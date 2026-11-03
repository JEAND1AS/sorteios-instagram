'use client';
import { Button, DateTimeInput } from './controls';
import { useState, type FormEvent } from 'react';
import { localDate, type EventView } from '@/lib/client';
import { Notice } from './ui';
export function EventSettings({
  event,
  onSave,
}: {
  event: EventView;
  onSave: (data: unknown) => Promise<void>;
}) {
  const [value, setValue] = useState({
    description: event.description,
    minValue: String(event.minValue / 100),
    maxValue: String(event.maxValue / 100),
    exchangeAt: localDate(event.exchangeAt),
    deadline: localDate(event.deadline),
    location: event.location,
    teamCount: event.teamCount,
    winnerCount: event.winnerCount,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const update = (key: keyof typeof value, v: unknown) => setValue((p) => ({ ...p, [key]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        ...value,
        minValue: Math.round(Number(value.minValue) * 100),
        maxValue: Math.round(Number(value.maxValue) * 100),
        exchangeAt: new Date(value.exchangeAt).toISOString(),
        deadline: new Date(value.deadline).toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy || event.status === 'ENDED'}>
        <div className="card-heading">
          <div>
            <h2>Os combinados do encontro.</h2>
            <p className="muted">Mantenha as informações atualizadas para a turma.</p>
          </div>
        </div>
        <label className="field">
          Mensagem para a turma
          <textarea
            maxLength={2000}
            value={value.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
          />
        </label>
        {event.type === 'SECRET' && (
          <div className="field-row">
            <label className="field">
              Valor mínimo (R$)
              <input
                type="number"
                required
                min="0"
                max="1000000"
                step="0.01"
                value={value.minValue}
                onChange={(e) => update('minValue', e.target.value)}
              />
            </label>
            <label className="field">
              Valor máximo (R$)
              <input
                type="number"
                required
                min="0"
                max="1000000"
                step="0.01"
                value={value.maxValue}
                onChange={(e) => update('maxValue', e.target.value)}
              />
            </label>
          </div>
        )}
        <fieldset className="field date-time-field">
          <legend>Inscrições até</legend>
          <DateTimeInput
            id="settings-deadline"
            label="Inscrições até"
            required
            value={value.deadline}
            onChange={(v) => update('deadline', v)}
          />
          <small>Reabrir exige um prazo futuro e um novo sorteio se já houver resultado.</small>
        </fieldset>
        <fieldset className="field date-time-field">
          <legend>Data e hora do encontro</legend>
          <DateTimeInput
            id="settings-exchange"
            label="Data e hora do encontro"
            required
            value={value.exchangeAt}
            onChange={(v) => update('exchangeAt', v)}
          />
        </fieldset>
        <label className="field">
          Local
          <input
            maxLength={250}
            value={value.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </label>
        {event.type === 'TEAMS' && (
          <label className="field">
            Número de times
            <input
              type="number"
              min="2"
              max="10"
              value={value.teamCount}
              disabled={!!event.startedAt}
              onChange={(e) => update('teamCount', Number(e.target.value))}
            />
          </label>
        )}
        {event.type === 'RAFFLE' && (
          <label className="field">
            Número de ganhadores
            <input
              type="number"
              min="1"
              max="100"
              value={value.winnerCount}
              disabled={!!event.startedAt}
              onChange={(e) => update('winnerCount', Number(e.target.value))}
            />
          </label>
        )}
        {error && <Notice error>{error}</Notice>}
        <div className="form-actions">
          <Button type="submit" className="button" disabled={busy || event.status === 'ENDED'}>
            {busy ? 'Salvando…' : 'Salvar combinados'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
