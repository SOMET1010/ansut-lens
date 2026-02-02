
# Configuration du CRON pour la collecte web automatique

## Objectif

Automatiser l'exécution de la fonction `collecte-social` toutes les 6 heures pour collecter les insights depuis les sources web (blogs, forums, actualités) sans intervention manuelle.

## Analyse des jobs existants

Actuellement, 5 jobs CRON sont configurés :

| ID | Nom | Schedule | Fonction |
|----|-----|----------|----------|
| 1 | collecte-veille-quotidienne | 0 8 * * * | collecte-veille (8h) |
| 2 | collecte-veille-critique | 0 */6 * * * | collecte-veille (toutes les 6h) |
| 4 | flux-digest-quotidien | 0 8 * * * | send-flux-digest (8h) |
| 5 | flux-digest-hebdo | 0 8 * * 1 | send-flux-digest (lundi 8h) |
| 6 | newsletter-scheduler-daily | 0 6 * * * | scheduler-newsletter (6h) |

Aucun job ne cible actuellement la fonction `collecte-social`.

## Nouveau job a creer

| Paramètre | Valeur |
|-----------|--------|
| Nom | `collecte-social-auto` |
| Schedule | `0 */6 * * *` |
| Fréquence | Toutes les 6 heures (0h, 6h, 12h, 18h UTC) |
| Fonction | `collecte-social` |

## Execution SQL

```sql
SELECT cron.schedule(
  'collecte-social-auto',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/collecte-social',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa2Z3eGlzcmFubWV0YnRneHJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjkxMDQsImV4cCI6MjA4MjQ0NTEwNH0.5nP9S0X_oIhYYrHRf_R_eQcUXTACMSGamSCMu25fo1M'
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

## Pourquoi cette approche

1. **Cohérence** : Utilise le même pattern que les autres jobs CRON existants (net.http_post avec Authorization Bearer)
2. **Fréquence adaptée** : 6 heures permet de capturer les mises à jour des blogs et actualités sans surcharger les sources
3. **Traçabilité** : Le paramètre `triggered_by: cron` permet d'identifier les exécutions automatiques dans les logs

## Verification apres creation

Le job sera visible dans :
- La page `/admin/cron-jobs` pour les administrateurs
- Les notifications temps réel via `useRealtimeCronAlerts` en cas d'erreur

## Resultat attendu

Après création, le système collectera automatiquement les insights web toutes les 6 heures. Les alertes seront générées pour les insights critiques, et les logs seront enregistrés dans `collectes_log`.
