

## Plan : Utiliser Perplexity pour ancrer la Matinale dans des sources réelles

### Problème actuel
La Matinale s'appuie uniquement sur les articles déjà en base (`actualites`) + un LLM (Gemini) pour générer le briefing. Si la base est vide ou pauvre, le LLM invente des noms, des faits, des URLs.

### Solution : Pipeline en 2 étapes

**Étape 1 — Perplexity collecte les actualités fraîches (grounded)**
- Appeler Perplexity `sonar` avec des requêtes ciblées (ex: "actualités télécommunications Côte d'Ivoire ANSUT ARTCI aujourd'hui")
- Perplexity retourne du contenu **avec citations/URLs vérifiées**
- Combiner ces résultats avec les articles déjà en base

**Étape 2 — Lovable AI structure le briefing (tool calling)**
- Le contexte enrichi (Perplexity + base) est passé à Gemini
- Gemini fait uniquement la mise en forme JSON via tool calling (comme actuellement)
- Température 0.3 conservée + contraintes anti-hallucination existantes

### Modifications techniques

**Fichier : `supabase/functions/generer-matinale/index.ts`**

1. Ajouter une fonction `fetchPerplexityNews()` qui :
   - Envoie 2-3 requêtes Perplexity `sonar` avec `search_recency_filter: 'day'` :
     - "Actualités télécommunications numérique Côte d'Ivoire aujourd'hui"
     - "ANSUT ARTCI service universel Côte d'Ivoire"
     - "Opérateurs telecoms Afrique de l'Ouest"
   - Récupère le contenu + les `citations` (URLs vérifiées par Perplexity)
   - Formate en liste structurée avec source + URL

2. Injecter ces résultats Perplexity dans le contexte existant sous une nouvelle section :
   ```
   === ACTUALITÉS TEMPS RÉEL (via recherche web) ===
   [P1] "Titre..." (source: example.com, url: https://...) 
   ```

3. Le prompt Gemini reste identique — il reçoit simplement un contexte plus riche et vérifié

### Avantages
- Les URLs sont **réelles** (vérifiées par Perplexity)
- Les noms/faits sont **ancrés** dans des articles existants
- La Matinale fonctionne même si la base `actualites` est vide
- Coût modéré : 2-3 appels Perplexity `sonar` par Matinale

### Aucune modification côté frontend
Le format de sortie reste identique — seule la qualité du contenu s'améliore.

