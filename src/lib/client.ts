export type EventView = {
  name: string;
  organizer: string;
  description: string;
  type: 'SECRET' | 'RAFFLE' | 'TEAMS';
  minValue: number;
  maxValue: number;
  exchangeAt: string;
  deadline: string;
  location: string;
  teamCount: number;
  winnerCount: number;
  status: 'OPEN' | 'CLOSED' | 'READY' | 'DRAWN' | 'ENDED';
  startedAt: string | null;
  drawnAt: string | null;
};
export type Person = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gifts: string[];
  notes: string;
  wishes: string;
  viewedAt: string | null;
};
export type AdminData = {
  event: EventView & { slug: string; version: number };
  participants: Person[];
  exclusions: { id: string; a: string; b: string }[];
};
export type PersonalData = { event: EventView; participant: Person; accessCode: string | null };
export type Result =
  | { kind: 'SECRET'; name: string; gifts: string[]; notes: string; wishes: string }
  | { kind: 'RAFFLE'; winner: boolean; position: number | null }
  | { kind: 'TEAMS'; team: number; members: string[] };
export const TYPE_NAMES = {
  SECRET: 'Amigo oculto',
  RAFFLE: 'Sorteio simples',
  TEAMS: 'Divisão de times',
};
export const STATUS_NAMES = {
  OPEN: 'Inscrições abertas',
  CLOSED: 'Inscrições encerradas',
  READY: 'Sorteio liberado',
  DRAWN: 'Sorteio realizado',
  ENDED: 'Evento encerrado',
};
export const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value / 100);
export const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
export function localDate(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export async function api<T>(url: string, input?: unknown): Promise<T> {
  const response = await fetch(url, {
    ...(input
      ? {
          method: 'POST',
          body: JSON.stringify(input),
          headers: { 'Content-Type': 'application/json' },
        }
      : {}),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
export type SavedEvent = { name: string; adminPath: string; invitePath: string; createdAt: string };
export type SavedParticipation = { name: string; personalPath: string };
export function savedParticipation(slug: string): SavedParticipation | null {
  try {
    const value = JSON.parse(localStorage.getItem('entre-nos-participations') || '{}')[slug];
    return value &&
      typeof value.name === 'string' &&
      /^\/participante\/[\w.-]+$/.test(value.personalPath)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function rememberParticipation(slug: string, participation: SavedParticipation) {
  try {
    const saved = JSON.parse(localStorage.getItem('entre-nos-participations') || '{}');
    const entries = Object.entries({ [slug]: participation, ...saved });
    // A inscrição mais recente substitui o acesso anterior deste evento neste dispositivo.
    localStorage.setItem(
      'entre-nos-participations',
      JSON.stringify(
        Object.fromEntries(
          [[slug, participation], ...entries.filter(([key]) => key !== slug)].slice(0, 30),
        ),
      ),
    );
  } catch {
    /* O acesso continua disponível na confirmação da inscrição e no email. */
  }
}
export function remember(event: Omit<SavedEvent, 'createdAt'>) {
  try {
    const saved = JSON.parse(localStorage.getItem('entre-nos-events') || '[]') as SavedEvent[];
    localStorage.setItem(
      'entre-nos-events',
      JSON.stringify(
        [
          { ...event, createdAt: new Date().toISOString() },
          ...saved.filter((e) => e.adminPath !== event.adminPath),
        ].slice(0, 30),
      ),
    );
  } catch {
    /* O link também é exibido para cópia. */
  }
}
