'use client';
import { Button } from './controls';
import { useState } from 'react';
import { Gift, LockKeyhole, ShieldCheck, Eye, RefreshCw, Shuffle } from 'lucide-react';
import { api, type PersonalData, type Result } from '@/lib/client';
import { Badge, CopyButton, EmptyError, EventSummary, Loading, Notice, useResource } from './ui';
import { ParticipantForm } from './participant-form';
export function Personal({ token }: { token: string }) {
  const url = `/api/participant/${token}`,
    { data, error, refresh } = useResource<PersonalData>(url),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [actionError, setActionError] = useState('');
  if (error) return <EmptyError message={error} />;
  if (!data) return <Loading />;
  const { event, participant } = data;
  async function reveal() {
    setBusy(true);
    setActionError('');
    try {
      const response = await api<{ result: Result }>(url, {
        action: 'draw',
      });
      setResult(response.result);
      await refresh();
    } catch (e) {
      setResult(null);
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container">
      <div className="invite-heading">
        <span>
          <Badge status={event.status} />
        </span>
        <p className="eyebrow">SEU CANTINHO NO ENCONTRO</p>
        <h1>Oi, {participant.name.split(' ')[0]}.</h1>
        <p>
          Você está em <strong>{event.name}</strong>, organizado por {event.organizer}.
        </p>
      </div>
      <div className="form-layout">
        <div>
          {message && <Notice>{message}</Notice>}
          {actionError && <Notice error>{actionError}</Notice>}
          {(event.status === 'DRAWN' || event.status === 'READY') && (
            <div className="result-card">
              <Gift className="result-icon" size={43} strokeWidth={1.3} />
              {!result ? (
                <>
                  <p className="eyebrow">
                    {event.type === 'SECRET'
                      ? 'SUA VEZ DE TIRAR UM NOME'
                      : 'A SURPRESA JÁ ESTÁ PRONTA'}
                  </p>
                  <h2>
                    {event.type === 'SECRET'
                      ? 'Quem será seu amigo oculto?'
                      : 'Um segredo esperando por você.'}
                  </h2>
                  <p>
                    {event.type === 'SECRET'
                      ? 'O organizador liberou o sorteio. Toque para ver seu amigo na hora. Seu resultado fica guardado para consultar depois.'
                      : 'Encontre um cantinho tranquilo e descubra seu resultado.'}
                  </p>
                  <Button className="button" onClick={() => void reveal()} disabled={busy}>
                    {event.type === 'SECRET' ? <Shuffle size={17} /> : <Eye size={17} />}
                    {busy
                      ? 'Abrindo…'
                      : event.type === 'SECRET'
                        ? participant.viewedAt
                          ? 'Ver meu amigo novamente'
                          : 'Sortear meu amigo'
                        : participant.viewedAt
                          ? 'Ver meu resultado novamente'
                          : 'Sortear meu resultado'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="eyebrow">SÓ ENTRE NÓS</p>
                  {result.kind === 'SECRET' ? (
                    <>
                      <p>Seu amigo oculto é…</p>
                      <h2>
                        {result.name} <span aria-hidden="true">✳</span>
                      </h2>
                      <div className="result-detail">
                        <h3>Ideias para acertar no presente</h3>
                        <div className="gift-tags">
                          {result.gifts.length ? (
                            result.gifts.map((g) => <span key={g}>{g}</span>)
                          ) : (
                            <span>Aberto a boas surpresas</span>
                          )}
                        </div>
                        {result.notes && (
                          <>
                            <h3>Detalhes que ajudam</h3>
                            <p>{result.notes}</p>
                          </>
                        )}
                        {result.wishes && (
                          <>
                            <h3>Lista de desejos</h3>
                            <p>{result.wishes}</p>
                          </>
                        )}
                      </div>
                    </>
                  ) : result.kind === 'RAFFLE' ? (
                    <>
                      <h2>
                        {result.winner ? 'A sorte escolheu você!' : 'Dessa vez, não foi por aqui.'}
                      </h2>
                      <p>
                        {result.winner
                          ? `Você ficou na posição ${result.position} entre os ganhadores. Combine a entrega com o organizador.`
                          : 'Obrigado por participar. Que venham os próximos encontros!'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2>Você está no time {result.team}.</h2>
                      <ul className="result-team">
                        {result.members.map((name, i) => (
                          <li key={i}>{name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <Button className="text-link" onClick={() => setResult(null)}>
                    <LockKeyhole size={13} /> Esconder resultado
                  </Button>
                  <p className="small-text" style={{ marginTop: 15, marginBottom: 0 }}>
                    Um novo sorteio pode mudar o resultado.{' '}
                    <Button className="text-link" onClick={() => void reveal()} disabled={busy}>
                      <RefreshCw size={12} />
                      Atualizar
                    </Button>
                  </p>
                </>
              )}
            </div>
          )}
          {event.status === 'ENDED' && (
            <Notice>
              Este evento foi encerrado pelo organizador. Os resultados não estão mais disponíveis.
            </Notice>
          )}
          {(event.status === 'OPEN' || event.status === 'CLOSED') && (
            <Notice>
              Aguarde o organizador fechar as inscrições e clicar em{' '}
              <strong>Começar sorteio</strong>.{' '}
              <Button className="text-link" onClick={() => void refresh()}>
                Verificar se já começou
              </Button>
            </Notice>
          )}
          <div className="card">
            <div className="card-heading">
              <div>
                <h2>Suas pistas para o presente.</h2>
                <p className="muted">
                  {event.status === 'OPEN'
                    ? 'Você pode atualizar seus dados enquanto as inscrições estiverem abertas.'
                    : 'Seus dados estão protegidos contra alterações após o fechamento.'}
                </p>
              </div>
            </div>
            <ParticipantForm
              key={participant.id}
              initial={participant}
              disabled={event.status !== 'OPEN'}
              label="Salvar minhas preferências"
              onSubmit={async (input) => {
                await api(url, { action: 'update', data: input });
                setMessage('Suas preferências foram salvas.');
                await refresh();
              }}
            />
          </div>
        </div>
        <aside>
          <div className="preview-card">
            <div className="preview-body">
              <p className="eyebrow">GUARDE O ENCONTRO NA AGENDA</p>
              <h2>{event.name}</h2>
              <EventSummary event={event} />
            </div>
          </div>
          <div className="card">
            {data.accessCode && (
              <div className="access-code-box">
                <span>Seu código de acesso</span>
                <strong>{data.accessCode}</strong>
                <p className="small-text muted">
                  Use estes 4 números no convite se não lembrar seus dados.
                </p>
                <CopyButton value={data.accessCode} label="Copiar código" />
              </div>
            )}
            <div className="aside-card-title">
              <ShieldCheck />
              <h3>Seu link é pessoal.</h3>
            </div>
            <p className="muted small-text">
              Quem tiver este link, souber seu código ou conhecer seus três dados de identificação
              pode acessar sua participação. Guarde o acesso só para você.
            </p>
            <CopyButton value={`/participante/${token}`} label="Copiar meu acesso" />
          </div>
          <div className="privacy-note">
            <LockKeyhole />
            <span>
              Você pode reabrir o convite e se identificar com os dados do cadastro. O nome sorteado
              aparece somente nesta página.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
