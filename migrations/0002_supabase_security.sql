-- O navegador acessa os dados pelas API routes do Next.js, autenticadas por token.
-- Não há policies para anon/authenticated nem leitura direta pela Data API do Supabase.
-- Esta migração também funciona em PostgreSQL local e Neon, sem as roles do Supabase.
DO $security$
DECLARE
  table_name text;
  role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'events', 'participants', 'exclusions', 'locks', 'email_attempts', 'rate_limits'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END
$security$;
