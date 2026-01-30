

# Ajout des Indicateurs de Tendance sur le Graphique de Sentiment

## Vue d'ensemble

Ajouter une flèche (↑/↓) et un delta de pourcentage sur chaque barre du graphique "Tonalité du jour" pour montrer l'évolution par rapport à la veille.

```text
Résultat visuel attendu :

┌────────────────────────────────────────┐
│  📊 Tonalité du jour                   │
│                                        │
│     ▲+5%      (hover: 38%)    ▼-3%     │
│                                        │
│   ████████    ████████    ████████     │
│   ████████    ████████    ████████     │
│   ████████    ████████    ████████     │
│                                        │
│   Positif    Neutre      Négatif       │
└────────────────────────────────────────┘
```

---

## Architecture de la solution

```text
┌─────────────────────┐
│  ActualitesPage     │
│  - articles (24-72h)│──────────────────────┐
│  - yesterdayArticles│                      │
└─────────────────────┘                      ▼
         │                    ┌──────────────────────────┐
         │                    │   useSidebarAnalytics    │
         ▼                    │   - Calcule sentiment    │
┌─────────────────────┐       │     aujourd'hui          │
│  useYesterdayStats  │──────▶│   - Calcule sentiment    │
│  (Nouveau hook)     │       │     hier                 │
│  - Query séparée    │       │   - Retourne deltas      │
└─────────────────────┘       └──────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────┐
                              │     SmartSidebar         │
                              │   - Affiche flèches      │
                              │   - Affiche deltas       │
                              └──────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/hooks/useSidebarAnalytics.ts` | Ajouter le calcul des tendances et retourner les deltas |
| `src/hooks/useActualites.ts` | Ajouter un hook `useYesterdayArticles` pour récupérer les articles de la veille |
| `src/pages/ActualitesPage.tsx` | Appeler le nouveau hook et passer les données à `useSidebarAnalytics` |
| `src/components/actualites/SmartSidebar.tsx` | Afficher les flèches et deltas sur chaque barre |

---

## Détails d'implémentation

### 1. Nouveau hook `useYesterdayArticles` (useActualites.ts)

```typescript
// Récupérer les articles d'hier (24-48h)
export const useYesterdayArticles = () => {
  return useQuery({
    queryKey: ['yesterday-articles'],
    queryFn: async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setHours(yesterday.getHours() - 48);
      const dayBeforeYesterday = new Date(now);
      dayBeforeYesterday.setHours(dayBeforeYesterday.getHours() - 72);

      const { data, error } = await supabase
        .from('actualites')
        .select('id, sentiment')
        .gte('date_publication', dayBeforeYesterday.toISOString())
        .lt('date_publication', yesterday.toISOString());

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });
};
```

### 2. Interface étendue (useSidebarAnalytics.ts)

```typescript
interface SidebarAnalytics {
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  // NOUVEAU : Tendances par rapport à hier
  sentimentTrends: {
    positive: { delta: number; direction: 'up' | 'down' | 'stable' };
    neutral: { delta: number; direction: 'up' | 'down' | 'stable' };
    negative: { delta: number; direction: 'up' | 'down' | 'stable' };
  };
  topConcepts: Array<{ tag: string; count: number; active: boolean }>;
  topSources: Array<{ name: string; count: number }>;
  trendingPeople: Array<{ name: string; mentions: number }>;
}
```

### 3. Calcul des tendances (useSidebarAnalytics.ts)

```typescript
export function useSidebarAnalytics(
  articles: ExtendedActualite[] | undefined,
  yesterdayArticles: { sentiment: number | null }[] | undefined, // NOUVEAU
  activeFilters: string[] = []
): SidebarAnalytics {
  return useMemo(() => {
    // ... calcul sentiment actuel (existant) ...

    // === NOUVEAU : Calcul sentiment d'hier ===
    let yesterdayDistribution = { positive: 33, neutral: 34, negative: 33 };
    
    if (yesterdayArticles && yesterdayArticles.length > 0) {
      let yPositive = 0, yNeutral = 0, yNegative = 0;
      
      yesterdayArticles.forEach(article => {
        const sentiment = article.sentiment ?? 0;
        if (sentiment > 0.2) yPositive++;
        else if (sentiment < -0.2) yNegative++;
        else yNeutral++;
      });
      
      const yTotal = yesterdayArticles.length;
      yesterdayDistribution = {
        positive: Math.round((yPositive / yTotal) * 100),
        neutral: Math.round((yNeutral / yTotal) * 100),
        negative: Math.round((yNegative / yTotal) * 100)
      };
    }

    // === Calcul des deltas ===
    const calculateTrend = (today: number, yesterday: number) => {
      const delta = today - yesterday;
      return {
        delta: Math.abs(delta),
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
      };
    };

    const sentimentTrends = {
      positive: calculateTrend(sentimentDistribution.positive, yesterdayDistribution.positive),
      neutral: calculateTrend(sentimentDistribution.neutral, yesterdayDistribution.neutral),
      negative: calculateTrend(sentimentDistribution.negative, yesterdayDistribution.negative)
    };

    return {
      sentimentDistribution,
      sentimentTrends, // NOUVEAU
      topConcepts,
      topSources,
      trendingPeople
    };
  }, [articles, yesterdayArticles, activeFilters]);
}
```

### 4. Affichage des flèches (SmartSidebar.tsx)

```tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Composant helper pour afficher la tendance
const TrendIndicator = ({ 
  delta, 
  direction, 
  colorClass 
}: { 
  delta: number; 
  direction: 'up' | 'down' | 'stable'; 
  colorClass: string;
}) => {
  if (direction === 'stable' || delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]">
        <Minus className="h-2.5 w-2.5" />
        <span>0%</span>
      </span>
    );
  }
  
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn(
      "flex items-center gap-0.5 text-[10px] font-medium",
      direction === 'up' ? "text-signal-positive" : "text-signal-critical"
    )}>
      <Icon className="h-2.5 w-2.5" />
      <span>{direction === 'up' ? '+' : '-'}{delta}%</span>
    </span>
  );
};

// Dans le widget Tonalité
<div className="flex-1 h-full relative group cursor-pointer">
  {/* Indicateur de tendance (toujours visible, au-dessus de la barre) */}
  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
    <TrendIndicator 
      delta={analytics.sentimentTrends.positive.delta}
      direction={analytics.sentimentTrends.positive.direction}
      colorClass="text-signal-positive"
    />
  </div>
  
  {/* Pourcentage au hover (sous l'indicateur de tendance) */}
  <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs font-bold 
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                   whitespace-nowrap z-10 text-signal-positive">
    {sentimentDistribution.positive}%
  </span>
  
  {/* Barre (existante) */}
  <div className="absolute inset-0 bg-signal-positive/20 rounded-lg overflow-hidden">
    ...
  </div>
</div>
```

---

## Logique de couleur des flèches

| Catégorie | Direction | Interprétation | Couleur |
|-----------|-----------|----------------|---------|
| **Positif** | ↑ Up | Bonne nouvelle | 🟢 Vert |
| **Positif** | ↓ Down | Inquiétant | 🔴 Rouge |
| **Neutre** | ↑ ou ↓ | Informatif | ⚪ Gris |
| **Négatif** | ↓ Down | Amélioration | 🟢 Vert |
| **Négatif** | ↑ Up | Dégradation | 🔴 Rouge |

---

## Récapitulatif des changements

| Fichier | Type | Description |
|---------|------|-------------|
| `useActualites.ts` | Ajout | Nouveau hook `useYesterdayArticles` |
| `useSidebarAnalytics.ts` | Modification | Ajouter paramètre `yesterdayArticles` + calcul tendances |
| `ActualitesPage.tsx` | Modification | Appeler `useYesterdayArticles` et passer à `useSidebarAnalytics` |
| `SmartSidebar.tsx` | Modification | Nouveau composant `TrendIndicator` + affichage au-dessus des barres |

---

## Aperçu visuel final

```text
┌─────────────────────────────────────────────────────────────┐
│  📊 Tonalité du jour                                        │
│                                                             │
│        38%           34%           28%     ← hover labels   │
│       ▲+5%          ─0%          ▼-5%     ← trend toujours │
│                                            visible          │
│   ┌────────┐    ┌────────┐    ┌────────┐                   │
│   │████████│    │████████│    │████████│                   │
│   │████████│    │████████│    │████████│                   │
│   │████████│    │████████│    │        │                   │
│   │████████│    │████████│    │        │                   │
│   └────────┘    └────────┘    └────────┘                   │
│    Positif       Neutre        Négatif                     │
└─────────────────────────────────────────────────────────────┘
```

