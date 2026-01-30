
# Corrections "Pixel Perfect" de la page Actualités

## Diagnostic des 3 problèmes à corriger

| Problème | Cause technique | Solution |
|----------|----------------|----------|
| **Graphique "Tonalité" cassé** | Positionnement `absolute -top-6` des pourcentages crée un débordement | Refonte avec flexbox, labels en hover uniquement |
| **Doublons visibles** | Seuil de similarité trop strict (40%) dans `useArticleClusters` | Baisser le seuil à 30% et ajouter la comparaison d'entités |
| **Bouton "Enrichir" trop dominant** | Utilise `variant="default"` avec `animate-pulse` | Inverser la hiérarchie : "Voir l'analyse" devient primaire |

---

## Correction 1 : Graphique de Sentiment (SmartSidebar.tsx)

### Problèmes actuels
- Les pourcentages flottent au-dessus des barres avec `absolute -top-6`
- Pas d'espace réservé pour les labels, créant un chevauchement
- Hauteur des barres (h-16) trop petite pour être lisible

### Solution proposée
- Augmenter la hauteur du graphique (h-24)
- Afficher les pourcentages uniquement au survol avec une animation fluide
- Ajouter des labels en bas pour chaque barre
- Améliorer les coins arrondis et transitions

```text
Avant :                          Après :
                                 
33%   34%   33%  (flottant)     ┌────────────────────┐
┌─┐   ┌─┐   ┌─┐                 │     (hover: 33%)   │
│█│   │█│   │█│                 │   ████             │
└─┘   └─┘   └─┘                 │   ████  ████       │
Positif Neutre Négatif          │   ████  ████  ████ │
                                │  Positif Neutre Neg│
                                └────────────────────┘
```

---

## Correction 2 : Amélioration du Clustering (useArticleClusters.ts)

### Problèmes actuels
- Seuil de similarité de titre à 40% (trop strict)
- Pas de comparaison par entités nommées (personnes/entreprises)
- Articles sur le même sujet (Orange SAT, Mamadou Bamba) restent séparés

### Solution proposée
- **Baisser le seuil de titre à 30%** pour attraper plus de doublons
- **Ajouter la comparaison par entités** : si deux articles partagent ≥1 personne OU ≥1 entreprise, ils sont regroupés
- **Combiner les critères** : titre OU tags OU entités partagées

```typescript
// Nouveau critère de regroupement
const shouldCluster = (article1, article2): boolean => {
  // Similarité de titre > 30% (au lieu de 40%)
  if (calculateSimilarity(title1, title2) > 0.30) return true;
  
  // Chevauchement de tags > 60%
  if (calculateTagOverlap(tags1, tags2) > 0.6) return true;
  
  // NOUVEAU : Entités partagées
  if (hasSharedEntities(article1, article2)) return true;
  
  // Même catégorie + similarité > 20%
  if (sameCategorie && titleSimilarity > 0.2) return true;
  
  return false;
};
```

---

## Correction 3 : Hiérarchie des Boutons (ArticleCluster.tsx)

### Problèmes actuels
- "Enrichir" avec `variant="default"` + `animate-pulse` = trop visible
- "Voir l'analyse" est un simple lien discret
- L'action principale pour un DG est "Lire", pas "Enrichir"

### Solution proposée

| Action | Avant | Après |
|--------|-------|-------|
| Partager / Commenter | `variant="ghost"` (gris) | ✓ Inchangé |
| **Enrichir** | `variant="default"` (bleu solide) | `variant="ghost"` (discret, icône seule optionnelle) |
| **Voir l'analyse** | `variant="link"` (texte bleu) | `variant="default"` (bouton principal avec flèche) |

```text
Avant :
[Partager] [Commenter]     [█ Enrichir █]  [Voir l'analyse →]
                           ↑ trop visible   ↑ pas assez visible

Après :
[Partager] [Commenter]     [✨ Enrichir]   [█ Lire l'analyse → █]
                           ↑ discret        ↑ action principale
```

---

## Correction 4 : État vide pour "Concepts Clés"

### Problème
Quand `topConcepts` est vide (pas de tags dans les articles), le widget apparaît vide sans message

### Solution
Ajouter un état placeholder avec icône et texte informatif :

```text
┌────────────────────────────┐
│  #️ Concepts Clés          │
│                            │
│      ⚠ En attente         │
│      d'analyse...          │
│                            │
└────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/actualites/SmartSidebar.tsx` | Refonte du graphique de sentiment + état vide concepts |
| `src/hooks/useArticleClusters.ts` | Seuil 30% + comparaison par entités |
| `src/components/actualites/ArticleCluster.tsx` | Inversion hiérarchie boutons |

---

## Détails d'implémentation

### SmartSidebar.tsx - Nouveau graphique de sentiment

```tsx
{/* Widget : Analyse de Sentiment (Corrigé) */}
<Card className="border-border/50">
  <CardContent className="p-5">
    <h3 className="...">Tonalité du jour</h3>
    
    {/* Graphique avec hauteur augmentée */}
    <div className="flex items-end justify-between gap-3 h-24 px-2">
      
      {/* Barre Positif */}
      <div className="flex flex-col items-center w-1/3 group cursor-pointer">
        {/* Label visible au hover */}
        <span className="text-xs font-bold text-signal-positive mb-1 
                         opacity-0 group-hover:opacity-100 
                         transition-opacity duration-200">
          {sentimentDistribution.positive}%
        </span>
        {/* Conteneur de la barre */}
        <div className="w-full bg-signal-positive/20 rounded-lg 
                        relative h-full overflow-hidden">
          <div 
            className="absolute bottom-0 w-full bg-signal-positive 
                       rounded-lg transition-all duration-500 
                       group-hover:brightness-110"
            style={{ height: `${sentimentDistribution.positive}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-2">Positif</span>
      </div>
      
      {/* Barre Neutre - même structure */}
      {/* Barre Négatif - même structure */}
    </div>
  </CardContent>
</Card>
```

### useArticleClusters.ts - Nouvelle fonction de comparaison

```typescript
// Vérifier si deux articles partagent des entités
const hasSharedEntities = (
  a1: ExtendedActualite, 
  a2: ExtendedActualite
): boolean => {
  const people1 = new Set(a1.entites_personnes ?? []);
  const people2 = new Set(a2.entites_personnes ?? []);
  const companies1 = new Set(a1.entites_entreprises ?? []);
  const companies2 = new Set(a2.entites_entreprises ?? []);
  
  // Au moins une personne en commun
  for (const p of people1) {
    if (people2.has(p)) return true;
  }
  
  // Au moins une entreprise en commun
  for (const c of companies1) {
    if (companies2.has(c)) return true;
  }
  
  return false;
};

// Mise à jour de shouldCluster
const shouldCluster = (article1, article2): boolean => {
  // Seuil de titre abaissé à 30%
  if (calculateSimilarity(title1, title2) > 0.30) return true;
  
  // Tags communs > 60%
  if (calculateTagOverlap(tags1, tags2) > 0.6) return true;
  
  // NOUVEAU: Entités partagées
  if (hasSharedEntities(article1, article2)) return true;
  
  // Catégorie + titre > 20%
  if (sameCategory && titleSimilarity > 0.2) return true;
  
  return false;
};
```

### ArticleCluster.tsx - Footer avec hiérarchie corrigée

```tsx
{/* Footer Actions - Hiérarchie corrigée */}
<div className="bg-muted/30 px-5 py-2.5 border-t border-border/50 
                flex justify-between items-center">
  
  {/* Actions sociales (inchangées) */}
  <div className="flex gap-2">
    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
      <Share2 className="h-3.5 w-3.5 mr-1" /> Partager
    </Button>
    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
      <MessageSquare className="h-3.5 w-3.5 mr-1" /> Commenter
    </Button>
  </div>
  
  {/* Actions principales (hiérarchie inversée) */}
  <div className="flex items-center gap-2">
    {/* Enrichir = discret maintenant */}
    {onEnrich && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEnrich(mainArticle.id)}
        disabled={isEnriching}
        className="text-xs text-primary hover:bg-primary/10"
      >
        {isEnriching ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1" />
        )}
        {needsEnrichment ? "Enrichir" : "Ré-analyser"}
      </Button>
    )}
    
    {/* Voir l'analyse = primaire maintenant */}
    <Button 
      variant="default" 
      size="sm" 
      className="text-xs font-bold gap-1"
    >
      Lire l'analyse
      <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  </div>
</div>
```

---

## Récapitulatif des améliorations UX

| Avant | Après |
|-------|-------|
| Graphique sentiment avec labels flottants | Labels au hover, barres plus hautes, coins arrondis |
| Doublons Orange SAT/Mamadou Bamba visibles | Regroupés grâce à la comparaison par entités |
| Bouton "Enrichir" trop visible | Discret, "Lire l'analyse" devient primaire |
| Concepts Clés vide sans message | Placeholder "En attente d'analyse..." |
