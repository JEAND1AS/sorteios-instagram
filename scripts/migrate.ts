import { loadEnvConfig } from '@next/env';
import { mkdir } from 'node:fs/promises';
import { Pool } from 'pg';
import { migrationSql } from '../src/db/migrations';
import { connectionOptions } from '../src/db/connection.mjs';
loadEnvConfig(process.cwd());
async function main() {
  const sql = await migrationSql();
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (connectionString) {
    const pool = new Pool({
      ...connectionOptions(connectionString),
      max: 1,
      connectionTimeoutMillis: 15000,
    });
    try {
      await pool.query(sql);
    } finally {
      await pool.end();
    }
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    await mkdir('./.data', { recursive: true });
    const db = new PGlite('./.data/postgres');
    try {
      await db.exec(sql);
    } finally {
      await db.close();
    }
  }
  console.log('Banco atualizado.');
}
main().catch(() => {
  console.error('Falha ao migrar. Confira DATABASE_URL e a conexão com o banco.');
  process.exit(1);
});
