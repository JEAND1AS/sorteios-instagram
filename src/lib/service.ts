import { randomUUID } from 'node:crypto';
import { and, eq, sql, asc } from 'drizzle-orm';
import { database } from '@/db';
import { events, participants, exclusions, type Event, type Participant } from '@/db/schema';
import {
  hash,
  participantToken,
  randomToken,
  verifyParticipant,
  seal,
  unseal,
  accessCodeHash,
  participantAccessCode,
} from './security';
import {
  eventSchema,
  participantSchema,
  identificationSchema,
  normalizeName,
  status,
} from './validation';
import { AppError } from './http';
import { draw, type DrawResult } from './draw';
import { z } from 'zod';
type Transaction = Parameters<
  Parameters<Awaited<ReturnType<typeof database>>['transaction']>[0]
>[0];

function eventDataForType<T extends { type: string; minValue: number; maxValue: number }>(data: T) {
  return data.type === 'SECRET' ? data : { ...data, minValue: 0, maxValue: 0 };
}

function participantDataForType<T extends { gifts: string[]; notes: string; wishes: string }>(
  data: T,
  event: Pick<Event, 'type'>,
) {
  return event.type === 'SECRET' ? data : { ...data, gifts: [], notes: '', wishes: '' };
}

function makeResults(event: Event, people: Participant[], rules: { a: string; b: string }[]) {
  try {
    return draw(
      people.map((p) => p.id),
      event.type,
      rules,
      event.teamCount,
      event.winnerCount,
    );
  } catch (error) {
    throw new AppError((error as Error).message);
  }
}
async function assignResults(tx: Transaction, event: Event) {
  const people = await tx.select().from(participants).where(eq(participants.eventId, event.id));
  const rules = await tx.select().from(exclusions).where(eq(exclusions.eventId, event.id));
  const results = makeResults(event, people, rules);
  const version = event.version + 1;
  for (const person of people)
    await tx
      .update(participants)
      .set({
        result: seal(results.get(person.id), event.id + ':' + person.id + ':' + version),
        viewedAt: null,
      })
      .where(eq(participants.id, person.id));
  const [updated] = await tx
    .update(events)
    .set({ drawnAt: new Date(), closed: true, version })
    .where(eq(events.id, event.id))
    .returning();
  return updated;
}
// O bloqueio do evento serializa a reserva de códigos, inclusive em cadastros simultâneos.
async function reserveAccessCode(
  tx: Transaction,
  eventId: string,
  id: string,
  initialNonce = randomToken(),
) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const nonce = attempt === 0 ? initialNonce : randomToken();
    const code = participantAccessCode(eventId, id, nonce);
    const digest = accessCodeHash(code, eventId);
    const [existing] = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(and(eq(participants.eventId, eventId), eq(participants.accessCodeHash, digest)));
    if (!existing || existing.id === id) return { nonce, accessCodeHash: digest };
  }
  throw new AppError('Não foi possível gerar seu código. Tente novamente.');
}
function privateAccess(person: Participant) {
  return {
    personalPath: '/participante/' + participantToken(person.id, person.nonce),
    accessCode: participantAccessCode(person.eventId, person.id, person.nonce),
  };
}
export function publicEvent(e: Event) {
  return {
    name: e.name,
    organizer: e.organizer,
    description: e.description,
    type: e.type,
    minValue: e.minValue,
    maxValue: e.maxValue,
    exchangeAt: e.exchangeAt,
    deadline: e.deadline,
    location: e.location,
    teamCount: e.teamCount,
    winnerCount: e.winnerCount,
    status: status(e),
    drawnAt: e.drawnAt,
    startedAt: e.startedAt,
  };
}
export function publicPerson(p: Participant) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    gifts: p.gifts,
    notes: p.notes,
    wishes: p.wishes,
    viewedAt: p.viewedAt,
  };
}
export async function createEvent(input: unknown) {
  const data = eventDataForType(eventSchema.parse(input));
  if (new Date(data.deadline) <= new Date())
    throw new AppError('Escolha um prazo de inscrição no futuro.');
  const token = randomToken(),
    slug = randomToken().slice(0, 18),
    db = await database();
  await db.insert(events).values({
    ...data,
    id: randomUUID(),
    slug,
    adminHash: hash(token),
    exchangeAt: new Date(data.exchangeAt),
    deadline: new Date(data.deadline),
  });
  return { adminPath: '/admin/' + token, invitePath: '/convite/' + slug, name: data.name };
}
export async function getInvite(slug: string) {
  const db = await database(),
    [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) throw new AppError('Convite não encontrado.', 404);
  const [count] = await db
    .select({ value: sql<number>`count(*)::integer` })
    .from(participants)
    .where(eq(participants.eventId, event.id));
  return { event: publicEvent(event), count: count.value };
}
export async function join(slug: string, input: unknown) {
  const data = participantSchema.parse(input),
    db = await database();
  const person = await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.slug, slug)).for('update');
    if (!event) throw new AppError('Convite não encontrado.', 404);
    if (status(event) !== 'OPEN')
      throw new AppError('As inscrições deste evento estão encerradas.', 409);
    const [count] = await tx
      .select({ value: sql<number>`count(*)::integer` })
      .from(participants)
      .where(eq(participants.eventId, event.id));
    if (count.value >= 200)
      throw new AppError('Este evento chegou ao limite de 200 participantes.');
    const id = randomUUID();
    const credentials = await reserveAccessCode(tx, event.id, id);
    const [person] = await tx
      .insert(participants)
      .values({ ...participantDataForType(data, event), id, eventId: event.id, ...credentials })
      .returning();
    return person;
  });
  return privateAccess(person);
}
export async function identify(slug: string, input: unknown) {
  const fields = z.record(z.string(), z.unknown()).parse(input);
  const data = identificationSchema.parse({ method: 'details', ...fields }),
    db = await database();
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.slug, slug)).for('update');
    if (!event || event.ended) throw new AppError('Não foi possível acessar este evento.', 404);
    const conditions =
      data.method === 'code'
        ? and(
            eq(participants.eventId, event.id),
            eq(participants.accessCodeHash, accessCodeHash(data.accessCode, event.id)),
          )
        : and(
            eq(participants.eventId, event.id),
            eq(participants.email, data.email),
            eq(participants.phone, data.phone),
          );
    let [person] = await tx.select().from(participants).where(conditions);
    if (
      !person ||
      (data.method === 'details' && normalizeName(person.name) !== normalizeName(data.name))
    )
      throw new AppError('Não foi possível entrar. Confira os dados ou o código de acesso.', 401);
    const currentCode = participantAccessCode(event.id, person.id, person.nonce);
    if (person.accessCodeHash !== accessCodeHash(currentCode, event.id)) {
      const credentials = await reserveAccessCode(tx, event.id, person.id, person.nonce);
      [person] = await tx
        .update(participants)
        .set(credentials)
        .where(eq(participants.id, person.id))
        .returning();
    }
    return { ...privateAccess(person), name: person.name };
  });
}
export async function getAdmin(token: string) {
  const db = await database(),
    [event] = await db
      .select()
      .from(events)
      .where(eq(events.adminHash, hash(token)));
  if (!event) throw new AppError('Link de administração inválido.', 404);
  const [people, rules] = await Promise.all([
    db
      .select()
      .from(participants)
      .where(eq(participants.eventId, event.id))
      .orderBy(asc(participants.createdAt)),
    db.select().from(exclusions).where(eq(exclusions.eventId, event.id)),
  ]);
  return {
    event: { ...publicEvent(event), slug: event.slug, version: event.version },
    participants: people.map(publicPerson),
    exclusions: rules.map(({ id, a, b }) => ({ id, a, b })),
  };
}
export async function adminAction(token: string, input: Record<string, unknown>) {
  const action = z
    .enum([
      'update',
      'add',
      'edit',
      'remove',
      'close',
      'reopen',
      'restrictions',
      'start',
      'redraw',
      'end',
      'delete',
    ])
    .parse(input.action);
  const db = await database();
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(events)
      .where(eq(events.adminHash, hash(token)))
      .for('update');
    if (!event) throw new AppError('Link de administração inválido.', 404);
    if (event.ended && action !== 'delete') throw new AppError('O evento foi encerrado.');
    const people = await tx.select().from(participants).where(eq(participants.eventId, event.id));
    const beforeStart = () => {
      if (event.startedAt || event.drawnAt)
        throw new AppError(
          'O sorteio já começou. Reabra as inscrições e invalide os resultados para alterar a lista.',
        );
    };
    const findPerson = () => {
      const p = people.find((p) => p.id === input.id);
      if (!p) throw new AppError('Participante não encontrado.', 404);
      return p;
    };
    if (action === 'update') {
      const data = eventDataForType(
        eventSchema.parse({
          ...publicEvent(event),
          deadline: event.deadline.toISOString(),
          exchangeAt: event.exchangeAt.toISOString(),
          ...z.record(z.string(), z.unknown()).parse(input.data),
          type: event.type,
          organizer: event.organizer,
          name: event.name,
        }),
      );
      if (
        event.startedAt &&
        (data.teamCount !== event.teamCount || data.winnerCount !== event.winnerCount)
      )
        throw new AppError('Reabra as inscrições para alterar as regras.');
      await tx
        .update(events)
        .set({ ...data, exchangeAt: new Date(data.exchangeAt), deadline: new Date(data.deadline) })
        .where(eq(events.id, event.id));
    } else if (action === 'add' || action === 'edit') {
      beforeStart();
      const data = participantDataForType(participantSchema.parse(input.data), event);
      if (action === 'add') {
        if (people.length >= 200) throw new AppError('Limite de 200 participantes.');
        await tx
          .insert(participants)
          .values({ ...data, id: randomUUID(), eventId: event.id, nonce: randomToken() });
      } else {
        const person = findPerson();
        await tx
          .update(participants)
          .set({
            ...data,
            ...(person.email !== data.email || person.phone !== data.phone
              ? { nonce: randomToken(), accessCodeHash: null }
              : {}),
          })
          .where(eq(participants.id, person.id));
      }
    } else if (action === 'remove') {
      beforeStart();
      await tx.delete(participants).where(eq(participants.id, findPerson().id));
    } else if (action === 'close') {
      beforeStart();
      await tx.update(events).set({ closed: true }).where(eq(events.id, event.id));
    } else if (action === 'reopen') {
      if ((event.startedAt || event.drawnAt) && input.confirmation !== 'REABRIR E INVALIDAR')
        throw new AppError('Confirme digitando REABRIR E INVALIDAR.');
      if (event.deadline <= new Date())
        throw new AppError('Atualize o prazo para uma data futura antes de reabrir.');
      await tx
        .update(events)
        .set({ closed: false, startedAt: null, drawnAt: null, version: event.version + 1 })
        .where(eq(events.id, event.id));
      await tx
        .update(participants)
        .set({ result: null, viewedAt: null })
        .where(eq(participants.eventId, event.id));
    } else if (action === 'restrictions') {
      beforeStart();
      if (event.type === 'RAFFLE')
        throw new AppError('Sorteios simples não usam restrições de pares.');
      const rules = z
          .array(z.object({ a: z.string(), b: z.string() }))
          .max(1000)
          .parse(input.rules),
        seen = new Set<string>();
      for (const r of rules) {
        if (r.a === r.b || !people.some((p) => p.id === r.a) || !people.some((p) => p.id === r.b))
          throw new AppError('Restrição inválida.');
        const key = [r.a, r.b].sort().join(':');
        if (seen.has(key)) throw new AppError('Este par já está bloqueado.');
        seen.add(key);
      }
      await tx.delete(exclusions).where(eq(exclusions.eventId, event.id));
      if (rules.length)
        await tx
          .insert(exclusions)
          .values(rules.map((r) => ({ ...r, id: randomUUID(), eventId: event.id })));
    } else if (action === 'start') {
      beforeStart();
      if (status(event) === 'OPEN')
        throw new AppError('Feche as inscrições antes de começar o sorteio.');
      if (input.confirmation !== 'COMEÇAR') throw new AppError('Confirme digitando COMEÇAR.');
      const rules = await tx.select().from(exclusions).where(eq(exclusions.eventId, event.id));
      makeResults(event, people, rules); // Valida as regras; não grava nem revela pares nesta etapa.
      await tx
        .update(events)
        .set({ startedAt: new Date(), closed: true })
        .where(eq(events.id, event.id));
      return {
        message:
          'Sorteio liberado! Compartilhe o mesmo convite para cada pessoa se identificar e sortear.',
      };
    } else if (action === 'redraw') {
      if (input.confirmation !== 'REFAZER SORTEIO') throw new AppError('Confirmação necessária.');
      if (!event.startedAt && !event.drawnAt) throw new AppError('O sorteio ainda não começou.');
      await tx
        .update(participants)
        .set({ result: null, viewedAt: null })
        .where(eq(participants.eventId, event.id));
      await tx
        .update(events)
        .set({ startedAt: null, drawnAt: null, closed: true, version: event.version + 1 })
        .where(eq(events.id, event.id));
      return {
        message: 'Resultados invalidados. Clique em Começar sorteio para liberar uma nova rodada.',
      };
    } else if (action === 'end') {
      if (input.confirmation !== 'ENCERRAR') throw new AppError('Confirme digitando ENCERRAR.');
      await tx.update(events).set({ ended: true, closed: true }).where(eq(events.id, event.id));
    } else if (action === 'delete') {
      if (input.confirmation !== 'EXCLUIR') throw new AppError('Confirme digitando EXCLUIR.');
      await tx.delete(events).where(eq(events.id, event.id));
      return { deleted: true };
    }
    return { message: 'Alteração salva.' };
  });
}
async function findParticipation(token: string) {
  const db = await database(),
    [person] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, token.split('.')[0]));
  if (!person || !verifyParticipant(token, person.id, person.nonce))
    throw new AppError('Link pessoal inválido.', 404);
  return { db, person };
}
export async function personal(token: string) {
  const { db, person } = await findParticipation(token),
    [event] = await db.select().from(events).where(eq(events.id, person.eventId));
  if (!event) throw new AppError('Evento não encontrado.', 404);
  return {
    event: publicEvent(event),
    participant: publicPerson(person),
    invitePath: '/convite/' + event.slug,
    accessCode: person.accessCodeHash
      ? participantAccessCode(person.eventId, person.id, person.nonce)
      : null,
  };
}
export async function personalAction(token: string, input: Record<string, unknown>) {
  const { db, person: initial } = await findParticipation(token);
  return db.transaction(async (tx) => {
    let [event] = await tx
      .select()
      .from(events)
      .where(eq(events.id, initial.eventId))
      .for('update');
    let [person] = await tx.select().from(participants).where(eq(participants.id, initial.id));
    if (!event || !person || !verifyParticipant(token, person.id, person.nonce))
      throw new AppError('Link inválido.', 404);
    if (event.ended) throw new AppError('O evento foi encerrado.');
    if (input.action === 'update') {
      if (status(event) !== 'OPEN')
        throw new AppError('A edição encerrou junto com as inscrições.', 409);
      const data = participantDataForType(participantSchema.parse(input.data), event);
      await tx.update(participants).set(data).where(eq(participants.id, person.id));
      return { message: 'Suas preferências foram salvas.' };
    }
    if (input.action !== 'draw' && input.action !== 'reveal') throw new AppError('Ação inválida.');
    if (!event.startedAt)
      throw new AppError('Aguarde o organizador clicar em Começar sorteio.', 409);
    if (!event.drawnAt && input.action === 'draw') {
      event = await assignResults(tx, event);
      [person] = await tx.select().from(participants).where(eq(participants.id, initial.id));
    }
    if (!person.result) throw new AppError('O sorteio ainda não foi realizado.');
    const result = unseal<DrawResult>(
      person.result,
      event.id + ':' + person.id + ':' + event.version,
    );
    let details: unknown = result;
    if (result.kind === 'SECRET') {
      const [recipient] = await tx
        .select()
        .from(participants)
        .where(and(eq(participants.id, result.recipientId), eq(participants.eventId, event.id)));
      if (!recipient) throw new AppError('Resultado indisponível.');
      details = {
        kind: 'SECRET',
        name: recipient.name,
        gifts: recipient.gifts,
        notes: recipient.notes,
        wishes: recipient.wishes,
      };
    } else if (result.kind === 'TEAMS') {
      const members = await tx
        .select({ id: participants.id, name: participants.name })
        .from(participants)
        .where(eq(participants.eventId, event.id));
      details = {
        kind: 'TEAMS',
        team: result.team,
        members: members.filter((p) => result.memberIds.includes(p.id)).map((p) => p.name),
      };
    }
    await tx
      .update(participants)
      .set({ viewedAt: new Date() })
      .where(eq(participants.id, person.id));
    return { result: details, version: event.version };
  });
}
