

## Module de Statistiques de Fiabilité des Sources

Ajouter un tableau de bord analytique accessible depuis la page Admin > Sources, calculé côté frontend à partir des données existantes dans `actualites` (pas de nouvelle table nécessaire).

---

### Approche

Toutes les données nécessaires existent déjà : la table `actualites` contient `source_nom`, `source_url`, `sentiment`, `importance`, `impact_ansut`, et `created_at`. On peut calculer les statistiques en agrégeant côté client via une requête unique.

### Nouveau hook : `useSourceReliability.ts`

Requête sur `actualites` (derniers 30 jours) pour récupérer `id, source_nom, source_url, sentiment, importance, impact_ansut, created_at`. Calcule par source :
- **Total articles** collectés
- **Taux de liens valides** : % d'articles ayant un `source_url` non null et non vide
- **Sentiment moyen** : moyenne du champ `sentiment`
- **Importance moyenne** : moyenne du champ `importance`
- **Taux d'impact ANSUT** : % d'articles ayant un `impact_ansut` non null
- **Score de fiabilité global** : formule pondérée (liens valides 40% + importance 30% + sentiment positif 30%)

### Nouveau composant : `SourceReliabilityDashboard.tsx`

Composant autonome avec :
1. **Tableau de classement** des sources triées par score de fiabilité (barres de progression colorées)
2. **KPI cards** en haut : nombre total de sources actives, taux moyen de liens valides, score fiabilité moyen
3. **Badge couleur** par source : vert (>70), orange (40-70), rouge (<40)
4. Colonnes : Nom source, Articles (30j), Liens valides %, Sentiment moy., Importance moy., Impact ANSUT %, Score fiabilité

### Intégration dans `SourcesPage.tsx`

Ajouter le composant `SourceReliabilityDashboard` en haut de la page Sources existante, au-dessus du tableau de gestion actuel, dans un `Tabs` component avec deux onglets : "Statistiques" et "Gestion".

### Fichiers concernés

| Action | Fichier |
|--------|---------|
| Créer | `src/hooks/useSourceReliability.ts` |
| Créer | `src/components/admin/SourceReliabilityDashboard.tsx` |
| Modifier | `src/pages/admin/SourcesPage.tsx` — wraper dans Tabs |

