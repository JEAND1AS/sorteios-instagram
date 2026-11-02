import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container narrow page-space">
      <p className="eyebrow">ESSE CAMINHO NÃO ESTAVA NO SORTEIO</p>
      <h1>Página não encontrada.</h1>
      <p className="muted">
        Confira se o link está completo ou volte para criar uma nova história.
      </p>
      <Link href="/" className="button">
        Voltar ao início
      </Link>
    </div>
  );
}
