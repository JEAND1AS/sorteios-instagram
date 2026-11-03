'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Eye,
  Clock,
  Plus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  Link2,
  Play,
  RefreshCw,
  UserRoundX,
} from 'lucide-react';
import { api, TYPE_NAMES, type AdminData, type Person } from '@/lib/client';
import {
  Badge,
  CopyButton,
  EmptyError,
  EventSummary,
  Loading,
  Modal,
  Notice,
  PageTop,
  useResource,
} from './ui';
import { Button } from './controls';
import { confirmAction } from '@/lib/confirm';
import { ParticipantForm } from './participant-form';
import { EventSettings } from './event-settings';
type Confirmation = { action: string; title: string; text: string; phrase: string; id?: string };
export function Admin({ token }: { token: string }) {
  const url = '/api/admin/' + token,
    { data, error, refresh } = useResource<AdminData>(url);
  const [tab, setTab] = useState('participants'),
    [search, setSearch] = useState(''),
    [notice, setNotice] = useState(''),
    [actionError, setActionError] = useState(''),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ person?: Person } | null>(null),
    [rule, setRule] = useState({ a: '', b: '' });
  if (error) return <EmptyError message={error} />;
  if (!data) return <Loading />;
  const { event, participants, exclusions } = data,
    ended = event.status === 'ENDED',
    started = !!event.startedAt,
    locked = started || ended;
  const visible = participants.filter((p) =>
    (p.name + ' ' + (p.email || '') + ' ' + (p.phone || ''))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const viewed = participants.filter((p) => p.viewedAt).length;
  async function run(input: Record<string, unknown>) {
    setBusy(true);
    setNotice('');
    setActionError('');
    try {
      const response = await api<{ message?: string; deleted?: boolean }>(url, input);
      if (response.deleted) {
        try {
          const saved = JSON.parse(localStorage.getItem('entre-nos-events') || '[]');
          localStorage.setItem(
            'entre-nos-events',
            JSON.stringify(
              saved.filter((e: { adminPath: string }) => e.adminPath !== '/admin/' + token),
            ),
          );
        } catch {}
        window.location.assign('/meus-eventos');
        return;
      }
      await refresh();
      setNotice(response.message || 'Alteração salva.');
    } finally {
      setBusy(false);
    }
  }
  async function handle(input: Record<string, unknown>) {
    try {
      await run(input);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  const prompt = (value: Confirmation) => {
    setActionError('');
    void confirmAction({
      title: value.title,
      text: value.text,
      confirmButtonText:
        {
          remove: 'Remover participante',
          end: 'Encerrar evento',
          delete: 'Excluir evento',
          start: 'Começar sorteio',
          redraw: 'Reiniciar sorteio',
          reopen: 'Reabrir inscrições',
        }[value.action] || 'Confirmar',
      destructive: value.action !== 'start',
      // Mantém o contrato da API; a pessoa confirma apenas pelo botão.
      onConfirm: () => run({ action: value.action, id: value.id, confirmation: value.phrase }),
    });
  };
  const personName = (id: string) =>
    participants.find((p) => p.id === id)?.name || 'Pessoa removida';
  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <PageTop
        eyebrow="SEU PAINEL DE ORGANIZAÇÃO"
        title={event.name}
        description={TYPE_NAMES[event.type] + ' · Organizado por ' + event.organizer}
      >
        <Badge status={event.status} />
      </PageTop>
      {notice && <Notice>{notice}</Notice>}
      {actionError && <Notice error>{actionError}</Notice>}
      <div className="dashboard-summary">
        {[
          [Users, participants.length, 'Pessoas na turma'],
          [Eye, viewed, 'Já viram o resultado'],
          [Clock, participants.length - viewed, 'Ainda não sortearam'],
          [Play, started ? 'Liberado' : 'Aguardando', 'Sorteio da turma'],
        ].map(([Icon, value, label]) => {
          const I = Icon as typeof Users;
          return (
            <div className="stat-card" key={String(label)}>
              <span>
                <I size={20} />
              </span>
              <div>
                <strong style={typeof value === 'string' ? { fontSize: 19 } : undefined}>
                  {String(value)}
                </strong>
                <small>{String(label)}</small>
              </div>
            </div>
          );
        })}
      </div>
      <div className="dashboard-layout">
        <div>
          <div className="card">
            <div className="tabs" role="tablist" aria-label="Organizar evento">
              {[
                ['participants', 'Participantes'],
                ['restrictions', 'Restrições'],
                ['settings', 'Combinados'],
              ].map(([key, label]) => (
                <Button
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls={'panel-' + key}
                  id={'tab-' + key}
                  key={key}
                  className={'tab ' + (tab === key ? 'active' : '')}
                  onClick={() => setTab(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}>
              {tab === 'participants' && (
                <>
                  <div className="toolbar">
                    <label className="search-field">
                      <Search size={14} />
                      <span className="sr-only">Buscar participante</span>
                      <input
                        value={search}
                        placeholder="Buscar na turma…"
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <Button
                      className="button button-small"
                      disabled={locked || busy}
                      onClick={() => setForm({})}
                    >
                      <Plus size={14} />
                      Adicionar pessoa
                    </Button>
                  </div>
                  {visible.length ? (
                    <div className="table-wrap">
                      <table className="people-table">
                        <thead>
                          <tr>
                            <th>Participante</th>
                            <th>Resultado</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((person, i) => (
                            <tr key={person.id}>
                              <td>
                                <div className="person-name">
                                  <span className={'avatar ' + (i % 2 ? 'alt' : '')}>
                                    {person.name
                                      .split(' ')
                                      .slice(0, 2)
                                      .map((n) => n[0])
                                      .join('')}
                                  </span>
                                  <div>
                                    <strong>{person.name}</strong>
                                    <small>{person.email}</small>
                                    <small>
                                      {person.phone ? '+' : null}
                                      {person.phone}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={'delivery-tag ' + (person.viewedAt ? 'viewed' : '')}
                                >
                                  {person.viewedAt ? <Eye size={12} /> : <Clock size={12} />}{' '}
                                  {person.viewedAt
                                    ? 'Visualizou'
                                    : started
                                      ? 'Não sorteou'
                                      : 'Aguardando início'}
                                </span>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <Button
                                    className="icon-button"
                                    title="Editar participante"
                                    aria-label={'Editar ' + person.name}
                                    disabled={locked || busy}
                                    onClick={() => setForm({ person })}
                                  >
                                    <Pencil />
                                  </Button>
                                  <Button
                                    className="icon-button"
                                    title="Remover participante"
                                    aria-label={'Remover ' + person.name}
                                    disabled={locked || busy}
                                    onClick={() =>
                                      prompt({
                                        action: 'remove',
                                        id: person.id,
                                        title: 'Remover da turma?',
                                        text: person.name + ' deixará de participar.',
                                        phrase: 'REMOVER',
                                      })
                                    }
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Users size={35} />
                      <h3>
                        {search ? 'Nenhum nome encontrado.' : 'A turma começa com um convite.'}
                      </h3>
                      <p>Compartilhe o convite para cada pessoa informar nome, email e celular.</p>
                      <CopyButton value={'/convite/' + event.slug} label="Copiar convite" />
                    </div>
                  )}
                  <div className="table-foot">
                    <span>{participants.length} participantes · limite de 200</span>
                    <Button className="text-link" onClick={() => void refresh()} disabled={busy}>
                      <RefreshCw size={12} />
                      Atualizar
                    </Button>
                  </div>
                </>
              )}
              {tab === 'restrictions' && (
                <>
                  <div className="card-heading">
                    <div>
                      <h2>Os combinados entre os nomes.</h2>
                      <p className="muted">
                        {event.type === 'TEAMS'
                          ? 'Pares bloqueados ficam em times diferentes.'
                          : 'O bloqueio vale nos dois sentidos.'}
                      </p>
                    </div>
                  </div>
                  {event.type === 'RAFFLE' ? (
                    <Notice>Sorteio simples não usa restrições entre pares.</Notice>
                  ) : (
                    <>
                      {exclusions.map((r) => (
                        <div className="restriction-row" key={r.id}>
                          {personName(r.a)}
                          <UserRoundX size={16} />
                          {personName(r.b)}
                          <Button
                            className="icon-button"
                            aria-label="Remover restrição"
                            disabled={locked || busy}
                            onClick={() =>
                              void handle({
                                action: 'restrictions',
                                rules: exclusions
                                  .filter((x) => x.id !== r.id)
                                  .map(({ a, b }) => ({ a, b })),
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                      {!exclusions.length && (
                        <p className="muted small-text">
                          Nenhum par bloqueado. No amigo oculto, ninguém tira o próprio nome.
                        </p>
                      )}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          try {
                            await run({
                              action: 'restrictions',
                              rules: [...exclusions.map(({ a, b }) => ({ a, b })), rule],
                            });
                            setRule({ a: '', b: '' });
                          } catch (e) {
                            setActionError((e as Error).message);
                          }
                        }}
                      >
                        <fieldset disabled={locked || busy}>
                          <div className="rules-form">
                            <label className="field">
                              Primeira pessoa
                              <select
                                required
                                value={rule.a}
                                onChange={(e) => setRule((r) => ({ ...r, a: e.target.value }))}
                              >
                                <option value="">Selecione</option>
                                {participants.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <UserRoundX size={17} />
                            <label className="field">
                              Segunda pessoa
                              <select
                                required
                                value={rule.b}
                                onChange={(e) => setRule((r) => ({ ...r, b: e.target.value }))}
                              >
                                <option value="">Selecione</option>
                                {participants
                                  .filter((p) => p.id !== rule.a)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          </div>
                          <div className="form-actions">
                            <Button
                              type="submit"
                              className="button"
                              disabled={locked || busy || !rule.a || !rule.b}
                            >
                              Adicionar restrição
                            </Button>
                          </div>
                        </fieldset>
                      </form>
                    </>
                  )}
                </>
              )}
              {tab === 'settings' && (
                <EventSettings
                  key={event.deadline + event.exchangeAt + event.status}
                  event={event}
                  onSave={async (value) => run({ action: 'update', data: value })}
                />
              )}
            </div>
          </div>
          <details className="danger-zone">
            <summary>Encerrar ou excluir este evento</summary>
            <div className="form-actions">
              <Button
                className="button button-outline"
                disabled={ended || busy}
                onClick={() =>
                  prompt({
                    action: 'end',
                    title: 'Encerrar o evento?',
                    text: 'Os resultados deixarão de ficar disponíveis.',
                    phrase: 'ENCERRAR',
                  })
                }
              >
                Encerrar evento
              </Button>
              <Button
                className="button button-danger"
                disabled={busy}
                onClick={() =>
                  prompt({
                    action: 'delete',
                    title: 'Excluir evento?',
                    text: 'Esta ação apaga definitivamente o evento e seus participantes.',
                    phrase: 'EXCLUIR',
                  })
                }
              >
                Excluir evento
              </Button>
            </div>
          </details>
        </div>
        <aside>
          <div className="card invite-card">
            <div className="aside-card-title">
              <Link2 />
              <h3>O mesmo convite para todos.</h3>
            </div>
            <p>
              Use este link para os cadastros e, depois do início, para cada pessoa se identificar e
              sortear.
            </p>
            <div className="copy-preview">/convite/{event.slug}</div>
            <CopyButton
              value={'/convite/' + event.slug}
              label="Copiar convite"
              className="button"
            />
            <Link className="text-link" href={'/convite/' + event.slug} style={{ marginTop: 14 }}>
              Ver página do convite
            </Link>
          </div>
          <div className="card aside-actions">
            <div className="aside-card-title">
              <Play />
              <h3>Hora de começar.</h3>
            </div>
            <p className="muted">
              {ended
                ? 'O evento foi encerrado.'
                : started
                  ? 'Liberado. Cada pessoa reabre o convite, se identifica e toca em sortear.'
                  : event.status === 'OPEN'
                    ? 'Espere a turma se cadastrar e feche as inscrições. Depois, clique em Começar sorteio.'
                    : 'As inscrições estão fechadas. Clique em Começar sorteio para liberar os participantes.'}
            </p>
            {!locked && (
              <>
                <Button
                  className="button button-outline"
                  disabled={busy}
                  onClick={() =>
                    void handle({ action: event.status === 'OPEN' ? 'close' : 'reopen' })
                  }
                >
                  {event.status === 'OPEN' ? 'Fechar inscrições' : 'Reabrir inscrições'}
                </Button>
                <Button
                  className="button"
                  disabled={busy || event.status === 'OPEN' || participants.length < 3}
                  onClick={() =>
                    prompt({
                      action: 'start',
                      title: 'Começar o sorteio?',
                      text: 'A lista será bloqueada. Os participantes poderão se identificar pelo convite e sortear o próprio resultado.',
                      phrase: 'COMEÇAR',
                    })
                  }
                >
                  <Play size={16} />
                  Começar sorteio
                </Button>
                {participants.length < 3 && (
                  <p className="muted small-text">É preciso ter pelo menos 3 participantes.</p>
                )}
              </>
            )}
            {started && !ended && (
              <>
                <Button
                  className="button button-outline"
                  disabled={busy}
                  onClick={() =>
                    prompt({
                      action: 'redraw',
                      title: 'Reiniciar a rodada?',
                      text: 'Os resultados serão apagados. Será necessário clicar novamente em Começar sorteio.',
                      phrase: 'REFAZER SORTEIO',
                    })
                  }
                >
                  Reiniciar sorteio
                </Button>
                <Button
                  className="text-link"
                  disabled={busy}
                  onClick={() =>
                    prompt({
                      action: 'reopen',
                      title: 'Reabrir inscrições?',
                      text: 'Todos os resultados serão invalidados. O prazo precisa estar no futuro.',
                      phrase: 'REABRIR E INVALIDAR',
                    })
                  }
                >
                  Reabrir inscrições
                </Button>
              </>
            )}
          </div>
          <div className="card">
            <h3>Na agenda da turma.</h3>
            <EventSummary event={event} />
          </div>
          <div className="privacy-note">
            <ShieldCheck />
            <span>
              Você acompanha quem já sorteou, sem ver os pares. Os resultados aparecem somente na
              página de cada participante.
            </span>
          </div>
        </aside>
      </div>
      {form && (
        <Modal
          title={form.person ? 'Editar participante' : 'Adicionar à turma'}
          onClose={() => setForm(null)}
        >
          <ParticipantForm
            initial={form.person}
            label={form.person ? 'Salvar participante' : 'Adicionar participante'}
            collectGiftPreferences={event.type === 'SECRET'}
            onSubmit={async (value) => {
              await run({ action: form.person ? 'edit' : 'add', id: form.person?.id, data: value });
              setForm(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
