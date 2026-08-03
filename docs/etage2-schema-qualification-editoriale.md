# Étage 2 — Schéma de qualification éditoriale (PROPOSITION à valider)

> **Ce document est une proposition de conception. Aucune migration n'est écrite
> ni appliquée.** Il répond à la demande : valider le modèle *avant* de figer la
> base. Après ton accord (choix Option A/B + modèle de liaison), j'écris la
> migration — je ne l'applique ni ne la merge sans ton feu vert.
>
> Critère de réussite : **un contenu est qualifié une fois, de manière traçable
> et versionnée, puis toutes les vues réutilisent cette qualification sans
> réinventer leur propre logique.**

## 0. Contrainte structurante — un contenu vit dans deux tables

Aujourd'hui, une prise de parole ANSUT est stockée **deux fois** :
- dans `publications_institutionnelles` (source native : plateforme, engagement,
  médias, provenance de date déjà en place) ;
- **et** dans `actualites` via le pont `injectIntoActualites`
  (`actualites.source_url = publications_institutionnelles.url_original`).

De plus `actualites` porte déjà des champs semi-éditoriaux peuplés par l'IA
(`categorie`, `piliers`, `pilier_id`, `confiance_ia`).

**Conséquence de conception** : si on ajoutait des colonnes de qualification sur
*chaque* table, on qualifierait le même contenu deux fois, avec risque de
divergence. Il faut **une identité de contenu unique** au-dessus des deux tables.

→ On introduit une **clé de contenu stable** `content_key` :
- `content_key = url canonique normalisée` (schéma/host/path en minuscules, sans
  paramètres de tracking) quand une URL existe ;
- sinon `content_key = 'hash:' + sha256(texte normalisé)`.

Une seule qualification par `content_key`. Les deux lignes (publication + actualité)
pointent vers **la même** qualification. Fin de la duplication.

## 1. Principe de stockage retenu

Une **table dédiée** `editorial_qualifications`, séparée des tables de contenu :
- pas de colonnes de qualification dispersées ni dupliquées ;
- liaison par `content_key` (identité), + références typées facultatives pour les
  jointures et l'intégrité (`ON DELETE CASCADE`) ;
- extensible à de futurs types de contenu (RSS, presse, partenaires) sans toucher
  aux tables sources.

## 2. Le débat central — où vivent les éligibilités ? (A vs B)

C'est l'arbitrage le plus important, comme tu l'as pressenti.

### Option A — Éligibilités persistées (booléens `eligible_*` stockés)
- **Avantage** : lecture/filtre SQL immédiats.
- **Risques** :
  1. **La fraîcheur est relative au temps.** `eligible_ce_matin`, `eligible_insights`
     dépendent d'une **fenêtre** (7/30/90 j, « aujourd'hui ») choisie *par la vue au
     moment du rendu*. Un booléen figé serait **faux dès le lendemain** (un contenu
     « récent » ne l'est plus) — ce serait un `Math.random()` temporel, contraire à
     la Charte.
  2. **Couplage aux écrans** : toute évolution d'une politique d'écran force à
     **requalifier toutes les anciennes lignes**.

### Option B — Faits éditoriaux persistés, éligibilités DÉRIVÉES *(recommandée)*
On persiste uniquement les **faits stables et intemporels** :
- date fiable (`editorial_date`, `date_verified`, `date_source`) ;
- `category` ; `primary_theme` / `secondary_themes` ;
- `is_ansut_voice` ; `is_institutional` ;
- (la **nature** institutionnelle/communautaire est un fait ; la **fraîcheur** ne
  l'est pas — on stocke la *date*, pas une classe « récent » qui pourrirait).

Les éligibilités sont calculées par un **service central de politiques éditoriales
versionné** — un module TS pur, `politiquesEditoriales.ts`, **hors composant
React** — fonction déterministe de `(faits, paramètres de vue)` :

```ts
eligibleInsights(faits, { fenetreJours, maintenantMs })  // dépend de la fenêtre
eligibleCeMatin(faits, { maintenantMs })
eligibleNotreCommunication(faits)                        // = is_ansut_voice
eligibleVeille(faits)                                    // = !is_ansut_voice && date_verified
```

- **Avantage** : aucun couplage figé ; changer une politique d'écran ne requalifie
  **aucune** ligne ; la fraîcheur reste honnête car recalculée à la lecture depuis
  la *date* réelle. « Les vues réutilisent la même intelligence » = elles appellent
  **le même module de politiques**, pas leurs propres règles.
- **Coût** : le filtre « fenêtre » se fait à la lecture (aujourd'hui `limit 500`,
  volume faible → négligeable ; si besoin plus tard, une **vue SQL** ou une colonne
  générée `editorial_date` indexée suffit à filtrer par date côté base).

**Recommandation argumentée : Option B.** La raison décisive n'est pas la
préférence esthétique, c'est que **les éligibilités de fraîcheur sont
intrinsèquement dépendantes de la fenêtre de la vue** : les figer en base produit
des booléens faux avec le temps. On persiste des faits vrais et stables ; on dérive
les éligibilités via une politique commune versionnée. Cela satisfait pleinement le
contrat « qualifié une fois, réutilisé partout » sans coupler la base aux écrans.

*(Nuance : `is_ansut_voice` et `is_institutional` SONT des faits stables → ils
peuvent servir directement de base à `eligibleNotreCommunication` / `eligibleVeille`,
qui ne dépendent pas du temps. C'est cohérent avec B.)*

## 3. Table proposée `editorial_qualifications` (Option B)

| Colonne | Type | Null | Défaut | Provenance | Déterministe / IA | Règle de MàJ |
|---|---|---|---|---|---|---|
| `id` | uuid | non | `gen_random_uuid()` | technique | — | immuable |
| `content_key` | text | non | — (UNIQUE) | dérivé (URL/hash) | déterministe | stable |
| `publication_id` | uuid | oui | null | FK `publications_institutionnelles(id)` ON DELETE CASCADE | — | set au rattachement |
| `actualite_id` | uuid | oui | null | FK `actualites(id)` ON DELETE CASCADE | — | set au rattachement |
| `editorial_date` | timestamptz | oui | null | `date_publication` **si vérifiée** | déterministe | à requalification |
| `date_verified` | boolean | non | `false` | `publication_date_verified` | déterministe | à requalification |
| `date_source` | text | non | `'unknown'` | `publication_date_source` (même enum) | déterministe | à requalification |
| `category` | text | non | `'autre'` | `categoriserCommunication()` | déterministe | à requalification |
| `primary_theme` | text | oui | null | 1er pilier apparié | déterministe | à requalification |
| `secondary_themes` | text[] | non | `'{}'` | piliers appariés (frontière de mot) | déterministe | à requalification |
| `is_institutional` | boolean | non | `false` | thème présent ET catégorie institutionnelle | déterministe | à requalification |
| `is_ansut_voice` | boolean | non | `false` | source officielle ANSUT | déterministe (fait de source) | stable |
| `evidence` | jsonb | non | `'{}'` | mots-clés/règles déclencheurs, provenance | déterministe (+ IA) | à requalification |
| `limitations` | text[] | non | `'{}'` | ex. « date non vérifiée », « thème incertain » | déterministe (+ IA) | à requalification |
| `qualification_method` | text | non | `'deterministic'` | `deterministic \| ai \| hybrid` | — | selon passe |
| `rules_version` | integer | non | `1` | version des règles déterministes | — | incrément global |
| `ai_version` | integer | oui | null | version de la passe IA (étage 4) | IA | quand IA passe |
| `qualified_at` | timestamptz | non | `now()` | horodatage de qualification | — | à chaque (re)qualif |
| `created_at` | timestamptz | non | `now()` | technique | — | immuable |
| `updated_at` | timestamptz | non | `now()` | technique | — | trigger |

**Contraintes** :
- `UNIQUE (content_key)` — une qualification par contenu réel.
- `CHECK (publication_id IS NOT NULL OR actualite_id IS NOT NULL)` — rattachée à ≥1 ligne.
- `CHECK (category IN (…8 valeurs…))`.
- `CHECK (date_source IN ('absolute_source','platform_metadata','relative_text','inferred','unknown'))`.
- `CHECK (qualification_method IN ('deterministic','ai','hybrid'))`.

**Index** :
- `unique(content_key)` ; `idx(publication_id)` ; `idx(actualite_id)` ;
- `idx(editorial_date)` — filtre par fenêtre côté base si besoin ;
- `idx(is_ansut_voice, date_verified)` — Notre communication / Insights / Veille ;
- `idx(category)` ; `gin(secondary_themes)`.

**RLS** : `select` pour les rôles applicatifs (comme les tables de contenu) ;
`insert/update` réservés au service role (édité par le pipeline, jamais le front).

> Champs que tu avais listés et **volontairement NON persistés** en B :
> `editorial_freshness` (relatif au temps → dérivé), `eligible_*` (dérivés par
> politique versionnée). `publication_date_verified` est conservé sous
> `date_verified`. `qualification_source` → `qualification_method` + `date_source`.

## 4. Ce qui est déterministe vs proposé par l'IA

- **Déterministe (étage 2, cette proposition)** : dates + provenance, `category`,
  thèmes, `is_institutional`, `is_ansut_voice`, `evidence` des règles. Rejoue
  exactement `qualificationContenu.ts` → parité garantie avec la logique actuelle.
- **IA (étage 4, plus tard)** : enrichissement du même enregistrement — résumé, ton,
  acteurs, récit, `limitations` affinées — écrit dans `evidence`/`ai_version`,
  **jamais** en écrasant les faits déterministes. L'IA **explique, ne décide pas**.

## 5. Versionnement & requalification

- `rules_version` : constante applicative (`QUALIFICATION_RULES_VERSION`). Quand on
  change une règle déterministe (ex. nouveaux mots-clés IA/blockchain de PR #21),
  on l'incrémente.
- **Détecter les contenus à requalifier** : `WHERE rules_version < $CURRENT`.
- **Requalifier** = recalcul idempotent (upsert par `content_key`), `qualified_at`
  mis à jour, aucun contenu source modifié.
- `ai_version` suit la même logique pour la passe IA, indépendamment.

## 6. Échantillon de 10 contenus et qualification attendue

Basé sur les règles actuelles (`qualifier()`), pour vérifier le modèle *avant* code.
`AV` = `is_ansut_voice`, `INST` = `is_institutional`, `DV` = `date_verified`.

| # | Contenu (extrait) | Source | `category` | thèmes | AV | INST | DV / date | Éligibilités dérivées (ex. fenêtre 30 j au 2026-08-03) |
|---|---|---|---|---|---|---|---|---|
| 1 | « GITEX 2026 : l'ANSUT au rendez-vous… » | X ANSUT | evenementielle | P1?, P3 | ✅ | ✅ | ✅ 2026-04-08 | NotreComm ✅ (étiqueté ancien) · Insights ❌ (>30 j) · CeMatin ❌ |
| 2 | « …application DIGITAL FANZONE / football » | YouTube ANSUT | sportive | — | ✅ | ❌ | ❌ NULL | NotreComm ✅ (non daté, marqué) · Insights ❌ · CeMatin ❌ |
| 3 | « Félicitations à nos champions d'Ébimpé » | YouTube ANSUT | protocolaire | — | ✅ | ❌ | ❌ NULL | NotreComm ✅ (marqué) · autres ❌ |
| 4 | « Déploiement fibre : 300 localités raccordées » | site ANSUT | programme | P1 | ✅ | ✅ | ✅ metadata | NotreComm ✅ · Insights ✅ (si <30 j) · CeMatin ✅ (si récent) |
| 5 | « Starlink lance ses offres en Côte d'Ivoire » | presse | autre | P1 | ❌ | ❌ | ✅ | Veille ✅ · NotreComm ❌ · Insights ❌ |
| 6 | « Signature d'une convention Identité Numérique » | LinkedIn ANSUT | institutionnelle | P2 | ✅ | ✅ | ✅ metadata | NotreComm ✅ · Insights ✅ · CeMatin ✅ |
| 7 | « Formation Digital Literacy à l'IA et la blockchain » | site ANSUT | programme/evenementielle | P3 | ✅ | ✅ | ✅ | NotreComm ✅ · Insights ✅ *(P3 détecté grâce à PR #21)* |
| 8 | « Téléchargez l'appli, jeu concours » | Facebook ANSUT | promotionnelle | — | ✅ | ❌ | ✅ | NotreComm ✅ · Insights ✅ (format promo) · profil stratégique ❌ |
| 9 | « Rapport d'audit : gouvernance de l'ANSUT » | presse | autre | P4 | ❌ | ❌ | ✅ | Veille ✅ · NotreComm ❌ |
| 10 | « Sensibilisation des citoyens au numérique » | Facebook ANSUT | communautaire | — | ✅ | ❌ | ✅ | NotreComm ✅ · profil stratégique ❌ (communautaire) |

Points que l'échantillon met en évidence :
- La **fraîcheur/éligibilité fenêtrée** (colonne de droite) **ne peut pas** être un
  booléen figé → confirme l'Option B.
- « Hors stratégie ≠ hors sujet » : #2, #3, #8, #10 restent affichables (NotreComm),
  simplement hors profil stratégique.

## 7. Diagnostic (lecture seule) — à lancer avant tout backfill

But : mesurer le volume, la jointure entre les deux tables, la couverture de dates.
Ne modifie rien.

```sql
-- a) Volumétrie des deux sources.
select 'publications_institutionnelles' as source, count(*) as n,
       count(*) filter (where publication_date_verified) as datees_verifiees
from public.publications_institutionnelles
union all
select 'actualites', count(*), count(*) filter (where date_publication is not null)
from public.actualites;

-- b) Recouvrement par URL (une prise de parole ANSUT vue dans les deux tables).
select count(*) as paires_pontees
from public.publications_institutionnelles p
join public.actualites a on a.source_url = p.url_original;

-- c) Contenus sans URL (auront une content_key de type hash).
select
  count(*) filter (where url_original is null) as pubs_sans_url,
  (select count(*) from public.actualites where source_url is null) as actus_sans_url
from public.publications_institutionnelles;

-- d) Estimation du nombre de content_key distinctes (≈ lignes à créer).
select count(distinct cle) as content_keys_estimees from (
  select coalesce(lower(url_original), 'hash:'||md5(coalesce(contenu,''))) as cle
  from public.publications_institutionnelles
  union
  select coalesce(lower(source_url), 'hash:'||md5(coalesce(contenu,''))) from public.actualites
) t;
```

## 8. Plan de backfill (NON destructif)

Aucun `UPDATE` sur les tables de contenu. On ne fait qu'**INSÉRER** dans la nouvelle
table.

1. **Migration** (après ta validation) : créer `editorial_qualifications` + index +
   RLS. Rien d'autre. Tu l'appliques.
2. **Qualifieur partagé** : extraire de `qualificationContenu.ts` la fonction pure
   déjà existante ; l'exposer aussi à une edge function `requalifier-contenus`.
   **Même code** à l'ingestion et au backfill → parité garantie.
3. **Backfill idempotent** via `requalifier-contenus` (pas de SQL brut pour
   catégorie/thèmes : l'appariement à frontière de mot vit en TS et doit rester la
   seule source de vérité) : lit les lignes, calcule `content_key` + faits, **upsert
   par `content_key`**. Rejouable sans effet de bord.
4. **Vérification** : rejouer le diagnostic ; comparer `count(editorial_qualifications)`
   à `content_keys_estimees` ; contrôler l'échantillon des 10.
5. **Bascule de lecture progressive** (étage 3) : Insights en premier (le plus
   simple), puis les autres écrans, chacun passant du calcul en mémoire à la lecture
   de la qualification via `politiquesEditoriales.ts`.

## 9. Rollback

- La table est **additive et isolée** : `DROP TABLE editorial_qualifications;` suffit,
  **zéro perte** sur les contenus (aucune colonne source modifiée).
- Tant que l'étage 3 n'a pas basculé, les écrans continuent d'utiliser le qualifieur
  en mémoire : le backfill peut être rejoué ou annulé sans impact visible.
- `rules_version` permet de revenir à une version antérieure de règles en
  requalifiant, sans toucher aux tables sources.

## 10. Décisions demandées avant migration

1. **Éligibilités** : Option **B** (recommandée) ou A ?
2. **Modèle de liaison** : `content_key` + FKs typées facultatives (recommandé) —
   OK, ou tu préfères une liaison polymorphe `(content_type, content_id)` ?
3. **Nom de table/colonnes** : valides-tu `editorial_qualifications` et les noms
   ci-dessus (mix EN/FR aligné sur l'existant : `is_ansut_voice`, `category`,
   `primary_theme`, `date_verified`…) ?

Après ton accord sur ces trois points, j'écris **uniquement la migration + la
fonction de qualification partagée**, sans les appliquer ni les merger avant ta
validation « migration appliquée ».
