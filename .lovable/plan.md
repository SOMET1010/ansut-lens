
# Enrichissement batch du sentiment via l'IA

## Contexte

La fonction backend `enrichir-actualite` supporte deja un mode `batch_sentiment` qui analyse le sentiment des articles via l'IA. Cependant, il n'existe aucun moyen de le declencher depuis l'interface. Actuellement les 509 articles ont deja un sentiment, mais les futurs articles collectes arriveront sans sentiment.

## Modifications

### 1. Hook `useActualites.ts` -- Ajouter une mutation batch sentiment

Ajouter un nouveau hook `useBatchSentiment` qui :
- Appelle `enrichir-actualite` avec `{ batch_sentiment: true, limit: 200 }`
- Invalide le cache `actualites` apres succes
- Affiche un toast avec le nombre d'articles enrichis

### 2. Page `ActualitesPage.tsx` -- Ajouter le bouton et l'etat

- Importer et utiliser le nouveau hook `useBatchSentiment`
- Passer la mutation au composant `WatchHeader`

### 3. Composant `WatchHeader.tsx` -- Ajouter un bouton "Enrichir sentiments"

- Ajouter une prop optionnelle `onBatchSentiment` et `isBatchingSentiment`
- Ajouter un bouton avec icone `Sparkles` dans la barre d'actions, a cote du bouton Rafraichir
- Le bouton affiche un spinner pendant le traitement
- Le bouton indique le nombre d'articles sans sentiment si disponible (optionnel)

## Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useActualites.ts` | Ajouter hook `useBatchSentiment` |
| `src/pages/ActualitesPage.tsx` | Brancher le hook et passer au header |
| `src/components/actualites/WatchHeader.tsx` | Ajouter bouton "Analyser sentiments" |

## Details techniques

Le hook appellera :
```typescript
supabase.functions.invoke('enrichir-actualite', {
  body: { batch_sentiment: true, limit: 200 }
})
```

Le bouton sera desactive si aucun article n'est sans sentiment ou si le traitement est en cours. Un toast informera du resultat : "X articles enrichis sur Y traites".
