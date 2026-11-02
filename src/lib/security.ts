import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
function secret(name: string) {
  const value = process.env[name];
  if (value && /^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, 'hex');
  if (process.env.NODE_ENV === 'production')
    throw new Error(`${name} deve conter 64 caracteres hexadecimais.`);
  return createHash('sha256').update(`entre-nos-dev-only-${name}`).digest();
}
export const randomToken = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function accessCodeHash(code: string, eventId: string) {
  return createHmac('sha256', secret('TOKEN_SECRET'))
    .update(`access-code-lookup:v1:${eventId}:${code}`)
    .digest('hex');
}
export function participantAccessCode(eventId: string, id: string, nonce: string) {
  const digest = createHmac('sha256', secret('TOKEN_SECRET'))
    .update(`access-code-value:v1:${eventId}:${id}:${nonce}`)
    .digest();
  return String(digest.readUInt32BE(0) % 10000).padStart(4, '0');
}
export function participantToken(id: string, nonce: string) {
  return `${id}.${createHmac('sha256', secret('TOKEN_SECRET')).update(`${id}:${nonce}`).digest('base64url')}`;
}
export function verifyParticipant(token: string, id: string, nonce: string) {
  const expected = Buffer.from(participantToken(id, nonce)),
    actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function seal(value: unknown, context: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', secret('DRAW_ENCRYPTION_KEY'), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal<T>(value: string, context: string): T {
  const raw = Buffer.from(value, 'base64url'),
    decipher = createDecipheriv('aes-256-gcm', secret('DRAW_ENCRYPTION_KEY'), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  decipher.setAAD(Buffer.from(context));
  return JSON.parse(
    Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString(),
  );
}
