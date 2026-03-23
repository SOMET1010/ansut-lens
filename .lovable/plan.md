

## Plan : Eliminer les sources hallucinees du flux d'actualites

### Probleme identifie
La base contient des dizaines d'articles Perplexity sans URL verifiee (`source_url = null`, `url_verified = false`). Ces articles ont des titres plausibles mais probablement fabriques par l'IA (ex: "ARTCI sanctionne l'ANSUT", "Cyberattaque majeure paralyse Orange CI et MTN").

La cause : Perplexity retourne des articles sans `citation_index`, et le code les insere quand meme en DB sans URL.

### Corrections

**1. `collecte-veille/index.ts` — Rejeter les articles sans URL verifiee**

Dans la section d'insertion (ligne ~727), ajouter une condition : ne PAS inserer un article Perplexity ou Grok si `url_verified === false` ET `source_url` est vide. Seuls les articles avec une citation reelle (URL provenant du tableau `citations[]` de Perplexity) seront conserves.

```
// Avant insertion :
if (!actu.url_verified && (!actu.url || actu.url === '')) {
  console.warn(`[collecte-veille] Article rejeté (pas d'URL vérifiée): "${actu.titre}"`);
  continue;
}
```

**2. Ajouter une verification HEAD sur les URLs Perplexity**

Actuellement, les URLs de citations Perplexity sont marquees `url_verified = true` sans verification reelle (seul Grok fait un `verifyUrlExists`). Ajouter la meme verification HEAD pour Perplexity.

**3. Nettoyage de la base existante**

Creer une migration SQL pour supprimer les articles sans URL verifiee deja en base :
```sql
DELETE FROM actualites 
WHERE source_url IS NULL 
  AND source_type = 'perplexity';
```

**4. Renforcer le filtrage Firecrawl/Google News**

Les articles Google News (via Firecrawl) sont deja marques `url_verified: true` car ils viennent de resultats de recherche reels avec URL. Pas de changement necessaire ici.

### Resume des modifications

| Fichier / Action | Changement |
|---|---|
| `supabase/functions/collecte-veille/index.ts` | Rejeter articles sans URL verifiee avant insertion |
| `supabase/functions/collecte-veille/index.ts` | Ajouter HEAD check sur URLs citations Perplexity |
| Migration SQL | Purger les articles hallucines existants (source_url null + perplexity) |

