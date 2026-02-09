

# Augmenter la frequence de collecte sociale API

## Situation actuelle

Le cron job `collecte-social-api-hourly` est configure pour s'executer **toutes les heures** (pas une fois par jour). Cependant, pour capter les informations en temps reel sur les reseaux sociaux, une frequence plus elevee est souhaitable.

## Contraintes a prendre en compte

- **Quotas API Twitter** : Le plan Basic offre 10 000 tweets/mois. A raison de 20 tweets par requete :
  - Toutes les heures = ~14 400 requetes/mois (depasse le quota)
  - Toutes les 15 min = ~57 600 requetes/mois (largement hors quota)
  - Toutes les 30 min = ~28 800 requetes/mois (hors quota aussi)
- **Le systeme de quota** est deja integre dans la fonction : si le quota est atteint, la collecte s'arrete automatiquement

## Proposition

Passer la frequence de **toutes les heures** a **toutes les 15 minutes**, tout en gardant le systeme de quota existant comme garde-fou. Le code verifie deja le quota avant chaque appel API et s'arrete quand la limite est atteinte.

## Implementation technique

1. Supprimer l'ancien cron job
2. Creer un nouveau cron job avec la frequence `*/15 * * * *` (toutes les 15 minutes)

### SQL a executer

```sql
-- Supprimer l'ancien job
SELECT cron.unschedule('collecte-social-api-hourly');

-- Creer le nouveau job toutes les 15 minutes
SELECT cron.schedule(
  'collecte-social-api-frequent',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-social-api',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa2Z3eGlzcmFubWV0YnRneHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjkxMDQsImV4cCI6MjA4MjQ0NTEwNH0.5nP9S0X_oIhYYrHRf_R_eQcUXTACMSGamSCMu25fo1M"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

## Fichiers concernes

Aucune modification de code. Seule une migration SQL pour remplacer le cron job.

## Securite quota

Le code existant dans `collecte-social-api` verifie deja les quotas :
- Si `quota_used >= quota_limit`, la plateforme est ignoree
- Cela protege contre la surconsommation meme avec une frequence elevee

