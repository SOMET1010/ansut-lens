---
name: Citation Validation Runtime
description: Validation post-génération des citations [N], [[ACTU:id]], [[DOSSIER:id]] et URLs contre le contexte injecté
type: feature
---
Les fonctions Edge `generer-briefing` et `assistant-ia` valident chaque réponse IA avant retour au client :
- `generer-briefing` : retire les `[N]` et URLs absents de `sourcesMap` ; renvoie `validation.invalid_citations_removed` et `invalid_urls_removed`.
- `assistant-ia` (stream) : passe la réponse SSE à travers un `TransformStream`, accumule le texte, vérifie chaque `[[ACTU:uuid]]` et `[[DOSSIER:uuid]]` contre les IDs réellement injectés ; en cas d'invalidité, ajoute un événement SSE `{type:"citation_validation", invalid_actu_ids, invalid_dossier_ids}` à la fin du flux.
Le client peut afficher un avertissement quand cet événement arrive.
