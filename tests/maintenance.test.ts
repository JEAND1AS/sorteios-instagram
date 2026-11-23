import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { database } from '../src/db';
import { events, participants } from '../src/db/schema';
import { GET } from '../src/app/api/cron/keep-alive/route';
import { MAINTENANCE_EVENT_ID } from '../src/lib/maintenance';

const root = '/tmp/entre-nos-maintenance-tests-' + randomUUID();
process.env.DATABASE_URL = '';
process.env.DIRECT_URL = '';
process.env.LOCAL_DB_PATH = root + '/postgres';
process.env.CRON_SECRET = 'cron-test-secret';

after(async () => {
  await rm(root, { recursive: true, force: true });
});

function request(secret = process.env.CRON_SECRET) {
  return new Request('http://localhost:3000/api/cron/keep-alive', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

test('cron exige segredo e alterna entre criar e excluir o evento sintético', async () => {
  assert.equal((await GET(request('incorreto'))).status, 401);

  const created = await GET(request());
  assert.equal(created.status, 200);
  assert.deepEqual(await created.json(), { action: 'created' });

  const db = await database();
  const storedEvents = await db.select().from(events).where(eq(events.id, MAINTENANCE_EVENT_ID));
  const storedPeople = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, MAINTENANCE_EVENT_ID));
  assert.equal(storedEvents.length, 1);
  assert.equal(storedEvents[0].closed, true);
  assert.equal(storedPeople.length, 1);
  assert.match(storedPeople[0].name, /^Participante automático [A-F0-9]{6}$/);

  const deleted = await GET(request());
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { action: 'deleted' });
  assert.equal(
    (await db.select().from(events).where(eq(events.id, MAINTENANCE_EVENT_ID))).length,
    0,
  );
  assert.equal(
    (await db.select().from(participants).where(eq(participants.eventId, MAINTENANCE_EVENT_ID)))
      .length,
    0,
  );
});
