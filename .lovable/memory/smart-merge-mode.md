---
name: Mode Fusionner intelligemment
description: Déduplication transverse des actualités entre matinale, briefing DG et assistant IA via module partagé
type: feature
---
Module partagé `supabase/functions/_shared/dedup-actualites.ts` exposant `consolidateActualites`, `formatConsolidatedForPrompt`, `buildSourcesMap`.

Règles de détection de doublons :
1. Même URL canonique (host+path normalisés)
2. Similarité titre Jaccard > 0.6 sur tokens >= 4 chars (stop-words FR/EN exclus)
3. Sim titre > 0.35 ET >= 2 entités (personnes/entreprises) communes

Consolidation : conserve l'article le plus riche (importance + résumé + impact_ansut + entités) comme `primary` ; agrège toutes les sources distinctes dans `sources[]` ; assigne une référence `[N]` unique triée par richesse.

Intégrations :
- `generer-briefing` : remplace l'ancien dédoublon par titre. Renvoie `validation.duplicates_merged`.
- `assistant-ia` : consolide les 20 dernières actus injectées dans le prompt système (citation `[[ACTU:id]]` avec marqueur `[×N sources]`).
- `generer-matinale` : fusionne articles DB + résultats Perplexity en un seul bloc `ACTUALITÉS CONSOLIDÉES`.
