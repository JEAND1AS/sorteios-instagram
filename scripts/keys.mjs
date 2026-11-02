import { randomBytes } from 'node:crypto';
console.log(
  `TOKEN_SECRET=${randomBytes(32).toString('hex')}\nDRAW_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
);
