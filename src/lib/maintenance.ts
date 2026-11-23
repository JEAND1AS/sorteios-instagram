import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { database } from '@/db';
import { events, locks, participants } from '@/db/schema';

export const MAINTENANCE_EVENT_ID = 'a50db7e8-18cd-4c3e-a655-927f6d7c2d18';
const MAINTENANCE_LOCK_ID = 'supabase-keepalive';

export async function toggleMaintenanceEvent() {
  const db = await database();

  return db.transaction(async (tx) => {
    // Serializa chamadas repetidas ou simultâneas do cron.
    await tx.insert(locks).values({ id: MAINTENANCE_LOCK_ID }).onConflictDoNothing();
    await tx.select().from(locks).where(eq(locks.id, MAINTENANCE_LOCK_ID)).for('update');

    const [existing] = await tx
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, MAINTENANCE_EVENT_ID));

    if (existing) {
      await tx.delete(events).where(eq(events.id, MAINTENANCE_EVENT_ID));
      return { action: 'deleted' as const };
    }

    const now = Date.now();
    await tx.insert(events).values({
      id: MAINTENANCE_EVENT_ID,
      slug: `manutencao-${randomUUID()}`,
      adminHash: `maintenance-${randomUUID()}`,
      name: 'Evento automático de manutenção',
      organizer: 'Entre Nós',
      description: 'Registro sintético criado pelo agendamento diário.',
      type: 'RAFFLE',
      exchangeAt: new Date(now + 3 * 86_400_000),
      deadline: new Date(now + 2 * 86_400_000),
      closed: true,
    });
    await tx.insert(participants).values({
      id: randomUUID(),
      eventId: MAINTENANCE_EVENT_ID,
      name: `Participante automático ${randomBytes(3).toString('hex').toUpperCase()}`,
      nonce: randomUUID(),
    });

    return { action: 'created' as const };
  });
}
