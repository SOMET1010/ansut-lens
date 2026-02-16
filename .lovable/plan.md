

# Cron job quotidien pour le calcul SPDI batch

## Contexte
La fonction `calculer-spdi` supporte deja le mode batch et l'enregistrement dans `collectes_log`. Le `config.toml` a deja `verify_jwt = false`. Il ne reste qu'a creer le job `pg_cron`.

## Action unique

Executer le SQL suivant (via l'outil d'insertion, pas de migration) pour planifier le job :

```sql
SELECT cron.schedule(
  'calcul-spdi-quotidien',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/calculer-spdi',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa2Z3eGlzcmFubWV0YnRneHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjkxMDQsImV4cCI6MjA4MjQ0NTEwNH0.5nP9S0X_oIhYYrHRf_R_eQcUXTACMSGamSCMu25fo1M"}'::jsonb,
    body := '{"batch": true}'::jsonb
  ) AS request_id;
  $$
);
```

## Resultat
- Job `calcul-spdi-quotidien` execute chaque jour a 5h UTC
- Appelle `calculer-spdi` avec `{"batch": true}`
- La fonction recalcule le SPDI de tous les acteurs avec `suivi_spdi_actif = true`
- Les resultats sont logges dans `collectes_log`, declenchant les notifications temps reel pour les admins
- Le job apparait dans la page Admin > Taches planifiees (CRON)
- Aucun fichier a modifier, uniquement une insertion SQL
