import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { database } from '@/db';
import { rateLimits } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { hash } from './security';
export class AppError extends Error {
  constructor(
    message: string,
    public code = 400,
  ) {
    super(message);
  }
}
export function json(data: unknown, code = 200) {
  return NextResponse.json(data, {
    status: code,
    headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  const allowed = new URL(process.env.APP_URL || request.url).origin;
  if (origin && origin !== allowed && origin !== new URL(request.url).origin)
    throw new AppError('Origem da requisição não permitida.', 403);
  if (Number(request.headers.get('content-length') || 0) > 32768)
    throw new AppError('Formulário muito grande.', 413);
  const raw = await request.text();
  if (raw.length > 32768) throw new AppError('Formulário muito grande.', 413);
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new AppError('Formulário inválido.');
  }
}
export async function limit(request: Request, scope: string, max = 60) {
  const ip = process.env.VERCEL
    ? request.headers.get('x-vercel-forwarded-for') || 'unknown'
    : 'local';
  const key = hash(`${scope}:${ip.split(',')[0]}`),
    db = await database();
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: new Date(Date.now() + 3600000) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} < now() THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} < now() THEN now() + interval '1 hour' ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning();
  if (row.count > max) throw new AppError('Muitas tentativas. Tente novamente em uma hora.', 429);
}
export function failure(error: unknown) {
  if (error instanceof AppError) return json({ error: error.message }, error.code);
  if (error instanceof ZodError)
    return json({ error: error.issues[0]?.message || 'Confira os dados.' }, 400);
  const code =
    (error as { code?: string; cause?: { code?: string } })?.cause?.code ||
    (error as { code?: string })?.code;
  if (code === '23505')
    return json({ error: 'Este email ou telefone já está inscrito neste evento.' }, 409);
  // Não registrar URLs, contatos, tokens nem o conteúdo de erros do banco/SMTP.
  console.error('[api] Falha interna', error instanceof Error ? error.name : 'Unknown');
  return json(
    { error: 'Não foi possível concluir. Confira a configuração do servidor e tente novamente.' },
    500,
  );
}
