

# Transformation de la page Acteurs en "Cartographie d'Influence Dynamique"

## Diagnostic

La page actuelle souffre de **triple redondance visuelle** sur les cercles :
1. `StatsBar` : 4 KPI cards + breakdown cercles en bas
2. `ActeurFilters` : chips cercles cliquables avec compteurs
3. `Tabs` : onglets Tous/C1/C2/C3/C4

De plus, les cartes sont "mortes" - elles n'affichent que des informations statiques sans indicateurs de veille en temps réel.

---

## Architecture de la transformation

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  AVANT (Redondance x3)                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │ [Stats 4 cards] + [Breakdown cercles]                                           ││
│  │ [Chips C1 C2 C3 C4] + [Dropdowns]                                               ││
│  │ [Tabs: Tous | C1 | C2 | C3 | C4]                                                ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│  APRES (Barre unifiée)                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │ Header: Titre + Stats compactes + [+ Ajouter]                                   ││
│  │ UnifiedFilterBar: [🔍 Search] [Tabs: Tous|C1|C2|C3|C4] [Filtres avancés]       ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/PersonnalitesPage.tsx` | Modifier | Refonte du layout avec header compact et barre unifiée |
| `src/components/personnalites/ActeurCard.tsx` | Modifier | Ajout Heat indicator, score influence, réseau mini |
| `src/components/personnalites/StatsBar.tsx` | Supprimer/Remplacer | Intégrer les stats dans le header compact |
| `src/components/personnalites/ActeurFilters.tsx` | Modifier | Fusionner avec les tabs dans une barre unifiée |

---

## Nouvelles fonctionnalités par composant

### 1. Header compact avec stats intégrées

Remplacer les 4 grosses cards par des badges compacts :

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  🎯 Cartographie des Acteurs                                                        │
│  Suivi de l'influence et des interactions du secteur                               │
│                                                              [Stats compactes]      │
│                                                              ┌───────┐ ┌───────┐   │
│                                                              │ 42    │ │ 85%   │   │
│                                                              │Acteurs│ │Compl. │   │
│                                                              └───────┘ └───────┘   │
│                                              [Liste/Radar]   [+ Ajouter un acteur]  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Barre de filtres unifiée (UnifiedFilterBar)

Fusion recherche + tabs cercles + dropdowns en une seule ligne :

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  [🔍 Rechercher un acteur...]  [Tous] [C1] [C2] [C3] [C4]   [Catégorie▼] [⚙️ Plus] │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. ActeurCard "Smart" avec indicateurs dynamiques

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  NOUVELLE CARTE ACTEUR                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                                ││
│  │  [Avatar]──[🔴85%] ← Heat indicator (météo médiatique)                        ││
│  │     │                                                                          ││
│  │     ├── Nom Prénom                                                            ││
│  │     ├── [Cercle 1] [Régulateur]                                               ││
│  │     │                                                                          ││
│  │     ├── Fonction @ Organisation                                               ││
│  │     │                                                                          ││
│  │     ├── [#5G] [#Digitalisation] [#Startups] ← Tags thématiques                ││
│  │     │                                                                          ││
│  │  ───────────────────────────────────────────────────────────────────────────  ││
│  │                                                                                ││
│  │  [👤👤👤+4 Connexions]                              [████████░░ 85] Influence ││
│  │   ↑ Mini-réseau                                                                ││
│  │                                                                                ││
│  └────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Détails techniques

### Heat Indicator (Météo médiatique)

Basé sur `derniere_activite` et un futur champ `nb_mentions_recent` :

```tsx
// Calcul du "Heat" - Visibilité médiatique récente
const calculateMediaHeat = (personnalite: Personnalite): number => {
  // Pour l'instant, basé sur score_influence + activité récente
  const baseScore = personnalite.score_influence;
  const hasRecentActivity = personnalite.derniere_activite && 
    new Date(personnalite.derniere_activite) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  if (hasRecentActivity) return Math.min(baseScore + 20, 100);
  return baseScore;
};

// Affichage conditionnel (seulement si heat > 50)
{mediaHeat > 50 && (
  <div className="absolute -bottom-1 -right-1 bg-background p-0.5 rounded-full">
    <div className="flex items-center gap-0.5 bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
      <TrendingUp className="h-2 w-2" />
      {mediaHeat}%
    </div>
  </div>
)}
```

### Mini-réseau de connexions

Simulation basée sur les acteurs du même cercle/catégorie :

```tsx
// Connexions simulées (à terme, table de relations dans DB)
const getConnections = (personnalite: Personnalite, all: Personnalite[]): Personnalite[] => {
  return all
    .filter(p => p.id !== personnalite.id)
    .filter(p => p.cercle === personnalite.cercle || p.organisation === personnalite.organisation)
    .slice(0, 3);
};

// Affichage
<div className="flex -space-x-2">
  {connections.slice(0, 3).map(c => (
    <Avatar key={c.id} className="h-6 w-6 border-2 border-background">
      <AvatarFallback className="text-[8px]">{c.nom[0]}</AvatarFallback>
    </Avatar>
  ))}
  {remainingCount > 0 && (
    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] border-2 border-background">
      +{remainingCount}
    </div>
  )}
</div>
```

### Barre d'influence visuelle

```tsx
// Jauge d'influence compacte
<div className="flex items-center gap-2">
  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
    <div 
      className="h-full bg-primary rounded-full transition-all" 
      style={{ width: `${personnalite.score_influence}%` }}
    />
  </div>
  <span className="text-xs font-bold text-primary">
    {personnalite.score_influence}
  </span>
</div>
```

---

## Restructuration de la page

### Avant (PersonnalitesPage)
1. Header avec titre
2. StatsBar (4 cards + breakdown)
3. ActeurFilters (recherche + chips + dropdowns)
4. Tabs (Tous/C1/C2/C3/C4)
5. Grid de cartes par cercle

### Après (PersonnalitesPage)
1. **Header compact** avec stats inline + toggle vue + bouton ajouter
2. **UnifiedFilterBar** combinant recherche + tabs + filtres avancés
3. **Grid directe** sans headers de cercle répétitifs

---

## Composant UnifiedFilterBar

Nouveau composant fusionnant `ActeurFilters` et les `Tabs` :

```tsx
interface UnifiedFilterBarProps {
  filters: PersonnalitesFilters;
  onFiltersChange: (f: PersonnalitesFilters) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats: PersonnalitesStats;
}

// Structure
<div className="bg-card p-2 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-3 items-center">
  
  {/* Zone de recherche */}
  <div className="relative flex-1 min-w-[200px]">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder="Rechercher..." className="pl-10" />
  </div>

  {/* Tabs Cercles intégrés */}
  <div className="flex bg-muted/50 p-1 rounded-lg">
    <button className={cn(activeTab === 'all' && 'bg-background shadow-sm')}>
      Tous <Badge>{stats.total}</Badge>
    </button>
    {[1,2,3,4].map(c => (
      <button key={c} className={cn(activeTab === c.toString() && 'bg-background shadow-sm')}>
        <div className={cn('h-2 w-2 rounded-full', CERCLE_COLORS[c])} />
        C{c}
      </button>
    ))}
  </div>

  {/* Filtres additionnels */}
  <Select value={filters.categorie || 'all'}>...</Select>
  
  <Button variant="ghost" size="sm">
    <Filter className="h-4 w-4" /> Plus
  </Button>
</div>
```

---

## Impact sur les fichiers existants

### StatsBar.tsx
- **Action** : Simplifier en composant `CompactStats`
- Garder uniquement : Total acteurs + Complétude en badges inline

### ActeurFilters.tsx
- **Action** : Fusionner dans `UnifiedFilterBar`
- Supprimer les chips cercles (intégrés aux tabs)
- Garder la recherche et les dropdowns catégorie/alerte

### CercleHeader.tsx
- **Action** : Conserver mais simplifier (retirer la progress bar redondante)
- Utiliser uniquement quand `activeTab === 'all'` pour séparer les sections

### ActeurCard.tsx
- **Action** : Enrichir avec :
  - Heat indicator sur l'avatar
  - Mini-réseau de connexions dans le footer
  - Barre d'influence visuelle
  - Tags thématiques plus visibles

---

## Récapitulatif des améliorations UX

| Problème | Solution |
|----------|----------|
| Triple redondance cercles | Barre unifiée avec tabs intégrés |
| Stats trop volumineuses | Badges compacts dans le header |
| Cartes statiques "annuaire" | Indicateurs Heat + Influence + Connexions |
| Pas de contexte thématique | Tags thématiques mis en avant |
| Actions cachées | Menu contextuel conservé mais plus visible au hover |

---

## Structure finale de la page

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  🎯 Cartographie des Acteurs                    [42 Acteurs] [85%]  [Liste▼] [+Add] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  [🔍 Rechercher...] [Tous(42)] [●C1(12)] [●C2(15)] [●C3(8)] [●C4(7)]  [Catégorie▼] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Cercle 1 - Institutionnels Nationaux (12 acteurs)                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │ [Avatar]🔥85│ │ [Avatar]    │ │ [Avatar]🔥72│ │ [Avatar]    │                    │
│  │ I. Konaté  │ │ G. Beugré   │ │ Y. Bamba    │ │ ...         │                    │
│  │ [C1][Régul]│ │ [C1][Expert]│ │ [C1][Opér.] │ │             │                    │
│  │ Ministre   │ │ DG ANSUT    │ │ PCA ANSUT   │ │             │                    │
│  │ #Digit #5G │ │ #Infra #SU  │ │ #Stratégie  │ │             │                    │
│  │────────────│ │────────────│ │────────────│ │             │                    │
│  │👤👤👤+4    │ │👤👤+2       │ │👤👤👤+1    │ │             │                    │
│  │██████░ 92  │ │█████░░ 88  │ │████░░░ 75  │ │             │                    │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                    │
│                                                                                      │
│  Cercle 2 - Opérateurs & Connectivité (15 acteurs)                                  │
│  ...                                                                                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

