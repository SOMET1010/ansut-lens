# Audit de santé RADAR — registre priorisé

> Audit multi-agents (6 dimensions + synthèse), lecture seule, constats ancrés
> au code (fichier:ligne). **2 P0 · 13 P1 · 10 P2.** Les P0 se corrigent avant
> tout le reste.
>
> **État d'avancement** : P0 #2 corrigé (envoyer-newsletter). P0 #1 = plan proposé
> (coordination CRON + secret, non déployable depuis l'agent). Le reste à traiter
> par ordre de rang.

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
| 16 | Badge de score SPDI à moitié migré (1 seuil sur 4 en tokens). | `SmartActeurCard.tsx:40-43` |
| 17 | Orange décoratif dans les blocs Newsletter Studio (aperçu in-app hors charte ; export e-mail assumé). | `newsletter/studio/blocks/*` |
| 18 | `EchoResonanceWidget` affiche des scores IA fabriqués (widget non monté en prod, mais prêt à ressurgir). | `EchoResonanceWidget.tsx:46-59` |
| 19 | Edge functions orphelines (aucun point d'appel) : analyser-visuel, ansut-notify, envoyer-document, generer-rapport-evenement, sync-directions. | `supabase/functions/*` |
| 20 | Routes admin orphelines atteignables par URL (newsletters, shadow-tracker, coffre-contenu, auto-veille, formation, presentation). | `src/App.tsx` |
| 21 | Fil d'Ariane de `/sujets` affiche le segment brut minuscule. | `Breadcrumbs.tsx:78-96` |
| 22 | 13 accès `from('table' as any)` (typage neutralisé) dans 4 hooks titrologie. | `useTitrologieAdmin.ts` |
| 23 | Composant monstre `MatinaleSections.tsx` (1039 lignes) + logique métier `as any` dans le JSX. | `MatinaleSections.tsx` |
| 24 | Catch vide qui avale une erreur de parsing et supprime un bonus de scoring sans trace. | `collecte-veille/index.ts:1111` |
| 25 | Endpoints publics d'email (reset-password, magic-link) sans rate-limiting → risque d'email bombing. | `reset-user-password`, `send-magic-link` |

---

## Synthèse

Santé globale **préoccupante côté sécurité** : deux failles d'habilitation P0
exposaient la plateforme au DoS financier, à l'injection de contenu et à l'envoi
massif au nom de l'ANSUT (P0 #2 corrigé, P0 #1 à cadrer). Un noyau de P1 mine la
**crédibilité éditoriale** (compteurs de preuves gonflables, thématiques d'acteur
non traçables, tendance/canaux SPDI structurellement faux) et la **traçabilité de
navigation** (liens profonds ignorés). Le produit reste utilisable et honnête sur
sa vitrine, mais ces points doivent être traités par ordre de rang.
