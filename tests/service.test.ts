import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { eq, sql } from 'drizzle-orm';
import {
  createEvent,
  getInvite,
  getAdmin,
  join,
  identify,
  adminAction,
  personal,
  personalAction,
} from '../src/lib/service';
import { database } from '../src/db';
import { events, participants } from '../src/db/schema';
import { body, limit, failure } from '../src/lib/http';
const root = '/tmp/entre-nos-tests-' + randomUUID();
process.env.DATABASE_URL = '';
process.env.DIRECT_URL = '';
process.env.LOCAL_DB_PATH = root + '/nested/postgres';
after(async () => {
  await rm(root, { recursive: true, force: true });
});
const eventInput = {
  name: 'Amigo da família',
  organizer: 'Marina',
  description: 'Encontro',
  type: 'SECRET',
  minValue: 5000,
  maxValue: 10000,
  deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
  exchangeAt: new Date(Date.now() + 86400000 * 10).toISOString(),
  location: 'Em casa',
  teamCount: 2,
  winnerCount: 1,
};
const person = (n: number) => ({
  name: 'Pessoa ' + n,
  email: 'pessoa' + n + '@example.com',
  phone: '1198888' + String(n).padStart(4, '0'),
  gifts: ['Livros'],
  notes: 'M',
  wishes: 'Um livro',
});
const tokenOf = (path: string) => path.split('/').pop()!;
async function group(count = 4, type = 'SECRET') {
  const created = await createEvent({ ...eventInput, type }),
    admin = tokenOf(created.adminPath),
    slug = tokenOf(created.invitePath),
    tokens: string[] = [];
  for (let n = 1; n <= count; n++) tokens.push(tokenOf((await join(slug, person(n))).personalPath));
  return { admin, slug, tokens };
}
async function start(admin: string) {
  await adminAction(admin, { action: 'close' });
  await adminAction(admin, { action: 'start', confirmation: 'COMEÇAR' });
}
test('fluxo completo: cadastro, fechar, começar, reabrir convite, identificar e sortear', async () => {
  const { admin, slug, tokens } = await group();
  assert.equal((await getInvite(slug)).event.status, 'OPEN');
  const before = await getAdmin(admin);
  assert.ok(!('quota' in before));
  assert.ok(before.participants.every((p) => !('delivery' in p) && !('preference' in p)));
  await assert.rejects(
    () => adminAction(admin, { action: 'start', confirmation: 'COMEÇAR' }),
    /Feche/,
  );
  await adminAction(admin, { action: 'close' });
  await assert.rejects(() => join(slug, person(5)), /encerradas/);
  await assert.rejects(() => personalAction(tokens[0], { action: 'draw' }), /Começar sorteio/);
  await adminAction(admin, { action: 'start', confirmation: 'COMEÇAR' });
  const ready = await getAdmin(admin);
  assert.equal(ready.event.status, 'READY');
  assert.equal(ready.event.drawnAt, null);
  assert.ok(ready.participants.every((p) => !p.viewedAt));
  // Identificação funciona em outro dispositivo, sem receber um token pelo organizador.
  const access = await identify(slug, {
    name: '  PESSOA 1  ',
    email: 'PESSOA1@example.com',
    phone: '+55 (11) 98888-0001',
  });
  assert.equal(tokenOf(access.personalPath), tokens[0]);
  assert.ok(!('result' in access));
  assert.ok(!('result' in (await personal(tokens[0]))));
  await assert.rejects(
    () => identify(slug, { ...person(1), name: 'Outra pessoa' }),
    /dados ou o código/,
  );
  await assert.rejects(
    () => identify(slug, { ...person(1), phone: person(2).phone }),
    /dados ou o código/,
  );
  await assert.rejects(
    () => identify(slug, { ...person(1), email: person(2).email }),
    /dados ou o código/,
  );
  const result = (await personalAction(tokenOf(access.personalPath), { action: 'draw' })) as {
    result: { kind: string; name: string; email?: string; phone?: string };
  };
  assert.equal(result.result.kind, 'SECRET');
  assert.notEqual(result.result.name, person(1).name);
  assert.equal(result.result.email, undefined);
  assert.equal(result.result.phone, undefined);
  const drawn = await getAdmin(admin);
  assert.equal(drawn.event.status, 'DRAWN');
  assert.equal(drawn.participants.filter((p) => p.viewedAt).length, 1);
  for (const token of tokens) assert.ok(!JSON.stringify(drawn).includes(token));
  await assert.rejects(
    () => adminAction(admin, { action: 'edit', id: drawn.participants[0].id, data: person(1) }),
    /já começou/,
  );
  await assert.rejects(() => adminAction(admin, { action: 'send' }));
  await assert.rejects(() =>
    adminAction(admin, { action: 'welcome', id: drawn.participants[0].id }),
  );
});
test('código de quatro números funciona sozinho, sem exigir nome ou contatos', async () => {
  const { admin, slug, tokens } = await group();
  const codes = await Promise.all(tokens.map(async (token) => (await personal(token)).accessCode!));
  assert.equal(new Set(codes).size, tokens.length);
  assert.ok(codes.every((code) => /^\d{4}$/.test(code)));
  const access = await identify(slug, { method: 'code', accessCode: codes[0] });
  assert.equal(tokenOf(access.personalPath), tokens[0]);
  assert.equal(access.accessCode, codes[0]);
  const wrong = Array.from({ length: 10000 }, (_, i) => String(i).padStart(4, '0')).find(
    (code) => !codes.includes(code),
  )!;
  await assert.rejects(
    () => identify(slug, { method: 'code', accessCode: wrong }),
    /dados ou o código/,
  );
  await assert.rejects(() => identify(slug, { method: 'code', accessCode: '12345' }), /4 números/);
  const other = await createEvent(eventInput);
  await assert.rejects(
    () => identify(tokenOf(other.invitePath), { method: 'code', accessCode: codes[0] }),
    /dados ou o código/,
  );
  const panel = await getAdmin(admin);
  assert.ok(
    panel.participants.every(
      (person) => !('accessCode' in person) && !('accessCodeHash' in person),
    ),
  );
  const db = await database();
  const [stored] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, panel.participants[0].id));
  assert.match(stored.accessCodeHash!, /^[a-f0-9]{64}$/);
  assert.notEqual(stored.accessCodeHash, codes[0]);
});
test('códigos não se repetem mesmo em um evento cheio', async () => {
  const { tokens } = await group(200);
  const codes = await Promise.all(tokens.map(async (token) => (await personal(token)).accessCode));
  assert.equal(new Set(codes).size, 200);
});
test('cadastros antigos e inclusões manuais recebem código ao entrar pelos dados', async () => {
  const created = await createEvent(eventInput),
    admin = tokenOf(created.adminPath),
    slug = tokenOf(created.invitePath);
  await adminAction(admin, { action: 'add', data: person(1) });
  const access = await identify(slug, person(1));
  assert.match(access.accessCode, /^\d{4}$/);
  assert.equal(
    (await identify(slug, { method: 'code', accessCode: access.accessCode })).personalPath,
    access.personalPath,
  );
});
test('começar bloqueia alterações antes mesmo de alguém sortear', async () => {
  const { admin, tokens } = await group();
  await start(admin);
  const data = await getAdmin(admin),
    id = data.participants[0].id;
  await assert.rejects(() => adminAction(admin, { action: 'remove', id }), /já começou/);
  await assert.rejects(() => adminAction(admin, { action: 'add', data: person(9) }), /já começou/);
  await assert.rejects(
    () => adminAction(admin, { action: 'restrictions', rules: [] }),
    /já começou/,
  );
  await assert.rejects(
    () => personalAction(tokens[0], { action: 'update', data: person(1) }),
    /edição encerrou/,
  );
});
test('cadastro exige os três dados e impede duplicidade com telefone normalizado', async () => {
  const { admin, slug } = await group(3);
  await assert.rejects(() => join(slug, { ...person(8), email: '' }));
  await assert.rejects(() => join(slug, { ...person(8), phone: '' }));
  await assert.rejects(() => join(slug, person(1)));
  await assert.rejects(() => join(slug, { ...person(8), phone: '+55 11 98888-0001' }));
  assert.equal((await getAdmin(admin)).participants.length, 3);
});
test('cadastros concorrentes não duplicam inscrição', async () => {
  const created = await createEvent(eventInput),
    slug = tokenOf(created.invitePath);
  const result = await Promise.allSettled([
    join(slug, person(1)),
    join(slug, person(1)),
    join(slug, person(1)),
  ]);
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
});
test('cliques simultâneos geram uma combinação única; clicar novamente não troca o nome', async () => {
  const { admin, tokens } = await group(6);
  await start(admin);
  const version = (await getAdmin(admin)).event.version;
  const results = await Promise.all(
    tokens.flatMap((token) => [
      personalAction(token, { action: 'draw' }),
      personalAction(token, { action: 'draw' }),
    ]),
  );
  const names = new Set();
  for (let i = 0; i < tokens.length; i++) {
    assert.deepEqual(results[i * 2], results[i * 2 + 1]);
    const result = results[i * 2] as { result: { name: string }; version: number };
    assert.equal(result.version, version + 1);
    assert.notEqual(result.result.name, person(i + 1).name);
    names.add(result.result.name);
  }
  assert.equal(names.size, tokens.length);
  assert.equal((await getAdmin(admin)).event.version, version + 1);
});
test('restrições são respeitadas e regras impossíveis não liberam o começo', async () => {
  const valid = await group();
  const p = (await getAdmin(valid.admin)).participants;
  await adminAction(valid.admin, { action: 'restrictions', rules: [{ a: p[0].id, b: p[1].id }] });
  await start(valid.admin);
  const first = (await personalAction(valid.tokens[0], { action: 'draw' })) as {
    result: { name: string };
  };
  assert.notEqual(first.result.name, person(2).name);
  const invalid = await group(3),
    people = (await getAdmin(invalid.admin)).participants;
  await adminAction(invalid.admin, {
    action: 'restrictions',
    rules: [{ a: people[0].id, b: people[1].id }],
  });
  await assert.rejects(() => start(invalid.admin), /impedem/);
  const data = await getAdmin(invalid.admin);
  assert.equal(data.event.startedAt, null);
  assert.equal(data.event.drawnAt, null);
});
test('prazo automático apenas fecha; organizador ainda precisa clicar em começar', async () => {
  const { admin, slug, tokens } = await group(3),
    db = await database();
  await db
    .update(events)
    .set({ deadline: new Date(Date.now() - 1000) })
    .where(eq(events.slug, slug));
  assert.equal((await getInvite(slug)).event.status, 'CLOSED');
  await assert.rejects(() => personalAction(tokens[0], { action: 'draw' }), /Começar sorteio/);
  await adminAction(admin, { action: 'start', confirmation: 'COMEÇAR' });
  await personalAction(tokens[0], { action: 'draw' });
});
test('mínimo de três e confirmação são exigidos para começar', async () => {
  const { admin } = await group(2);
  await adminAction(admin, { action: 'close' });
  await assert.rejects(
    () => adminAction(admin, { action: 'start', confirmation: 'ERRADO' }),
    /Confirme/,
  );
  await assert.rejects(
    () => adminAction(admin, { action: 'start', confirmation: 'COMEÇAR' }),
    /3 participantes/,
  );
});
test('reiniciar e reabrir invalidam resultados e exigem começar novamente', async () => {
  const { admin, tokens } = await group();
  await start(admin);
  await personalAction(tokens[0], { action: 'draw' });
  await assert.rejects(() => adminAction(admin, { action: 'reopen' }), /Confirme/);
  await adminAction(admin, { action: 'redraw', confirmation: 'REFAZER SORTEIO' });
  assert.equal((await getAdmin(admin)).event.status, 'CLOSED');
  await assert.rejects(() => personalAction(tokens[0], { action: 'draw' }), /Começar sorteio/);
  await adminAction(admin, { action: 'start', confirmation: 'COMEÇAR' });
  await personalAction(tokens[0], { action: 'draw' });
  await adminAction(admin, { action: 'reopen', confirmation: 'REABRIR E INVALIDAR' });
  assert.equal((await getAdmin(admin)).event.status, 'OPEN');
});
test('sorteio simples e times seguem o mesmo começo e mostram apenas o resultado individual', async () => {
  for (const type of ['RAFFLE', 'TEAMS']) {
    const { admin, tokens } = await group(5, type);
    await start(admin);
    const r = (await personalAction(tokens[0], { action: 'draw' })) as {
      result: { kind: string; members?: string[]; memberIds?: string[] };
    };
    assert.equal(r.result.kind, type);
    assert.equal(r.result.memberIds, undefined);
    if (type === 'TEAMS') assert.ok(r.result.members!.length >= 2);
  }
});
test('sorteio simples e times não armazenam valores ou preferências de presente', async () => {
  for (const type of ['RAFFLE', 'TEAMS']) {
    const created = await createEvent({ ...eventInput, type, minValue: 5000, maxValue: 10000 });
    const slug = tokenOf(created.invitePath);
    const token = tokenOf((await join(slug, person(1))).personalPath);
    const invitation = await getInvite(slug);
    assert.equal(invitation.event.minValue, 0);
    assert.equal(invitation.event.maxValue, 0);
    let participation = await personal(token);
    assert.deepEqual(participation.participant.gifts, []);
    assert.equal(participation.participant.notes, '');
    assert.equal(participation.participant.wishes, '');
    await personalAction(token, { action: 'update', data: person(1) });
    participation = await personal(token);
    assert.deepEqual(participation.participant.gifts, []);
    assert.equal(participation.participant.notes, '');
    assert.equal(participation.participant.wishes, '');
  }
});
test('encerrar bloqueia identificação e resultado; excluir remove os dados por cascata', async () => {
  const { admin, slug, tokens } = await group();
  await start(admin);
  await personalAction(tokens[0], { action: 'draw' });
  await adminAction(admin, { action: 'end', confirmation: 'ENCERRAR' });
  await assert.rejects(() => identify(slug, person(1)));
  await assert.rejects(() => personalAction(tokens[0], { action: 'draw' }), /encerrado/);
  const db = await database(),
    [event] = await db.select().from(events).where(eq(events.slug, slug));
  await adminAction(admin, { action: 'delete', confirmation: 'EXCLUIR' });
  await assert.rejects(() => getInvite(slug), /não encontrado/);
  assert.equal(
    (await db.select().from(participants).where(eq(participants.eventId, event.id))).length,
    0,
  );
});
test('origem, JSON inválido, credenciais forjadas e rate limit continuam protegidos', async () => {
  await assert.rejects(
    () =>
      body(
        new Request('http://localhost:3000/api/events', {
          method: 'POST',
          headers: { origin: 'https://outro.example' },
          body: '{}',
        }),
      ),
    /Origem/,
  );
  await assert.rejects(
    () => body(new Request('http://localhost:3000/api/events', { method: 'POST', body: '{' })),
    /inválido/,
  );
  const req = new Request('http://localhost:3000');
  await limit(req, 'test', 2);
  await limit(req, 'test', 2);
  await assert.rejects(() => limit(req, 'test', 2), /Muitas/);
  await assert.rejects(() => personal('forjado.invalido'), /inválido/);
  assert.equal(failure({ cause: { code: '23505' } }).status, 409);
});
