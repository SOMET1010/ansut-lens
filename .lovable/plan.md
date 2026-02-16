
# Page de statut du calcul SPDI batch quotidien

## Vue d'ensemble
Ajouter une page d'administration dediee au suivi du cron job SPDI batch. Elle affichera les KPI du dernier calcul, l'historique des executions depuis `collectes_log` (filtre `type = 'calcul-spdi'`), et un bouton pour declencher manuellement un calcul batch.

## Structure

### 1. Nouvelle page : `src/pages/admin/SpdiStatusPage.tsx`
- **Header** avec lien retour vers `/admin`, titre "Statut SPDI Batch", bouton "Lancer un calcul batch" et "Actualiser"
- **KPI Cards** (ligne de 4 cartes) :
  - Dernier statut (succes/erreur avec badge colore)
  - Date du dernier calcul (format relatif)
  - Nombre d'acteurs traites (dernier run)
  - Duree moyenne des 10 derniers runs
- **Historique des executions** : tableau avec date, statut, nb acteurs, duree, erreur eventuelle
  - Donnees depuis `collectes_log` filtre `type = 'calcul-spdi'`, ordonne par `created_at DESC`, limite 50
- **Acteurs suivis** : liste compacte des personnalites avec `suivi_spdi_actif = true` et leur dernier score

### 2. Hook : `src/hooks/useSpdiStatus.ts`
- Query `collectes_log` filtree sur `type = 'calcul-spdi'`, limit 50, order by `created_at desc`
- Query `personnalites` filtrees sur `suivi_spdi_actif = true` avec `score_spdi_actuel` et `derniere_mesure_spdi`
- Mutation pour declencher `calculer-spdi` en mode batch via `supabase.functions.invoke`

### 3. Routage : `src/App.tsx`
- Ajouter route `/admin/spdi-status` sous la permission `manage_cron_jobs`

### 4. Lien dans la page Admin : `src/pages/AdminPage.tsx`
- Ajouter une `AdminNavCard` dans la section "Supervision Technique" avec icone `Activity`, titre "Statut SPDI Batch"

## Details techniques

### `src/hooks/useSpdiStatus.ts`
```typescript
// Query 1: collectes_log filtre type='calcul-spdi'
const { data: logs } = useQuery({
  queryKey: ['spdi-batch-logs'],
  queryFn: () => supabase
    .from('collectes_log')
    .select('*')
    .eq('type', 'calcul-spdi')
    .order('created_at', { ascending: false })
    .limit(50)
});

// Query 2: acteurs avec suivi SPDI actif
const { data: acteurs } = useQuery({
  queryKey: ['spdi-acteurs-suivis'],
  queryFn: () => supabase
    .from('personnalites')
    .select('id, nom, prenom, score_spdi_actuel, derniere_mesure_spdi, tendance_spdi')
    .eq('suivi_spdi_actif', true)
    .order('score_spdi_actuel', { ascending: false })
});

// Mutation: lancer batch
const runBatch = useMutation({
  mutationFn: () => supabase.functions.invoke('calculer-spdi', {
    body: { batch: true }
  })
});
```

### `src/pages/admin/SpdiStatusPage.tsx`
- Utilise les composants UI existants : Card, Table, Badge, Button, Skeleton
- KPI calculees depuis les logs : dernier statut, date, nb resultats, duree moyenne
- Tableau historique avec colonnes : Date, Statut (badge vert/rouge), Acteurs traites, Duree, Erreur
- Section acteurs avec petite table : Nom, Score actuel, Derniere mesure, Tendance (badge)

### Route dans `src/App.tsx`
```typescript
<Route element={<PermissionRoute permission="manage_cron_jobs" />}>
  <Route path="/admin/cron-jobs" element={<CronJobsPage />} />
  <Route path="/admin/spdi-status" element={<SpdiStatusPage />} />
</Route>
```

### Carte admin dans `src/pages/AdminPage.tsx`
Ajout dans la section "Supervision Technique" a cote de la carte "Taches CRON" :
```typescript
<AdminNavCard
  color="purple"
  icon={<Activity size={24} />}
  title="Statut SPDI Batch"
  badge={/* dernier statut */}
  subtitle="Suivi du calcul automatique quotidien du SPDI."
  to="/admin/spdi-status"
/>
```

## Fichiers modifies
- **Nouveau** : `src/pages/admin/SpdiStatusPage.tsx`
- **Nouveau** : `src/hooks/useSpdiStatus.ts`
- **Modifie** : `src/App.tsx` (ajout route)
- **Modifie** : `src/pages/AdminPage.tsx` (ajout carte nav)
