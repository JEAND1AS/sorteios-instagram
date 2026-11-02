import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rootCertificates } from 'node:tls';

export function connectionOptions(value) {
  const url = new URL(value);
  if (!url.hostname.endsWith('.supabase.com') && !url.hostname.endsWith('.supabase.co')) {
    return { connectionString: value };
  }
  // pg substitui o objeto SSL ao interpretar opções SSL da URI. Normalizamos aqui
  // para manter validação de CA e hostname com o certificado oficial do Supabase.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'])
    url.searchParams.delete(key);
  const ca = readFileSync(join(process.cwd(), 'certs/supabase-ca.crt'), 'utf8');
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ca: [...rootCertificates, ca] },
  };
}
