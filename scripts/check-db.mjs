import nextEnv from '@next/env';
import { Client } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import { connectionOptions } from '../src/db/connection.mjs';
nextEnv.loadEnvConfig(process.cwd(), true);
const fix = process.argv.includes('--fix');
const file = '.env.local';
const original = await readFile(file, 'utf8');
function normalized(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('INVALID_URL');
  const password = decodeURIComponent(url.password);
  if (password.startsWith('[') && password.endsWith(']'))
    url.password = encodeURIComponent(password.slice(1, -1));
  url.searchParams.set('sslmode', 'verify-full');
  return url;
}
try {
  const app = normalized(process.env.DATABASE_URL || '');
  const direct = process.env.DIRECT_URL ? normalized(process.env.DIRECT_URL) : new URL(app);
  if (/YOUR.PASSWORD|SENHA_CODIFICADA/i.test(decodeURIComponent(direct.password)))
    direct.password = app.password;
  if (!process.env.DIRECT_URL)
    direct.port = app.hostname.endsWith('.pooler.supabase.com') ? '5432' : app.port;
  for (const [name, url] of [
    ['DATABASE_URL', app],
    ['DIRECT_URL', direct],
  ]) {
    const client = new Client({
      ...connectionOptions(url.toString()),
      connectionTimeoutMillis: 10000,
      statement_timeout: 5000,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      console.log(`${name}: conexão PostgreSQL validada com SSL (porta ${url.port || '5432'}).`);
    } finally {
      await client.end();
    }
  }
  if (fix) {
    if ((await readFile(file, 'utf8')) !== original) throw new Error('FILE_CHANGED');
    let updated = original;
    for (const [name, url] of [
      ['DATABASE_URL', app],
      ['DIRECT_URL', direct],
    ]) {
      // Escapa $ para que o carregador .env não interprete parte da senha como variável.
      const line = `${name}="${url.toString().replaceAll('$', '\\$')}"`;
      const pattern = new RegExp(`^${name}=.*$`, 'm');
      updated = pattern.test(updated)
        ? updated.replace(pattern, () => line)
        : `${updated}\n${line}\n`;
    }
    await writeFile(file, updated, { mode: 0o600 });
    console.log('URLs corrigidas em .env.local. Nenhuma credencial foi exibida.');
  }
} catch (error) {
  const code =
    error?.code || (error?.message === 'FILE_CHANGED' ? 'FILE_CHANGED' : 'CONNECTION_FAILED');
  console.error(`Não foi possível validar o banco (${code}). O arquivo não foi alterado.`);
  process.exitCode = 1;
}
