

# Ajout d'un cron job pour la collecte sociale API

## Objectif

Programmer l'execution automatique de la fonction `collecte-social-api` toutes les heures via pg_cron.

## Implementation

Une seule etape : executer une requete SQL pour creer le cron job dans pg_cron. Les extensions `pg_cron` et `pg_net` sont deja actives (d'autres cron jobs existent deja dans le projet).

### SQL a executer

```sql
SELECT cron.schedule(
  'collecte-social-api-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-social-api',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa2Z3eGlzcmFubWV0YnRneHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjkxMDQsImV4cCI6MjA4MjQ0NTEwNH0.5nP9S0X_oIhYYrHRf_R_eQcUXTACMSGamSCMu25fo1M"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

Ce job :
- S'execute a la minute 0 de chaque heure (toutes les heures)
- Appelle la fonction `collecte-social-api` via HTTP POST
- Utilise la cle anon pour l'authentification
- Sera visible et geeable depuis la page Admin > Cron Jobs

## Fichiers concernes

Aucune modification de code n'est necessaire. Seule une migration SQL sera executee.

