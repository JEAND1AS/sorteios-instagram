import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gift,
  Shuffle,
  Users,
  LockKeyhole,
  Heart,
  Sparkles,
} from 'lucide-react';
import { GiftArt } from '@/components/gift-art';
export default function Home() {
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-label">
            <span /> UM CONVITE PARA ESTAR MAIS PERTO
          </div>
          <h1>
            Um pouco de mistério.
            <br />
            Um monte de{' '}
            <em>
              boas
              <br className="desktop-break" /> conexões.
            </em>
          </h1>
          <p>
            Amigo oculto, sorteios e times. A gente cuida da organização para você aproveitar o
            melhor: estar junto.
          </p>
          <div className="hero-actions">
            <Link href="/como-funciona" className="text-link">
              Como funciona <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-checks">
            <span>
              <Check />
              100% gratuito
            </span>
            <span>
              <Check />
              Sem criar conta
            </span>
            <span>
              <Check />
              Resultado individual
            </span>
          </div>
        </div>
        <GiftArt />
      </section>
      <div className="trust-band">
        <div className="container">
          <span>
            <LockKeyhole size={18} /> Cada pessoa abre seu resultado.
          </span>
          <span>
            O painel não exibe os pares.{' '}
            <Link href="/privacidade">
              Entenda a proteção <ArrowUpRight size={13} />
            </Link>
          </span>
        </div>
      </div>
      <section className="container types-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ESCOLHA O SEU JEITO DE REUNIR</p>
            <h2>Tem encontro para todo tipo de sorte.</h2>
          </div>
          <span className="hand-note">qual vai ser o seu? ↴</span>
        </div>
        <div className="type-grid">
          <Link href="/novo?tipo=SECRET" className="type-card type-peach">
            <div className="type-card-top">
              <span className="type-icon">
                <Gift size={27} strokeWidth={1.5} />
              </span>
              <span className="small-label">O QUERIDINHO</span>
            </div>
            <h3>Amigo oculto</h3>
            <p>
              Cada pessoa, um presente e um segredo.
              <br />A surpresa começa por aqui.
            </p>
            <span className="card-bottom">
              Espalhar boas surpresas <ArrowUpRight size={21} />
            </span>
            <span className="card-decoration">✳</span>
          </Link>
          <Link href="/novo?tipo=RAFFLE" className="type-card type-sage">
            <div className="type-card-top">
              <span className="type-icon">
                <Shuffle size={27} strokeWidth={1.5} />
              </span>
              <span className="small-label">DEIXE COM A SORTE</span>
            </div>
            <h3>Sorteio simples</h3>
            <p>
              Um prêmio, vários nomes.
              <br />
              Quem será que a sorte vai escolher?
            </p>
            <span className="card-bottom">
              Sortear um nome <ArrowUpRight size={21} />
            </span>
            <span className="card-decoration">✦</span>
          </Link>
          <Link href="/novo?tipo=TEAMS" className="type-card type-yellow">
            <div className="type-card-top">
              <span className="type-icon">
                <Users size={27} strokeWidth={1.5} />
              </span>
              <span className="small-label">TODO MUNDO NO JOGO</span>
            </div>
            <h3>Divisão de times</h3>
            <p>
              Grupos equilibrados, sem complicação.
              <br />
              Agora é só combinar a brincadeira.
            </p>
            <span className="card-bottom">
              Formar os times <ArrowUpRight size={21} />
            </span>
            <span className="card-decoration">✴</span>
          </Link>
        </div>
      </section>
      <section className="container steps-section">
        <div className="steps-intro">
          <p className="eyebrow">SIMPLES ASSIM</p>
          <h2>
            Você reúne a turma.
            <br />O resto é com a gente.
          </h2>
          <p className="muted">
            Sem planilhas, papéis dobrados ou aquele
            <br />
            “quem ainda não confirmou?”.
          </p>
          <Link href="/novo" className="text-link">
            Vamos começar <ArrowRight size={17} />
          </Link>
        </div>
        <div className="steps-list">
          {[
            ['01', 'Crie do seu jeito', 'Dê um nome ao encontro e combine as regras.'],
            ['02', 'Chame quem faz parte', 'Compartilhe o convite. Cada um preenche seus dados.'],
            [
              '03',
              'Deixe a surpresa acontecer',
              'Feche a lista e clique em começar. Cada um sorteia o seu.',
            ],
          ].map(([n, title, text]) => (
            <div className="step-item" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
