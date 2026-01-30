
# Plan de Refonte UI/UX - Page "Acteurs Clés"

## Diagnostic confirmé

Après analyse du code existant, je confirme les points soulevés :
- **ActeurCard** : Utilise `border-l-4` (bordure latérale gauche) qui est un pattern daté
- **StatsBar** : Affichage minimaliste "4 acteurs" avec petits cercles, manque d'impact visuel
- **ActeurFilters** : Dropdowns standards, barre de recherche perdue dans le flux
- **Absence de visualisation "Radar"** : Aucune dimension visuelle de cartographie

---

## Plan d'amélioration en 5 phases

### Phase 1 : Refonte des KPIs (StatsBar)
Transformer la barre de stats en cartes de statistiques modernes et impactantes.

| Avant | Après |
|-------|-------|
| Ligne compacte avec cercles | 4 cartes KPI avec icônes, chiffres grands, tendances |

**Modifications :**
- Créer 4 cartes horizontales avec design "glass" moderne
- Ajouter des icônes distinctives pour chaque métrique
- Intégrer un indicateur de complétude des profils (% avec photo, bio, etc.)
- Afficher les alertes de manière plus visible

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   👥 12      │ │   🔵 4       │ │   ⚠️ 2       │ │   📊 85%     │
│   Acteurs    │ │   Cercle 1   │ │   Alertes    │ │   Complétude │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

### Phase 2 : Redesign complet de ActeurCard
Transformer les cartes en profils modernes inspirés LinkedIn/CRM.

**Changements majeurs :**
1. **Supprimer la bordure latérale** : Remplacer par `shadow-sm hover:shadow-lg`
2. **Avatar dynamique** : Couleurs de fond par cercle (bleu C1, orange C2, vert C3, violet C4)
3. **Badge cercle repositionné** : En haut à droite, plus visible, style `rounded-full`
4. **Titre avec tooltip** : Gestion propre de la troncature avec `line-clamp-2`
5. **Footer avec actions** : Score étoiles + bouton "Voir le profil"
6. **Coins plus arrondis** : `rounded-xl` au lieu de `rounded-lg`
7. **Transition fluide** : `transition-all duration-200`

```
┌─────────────────────────────────────────┐
│  ┌────┐  Ibrahim Kalil Konaté    [C1]  │
│  │ IK │  Cercle 1 • Régulateur         │
│  └────┘                                 │
│                                         │
│  [Régulateur] [Institutionnel]          │
│                                         │
│  Ministre de la Transition Numérique    │
│  et de la Digitalisation                │
│─────────────────────────────────────────│
│  ★★★★★                   Voir le profil │
└─────────────────────────────────────────┘
```

---

### Phase 3 : Amélioration des Filtres
Rendre la navigation plus intuitive et réduire les clics.

**Changements :**
1. **Barre de recherche centrale** : Plus large, icône plus visible, placeholder explicite
2. **Filtres cercles en chips/boutons** : Boutons toggle au lieu de dropdown
3. **Badges de comptage** : Nombre d'acteurs par cercle directement sur les chips
4. **Suppression du dropdown cercles** (redondant avec les onglets)

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Rechercher un acteur, une fonction, une organisation... │
└─────────────────────────────────────────────────────────────┘

[C1 (4)] [C2 (3)] [C3 (2)] [C4 (3)]  |  Catégorie ▼  |  Alerte ▼
```

---

### Phase 4 : Visualisation Radar (nouvelle fonctionnalité)
Ajouter une dimension visuelle "radar" avec un graphique en cercles concentriques.

**Nouveau composant : `RadarVisualization`**
- Représentation en cible (target chart) avec 4 cercles concentriques
- Points représentant les acteurs, positionnés par cercle
- Taille des points proportionnelle au score d'influence
- Couleur selon la catégorie
- Tooltip au survol avec infos de l'acteur
- Toggle pour basculer entre vue Liste et vue Radar

**Intégration :**
- Ajout d'un onglet ou toggle "Vue Liste" / "Vue Radar"
- Utilisation de Recharts (déjà installé) avec RadarChart ou graphique custom

---

### Phase 5 : Amélioration de l'en-tête de cercle (CercleHeader)
Moderniser les séparateurs de sections.

**Changements :**
- Supprimer les emojis (style moins institutionnel)
- Ajouter une ligne de progression (barre indiquant le % du cercle)
- Design plus épuré avec badge coloré

```
──── Cercle 1 • Institutionnels Nationaux (4 acteurs) ────────────
     [████████░░] 40% du total
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/personnalites/StatsBar.tsx` | Refonte complète en cartes KPI |
| `src/components/personnalites/ActeurCard.tsx` | Redesign moderne sans bordure latérale |
| `src/components/personnalites/ActeurFilters.tsx` | Barre de recherche centrale + chips cercles |
| `src/components/personnalites/CercleHeader.tsx` | Design épuré sans emojis |
| `src/components/personnalites/RadarVisualization.tsx` | **Nouveau** - Vue graphique radar |
| `src/pages/PersonnalitesPage.tsx` | Intégrer toggle vue Liste/Radar |

---

## Récapitulatif des améliorations visuelles

### Palette de couleurs par cercle (conservée et renforcée)
- **Cercle 1** : Bleu (`#3B82F6`) - Institutionnels
- **Cercle 2** : Orange (`#F97316`) - Opérateurs
- **Cercle 3** : Vert (`#22C55E`) - Bailleurs
- **Cercle 4** : Violet (`#A855F7`) - Experts

### Nouveaux patterns visuels
- **Ombre au survol** au lieu de bordure latérale
- **Coins arrondis** (`rounded-xl`)
- **Badges modernes** (`rounded-full` avec couleurs pastel)
- **Cartes KPI** avec icônes et tendances
- **Visualisation radar** pour impact immédiat

### Typographie améliorée
- Nom en `font-bold text-base` (plus grand)
- Fonction en `text-sm text-muted-foreground line-clamp-2`
- Badges en `text-xs font-semibold`

---

## Priorité d'implémentation

1. **ActeurCard** (impact visuel immédiat le plus fort)
2. **StatsBar** (KPIs plus impactants)
3. **ActeurFilters** (UX améliorée)
4. **CercleHeader** (cohérence visuelle)
5. **RadarVisualization** (fonctionnalité bonus)

