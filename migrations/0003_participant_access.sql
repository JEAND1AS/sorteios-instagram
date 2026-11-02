-- Novo fluxo: fechar lista e começar são etapas distintas.
ALTER TABLE events ADD COLUMN IF NOT EXISTS started_at timestamptz;
-- Preserva os eventos já sorteados na versão anterior.
UPDATE events SET started_at = drawn_at WHERE started_at IS NULL AND drawn_at IS NOT NULL;
-- A aplicação não usa mais preferência ou canais de entrega. Não apagamos histórico existente.
ALTER TABLE participants ALTER COLUMN preference SET DEFAULT 'NONE';
