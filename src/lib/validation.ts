import { z } from 'zod';
export const GIFT_TYPES = [
  'Roupas',
  'Livros',
  'Jogos',
  'Cosméticos',
  'Comida/bebida',
  'Eletrônicos',
  'Casa/decoração',
  'Experiências',
  'Artesanato',
  'Outros',
] as const;
export const eventSchema = z
  .object({
    name: z.string().trim().min(3, 'Dê um nome com pelo menos 3 letras.').max(100),
    organizer: z.string().trim().min(2, 'Informe o nome do organizador.').max(80),
    description: z.string().trim().max(2000).default(''),
    type: z.enum(['SECRET', 'RAFFLE', 'TEAMS']),
    minValue: z.number().int().min(0).max(100000000),
    maxValue: z.number().int().min(0).max(100000000),
    exchangeAt: z.iso.datetime(),
    deadline: z.iso.datetime(),
    location: z.string().trim().max(250).default(''),
    teamCount: z.number().int().min(2).max(10).default(2),
    winnerCount: z.number().int().min(1).max(100).default(1),
  })
  .refine((v) => v.maxValue >= v.minValue, {
    message: 'O valor máximo deve ser maior ou igual ao mínimo.',
    path: ['maxValue'],
  })
  .refine((v) => new Date(v.exchangeAt) >= new Date(v.deadline), {
    message: 'A troca deve acontecer depois do prazo de inscrição.',
    path: ['exchangeAt'],
  });
export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}
export const identitySchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(80),
  email: z.string().trim().toLowerCase().pipe(z.email('Informe um email válido.')),
  phone: z
    .string()
    .max(30)
    .min(1, 'Informe seu celular com DDD.')
    .transform(normalizePhone)
    .refine((v) => /^\d{10,15}$/.test(v), 'Informe um telefone com DDD (ou código internacional).'),
});
export const normalizeName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
export const accessCodeSchema = z
  .string()
  .regex(/^\d{4}$/, 'Informe os 4 números do código de acesso.');
export const identificationSchema = z.discriminatedUnion('method', [
  identitySchema.extend({ method: z.literal('details') }),
  z.object({ method: z.literal('code'), accessCode: accessCodeSchema }),
]);
export const participantSchema = identitySchema.extend({
  gifts: z.array(z.enum(GIFT_TYPES)).max(10).default([]),
  notes: z.string().trim().max(1000).default(''),
  wishes: z.string().trim().max(2000).default(''),
});
export function status(event: {
  ended: boolean;
  drawnAt: Date | string | null;
  startedAt?: Date | string | null;
  closed: boolean;
  deadline: Date | string;
}) {
  return event.ended
    ? 'ENDED'
    : event.drawnAt
      ? 'DRAWN'
      : event.startedAt
        ? 'READY'
        : event.closed || new Date(event.deadline) <= new Date()
          ? 'CLOSED'
          : 'OPEN';
}
