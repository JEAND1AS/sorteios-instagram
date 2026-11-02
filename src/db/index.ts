import { drizzle as postgres, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as embedded } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';
import { migrationSql } from './migrations';
import { connectionOptions } from './connection.mjs';
type Store = Promise<NodePgDatabase<typeof schema>>;
const globalStore = globalThis as unknown as { entreNosDatabaseInit?: Store };
async function initializeDatabase(): Store {
  if (process.env.NODE_ENV === 'production') {
    for (const key of ['TOKEN_SECRET', 'DRAW_ENCRYPTION_KEY'])
      if (!/^[a-f0-9]{64}$/i.test(process.env[key] || ''))
        throw new Error(`${key} não configurada.`);
    if (
      !process.env.APP_URL ||
      !process.env.APP_URL.startsWith('https://') ||
      process.env.APP_URL.endsWith('/')
    )
      throw new Error('APP_URL deve ser HTTPS e sem barra final.');
  }
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      ...connectionOptions(process.env.DATABASE_URL),
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
      allowExitOnIdle: true,
    });
    pool.on('error', () => console.error('[db] Conexão ociosa encerrada pelo provedor.'));
    return postgres(pool, { schema });
  } else {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL não configurada.');
    const path = resolve(process.env.LOCAL_DB_PATH || './.data/postgres');
    // PGlite cria seu próprio diretório, mas exige que os diretórios pais existam.
    await mkdir(dirname(path), { recursive: true });
    const client = new PGlite(path);
    await client.waitReady;
    await client.exec(await migrationSql());
    return embedded(client, { schema }) as unknown as NodePgDatabase<typeof schema>;
  }
}
export function database(): Store {
  // Compartilha a própria inicialização: requisições simultâneas não abrem dois bancos locais.
  globalStore.entreNosDatabaseInit ??= initializeDatabase().catch((error) => {
    delete globalStore.entreNosDatabaseInit;
    throw error;
  });
  return globalStore.entreNosDatabaseInit;
}
