'use client';
import { Button } from './controls';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Gift,
  ArrowUpRight,
  Check,
  Copy,
  LoaderCircle,
  X,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Wallet,
  ArrowLeft,
} from 'lucide-react';
import { api, date, money, STATUS_NAMES, type EventView } from '@/lib/client';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Entre Nós, início">
      <span className="brand-mark">
        <Gift size={23} strokeWidth={1.7} />
      </span>
      entre<span className="brand-serif">nós</span>
      <span className="brand-dot">✳</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Navegação principal">
          <Link href="/como-funciona">Como funciona</Link>
          <Link href="/meus-eventos">Meus eventos</Link>
        </nav>
        <Link className="button button-small" href="/novo" aria-label="Criar um sorteio">
          <span className="header-cta-long">Criar um sorteio</span>
          <span className="header-cta-short">Criar</span> <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer container">
      <Brand />
      <span>Menos organização. Mais boas histórias.</span>
      <Link href="/privacidade">
        Privacidade e segurança <ArrowUpRight size={13} />
      </Link>
    </footer>
  );
}
export function PageTop({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-top">
      <Link className="back-link" href="/">
        <ArrowLeft size={15} /> Início
      </Link>
      <div className="page-top-row">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description && <p className="muted">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <span>Preparando tudo por aqui…</span>
    </div>
  );
}
export function EmptyError({ message }: { message: string }) {
  return (
    <div className="container narrow page-space">
      <h1>Não conseguimos abrir este link</h1>
      <Notice error>{message}</Notice>
      <Link href="/" className="button">
        Voltar ao início
      </Link>
    </div>
  );
}
export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const result = await api<T>(url);
      setData(result);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [url]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, error, refresh, setData };
}
export function CopyButton({
  value,
  label = 'Copiar link',
  className = 'button button-outline',
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <>
      <Button
        type="button"
        className={className}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              value.startsWith('/') ? `${window.location.origin}${value}` : value,
            );
            setCopied(true);
            timer.current = setTimeout(() => setCopied(false), 2500);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado!' : label}
      </Button>
      {error && (
        <input
          aria-label="Selecione e copie o link"
          readOnly
          value={
            value.startsWith('/')
              ? `${typeof window !== 'undefined' ? window.location.origin : ''}${value}`
              : value
          }
          onFocus={(e) => e.target.select()}
        />
      )}
    </>
  );
}
export function Badge({ status }: { status: EventView['status'] }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <i />
      {STATUS_NAMES[status]}
    </span>
  );
}
export function EventSummary({ event }: { event: EventView }) {
  return (
    <div className="event-facts">
      <div>
        <Wallet size={19} />
        <span>
          Presente sugerido
          <strong>
            {event.maxValue ? `${money(event.minValue)} a ${money(event.maxValue)}` : 'Valor livre'}
          </strong>
        </span>
      </div>
      <div>
        <CalendarDays size={19} />
        <span>
          Encontro<strong>{date(event.exchangeAt)}</strong>
        </span>
      </div>
      {event.location && (
        <div>
          <MapPin size={19} />
          <span>
            Onde vamos nos encontrar<strong>{event.location}</strong>
          </span>
        </div>
      )}
      <div>
        <ShieldCheck size={19} />
        <span>
          Inscrições até<strong>{date(event.deadline)}</strong>
        </span>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-modal="true"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <Button className="icon-button" onClick={onClose} aria-label="Fechar janela">
          <X />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
