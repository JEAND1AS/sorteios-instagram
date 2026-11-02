import { randomInt } from 'node:crypto';
export function shuffle<T>(input: readonly T[]): T[] {
  const values = [...input];
  for (let i = values.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
export type DrawResult =
  | { kind: 'SECRET'; recipientId: string }
  | { kind: 'RAFFLE'; winner: boolean; position: number | null }
  | { kind: 'TEAMS'; team: number; memberIds: string[] };
export function draw(
  ids: string[],
  type: string,
  exclusions: { a: string; b: string }[],
  teamCount = 2,
  winnerCount = 1,
): Map<string, DrawResult> {
  if (ids.length < 3) throw new Error('Adicione pelo menos 3 participantes.');
  const blocked = new Set(exclusions.flatMap(({ a, b }) => [`${a}:${b}`, `${b}:${a}`]));
  if (type === 'RAFFLE') {
    if (winnerCount > ids.length) throw new Error('Há mais ganhadores que participantes.');
    const winners = shuffle(ids).slice(0, winnerCount);
    return new Map(
      ids.map((id) => [
        id,
        {
          kind: 'RAFFLE',
          winner: winners.includes(id),
          position: winners.includes(id) ? winners.indexOf(id) + 1 : null,
        },
      ]),
    );
  }
  if (type === 'TEAMS') {
    if (teamCount > ids.length) throw new Error('Há mais times que participantes.');
    const teams: string[][] = Array.from({ length: teamCount }, () => []);
    const order = shuffle(ids).sort(
      (a, b) =>
        exclusions.filter((e) => e.a === b || e.b === b).length -
        exclusions.filter((e) => e.a === a || e.b === a).length,
    );
    const sizes = teams.map(
      (_, i) => Math.floor(ids.length / teamCount) + (i < ids.length % teamCount ? 1 : 0),
    );
    let steps = 0;
    function place(index: number): boolean {
      if (++steps > 200000)
        throw new Error(
          'Muitas restrições para formar os times. Reduza as restrições e tente novamente.',
        );
      if (index === order.length) return true;
      const id = order[index];
      for (const n of shuffle(teams.map((_, i) => i))) {
        if (teams[n].length >= sizes[n] || teams[n].some((other) => blocked.has(`${id}:${other}`)))
          continue;
        teams[n].push(id);
        if (place(index + 1)) return true;
        teams[n].pop();
      }
      return false;
    }
    if (!place(0))
      throw new Error('Não é possível formar times equilibrados com essas restrições.');
    return new Map(
      teams.flatMap((members, i) =>
        members.map(
          (id) => [id, { kind: 'TEAMS', team: i + 1, memberIds: members }] as [string, DrawResult],
        ),
      ),
    );
  }
  // Emparelhamento bipartido completo: nunca permite a própria pessoa ou um par restrito.
  const candidates = new Map(
    ids.map((id) => [
      id,
      shuffle(ids.filter((other) => id !== other && !blocked.has(`${id}:${other}`))),
    ]),
  );
  const recipients = new Map<string, string>();
  function match(giver: string, seen: Set<string>): boolean {
    for (const recipient of candidates.get(giver)!) {
      if (seen.has(recipient)) continue;
      seen.add(recipient);
      const previous = recipients.get(recipient);
      if (!previous || match(previous, seen)) {
        recipients.set(recipient, giver);
        return true;
      }
    }
    return false;
  }
  for (const id of shuffle(ids))
    if (!match(id, new Set()))
      throw new Error('As restrições impedem um sorteio válido. Revise os pares bloqueados.');
  return new Map(
    [...recipients].map(([recipientId, giver]) => [giver, { kind: 'SECRET', recipientId }]),
  );
}
