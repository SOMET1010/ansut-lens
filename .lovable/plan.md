

# Ajout d'icônes aux labels des quadrants

## Vue d'ensemble

Ajouter une icône distincte à chaque quadrant dans la modale d'analyse IA pour améliorer la lisibilité et la compréhension visuelle.

```text
Résultat attendu :

📊 Répartition par quadrant
─────────────────────────────────────────────
🔬 Tech        ████████████████████░░░  97%
📈 Market      ██████████████████████   100%
⚖️ Regulation  ░░░░░░░░░░░░░░░░░░░░░░   0%
🌟 Reputation  ░░░░░░░░░░░░░░░░░░░░░░   0%
```

---

## Mapping des icônes

| Quadrant | Icône Lucide | Signification |
|----------|--------------|---------------|
| **Tech** | `Cpu` | Technologies, innovations techniques |
| **Market** | `TrendingUp` | Marché, tendances économiques |
| **Regulation** | `Scale` | Réglementation, lois, conformité |
| **Reputation** | `Star` | Image de marque, réputation |

---

## Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/actualites/ArticleCluster.tsx` | Ajouter mapping icônes + affichage dans les quadrants |

---

## Implémentation

### 1. Imports des nouvelles icônes

```tsx
import { Cpu, TrendingUp, Scale, Star } from 'lucide-react';
```

### 2. Mapping des icônes par quadrant

```tsx
// Configuration des quadrants avec icônes
const quadrantConfig: Record<string, { icon: React.ElementType; label: string }> = {
  tech: { icon: Cpu, label: 'Tech' },
  market: { icon: TrendingUp, label: 'Market' },
  regulation: { icon: Scale, label: 'Regulation' },
  reputation: { icon: Star, label: 'Reputation' }
};
```

### 3. Affichage avec icônes (remplace lignes 299-310)

```tsx
{Object.entries(analyseData.quadrant_distribution).map(([quadrant, score]) => {
  const config = quadrantConfig[quadrant.toLowerCase()] ?? { 
    icon: null, 
    label: quadrant 
  };
  const IconComponent = config.icon;
  
  return (
    <div key={quadrant} className="flex items-center gap-2">
      <span className="w-28 text-xs flex items-center gap-1.5">
        {IconComponent && <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="capitalize">{config.label}</span>
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary/70 transition-all" 
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs w-8 text-right">{score}%</span>
    </div>
  );
})}
```

---

## Récapitulatif des changements

| Élément | Avant | Après |
|---------|-------|-------|
| Import icônes | — | `Cpu`, `TrendingUp`, `Scale`, `Star` |
| Label quadrant | Texte seul (`w-24`) | Icône + Texte (`w-28`) |
| Fallback | — | Label brut si quadrant inconnu |

