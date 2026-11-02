'use client';
import { Button as PrimeButton, type ButtonProps } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { localDate } from '@/lib/client';

export function Button(props: ButtonProps) {
  return <PrimeButton type="button" {...props} />;
}
export function DateTimeInput({
  id,
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <Calendar
      inputId={id}
      value={value ? new Date(value) : null}
      onChange={(event) =>
        onChange(event.value instanceof Date ? localDate(event.value.toISOString()) : '')
      }
      dateFormat="dd/mm/yy"
      showTime
      hourFormat="24"
      showIcon
      showButtonBar
      required={required}
      disabled={disabled}
      locale="pt-BR"
      className="date-time-input"
      inputClassName="date-time-text"
      placeholder="dd/mm/aaaa hh:mm"
      panelStyle={{ maxWidth: 'calc(100vw - 24px)' }}
    />
  );
}
