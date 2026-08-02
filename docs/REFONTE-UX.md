# Refonte de l'expérience — ANSUT RADAR

Rapport d'audit et guide de reprise consolidé. Ce document trace le périmètre
de la refonte de l'expérience utilisateur, ce qui a été livré et vérifié, et ce
qui reste ouvert pour la suite. Il s'adresse aux personnes qui reprendront le
projet (équipe Lovable ou autre).

**État à la clôture de cette étape :** build de production vert, refonte de la
navigation et de la performance intégrée, anomalies de recette authentifiée
corrigées. Une recommandation backend reste ouverte (pertinence de la veille).

---

## 1. Contexte et objectifs

L'audit portait sur la lisibilité, la cohérence et la performance de la
plateforme, avec trois objectifs :

1. **Réduire la surcharge de navigation** — 8 entrées de menu et 25 cartes
   d'administration exposaient un vocabulaire technique interne (« Shadow
   Tracker VIP », « SPDI Batch », « Auto-Veille ») incompréhensible pour un
   utilisateur métier.
2. **Alléger le chemin critique de chargement** — l'application se chargeait via
   un chunk JavaScript unique de 3 972 kB (1 119 kB gzip).
3. **Rendre l'interface accessible et honnête** — libellés accessibles manquants
   sur les boutons icône, et actions affichant un faux succès (« Brouillon
   enregistré » sans rien enregistrer).

---

## 2. Nouvelle architecture de navigation

Une source unique de vérité (`src/config/navigation.ts`) alimente la barre
latérale, le fil d'Ariane, la navigation mobile et la recherche. Les sections
ont été renommées avec un vocabulaire métier, et **toutes les anciennes URL sont
redirigées** dans `src/App.tsx` (`<Navigate replace>`), ce qui évite de casser
les liens existants.

| Avant | Après | Route |
|---|---|---|
| Accueil / Radar | Ce matin | `/ce-matin` (ex `/radar`) |
| (onglet Flux complet) | Veille | `/veille` (ex `/actualites`, `/medias`) |
| Balayage 30 jours | Recherche | `/recherche` (ex `/balayage`) |
| Capteurs Stratégiques | Surveillance | `/surveillance` (ex `/flux`) |
| Acteurs & Influence | Acteurs | `/acteurs` |
| Communication 360° | Notre communication | `/communication` |
| Studio Publication | Publier | `/publier` (ex `/dossiers`) |
| Assistant IA | Assistant | `/assistant` + bouton flottant permanent |
| Administration | Réglages | `/admin` |
| — | Aide et glossaire | `/aide` (nouveau) |

### Pages et composants structurants créés

- `src/pages/CeMatinPage.tsx` — page d'accueil en 4 strates (alerte critique,
  chiffres clés, sujets du jour, prochaine action), sans onglets empilés.
- `src/pages/VeillePage.tsx` — veille dédiée (ex-onglet « Flux complet »).
- `src/pages/AidePage.tsx` — aide et glossaire des 16 termes métier.
- `src/config/glossaire.ts` + `src/components/common/TermeMetier.tsx` — infobulle
  de définition accessible au clavier pour le vocabulaire spécialisé.
- `src/components/common/` — `PageHeader`, `PageContainer`, `ProchaineAction`,
  `ChiffreCle`, `SectionRepliable` (remplace le masquage mobile pur),
  `RouteSkeleton`.
- `src/components/layout/` — `Breadcrumbs`, `MobileNav`, `AssistantFlottant`.

Le thème par défaut est désormais **clair** (`defaultTheme="light"` dans
`App.tsx`), avec bascule système conservée.

---

## 3. Performance du chargement initial

Le passage de toutes les routes en `React.lazy` + `Suspense` et une stratégie de
`manualChunks` dans `vite.config.ts` ont réduit le chemin critique.

| Étape | Chemin critique (gzip) |
|---|---|
| Avant refonte | 1 119 kB (chunk unique 3 972 kB) |
| Après lazy + manualChunks v1 | 790 kB |
| Après isolation `commonjsHelpers` / icons / base | 400 kB |
| **Après rattachement des dépendances jsPDF** | **≈ 270 kB** |

Causes racines identifiées et corrigées :

1. Les modules virtuels `vite/preload-helper.js` et `commonjsHelpers.js` étaient
   rangés par Rollup dans `vendor-documents`, forçant jsPDF/docx (≈ 1,5 Mo) dans
   le chemin critique. Ils sont désormais assignés explicitement au chunk
   `index`.
2. Les dépendances transitives de jsPDF (`pako`, `canvg`, `core-js`,
   `dompurify`) et l'écosystème `unified`/react-markdown (~25 paquets) ont été
   regroupés dans leurs propres vendors.

**Vérification build (cette étape) :** `vendor-documents` (1 535 kB / 475 kB
gzip) n'est plus chargé au démarrage — il n'est tiré que par les écrans qui
exportent en PDF/DOCX. Le build passe (`npm run build`, ✓ sans erreur).

---

## 4. Accessibilité

- Libellés accessibles ajoutés sur l'ensemble des boutons icône (`aria-label`
  ou texte `sr-only` en français), pour ne laisser aucun bouton sans nom
  accessible.
- Le masquage pur sous `lg` a été remplacé par des sections repliables
  (`SectionRepliable`), pour que le contenu reste atteignable sur mobile.
- Infobulles de glossaire navigables au clavier (`TermeMetier`).

---

## 5. Réglages réorganisés (ex-Administration)

`src/config/reglages.ts` déclare les entrées d'administration regroupées en
sections formulées en questions métier (« Qui peut utiliser la plateforme ? »,
« Que surveille la plateforme ? », « Comment l'information est traitée ? »…).
`AdminPage.tsx` propose une recherche interne qui reconnaît les anciens noms
(synonymes), des lignes compactes et un filtrage par permission.

Renommages notables : « Shadow Tracker VIP » → « Veille discrète des
dirigeants », « Coffre-fort Contenus » → « Coffre à contenus », « Statut SPDI
Batch » → « État du calcul des scores », « Tâches CRON » → « Tâches
programmées », « Audit Logs » → « Journal des actions », « Auto-Veille
Institutionnelle » → « Résonance de nos publications ».

---

## 6. Recette authentifiée — anomalies et résolutions

Recette menée en session authentifiée sur données réelles. Anomalies relevées et
état de correction :

| Réf | Anomalie | Résolution |
|---|---|---|
| A1 | Doublons de genre illisibles (« Aucun·e mention », « signal·aux classé·s ») | Corrigé : accord réel selon le nombre, sans point médian. |
| A2 | Chiffres à zéro sans interprétation actionnable | Corrigé : les phrases d'interprétation orientent vers le réglage ou l'action correspondante. |
| A3 | Titre de page redondant avec le fil d'Ariane | Corrigé : en-tête unifié (`PageHeader`), plus de double titre. |
| A4 | Double titre sur Veille (« Veille » + « Actualités & Veille ») | Corrigé : le titre hérité interne a été supprimé au profit de l'en-tête unifié. |
| A5 | Le filtre `?niveau=critical` de « Examiner » était ignoré | Corrigé par conception : les signaux critiques (table `signaux`) et les articles (table `actualites`) n'ont pas de champ commun permettant un filtre honnête. Plutôt que de simuler un filtre, les signaux critiques sont **dépliables sur place** sur l'accueil, sans changement d'écran (voir le commentaire d'intention dans `CeMatinPage.tsx`). |
| A6 | Markdown brut et URL non assainis dans les extraits **et les titres** | Corrigé : `src/lib/nettoyerExtrait.ts` expose `nettoyerExtrait` (extraits, tronqués) et `nettoyerTitre` (titres, non tronqués). Appliqué aux extraits (`ArticleCluster`, `PourVousFeed`, `SocialPulseWidget`, `EchoResonanceWidget`, `PostsAmplifierSection`…) et aux **titres d'articles collectés** (`ArticleCluster`, `FluxDetailPage`, `SpotlightSearch`, `ContextSelector`, `IntelligenceCard`, `SentimentSourcePopover`, flash info de la Matinale). |
| A7 | Indicateur de pertinence constant à 50 % | **Corrigé** — front (utilise `score_pertinence` en priorité) et **backend** : la collecte calcule et persiste désormais un vrai `score_pertinence`. Détail des corrections du pipeline en §8. |

**Le texte vit dans les composants, pas dans les pages.** Homogénéiser les
en-têtes de page ne suffit pas : l'essentiel du vocabulaire affiché (titres de
section, libellés, extraits) est porté par les composants. Le jargon interne
(« Cockpit Réputationnel », « Posts à Amplifier ») a été remplacé par des
formulations métier (« Notre présence en ligne », « Publications à relayer »),
les emojis décoratifs par des icônes vectorielles (rendu stable, lecture d'écran
prévisible), et le Markdown brut assaini y compris dans les titres. La page
« Notre communication » a servi de cas d'étude à cette passe.

Faux message de succès — corrigé également : `DocumentWorkspace.tsx`
(`handleSaveDraft`) écrit désormais réellement le brouillon dans la table
`dossiers` (statut `brouillon`) et, en cas d'échec, invite explicitement à copier
ou exporter le texte avant de fermer.

---

## 7. Vérification à la clôture de cette étape

- `npm run build` : **succès**, chunks correctement séparés, `vendor-documents`
  hors du chemin critique.
- `npm run lint` : le projet reste sur ~343 erreurs `@typescript-eslint/no-explicit-any`,
  **préexistantes** et concentrées dans les Edge Functions Deno
  (`supabase/functions/`). Elles ne sont pas introduites par la refonte et n'ont
  pas été traitées ici (dette technique de fond, hors périmètre). À planifier
  séparément si le durcissement des types est souhaité.
- Aucun cadre de test n'est configuré dans le projet (`package.json` sans script
  `test`) : la validation repose sur le build et la recette manuelle.

---

## 8. Reste à faire / recommandations pour la reprise

### Pertinence de la veille (backend) — corrigé

La cause racine de A7 (pertinence uniforme à 50 %) était dans l'Edge Function de
collecte `supabase/functions/collecte-veille/index.ts`. Les défauts identifiés à
l'audit ont été traités :

| Défaut | Correction |
|---|---|
| Appariement par sous-chaîne (`includes`) → faux positifs (« ia » dans « média », « reseau » dans « reseaux ») | `contientTerme()` : appariement par **frontière de mot**, accents normalisés. |
| Le score d'importance mesurait la densité d'appariement, pas la pertinence (d'où le 50 % constant) | Vrai **`score_pertinence`** écrit en base : criticité du thème le plus fort + bonus de corroboration plafonné ; `importance` alignée sur cette valeur 0-100. |
| Filtrage sémantique plafonné à 30 articles, silencieusement | Traitement **par lots** jusqu'à 90 articles, et **journalisation** explicite de ce qui est écarté au-delà. |
| Seuil sémantique à 50/100 | Relevé à **60** (`SEUIL_SEMANTIQUE`). |
| Déduplication sur le titre exact | **`cleDedup()`** : dédup sur titre normalisé (accents, ponctuation, balisage retirés), pré-chargée sur 30 jours et intra-cycle. |

La logique des fonctions (`contientTerme`, `cleDedup`, scoring) a été validée par
un test isolé. Le front (`ArticleCluster`) lit déjà `score_pertinence` en
priorité : les nouvelles collectes affichent une pertinence qui varie réellement.

**Mitigation restante (défaut 4 de l'audit).** Le filtrage sémantique ne
s'applique toujours qu'aux articles **non appariés** par mot-clé ; un éventuel
faux positif d'appariement n'est pas revérifié par le modèle. L'appariement par
frontière de mot supprime le mécanisme principal de ces faux positifs, mais une
vérification sémantique des articles appariés sur un seul mot-clé court et peu
critique reste un durcissement possible (coût LLM supplémentaire).

> Ces changements touchent la chaîne de collecte et le projet n'a pas de tests
> automatisés : valider en préproduction (lancer une collecte, contrôler les
> `score_pertinence` obtenus) avant la mise en production.

### Divers

- Pages historiques `RadarPage.tsx` et `ActualitesPage.tsx` : supprimées, leurs
  routes redirigent vers `/ce-matin` et `/veille`. Rien à faire, mentionné pour
  mémoire.
- Durcissement TypeScript des Edge Functions (`no-explicit-any`) : chantier de
  fond distinct, cf. §7.

---

*Dernière mise à jour : août 2026.*
