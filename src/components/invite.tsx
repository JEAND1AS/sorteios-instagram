'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { InputText } from 'primereact/inputtext';
import { Check, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  api,
  rememberParticipation,
  savedParticipation,
  type SavedParticipation,
  type EventView,
} from '@/lib/client';
import { Badge, CopyButton, EmptyError, EventSummary, Loading, Notice, useResource } from './ui';
import { ParticipantForm, type ParticipantInput } from './participant-form';
import { Button } from './controls';
export function Invite({ slug }: { slug: string }) {
  const { data, error, refresh } = useResource<{ event: EventView; count: number }>(
    '/api/invite/' + slug,
  );
  const [joined, setJoined] = useState<{ personalPath: string; accessCode: string } | null>(null),
    [saved, setSaved] = useState<SavedParticipation | null>(null),
    [mode, setMode] = useState<'join' | 'identify'>('join');
  const [identity, setIdentity] = useState({ name: '', email: '', phone: '' }),
    [accessMethod, setAccessMethod] = useState<'details' | 'code'>('details'),
    [accessCode, setAccessCode] = useState(''),
    [busy, setBusy] = useState(false),
    [accessError, setAccessError] = useState('');
  useEffect(() => {
    setSaved(savedParticipation(slug));
  }, [slug]);
  useEffect(() => {
    if (data && data.event.status !== 'OPEN') setMode('identify');
  }, [data]);
  if (error) return <EmptyError message={error} />;
  if (!data) return <Loading />;
  const { event, count } = data;
  async function join(input: ParticipantInput) {
    const response = await api<{ personalPath: string; accessCode: string }>(
      '/api/invite/' + slug,
      input,
    );
    const participation = { name: input.name.trim(), personalPath: response.personalPath };
    rememberParticipation(slug, participation);
    setSaved(participation);
    setJoined(response);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function joinAnother() {
    setJoined(null);
    setMode('join');
    void refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function identify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAccessError('');
    try {
      const response = await api<{ personalPath: string; name: string }>('/api/invite/' + slug, {
        action: 'identify',
        ...(accessMethod === 'code'
          ? { method: 'code', accessCode }
          : { method: 'details', ...identity }),
      });
      rememberParticipation(slug, { name: response.name, personalPath: response.personalPath });
      window.location.assign(response.personalPath);
    } catch (e) {
      setAccessError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (joined)
    return (
      <div className="container narrow page-space">
        <div className="card success-view">
          <div className="success-icon">
            <Check size={30} />
          </div>
          <h1>Presença confirmada!</h1>
          <p className="muted">
            Quando o organizador começar o sorteio, reabra o mesmo convite e entre com seu nome,
            email e celular, ou use seu código de 4 números. Guarde seu código e não compartilhe.
          </p>
          <div className="access-code-box">
            <span>Seu código de acesso</span>
            <strong>{joined.accessCode}</strong>
            <CopyButton value={joined.accessCode} label="Copiar código" />
          </div>
          <div className="secret-link">
            <CopyButton value={joined.personalPath} label="Copiar meu acesso" />
          </div>
          <div className="success-actions">
            <Button className="button button-outline" onClick={joinAnother}>
              <ArrowLeft size={16} /> Cadastrar outra pessoa
            </Button>
            <Link href={joined.personalPath} className="button">
              Abrir minha página <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  return (
    <div className="container">
      <div className="invite-heading">
        <span>
          <Badge status={event.status} />
        </span>
        <p className="eyebrow">UM CONVITE PARA A FAMÍLIA</p>
        <h1>{event.name}</h1>
        <p>
          Organizado por <strong>{event.organizer}</strong>
        </p>
        {event.description && <p>{event.description}</p>}
      </div>
      <div className="form-layout">
        <div className="card">
          {event.status === 'ENDED' ? (
            <Notice>Este evento foi encerrado pelo organizador.</Notice>
          ) : (
            <>
              {saved && (
                <Notice>
                  <p>Acesso salvo neste navegador. Confira se é o seu antes de continuar.</p>
                  <Link href={saved.personalPath} className="button button-small">
                    Continuar como {saved.name} <ArrowRight size={14} />
                  </Link>
                </Notice>
              )}
              <div className="tabs" role="tablist" aria-label="Acessar evento">
                {event.status === 'OPEN' && (
                  <Button
                    role="tab"
                    aria-selected={mode === 'join'}
                    className={'tab ' + (mode === 'join' ? 'active' : '')}
                    onClick={() => setMode('join')}
                  >
                    Quero me cadastrar
                  </Button>
                )}
                <Button
                  role="tab"
                  aria-selected={mode === 'identify'}
                  className={'tab ' + (mode === 'identify' ? 'active' : '')}
                  onClick={() => setMode('identify')}
                >
                  Já estou cadastrado
                </Button>
              </div>
              <div className="card-heading">
                <div>
                  <h2>{mode === 'join' ? 'Vem fazer parte.' : 'Quem está entrando?'}</h2>
                  <p className="muted">
                    {mode === 'join'
                      ? 'Preencha nome, email e celular para identificar sua participação.'
                      : 'Entre com os dados de cadastro ou use seu código de 4 números.'}
                  </p>
                  <p className="muted small-text">{count} participante(s) na turma.</p>
                </div>
              </div>
              {mode === 'join' && event.status === 'OPEN' ? (
                <ParticipantForm onSubmit={join} />
              ) : (
                <form onSubmit={identify}>
                  <fieldset disabled={busy}>
                    <div
                      className="access-methods"
                      role="group"
                      aria-label="Forma de identificação"
                    >
                      <Button
                        className={'button ' + (accessMethod === 'details' ? '' : 'button-outline')}
                        aria-pressed={accessMethod === 'details'}
                        onClick={() => setAccessMethod('details')}
                      >
                        Usar meus dados
                      </Button>
                      <Button
                        className={'button ' + (accessMethod === 'code' ? '' : 'button-outline')}
                        aria-pressed={accessMethod === 'code'}
                        onClick={() => setAccessMethod('code')}
                      >
                        Usar meu código
                      </Button>
                    </div>
                    {accessMethod === 'code' ? (
                      <label className="field">
                        Código de acesso *
                        <InputText
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          required
                          minLength={4}
                          maxLength={4}
                          pattern="[0-9]{4}"
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="4 números"
                        />
                      </label>
                    ) : (
                      <>
                        <label className="field">
                          Nome completo *
                          <InputText
                            required
                            autoComplete="name"
                            maxLength={80}
                            value={identity.name}
                            onChange={(e) => setIdentity((p) => ({ ...p, name: e.target.value }))}
                          />
                        </label>
                        <label className="field">
                          Email *
                          <InputText
                            type="email"
                            required
                            autoComplete="email"
                            maxLength={254}
                            value={identity.email}
                            onChange={(e) => setIdentity((p) => ({ ...p, email: e.target.value }))}
                          />
                        </label>
                        <label className="field">
                          Celular com DDD *
                          <InputText
                            type="tel"
                            required
                            autoComplete="tel"
                            maxLength={30}
                            value={identity.phone}
                            onChange={(e) => setIdentity((p) => ({ ...p, phone: e.target.value }))}
                          />
                        </label>
                      </>
                    )}
                    {accessError && <Notice error>{accessError}</Notice>}
                    <Button type="submit" className="button wide-button" loading={busy}>
                      Entrar na minha página
                    </Button>
                  </fieldset>
                </form>
              )}
            </>
          )}
        </div>
        <aside>
          <div className="preview-card">
            <div className="preview-body">
              <p className="eyebrow">OS COMBINADOS</p>
              <h2>Para se programar.</h2>
              <EventSummary event={event} />
            </div>
          </div>
          <div className="privacy-note">
            <ShieldCheck />
            <span>
              O resultado fica no site. Não há envio por email, SMS ou WhatsApp. Para entrar
              novamente, use o mesmo convite e seus dados de cadastro.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
