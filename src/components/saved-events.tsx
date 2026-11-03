'use client';
import { Button } from './controls';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Gift, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { confirmAction } from '@/lib/confirm';
import { date, type SavedEvent } from '@/lib/client';
import { CopyButton, PageTop } from './ui';
export function SavedEvents() {
  const [events, setEvents] = useState<SavedEvent[]>([]),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('entre-nos-events') || '[]');
      setEvents(
        Array.isArray(stored)
          ? stored.filter(
              (e: SavedEvent) =>
                e &&
                typeof e.name === 'string' &&
                /^\/admin\/[\w-]+$/.test(e.adminPath) &&
                /^\/convite\/[\w-]+$/.test(e.invitePath),
            )
          : [],
      );
    } catch {}
    setReady(true);
  }, []);
  return (
    <div className="container" style={{ paddingBottom: 50, minHeight: '65vh' }}>
      <PageTop
        eyebrow="OS ENCONTROS QUE VOCÊ ORGANIZA"
        title="Meus eventos."
        description="Seus acessos salvos neste navegador. Guarde os links privados em um lugar seguro."
      >
        <Link href="/novo" className="button">
          <Plus size={16} />
          Criar novo sorteio
        </Link>
      </PageTop>
      <div className="privacy-box">
        <ShieldCheck size={21} />
        <span>
          Esta lista fica apenas neste dispositivo. Limpar os dados do navegador apaga os atalhos,
          mas não exclui os eventos. Você ainda pode abrir um evento usando seu link de
          administração.
        </span>
      </div>
      {ready &&
        (!events.length ? (
          <div className="card empty-state">
            <Gift size={44} strokeWidth={1.2} />
            <h3>A próxima boa história é sua.</h3>
            <p>
              Você ainda não criou eventos neste navegador.
              <br />
              Que tal chamar a turma para uma surpresa?
            </p>
            <Link href="/novo" className="button">
              Criar meu primeiro sorteio <ArrowUpRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="saved-grid">
            {events.map((e) => (
              <div className="card saved-card" key={e.adminPath}>
                <Gift color="#93a27e" size={26} />
                <p className="eyebrow">UM ENCONTRO ENTRE NÓS</p>
                <h2>{e.name}</h2>
                <p>Criado em {date(e.createdAt)}</p>
                <Link href={e.adminPath} className="button">
                  Abrir painel <ArrowUpRight size={16} />
                </Link>
                <CopyButton value={e.invitePath} label="Copiar convite" />
                <Button
                  className="text-link"
                  onClick={() =>
                    void confirmAction({
                      title: 'Esquecer o acesso neste navegador?',
                      text: 'O evento continuará existindo. Certifique-se de ter guardado seu link de administração em outro lugar.',
                      confirmButtonText: 'Esquecer atalho',
                      destructive: true,
                      onConfirm: async () => {
                        const updated = events.filter((saved) => saved.adminPath !== e.adminPath);
                        localStorage.setItem('entre-nos-events', JSON.stringify(updated));
                        setEvents(updated);
                      },
                    })
                  }
                >
                  <Trash2 size={12} />
                  Esquecer este atalho
                </Button>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
