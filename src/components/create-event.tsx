'use client';
import { Button, DateTimeInput } from './controls';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Gift,
  Shuffle,
  Users,
  ShieldCheck,
  Check,
  LoaderCircle,
  ArrowUpRight,
} from 'lucide-react';
import { api, TYPE_NAMES, remember, date, money } from '@/lib/client';
import { eventSchema } from '@/lib/validation';
import { PageTop, Notice, CopyButton } from './ui';
type Draft = {
  name: string;
  organizer: string;
  description: string;
  type: 'SECRET' | 'RAFFLE' | 'TEAMS';
  minValue: string;
  maxValue: string;
  exchangeAt: string;
  deadline: string;
  location: string;
  teamCount: number;
  winnerCount: number;
};
const empty: Draft = {
  name: '',
  organizer: '',
  description: '',
  type: 'SECRET',
  minValue: '50',
  maxValue: '100',
  exchangeAt: '',
  deadline: '',
  location: '',
  teamCount: 2,
  winnerCount: 1,
};
export function CreateEvent() {
  const [draft, setDraft] = useState<Draft>(empty),
    [step, setStep] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [created, setCreated] = useState<{
      adminPath: string;
      invitePath: string;
      name: string;
    } | null>(null);
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get('tipo');
    if (type && type in TYPE_NAMES) setDraft((d) => ({ ...d, type: type as Draft['type'] }));
  }, []);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function payload() {
    return {
      ...draft,
      minValue: Math.round(Number(draft.minValue) * 100),
      maxValue: Math.round(Number(draft.maxValue) * 100),
      exchangeAt: new Date(draft.exchangeAt).toISOString(),
      deadline: new Date(draft.deadline).toISOString(),
    };
  }
  async function next(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (step === 0) {
      if (draft.name.trim().length < 3 || draft.organizer.trim().length < 2) {
        setError('Preencha o nome do evento e do organizador.');
        return;
      }
      setStep(1);
      return;
    }
    let data;
    try {
      data = payload();
    } catch {
      setError('Preencha as datas do encontro e do prazo.');
      return;
    }
    const parsed = eventSchema.safeParse(data);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (new Date(data.deadline) <= new Date()) {
      setError('Escolha um prazo de inscrição no futuro.');
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ adminPath: string; invitePath: string; name: string }>(
        '/api/events',
        data,
      );
      remember(result);
      setCreated(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <div className="container narrow page-space">
        <div className="card success-view">
          <div className="success-icon">
            <Check size={32} />
          </div>
          <p className="eyebrow">O PRIMEIRO PASSO ESTÁ DADO</p>
          <h1>Seu encontro já tem lugar.</h1>
          <p className="muted">
            “{created.name}” está pronto para receber a turma. Guarde o link de administração antes
            de compartilhar o convite.
          </p>
          <Notice>
            Seu link de administração é a chave do evento. Quem tiver acesso a ele poderá organizar
            e excluir o sorteio.
          </Notice>
          <label className="field">
            Seu link privado
            <div className="secret-link">
              <code>
                {typeof window !== 'undefined' ? window.location.origin : ''}
                {created.adminPath}
              </code>
              <CopyButton value={created.adminPath} label="Guardar link" />
            </div>
          </label>
          <label className="field">
            O convite para compartilhar
            <div className="secret-link">
              <code>
                {typeof window !== 'undefined' ? window.location.origin : ''}
                {created.invitePath}
              </code>
              <CopyButton value={created.invitePath} />
            </div>
          </label>
          <Link href={created.adminPath} className="button button-large">
            Abrir meu painel <ArrowUpRight size={17} />
          </Link>
          <p className="muted small-text" style={{ marginTop: 18 }}>
            O acesso também fica salvo neste navegador, em Meus eventos.
          </p>
        </div>
      </div>
    );
  return (
    <div className="container">
      <PageTop
        eyebrow="VAMOS REUNIR A TURMA"
        title="Toda boa surpresa começa aqui."
        description="Conte um pouco sobre o encontro. Em poucos passos, o convite está pronto."
      />
      <div className="form-layout">
        <div className="card">
          <div className="wizard-steps">
            {['O encontro', 'Os combinados', 'Tudo pronto'].map((label, i) => (
              <div style={{ display: 'contents' }} key={label}>
                {i > 0 && <span className="wizard-line" />}
                <div
                  className={`wizard-step ${i <= step ? 'active' : ''}`}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span>{i < step ? <Check size={12} /> : i + 1}</span>
                  {label}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={next}>
            <fieldset disabled={busy}>
              {step === 0 && (
                <>
                  <h2>Que encontro vamos criar?</h2>
                  <p className="muted small-text">
                    Escolha o tipo de sorteio e dê a ele a sua cara.
                  </p>
                  <div className="type-options">
                    {(
                      [
                        ['SECRET', Gift],
                        ['RAFFLE', Shuffle],
                        ['TEAMS', Users],
                      ] as const
                    ).map(([type, Icon]) => (
                      <Button
                        className={`type-option ${draft.type === type ? 'selected' : ''}`}
                        aria-pressed={draft.type === type}
                        type="button"
                        key={type}
                        onClick={() => change('type', type)}
                      >
                        <Icon size={24} strokeWidth={1.5} />
                        {TYPE_NAMES[type]}
                      </Button>
                    ))}
                  </div>
                  <label className="field">
                    Nome do evento *
                    <input
                      autoFocus
                      required
                      minLength={3}
                      maxLength={100}
                      placeholder="Ex.: Amigo oculto da nossa turma"
                      value={draft.name}
                      onChange={(e) => change('name', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Quem está organizando? *
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      placeholder="Seu nome ou nome da turma"
                      value={draft.organizer}
                      onChange={(e) => change('organizer', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Uma mensagem para a turma
                    <textarea
                      maxLength={2000}
                      placeholder="Conte como vai ser, deixe um recado ou combine as regras…"
                      value={draft.description}
                      onChange={(e) => change('description', e.target.value)}
                      rows={4}
                    />
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  <h2>Vamos combinar os detalhes.</h2>
                  <p className="muted small-text">
                    As datas usam o fuso do seu dispositivo. Na página do evento, exibimos o horário
                    de Brasília.
                  </p>
                  {draft.type === 'SECRET' && (
                    <div className="field-row">
                      <label className="field">
                        Valor mínimo (R$)
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          max="1000000"
                          value={draft.minValue}
                          onChange={(e) => change('minValue', e.target.value)}
                        />
                      </label>
                      <label className="field">
                        Valor máximo (R$)
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          max="1000000"
                          value={draft.maxValue}
                          onChange={(e) => change('maxValue', e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                  {draft.type === 'TEAMS' && (
                    <label className="field">
                      Quantos times?
                      <input
                        type="number"
                        min="2"
                        max="10"
                        required
                        value={draft.teamCount}
                        onChange={(e) => change('teamCount', Number(e.target.value))}
                      />
                      <small>Os times terão tamanhos iguais ou com uma pessoa de diferença.</small>
                    </label>
                  )}
                  {draft.type === 'RAFFLE' && (
                    <label className="field">
                      Quantas pessoas ganham?
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={draft.winnerCount}
                        onChange={(e) => change('winnerCount', Number(e.target.value))}
                      />
                    </label>
                  )}
                  <label className="field">
                    Inscrições até *
                    <DateTimeInput
                      id="create-deadline"
                      required
                      value={draft.deadline}
                      onChange={(value) => change('deadline', value)}
                    />
                    <small>Depois desse horário, a lista fecha automaticamente.</small>
                  </label>
                  <label className="field">
                    Data e hora do encontro *
                    <DateTimeInput
                      id="create-exchange"
                      required
                      value={draft.exchangeAt}
                      onChange={(value) => change('exchangeAt', value)}
                    />
                  </label>
                  <label className="field">
                    Onde vai ser? <span className="muted">(opcional)</span>
                    <input
                      maxLength={250}
                      placeholder="Um endereço, um lugar especial ou online"
                      value={draft.location}
                      onChange={(e) => change('location', e.target.value)}
                    />
                  </label>
                </>
              )}
              {step === 2 && (
                <>
                  <h2>Pronto para chamar a turma?</h2>
                  <p className="muted small-text">
                    Confira os combinados. Você poderá editar os detalhes no painel.
                  </p>
                  <dl className="review-list">
                    {[
                      ['Evento', draft.name],
                      ['Organização', draft.organizer],
                      ['Tipo', TYPE_NAMES[draft.type]],
                      [
                        'Presente',
                        draft.type === 'SECRET'
                          ? `${money(Number(draft.minValue) * 100)} a ${money(Number(draft.maxValue) * 100)}`
                          : 'Não se aplica',
                      ],
                      ['Inscrições até', date(new Date(draft.deadline).toISOString())],
                      ['Encontro', date(new Date(draft.exchangeAt).toISOString())],
                      ['Local', draft.location || 'A combinar'],
                      ...(draft.type === 'TEAMS' ? [['Times', String(draft.teamCount)]] : []),
                      ...(draft.type === 'RAFFLE'
                        ? [['Ganhadores', String(draft.winnerCount)]]
                        : []),
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="privacy-note">
                    <ShieldCheck />
                    <span>
                      Ao criar, você recebe um link privado de administração. Guarde-o com cuidado:
                      não há senha nem recuperação de acesso.
                    </span>
                  </div>
                </>
              )}
              {error && <Notice error>{error}</Notice>}
              <div className="form-actions">
                {step > 0 ? (
                  <Button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      setStep((s) => s - 1);
                      setError('');
                    }}
                  >
                    <ArrowLeft size={15} />
                    Voltar
                  </Button>
                ) : (
                  <Link href="/" className="text-link">
                    Cancelar
                  </Link>
                )}
                <Button type="submit" className="button" disabled={busy}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : null}
                  {step === 2 ? 'Criar meu sorteio' : 'Continuar'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </fieldset>
          </form>
        </div>
        <aside>
          <div className="preview-card">
            <div className="preview-illustration">
              <span className="spark s1">✳</span>
              <Gift />
              <span className="spark s2">✧</span>
            </div>
            <div className="preview-body">
              <p className="eyebrow">UM PEDACINHO DO SEU CONVITE</p>
              <h2>{draft.name || 'Seu próximo bom encontro'}</h2>
              <p>Organizado por {draft.organizer || 'você, com carinho'}</p>
              <span className="badge">
                <i />
                {TYPE_NAMES[draft.type]}
              </span>
              <p style={{ marginTop: 20, whiteSpace: 'pre-line' }}>
                {draft.description ||
                  'Um convite para compartilhar surpresas e criar novas histórias.'}
              </p>
              <p className="small-text">
                {draft.maxValue && draft.type === 'SECRET'
                  ? `Presentes entre ${money(Number(draft.minValue) * 100)} e ${money(Number(draft.maxValue) * 100)}`
                  : 'A turma informa seus dados pelo convite.'}
              </p>
            </div>
          </div>
          <div className="privacy-note">
            <ShieldCheck />
            <span>
              Os resultados são individuais. Os pares não aparecem no painel de organização.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
