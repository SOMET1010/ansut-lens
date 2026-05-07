SELECT cron.schedule(
  'collecte-titrologie-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-titrologie',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa2Z3eGlzcmFubWV0YnRneHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjkxMDQsImV4cCI6MjA4MjQ0NTEwNH0.5nP9S0X_oIhYYrHRf_R_eQcUXTACMSGamSCMu25fo1M"}'::jsonb,
    body:='{"trigger":"cron"}'::jsonb
  ) as request_id;
  $$
);