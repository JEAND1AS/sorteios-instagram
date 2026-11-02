import { cp, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

// Uma cópia isolada evita que o Next de teste altere tsconfig, .env ou o servidor do usuário.
const source = process.cwd();
const directory = await mkdtemp(join(tmpdir(), 'entre-nos-e2e-'));
const require = createRequire(import.meta.url);
try {
  await Promise.all([
    ...[
      'src',
      'public',
      'certs',
      'migrations',
      'package.json',
      'tsconfig.json',
      'next-env.d.ts',
      'next.config.ts',
      'postcss.config.mjs',
    ].map((name) => cp(join(source, name), join(directory, name), { recursive: true })),
    symlink(join(source, 'node_modules'), join(directory, 'node_modules'), 'dir'),
  ]);
  const child = spawn(
    process.execPath,
    [
      require.resolve('next/dist/bin/next'),
      'dev',
      '--webpack',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3100',
    ],
    {
      cwd: directory,
      stdio: 'inherit',
      env: { ...process.env, LOCAL_DB_PATH: join(directory, '.data', 'postgres') },
    },
  );
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.once('error', async () => {
    await rm(directory, { recursive: true, force: true });
    process.exit(1);
  });
  child.once('exit', async (code) => {
    await rm(directory, { recursive: true, force: true });
    process.exit(code ?? 0);
  });
} catch (error) {
  await rm(directory, { recursive: true, force: true });
  throw error;
}
