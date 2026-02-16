
# Quick-Tour / Help Overlay pour la page Acteurs & Influence

## Objectif

Ajouter un overlay d'aide interactif sur la page `/acteurs` qui explique la nouvelle structure unifiee (4 onglets) et guide l'utilisateur. L'overlay s'affiche automatiquement a la premiere visite, puis est accessible via un bouton d'aide.

---

## Composant : `ActeursQuickTour.tsx`

Creer `src/components/acteurs/ActeursQuickTour.tsx` -- un Dialog modal avec :

- Un titre "Bienvenue dans Acteurs & Influence"
- Une description des 4 onglets avec icones et explications courtes :
  - **Cartographie** : Vue d'ensemble des acteurs cles, fiches et filtres
  - **Dashboard SPDI** : Score de presence digitale par acteur, radar et recommandations IA
  - **Revue Stabilite** : Comparaison des tendances SPDI entre tous les acteurs
  - **Benchmark** : Duel d'influence entre deux acteurs
- Une note sur le deep linking (`/acteurs?tab=spdi`)
- Un checkbox "Ne plus afficher" qui sauvegarde dans `localStorage`
- Un bouton "C'est parti !" pour fermer

## Logique d'affichage

- Utiliser `localStorage.getItem('acteurs-tour-dismissed')` pour detecter si l'utilisateur a deja vu le tour
- Si non dismissé, afficher automatiquement au mount
- Sauvegarder `'true'` dans localStorage quand l'utilisateur coche "Ne plus afficher" ou ferme le dialog

## Integration dans `ActeursInfluencePage.tsx`

- Ajouter un bouton `HelpCircle` (lucide) a cote du titre "Acteurs & Influence"
- Ce bouton ouvre manuellement le tour a tout moment
- Importer et rendre `<ActeursQuickTour />` dans la page

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/acteurs/ActeursQuickTour.tsx` | Creer -- composant Dialog du tour |
| `src/pages/ActeursInfluencePage.tsx` | Modifier -- ajouter bouton aide + monter le composant tour |

## Details techniques

- Utilisation de `Dialog` / `DialogContent` de shadcn (deja installe)
- Icones lucide : `HelpCircle`, `Map`, `BarChart3`, `TrendingUp`, `Swords`
- Persistance via `localStorage` (meme pattern que `useDailyBriefing`)
- Aucune nouvelle dependance requise
- Le composant est purement frontend, aucun appel backend
