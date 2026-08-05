# Audit de santé RADAR — registre priorisé

> Audit multi-agents (6 dimensions + synthèse), lecture seule, constats ancrés
> au code (fichier:ligne). **2 P0 · 13 P1 · 10 P2.** Les P0 se corrigent avant
> tout le reste.
>
> **État d'avancement (remédiation)** :
> - ✅ **P0 #2** corrigé (auth réelle sur envoyer-newsletter).
> - ✅ **13 des 13 P1 corrigés** (dédup carte-sujet, thématiques par acteur, tendance
>   & canaux SPDI réels, activation des mentions, SMS, liens profonds, recherche
>   Sources, verdicts « Ce matin » en tokens, cercle-2 dé-ambré, contraste badges,
>   tests des preuves).
> - ✅ **10 des 10 P2 traités** : corrigés — #16 badge score en tokens, #18 widget
>   aux scores fabriqués supprimé, #21 fil d'Ariane /sujets, #22 casts titrologie
>   périmés retirés, #24 catch tracé, #25 anti email-bombing ; statués (décision
>   documentée, non destructive) — #17 orange newsletter = marque e-mail (conservé),
>   #19 edge functions orphelines (couvertes par le durcissement P0 #1), #20 routes
>   admin gardées (réintégration nav pilotée ailleurs), #23 MatinaleSections
>   (extraction incrémentale plutôt que réécriture).
> - ⏳ **Reste** : **P0 #1** seul (verify_jwt/CRON — nécessite accès Supabase).

## 🔴 P0 — à corriger avant toute autre chose

| # | Constat | Fichier | État |
|---|---|---|---|
| 1 | **`verify_jwt=false` sur 40 fonctions** service-role sans contrôle interne → invocables via la clé publique du frontend : DoS financier (Perplexity/XAI/Firecrawl/Gemini), déclenchement des pipelines, injection de contenu IA. | `supabase/config.toml` + `collecte-veille`, `enrichir-actualite`, `calculer-spdi`, `collecte-*`, etc. | ⏳ **plan** |
| 2 | **`envoyer-newsletter` : contrôle réduit à la présence de l'en-tête** — `Bearer n'importe_quoi` passe puis envoi service-role à **tous** les destinataires actifs (envoi massif au nom de l'ANSUT). | `envoyer-newsletter/index.ts:44` | ✅ **corrigé** (getUser + has_role admin) |

**Plan P0 #1** (à cadrer, non déployable d'ici) : gate à **secret partagé** (comme
`import-publications`) pour les fonctions CRON/service ; `verify_jwt=true` + contrôle
de rôle interne pour les fonctions exposées à l'UI. Nécessite de mettre à jour en
même temps les déclencheurs `pg_cron` (envoi du secret) — risque de casser la
collecte si mal fait → à faire avec accès Supabase et test.

## 🟠 P1 — crédibilité éditoriale, chiffres, navigation

| # | Constat | Fichier |
|---|---|---|
| 3 | **Compteur de preuves de la carte-sujet gonflable** : `construireSujets` ne dédoublonne pas ; `nbArticles` diverge des preuves dédupliquées de La Matinale pour le même sujet. | `src/lib/sujets.ts:120-123,189` |
| 4 | **Thématiques d'un acteur = hashtags GLOBAUX** de tous les social_insights (non filtrés par acteur) → deux acteurs comparés affichent la même liste. | `src/hooks/useActeurDigitalDashboard.ts:190-231` |
| 5 | **`tendance_spdi` : edge écrit `up/down/stable`, UI attend `hausse/baisse`** → KPI « En hausse » toujours 0, icônes toujours neutres, texte anglais brut ; de plus dérivée du niveau absolu, pas d'une évolution. | `calculer-spdi/index.ts:225` |
| 6 | **Canal « Conférences/Panels » codé en dur à 0** ; « presse » = citations mal nommées ; normalisations arbitraires sans méthode exposée. | `calculer-spdi/index.ts:215` |
| 7 | **`lier-mentions-acteurs` n'est jamais invoqué** (aucun cron/appel) → tables mentions vides, cartes acteurs sans mentions. | `lier-mentions-acteurs/index.ts` |
| 8 | **SMS d'alerte visent `sms_destinataires` (jamais peuplée)** ; l'UI écrit ailleurs (`diffusion_programmation`) → alertes SMS ne partent à personne. | `envoyer-sms/index.ts:101` |
| 9 | **Liens profonds `?article=<id>` ignorés par VeillePage** (8 émetteurs) → clic sur un article retombe sur la liste ; traçabilité rompue. | `src/pages/VeillePage.tsx:62-77` |
| 10 | **Liens `?id=` vers /acteurs et /publier ignorés** ; branche « focus » (item/q/from) = code mort. | `ActeursInfluencePage.tsx:41` · `DossiersPage.tsx:46` |
| 11 | **Résultats « Sources » de la recherche → /admin/sources** (réservé) : impasse « Accès refusé » pour non-admin. | `SpotlightSearch.tsx:220` |
| 12 | **Verdicts « Ce matin » en Tailwind brut** (rouge/emerald/bleu ~34 occ.) au lieu des tokens confirme/incident/primary. | `MatinaleSections.tsx:57-63,245-261` |
| 13 | **Orange catégoriel/décoratif** (cercle 2, catégories acteur) + hex littéral `#F97316` dans la data-viz radar (non re-thémable). | `SmartActeurCard.tsx:54` · `RadarVisualization.tsx:21` |
| 14 | **Badges de source calibrés thème sombre uniquement** (`text-*-400` sur fond clair) → illisibles en clair. | `import-acteurs/SourceBadge.tsx:51-66` |
| 15 | **Zéro test sur la logique qui produit les chiffres du briefing** (construireSujets, briefingAdapter, insightsCommunication, documentsProbants). | `src/lib/*` |

## 🟡 P2 — cohérence, dette, endpoints

| # | Constat | Fichier |
|---|---|---|
| 16 | ✅ **corrigé** — badge de score SPDI entièrement en tokens (les 4 seuils : confirme/primary/attention/incident). | `SmartActeurCard.tsx:38-43` |
| 17 | ✅ **statué (conservé)** — L'orange des blocs Newsletter Studio est la **couleur de marque de la newsletter e-mail** ANSUT. Ces blocs sont un aperçu WYSIWYG fidèle de l'e-mail exporté (orange « assumé ») : les recolorer ferait mentir l'aperçu sur le rendu réel. La charte 4-rôles régit l'UI RADAR, pas cet artefact e-mail de marque. | `newsletter/studio/blocks/*` |
| 18 | ✅ **corrigé** — `EchoResonanceWidget` (scores IA fabriqués, jamais monté) **supprimé** ainsi que son export. Plus rien ne peut ressurgir. | ~~`EchoResonanceWidget.tsx`~~ |
| 19 | 🟡 **statué (conservé, non supprimé)** — aucune de ces fonctions n'a d'appelant *dans le dépôt* ; `generer-rapport-evenement` a même un **test** (donc intentionnelle, pas morte). Un `pg_cron` côté Supabase peut en invoquer certaines (invisible d'ici). Les supprimer à l'aveugle casserait un déclencheur non visible. **Décision** : ne pas supprimer ; leur surface est neutralisée par le durcissement **P0 #1** (verify_jwt/secret partagé), qui empêche l'invocation via la clé anon publique. Décommission éventuelle à faire avec accès Supabase (vérifier les crons). | `supabase/functions/*` |
| 20 | 🟡 **statué (non destructif)** — toutes ces routes sont sous `access_admin` (+ permission fine par page) : **inaccessibles au public**, l'URL directe ne contourne pas le gating (cf. bloc Console technique dans `App.tsx`). Le seul écart est l'absence d'entrée de menu pour des features encore en cours (shadow-tracker/résonance, coffre éditorial, auto-veille). Leur **réintégration au produit** est déjà pilotée par l'effort « Remonter la valeur éditoriale ». **Décision** : ne pas supprimer des features gardées et potentiellement en construction (règle « ne pas détruire ce que je n'ai pas créé »). | `src/App.tsx` |
| 21 | ✅ **corrigé** — `/sujets` libellé « Tous les sujets » dans le fil d'Ariane. | `Breadcrumbs.tsx` |
| 22 | ✅ **corrigé** — les tables `titrologie_sources/keywords/runs` figurent désormais dans les types Supabase générés : les casts `from('table' as any)` étaient **périmés**. Tous retirés (9 restants), typage réel restauré (build vert = types conformes). | `useTitrologieAdmin.ts`, `useTitrologieRuns.ts` |
| 23 | 🟡 **statué (report tracé)** — `MatinaleSections.tsx` (~1039 lignes) alimente l'écran-phare « Ce matin » et **n'a aucun test**. Un refactor big-bang y ferait courir un risque de régression disproportionné pour un P2. Il vient d'être durci (tokens, lot 7). **Décision** : extraction **incrémentale** (sortir la logique métier `as any` vers `src/lib/`, un bloc à la fois, chacun couvert par un test) plutôt qu'une réécriture — à mener comme chantier dédié, pas comme nettoyage P2. | `MatinaleSections.tsx` |
| 24 | ✅ **corrigé** — le catch d'`analyse_ia` journalise l'incident (id d'actualité) au lieu d'avaler l'erreur ; la perte du bonus quadrant du matching de flux n'est plus invisible. | `collecte-veille/index.ts` |
| 25 | ✅ **corrigé** — garde-fou anti email-bombing : migration `auth_email_throttle` + fonction SQL atomique `consommer_quota_email`, helper `_shared/emailRateLimit.ts` (3/15 min par adresse, 15/h par IP), 429 générique, fail-open tracé. | `reset-user-password`, `send-magic-link`, `_shared/emailRateLimit.ts` |

---

## Synthèse

Santé globale **préoccupante côté sécurité** : deux failles d'habilitation P0
exposaient la plateforme au DoS financier, à l'injection de contenu et à l'envoi
massif au nom de l'ANSUT (P0 #2 corrigé, P0 #1 à cadrer). Un noyau de P1 mine la
**crédibilité éditoriale** (compteurs de preuves gonflables, thématiques d'acteur
non traçables, tendance/canaux SPDI structurellement faux) et la **traçabilité de
navigation** (liens profonds ignorés). Le produit reste utilisable et honnête sur
sa vitrine, mais ces points doivent être traités par ordre de rang.
