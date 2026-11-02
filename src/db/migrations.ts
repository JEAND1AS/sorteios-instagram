import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// As migrações atuais são idempotentes e executam em uma única transação.
// Assim, um banco novo não fica exposto entre a criação das tabelas e a ativação de RLS.
export async function migrationSql() {
  const directory = join(process.cwd(), 'migrations');
  const names = (await readdir(directory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  const scripts = await Promise.all(names.map((name) => readFile(join(directory, name), 'utf8')));
  return `BEGIN;\n${scripts.join('\n')}\nCOMMIT;`;
}
