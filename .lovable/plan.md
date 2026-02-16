
# Automatisation du sentiment a l'ingestion des articles

## Probleme

Actuellement, les articles collectes par `collecte-veille` sont inseres **sans score de sentiment**. Le champ `sentiment` reste `null` jusqu'a ce qu'un utilisateur clique manuellement sur "Analyser sentiments" depuis l'interface. Cela signifie que les dashboards SPDI et les barres de sentiment affichent "Aucune donnee" pour tous les nouveaux articles.

## Solution

Integrer l'analyse de sentiment par IA directement dans la fonction `collecte-veille`, juste apres l'insertion des articles. Les articles nouvellement inseres seront analyses en batch via le Lovable AI Gateway (Gemini Flash Lite) et mis a jour avec leur score de sentiment avant la fin de l'execution.

## Modifications

### Fichier unique : `supabase/functions/collecte-veille/index.ts`

1. **Ajouter une fonction `analyzeSentimentInline`** : Fonction legere qui prend une liste d'articles (titre + resume), appelle le Lovable AI Gateway avec le meme prompt que `enrichir-actualite`, et retourne une map `id -> score`.

2. **Collecter les IDs des articles inseres** : Modifier l'insertion pour utiliser `.insert(...).select('id')` afin de recuperer les IDs des articles nouvellement crees.

3. **Appeler l'analyse sentiment apres les insertions** : Apres la boucle d'insertion (ligne 481), ajouter un bloc qui :
   - Verifie que `LOVABLE_API_KEY` est disponible
   - Regroupe les articles inseres (titre + resume + id)
   - Appelle `analyzeSentimentInline` par lots de 20
   - Met a jour chaque article avec son score de sentiment
   - Logue le nombre d'articles enrichis

4. **Gestion d'erreur non-bloquante** : Si l'API IA echoue ou si la cle n'est pas configuree, la collecte continue normalement -- le sentiment sera simplement `null` et pourra etre enrichi plus tard via le bouton manuel.

## Flux d'execution mis a jour

```text
collecte-veille
  |
  +-- 1. Recuperer mots-cles
  +-- 2. Appeler Perplexity + Grok en parallele
  +-- 3. Inserer articles (avec recuperation des IDs)
  +-- 4. [NOUVEAU] Analyser sentiment par batch IA
  +-- 5. Matcher flux utilisateurs
  +-- 6. Logger la collecte
```

## Details techniques

- Modele utilise : `google/gemini-2.5-flash-lite` (le plus rapide et economique, suffisant pour la classification de sentiment)
- Taille de lot : 20 articles par appel API (identique a `enrichir-actualite`)
- Le score est un nombre entre -1.0 et +1.0, arrondi a 2 decimales
- La reponse de collecte inclura un nouveau champ `nb_sentiments_enrichis`
- Aucune modification de base de donnees necessaire
