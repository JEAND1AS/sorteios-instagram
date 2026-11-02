'use client';
import { useState, type FormEvent } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from './controls';
import { GIFT_TYPES, participantSchema } from '@/lib/validation';
import type { Person } from '@/lib/client';
import { Notice } from './ui';
export type ParticipantInput = {
  name: string;
  email: string;
  phone: string;
  gifts: string[];
  notes: string;
  wishes: string;
};
export function ParticipantForm({
  initial,
  onSubmit,
  label = 'Confirmar minha participação',
  disabled = false,
}: {
  initial?: Partial<Person>;
  onSubmit: (value: ParticipantInput) => Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<ParticipantInput>({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    gifts: initial?.gifts || [],
    notes: initial?.notes || '',
    wishes: initial?.wishes || '',
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const update = (key: keyof ParticipantInput, v: unknown) => setValue((p) => ({ ...p, [key]: v }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const parsed = participantSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={disabled || busy}>
        <label className="field">
          Nome completo *
          <InputText
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Seu nome completo"
          />
        </label>
        <label className="field">
          Email *
          <InputText
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={value.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="voce@email.com"
          />
        </label>
        <label className="field">
          Celular com DDD *
          <InputText
            type="tel"
            required
            maxLength={30}
            autoComplete="tel"
            value={value.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </label>
        <Notice>
          Guarde esses três dados: você usará nome, email e celular para se identificar ao reabrir o
          convite. Você também receberá um código de 4 números como alternativa de acesso. O
          resultado aparece apenas aqui no site.
        </Notice>
        <fieldset>
          <legend>
            O que você gosta de ganhar? <span className="muted">(opcional)</span>
          </legend>
          <div className="checkbox-grid">
            {GIFT_TYPES.map((gift) => (
              <label className="gift-option" key={gift}>
                <input
                  type="checkbox"
                  checked={value.gifts.includes(gift)}
                  onChange={() =>
                    update(
                      'gifts',
                      value.gifts.includes(gift)
                        ? value.gifts.filter((g) => g !== gift)
                        : [...value.gifts, gift],
                    )
                  }
                />
                {gift}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          Mais um pouquinho sobre você
          <InputTextarea
            maxLength={1000}
            rows={3}
            value={value.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Tamanhos, restrições alimentares e outras pistas…"
          />
        </label>
        <label className="field">
          Sua lista de desejos <span className="muted">(opcional)</span>
          <InputTextarea
            maxLength={2000}
            rows={3}
            value={value.wishes}
            onChange={(e) => update('wishes', e.target.value)}
            placeholder="Ideias de presente e links para ajudar quem tirar você."
          />
        </label>
        {error && <Notice error>{error}</Notice>}
        <Button
          type="submit"
          className="button wide-button"
          loading={busy}
          disabled={disabled || busy}
        >
          {label}
        </Button>
      </fieldset>
    </form>
  );
}
