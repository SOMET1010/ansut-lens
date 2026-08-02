-- =============================================================================
-- Planification de la collecte institutionnelle (voix de l'ANSUT)
--
-- Firecrawl est configuré et les comptes officiels sont enregistrés, mais la
-- collecte n'avait jamais tourné (aucun CRON). On planifie
-- `collecte-institutionnelle` toutes les 3 heures pour que les publications de
-- l'ANSUT (site + réseaux) se collectent automatiquement, sans clic.
--
-- Mêmes extensions/patron que la titrologie (pg_cron + pg_net). Idempotent :
-- on retire d'abord une éventuelle tâche du même nom.
-- =============================================================================

SELECT cron.unschedule('collecte-institutionnelle-3h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collecte-institutionnelle-3h');

SELECT cron.schedule(
  'collecte-institutionnelle-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url:='https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-institutionnelle',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa2Z3eGlzcmFubWV0YnRneHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjkxMDQsImV4cCI6MjA4MjQ0NTEwNH0.5nP9S0X_oIhYYrHRf_R_eQcUXTACMSGamSCMu25fo1M"}'::jsonb,
    body:='{"trigger":"cron","mode":"all"}'::jsonb
  ) as request_id;
  $$
);
