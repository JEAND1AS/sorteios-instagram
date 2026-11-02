import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw } from '../src/lib/draw';
import { seal, unseal, participantToken, verifyParticipant } from '../src/lib/security';
import { normalizePhone, status, participantSchema } from '../src/lib/validation';
test('amigo oculto cobre todos sem autoatribuição e respeita bloqueios nos dois sentidos', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  for (let attempt = 0; attempt < 150; attempt++) {
    const result = draw(ids, 'SECRET', [
      { a: 'a', b: 'b' },
      { a: 'c', b: 'd' },
    ]);
    const recipients = [];
    for (const [id, value] of result) {
      assert.equal(value.kind, 'SECRET');
      if (value.kind !== 'SECRET') continue;
      assert.notEqual(id, value.recipientId);
      assert.ok(
        ![
          ['a', 'b'],
          ['b', 'a'],
          ['c', 'd'],
          ['d', 'c'],
        ].some(([a, b]) => a === id && b === value.recipientId),
      );
      recipients.push(value.recipientId);
    }
    assert.equal(new Set(recipients).size, ids.length);
  }
});
test('restrições impossíveis e grupos pequenos produzem erro sem resultado parcial', () => {
  assert.throws(() => draw(['a', 'b'], 'SECRET', []), /3 participantes/);
  assert.throws(() => draw(['a', 'b', 'c'], 'SECRET', [{ a: 'a', b: 'b' }]), /impedem/);
});
test('times equilibrados separam pares bloqueados', () => {
  const ids = Array.from({ length: 11 }, (_, i) => String(i));
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = draw(ids, 'TEAMS', [{ a: '0', b: '1' }], 3);
    const first = result.get('0'),
      second = result.get('1');
    assert.equal(result.size, 11);
    assert.ok(first?.kind === 'TEAMS' && second?.kind === 'TEAMS' && first.team !== second.team);
    const sizes = [
      ...new Set([...result.values()].map((r) => (r.kind === 'TEAMS' ? r.memberIds.length : 0))),
    ];
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
  }
});
test('sorteio simples escolhe exatamente a quantidade de ganhadores sem repetição', () => {
  const result = draw(['a', 'b', 'c', 'd', 'e'], 'RAFFLE', [], 2, 3);
  assert.equal([...result.values()].filter((r) => r.kind === 'RAFFLE' && r.winner).length, 3);
  assert.throws(() => draw(['a', 'b', 'c'], 'RAFFLE', [], 2, 4), /mais ganhadores/);
});
test('criptografia autentica ciphertext, participante e versão', () => {
  const ciphertext = seal({ recipientId: 'segredo' }, 'evento:pessoa:1');
  assert.deepEqual(unseal(ciphertext, 'evento:pessoa:1'), { recipientId: 'segredo' });
  assert.ok(!ciphertext.includes('segredo'));
  assert.throws(() => unseal(ciphertext, 'evento:outra:1'));
  assert.throws(() => unseal(ciphertext, 'evento:pessoa:2'));
  const raw = Buffer.from(ciphertext, 'base64url');
  raw[raw.length - 1] ^= 1;
  assert.throws(() => unseal(raw.toString('base64url'), 'evento:pessoa:1'));
});
test('token pessoal depende do segredo e do nonce, não só do id público', () => {
  const token = participantToken('pessoa', 'nonce');
  assert.ok(verifyParticipant(token, 'pessoa', 'nonce'));
  assert.ok(!verifyParticipant(token, 'pessoa', 'outro'));
  assert.ok(!verifyParticipant('invalido', 'pessoa', 'nonce'));
});
test('normalização e obrigatoriedade de contato', () => {
  assert.equal(normalizePhone('(11) 99999-1234'), '5511999991234');
  assert.equal(normalizePhone('+55 11 99999-1234'), '5511999991234');
  assert.ok(
    !participantSchema.safeParse({ name: 'Ana', preference: 'EMAIL', email: '', phone: '' })
      .success,
  );
  assert.ok(
    !participantSchema.safeParse({
      name: 'Ana',
      preference: 'EMAIL',
      email: '',
      phone: '11999991234',
    }).success,
  );
});
test('o prazo fecha a inscrição sem cron e o sorteio prevalece sobre a data', () => {
  const event = { ended: false, drawnAt: null, closed: false, deadline: new Date(Date.now() - 1) };
  assert.equal(status(event), 'CLOSED');
  assert.equal(status({ ...event, deadline: new Date(Date.now() + 60000) }), 'OPEN');
  assert.equal(status({ ...event, drawnAt: new Date() }), 'DRAWN');
  assert.equal(status({ ...event, ended: true }), 'ENDED');
});
