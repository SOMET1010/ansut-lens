
# Transformation de la page Actualités : Du Gestionnaire de Fichiers au Moteur de Veille Augmentée

## Diagnostic de l'existant

### Problèmes identifiés
| Problème | Impact |
|----------|--------|
| **Doublons non gérés** | 3 articles "Orange SAT" identiques dans le flux actuel |
| **KPIs inutiles** | Les 4 cartes (50 Actualités, 0 Alertes...) consomment 30% de l'écran |
| **Filtres passifs** | Menus déroulants cachés vs. filtres interactifs visibles |
| **Pas d'extraction d'entités** | Les personnes/entreprises citées ne sont pas visibles |
| **Enrichissement manuel** | Bouton "Enrichir" = l'IA n'a pas encore travaillé |

### Données disponibles pour la transformation
Après analyse de la base de données :
- `analyse_ia` : contient les quadrants et mots-clés détectés
- `sentiment` : disponible mais non rempli actuellement
- `tags` : tableau de mots-clés
- `resume`, `pourquoi_important` : contexte stratégique
- Table `personnalites` : 4 acteurs clés identifiés (Kalil Konaté, Thierry Beugré, Bamba, etc.)

---

## Architecture cible : Layout 2 colonnes

```text
┌────────────────────────────────────────────────────────────────────────────┐
│  🔍 BARRE DE RECHERCHE CENTRALE (pleine largeur)                          │
│  [Rechercher par mot-clé, acteur (ex: ANSUT, Ministre)...] [Filtres ▼]    │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐ ┌────────────────────────────┐
│  ⚡ FLUX TEMPS RÉEL (70%)                   │ │  📊 SIDEBAR (30%)          │
│                                             │ │                            │
│ ┌─────────────────────────────────────────┐ │ │ ┌────────────────────────┐ │
│ │ 95%  AGENCE ECOFIN • Il y a 2h         │ │ │ │  📈 TONALITÉ DU JOUR   │ │
│ │      [3 sources similaires ▼]           │ │ │ │  ████ 60% Positif     │ │
│ │                                         │ │ │ │  ██   30% Neutre      │ │
│ │ Orange SAT : connecter les zones où    │ │ │ │  █    10% Négatif     │ │
│ │ les réseaux s'arrêtent                 │ │ │ └────────────────────────┘ │
│ │                                         │ │ │                            │
│ │ Mamadou Bamba présente Orange SAT,     │ │ │ ┌────────────────────────┐ │
│ │ solution Internet satellite avec       │ │ │ │  #️⃣ CONCEPTS CLÉS      │ │
│ │ Eutelsat pour les zones rurales...     │ │ │ │  [Infrastructure] [5G] │ │
│ │                                         │ │ │ │  [Orange CI] [ANSUT]   │ │
│ │ 👤 Mamadou Bamba  🏢 Orange CI         │ │ │ │  [Satellite] [Fibre]   │ │
│ │ 🏢 Eutelsat                            │ │ │ └────────────────────────┘ │
│ │                                         │ │ │                            │
│ │         [Partager] [Commenter]         │ │ │ ┌────────────────────────┐ │
│ └─────────────────────────────────────────┘ │ │ │  🌐 TOP SOURCES (24h) │ │
│                                             │ │ │  Agence Ecofin    12  │ │
│ ┌─────────────────────────────────────────┐ │ │ │  Sika Finance      8  │ │
│ │ 72%  FRATERNITY MATIN • Hier           │ │ │ │  Abidjan.net       5  │ │
│ │      Nouveau ministre du Numérique...   │ │ │ └────────────────────────┘ │
│ └─────────────────────────────────────────┘ │ │                            │
│                                             │ │ ┌────────────────────────┐ │
│ [Charger plus d'articles]                   │ │ │  🔥 PERSONNALITÉS      │ │
│                                             │ │ │  Mamadou Bamba    12  │ │
└─────────────────────────────────────────────┘ │ │  Kalil Konaté      8  │ │
                                                │ │  Thierry Beugré    3  │ │
                                                │ └────────────────────────┘ │
                                                └────────────────────────────┘
```

---

## Phase 1 : Migration du schéma de base de données

Ajouter des colonnes pour l'extraction d'entités dans la table `actualites` :

```sql
ALTER TABLE actualites 
ADD COLUMN IF NOT EXISTS entites_personnes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS entites_entreprises TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cluster_id UUID,
ADD COLUMN IF NOT EXISTS score_pertinence INTEGER DEFAULT 50;
```

---

## Phase 2 : Nouveaux composants

### 2.1 ArticleCluster.tsx (Carte avec regroupement)

**Fonctionnalités :**
- Score de pertinence visible (badge bleu)
- Indicateur "X sources similaires" cliquable
- Titre + Résumé enrichi
- Entités extraites (Personnes + Entreprises) avec icônes
- Zone expandable pour les articles liés
- Actions footer (Partager, Commenter, Analyse complète)

**Design :**
```text
┌────────────────────────────────────────────────────────────────┐
│ [95% Pertinence]  SOURCE • TEMPS     [3 sources similaires ▼] │
│                                                                │
│ Titre de l'article principal (gras, cliquable)                │
│                                                                │
│ Résumé de 2-3 lignes expliquant l'impact stratégique...       │
│                                                                │
│ 👤 Personne1  👤 Personne2  🏢 Entreprise1  🏢 Entreprise2    │
│                                                                │
│ ─────────────────────────────────────────────────────────────  │
│ [Partager] [Commenter]                [Voir l'analyse →]      │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 SmartSidebar.tsx (Filtres intelligents)

**Widgets inclus :**
1. **Tonalité du jour** : Graphique barres (Positif/Neutre/Négatif)
2. **Concepts clés** : Nuage de tags cliquables (filtrage actif)
3. **Top Sources** : Liste ordonnée par nombre d'articles
4. **Personnalités citées** : Compteur de mentions par acteur

### 2.3 WatchHeader.tsx (En-tête épuré)

**Éléments :**
- Titre + sous-titre ("X nouveaux articles depuis votre dernière visite")
- Sélecteur de date (Aujourd'hui / 7 jours / 30 jours)
- Bouton "Exporter le rapport"

### 2.4 BigSearchBar.tsx (Recherche principale)

**Design :**
- Barre de recherche large (100% largeur)
- Placeholder intelligent
- Bouton "Filtres avancés" intégré
- Autocomplétion sur entités

---

## Phase 3 : Hook de clustering useArticleClusters

**Logique de regroupement :**
```typescript
interface ArticleCluster {
  mainArticle: Actualite;        // Article avec le meilleur score
  relatedArticles: Actualite[];  // Articles similaires
  relevanceScore: number;        // Score de pertinence du cluster
  entities: {
    people: string[];
    companies: string[];
  };
}

// Algorithme de clustering simplifié
const clusterArticles = (articles: Actualite[]): ArticleCluster[] => {
  // 1. Grouper par similarité de titre (Levenshtein < 0.3)
  // 2. Ou par mots-clés communs (>60% de chevauchement)
  // 3. Garder l'article avec le meilleur score comme "maître"
  // 4. Extraire les entités du cluster combiné
};
```

---

## Phase 4 : Hook useSidebarAnalytics

**Données calculées en temps réel :**
```typescript
interface SidebarAnalytics {
  sentimentDistribution: {
    positive: number;  // %
    neutral: number;
    negative: number;
  };
  topConcepts: Array<{ tag: string; count: number; active: boolean }>;
  topSources: Array<{ name: string; count: number }>;
  trendingPeople: Array<{ name: string; mentions: number }>;
}
```

---

## Phase 5 : Refonte de ActualitesPage.tsx

**Structure finale :**
```tsx
<div className="min-h-screen bg-muted/30">
  {/* 1. En-tête */}
  <WatchHeader 
    newArticlesCount={newCount}
    onDateChange={setPeriod}
    onExport={handleExport}
  />

  {/* 2. Barre de recherche */}
  <BigSearchBar 
    value={searchTerm}
    onChange={setSearchTerm}
    suggestions={topEntities}
    onAdvancedFilters={() => setShowFilters(true)}
  />

  {/* 3. Layout 2 colonnes */}
  <div className="flex gap-8">
    {/* Colonne principale (70%) */}
    <main className="w-full lg:w-3/4 space-y-4">
      <SectionLabel 
        icon={TrendingUp}
        title="Les immanquables"
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      {clusters.map(cluster => (
        <ArticleCluster
          key={cluster.mainArticle.id}
          mainArticle={cluster.mainArticle}
          relatedArticles={cluster.relatedArticles}
          entities={cluster.entities}
          onExpand={trackInteraction}
        />
      ))}
      
      <LoadMoreButton onClick={loadMore} hasMore={hasMore} />
    </main>

    {/* Sidebar (30%) */}
    <aside className="hidden lg:block w-1/4 sticky top-6">
      <SmartSidebar
        analytics={analytics}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
      />
    </aside>
  </div>
</div>
```

---

## Phase 6 : Edge function d'extraction d'entités

Enrichir la fonction `enrichir-actualite` pour extraire automatiquement les personnes et entreprises citées en utilisant l'IA.

**Prompt IA pour extraction :**
```text
Analyse ce texte et extrais les entités nommées :
1. PERSONNES : Noms complets des personnes citées
2. ENTREPRISES : Noms des organisations, entreprises, institutions

Format JSON attendu :
{
  "personnes": ["Mamadou Bamba", "Kalil Konaté"],
  "entreprises": ["Orange CI", "Eutelsat", "ANSUT"]
}
```

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/actualites/ArticleCluster.tsx` | Carte avec regroupement d'articles similaires |
| `src/components/actualites/SmartSidebar.tsx` | Sidebar avec widgets analytiques |
| `src/components/actualites/WatchHeader.tsx` | En-tête épuré avec date picker |
| `src/components/actualites/BigSearchBar.tsx` | Barre de recherche centrée |
| `src/components/actualites/SentimentChart.tsx` | Widget graphique de sentiment |
| `src/components/actualites/ConceptCloud.tsx` | Nuage de tags cliquables |
| `src/components/actualites/SourceRanking.tsx` | Liste des top sources |
| `src/components/actualites/TrendingPeople.tsx` | Personnalités tendance |
| `src/hooks/useArticleClusters.ts` | Hook de clustering des articles |
| `src/hooks/useSidebarAnalytics.ts` | Hook de calcul des analytics sidebar |

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/ActualitesPage.tsx` | Refonte complète du layout |
| `src/hooks/useActualites.ts` | Ajout des nouveaux champs (entités, cluster_id) |
| `supabase/functions/enrichir-actualite/index.ts` | Ajout de l'extraction d'entités par IA |

---

## Récapitulatif des améliorations UX

### Gain d'espace
- **Avant** : 4 KPIs + filtres déroulants = 40% écran perdu
- **Après** : Recherche + flux = 95% contenu utile

### Réduction du bruit
- **Avant** : 3 articles identiques sur Orange SAT
- **Après** : 1 cluster avec "3 sources similaires" cliquable

### Analyse visible
- **Avant** : Bouton "Enrichir" = analyse non faite
- **Après** : Entités (👤 👏) visibles directement sur les cartes

### Filtrage actif
- **Avant** : Menus déroulants cachés
- **Après** : Tags cliquables + graphique de sentiment interactif

