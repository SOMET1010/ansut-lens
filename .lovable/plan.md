
# Planification du calcul SPDI automatique via cron quotidien avec notifications

## Objectif
Ajouter une tache cron `pg_cron` qui appelle quotidiennement la fonction `calculer-spdi` en mode batch, et enregistrer les resultats dans la table `collectes_log` pour declencher les notifications temps reel existantes (toast pour les admins).

## Ce qui existe deja
- La fonction `calculer-spdi` supporte le mode `batch: true` (calcule pour tous les acteurs avec `suivi_spdi_actif = true`)
- Le systeme de notifications temps reel (`useRealtimeCronAlerts`) ecoute les insertions dans `collectes_log` et affiche des toasts
- La page CRON (`/admin/cron-jobs`) affiche tous les jobs et leur historique
- 7 cron jobs sont deja configures (collecte-veille, flux-digest, newsletter, collecte-social)

## Plan d'implementation

### Etape 1 : Modifier la fonction `calculer-spdi` pour logger les resultats
Ajouter a la fin du mode batch une insertion dans `collectes_log` avec :
- `type`: `"calcul-spdi"`
- `statut`: `"success"` ou `"error"`
- `nb_resultats`: nombre d'acteurs traites
- `duree_ms`: temps d'execution total
- `erreur`: message en cas d'echec

Cela activera automatiquement les notifications temps reel pour les admins connectes.

### Etape 2 : Creer le cron job quotidien
Inserer via SQL (outil insert, pas migration) un job `pg_cron` :
- **Nom** : `calcul-spdi-quotidien`
- **Schedule** : `0 5 * * *` (tous les jours a 5h UTC, avant la collecte de veille a 8h)
- **Action** : `net.http_post` vers `/functions/v1/calculer-spdi` avec `body: {"batch": true}`

### Etape 3 : Mettre a jour `supabase/config.toml`
Ajouter `[functions.calculer-spdi]` avec `verify_jwt = false` pour permettre l'appel depuis pg_cron.

## Details techniques

### Modification de `supabase/functions/calculer-spdi/index.ts`
Ajout dans le bloc `if (batch)`, apres le calcul, d'un insert dans `collectes_log` :

```typescript
const startTime = Date.now();
// ... existing batch logic ...
const durationMs = Date.now() - startTime;
const hasErrors = results.some(r => r.error);

await supabase.from("collectes_log").insert({
  type: "calcul-spdi",
  statut: hasErrors ? "error" : "success",
  nb_resultats: results.length,
  duree_ms: durationMs,
  erreur: hasErrors
    ? results.filter(r => r.error).map(r => `${r.id}: ${r.error}`).join("; ").slice(0, 500)
    : null,
  mots_cles_utilises: ["spdi", "batch"],
});
```

### SQL pour le cron job
```sql
SELECT cron.schedule(
  'calcul-spdi-quotidien',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lpkfwxisranmetbtgxrv.supabase.co/functions/v1/calculer-spdi',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"batch": true}'::jsonb
  ) AS request_id;
  $$
);
```

### Ajout dans `supabase/config.toml`
```toml
[functions.calculer-spdi]
verify_jwt = false
```

## Resultat attendu
- Chaque jour a 5h UTC, le SPDI de tous les acteurs suivis est recalcule automatiquement
- Les admins connectes recoivent un toast en temps reel (succes ou erreur)
- Le job apparait dans la page "Taches planifiees (CRON)" avec son historique
- Aucune nouvelle table ni composant UI necessaire
