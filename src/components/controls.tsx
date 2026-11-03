'use client';
import { Button as PrimeButton, type ButtonProps } from 'primereact/button';
import { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { localDate } from '@/lib/client';

export function Button(props: ButtonProps) {
  return <PrimeButton type="button" {...props} />;
}
function dateParts(value: string) {
  const [date = '', time = ''] = value.split('T');
  const [hour = '', minute = ''] = time.split(':');
  return { date, hour, minute: Number(minute) % 5 === 0 ? minute : '' };
}

export function DateTimeInput({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [parts, setParts] = useState(() => dateParts(value));
  const today = localDate(new Date().toISOString()).slice(0, 10);
  useEffect(() => setParts(dateParts(value)), [value]);

  function change(key: keyof typeof parts, nextValue: string) {
    const next = { ...parts, [key]: nextValue };
    setParts(next);
    onChange(
      next.date && next.hour && next.minute ? `${next.date}T${next.hour}:${next.minute}` : '',
    );
  }

  return (
    <div className="date-time-input" role="group" aria-label={label}>
      <label className="date-time-day" htmlFor={id}>
        <span>
          <CalendarDays size={15} /> Data
        </span>
        <input
          id={id}
          type="date"
          aria-label={`${label}: data`}
          value={parts.date}
          min={today}
          required={required}
          disabled={disabled}
          onFocus={(event) => {
            // Atualiza o limite caso a página permaneça aberta durante a virada do dia.
            event.currentTarget.min = localDate(new Date().toISOString()).slice(0, 10);
          }}
          onChange={(event) => {
            const date = event.target.value;
            const minimum = localDate(new Date().toISOString()).slice(0, 10);
            if (date && date < minimum) return;
            change('date', date);
          }}
        />
      </label>
      <div className="date-time-clock">
        <span className="date-time-caption">
          <Clock3 size={15} /> Horário
        </span>
        <div className="date-time-selects">
          <select
            aria-label={`${label}: hora`}
            value={parts.hour}
            required={required}
            disabled={disabled}
            onChange={(event) => change('hour', event.target.value)}
          >
            <option value="" disabled>
              Hora
            </option>
            {Array.from({ length: 24 }, (_, hour) => {
              const option = String(hour).padStart(2, '0');
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            })}
          </select>
          <span aria-hidden="true">:</span>
          <select
            aria-label={`${label}: minutos`}
            value={parts.minute}
            required={required}
            disabled={disabled}
            onChange={(event) => change('minute', event.target.value)}
          >
            <option value="" disabled>
              Min
            </option>
            {Array.from({ length: 12 }, (_, index) => {
              const option = String(index * 5).padStart(2, '0');
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
