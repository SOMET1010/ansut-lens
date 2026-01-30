

# Correction du Bug du Graphique de Sentiment

## Diagnostic

Le graphique "Tonalité du jour" dans la sidebar affiche correctement:
- Les labels ("Positif", "Neutre", "Négatif")
- Les pourcentages au hover (33%, 34%, 33%)

Mais **les barres colorées sont invisibles** car leur hauteur calculée est quasi nulle.

## Cause racine

Dans `SmartSidebar.tsx`, la structure actuelle est:

```tsx
<div className="flex items-end ... h-24">  {/* Hauteur 24 (96px) */}
  <div className="flex flex-col ... w-1/3">
    <span>33%</span>              {/* ~16px de hauteur */}
    <div className="h-full">      {/* Problème: "h-full" = reste = ~64px */}
      <div style={{ height: '33%' }} />  {/* 33% de 64px = ~21px mais... */}
    </div>
    <span>Positif</span>          {/* ~16px de hauteur */}
  </div>
</div>
```

Le problème est double:
1. `h-full` calcule mal dans un contexte flex-col
2. Le conteneur parent `h-24` (96px) est partagé entre 3 éléments (span, div, span)

## Solution proposée

Restructurer le graphique en séparant clairement:
1. Zone des barres (hauteur fixe)
2. Zone des labels (dessous)

```tsx
{/* Widget : Analyse de Sentiment - Structure corrigée */}
<Card className="border-border/50">
  <CardContent className="p-5">
    <h3 className="...">Tonalité du jour</h3>
    
    {/* Graphique avec structure améliorée */}
    <div className="flex items-end justify-between gap-3 h-28 px-2 mb-2">
      
      {/* Barre Positif */}
      <div className="flex-1 flex flex-col items-center group cursor-pointer h-full">
        {/* Pourcentage au hover - position absolue */}
        <div className="relative flex-1 w-full">
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-signal-positive 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            {sentimentDistribution.positive}%
          </span>
          {/* Conteneur de la barre - prend toute la hauteur restante */}
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-signal-positive/20 rounded-lg overflow-hidden">
            <div 
              className="absolute bottom-0 w-full bg-signal-positive rounded-lg transition-all duration-500 
                         group-hover:brightness-110"
              style={{ height: `${Math.max(sentimentDistribution.positive, 5)}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Barre Neutre - même structure */}
      {/* Barre Négatif - même structure */}
    </div>
    
    {/* Labels en bas - séparés du graphique */}
    <div className="flex justify-between px-2">
      <span className="flex-1 text-center text-xs text-muted-foreground font-medium">Positif</span>
      <span className="flex-1 text-center text-xs text-muted-foreground font-medium">Neutre</span>
      <span className="flex-1 text-center text-xs text-muted-foreground font-medium">Négatif</span>
    </div>
  </CardContent>
</Card>
```

## Changements clés

| Avant | Après |
|-------|-------|
| Hauteur `h-24` (96px) partagée | Hauteur `h-28` (112px) + labels séparés |
| Structure flex-col avec `h-full` | Position absolute pour les barres |
| Labels dans le même flex | Labels en `<div>` séparé dessous |
| Pourcentage dans le flux | Pourcentage en position absolute `-top-5` |
| Minimum de hauteur = 0% | Minimum de 5% pour éviter barres invisibles |

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/actualites/SmartSidebar.tsx` | Refonte complète du widget "Tonalité du jour" (lignes 36-87) |

## Validation après correction

1. Les 3 barres colorées (vert/gris/rouge) doivent être visibles
2. Les pourcentages apparaissent au hover
3. Les labels restent en bas
4. L'animation au survol fonctionne (brightness)

