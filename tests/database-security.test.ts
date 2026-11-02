import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { migrationSql } from '../src/db/migrations';

test('roles públicas do Supabase não podem acessar as tabelas; o backend mantém acesso', async () => {
  const db = new PGlite();
  try {
    // Simula projetos Supabase que concedem acesso a tabelas novas por padrão.
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON TABLES TO anon, authenticated;
    `);
    await db.exec(await migrationSql());
    const tables = [
      'events',
      'participants',
      'exclusions',
      'locks',
      'email_attempts',
      'rate_limits',
    ];
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'",
    );
    assert.equal(rows.length, tables.length);
    for (const table of tables) {
      assert.equal(rows.find((row) => row.relname === table)?.relrowsecurity, true);
      for (const role of ['anon', 'authenticated']) {
        const { rows: privileges } = await db.query<{ allowed: boolean }>(
          'SELECT has_table_privilege($1, $2, $3) AS allowed',
          [role, `public.${table}`, 'SELECT,INSERT,UPDATE,DELETE'],
        );
        assert.equal(privileges[0].allowed, false, `${role} não deve acessar ${table}`);
      }
    }
    await db.exec('SET ROLE anon;');
    await assert.rejects(() => db.query('SELECT * FROM participants'), /permission denied/);
    await db.exec('RESET ROLE;');
    const { rows: locks } = await db.query<{ id: string }>('SELECT id FROM locks');
    assert.deepEqual(locks, [{ id: 'email' }]);
  } finally {
    await db.close();
  }
});

test('migrações podem ser reaplicadas sem remover dados existentes', async () => {
  const db = new PGlite();
  try {
    await db.exec(await migrationSql());
    await db.query('INSERT INTO email_attempts(id) VALUES ($1)', ['tentativa-preservada']);
    await db.exec(await migrationSql());
    const { rows } = await db.query<{ id: string }>('SELECT id FROM email_attempts');
    assert.deepEqual(rows, [{ id: 'tentativa-preservada' }]);
  } finally {
    await db.close();
  }
});
