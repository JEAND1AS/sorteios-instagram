'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container narrow page-space">
      <h1>Uma pausa na surpresa.</h1>
      <p className="muted">
        Não foi possível abrir esta página agora. Tente novamente em instantes.
      </p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
