# PIPELINE_EDITORIAL.md — le contrat technique de RADAR

> **Statut : contrat.** Ce document fait autorité sur *comment* un contenu
> traverse RADAR. Le manifeste produit
> [`RADAR_PRODUCT_ARCHITECTURE.md`](../RADAR_PRODUCT_ARCHITECTURE.md) dit *pourquoi*,
> la [Charte de crédibilité](CHARTE_CREDIBILITE.md) dit *ce qui est permis*,
> l'[Architecture éditoriale](ARCHITECTURE_EDITORIALE.md) donne le chemin de
> migration. **Le présent contrat lie l'implémentation** : toute divergence entre
> le code et ce document est un bug — soit le code, soit le contrat doit être
> corrigé, jamais ignoré.
>
> Règle fondatrice unique : **un contenu est traité une seule fois. Le pipeline
> décide, les écrans présentent.** Aucune règle de fraîcheur, de thème, de
> catégorie ou d'éligibilité ne doit vivre dans un composant React.

## Vue d'ensemble — les quatre étages

```
ÉTAGE 1  Ingestion + Datation        →  Contenu brut daté et sourcé
ÉTAGE 2  Qualification éditoriale     →  UNE qualification par contenu (calculée 1 fois)
ÉTAGE 3  Vues                         →  Les écrans LISENT la qualification, ne décident pas
ÉTAGE 4  Conseiller IA                →  L'IA lit du contenu QUALIFIÉ et produit récits/synthèses/reco
```

Objets métier (rappel) : **Source · Contenu · Sujet · Récit · Briefing · Vue**.
Le contrat ci-dessous détaille les huit responsabilités qui traversent ces
étages.

---

## 1. Ingestion — `ÉTAGE 1` ✅ en place

**Rôle** : récupérer le contenu brut, sans interprétation. Aucune décision
éditoriale ici.

- Sources : comptes ANSUT (Facebook/LinkedIn/X/YouTube), site `ansut.ci`, presse,
  institutions, partenaires. Edge functions `collecte-*`.
- Récupération : Firecrawl renvoie **markdown + html** (`onlyMainContent: false`)
  pour préserver les métadonnées machine.
- Déduplication à l'entrée : par `url_original` / `source_url`, et par empreinte
  de contenu.
- Sortie : une ligne **Contenu brut** (`publications_institutionnelles`,
  `actualites`) portant : texte, plateforme/source, auteur, URL, médias,
  `collected_at`.

**Contrat** : l'ingestion ne renseigne JAMAIS un champ éditorial (thème,
catégorie, importance « vraie »). Elle capte des faits bruts + une datation
(section 2).

## 2. Datation — `ÉTAGE 1` ✅ en place (PR #22)

**Rôle** : attacher une date de publication **vérifiable**, ou aucune.

- `published_at` n'est renseigné **que** depuis une origine absolue :
  - `absolute` : date absolue explicite écrite dans le contenu (« 12 mars 2026 »).
  - `metadata` : horodatage machine ABSOLU du HTML — `<time datetime>`,
    `data-utime` (epoch), tooltip `title`, JSON-LD `datePublished`/`uploadDate`,
    `<meta article:published_time>`. **Absolu même quand l'affichage est relatif.**
- Une mention **relative affichée** (« il y a 2 h », « hier ») n'est **jamais**
  convertie → `published_at = null`.
- La **date de collecte ne se substitue jamais** à la date de publication.
- **Provenance conservée** (colonnes `publication_date_source`,
  `publication_date_verified`) :

  | `publication_date_source` | Sens | `verified` |
  |---|---|---|
  | `absolute_source` | date absolue explicite lue dans le texte | ✅ |
  | `platform_metadata` | horodatage machine absolu du HTML | ✅ |
  | `relative_text` | seule une mention relative existait | ❌ |
  | `inferred` | date déduite (non vérifiée) | ❌ |
  | `unknown` | aucune date exploitable | ❌ |

**Deux temporalités** (règle permanente) :
- **Fraîcheur de communication** = date de **publication** du post (quand l'ANSUT
  a pris la parole).
- **Fraîcheur d'événement/sujet** = date de l'événement dont parle le contenu.
- Un post récent peut concerner un événement ancien. « Ce matin » privilégie les
  **sujets nouveaux** ; « Notre communication » montre les **prises de parole
  récentes** même sur un événement passé, mais l'**étiquette**.

## 3. Qualification — `ÉTAGE 2` 🟡 règles écrites, à PERSISTER

**Rôle** : produire, **une seule fois par contenu**, la qualification unique que
tous les écrans consommeront. Aujourd'hui les règles vivent dans
[`src/lib/qualificationContenu.ts`](../src/lib/qualificationContenu.ts) mais sont
**rejouées au rendu de chaque écran** — la bonne logique au mauvais endroit. La
cible est de la **calculer à l'ingestion et la stocker**.

### 3.1 Le contrat de Qualification (schéma unique)

Toute qualification, quelle que soit la table d'origine, expose ce contrat :

| Champ | Type | Règle de calcul | Classe Charte |
|---|---|---|---|
| `dateEditoriale` | date \| null | `published_at` si vérifiée, sinon `null` | 🟢 |
| `dateVerifiee` | bool | provenance `absolute`/`metadata` et date ≤ maintenant | 🟢 |
| `ageJours` | number \| null | `(maintenant − dateEditoriale)/jour` ; `null` si non vérifiée | 🟢 |
| `categorie` | enum(8) | appariement mots-clés (section 4) | 🟡 |
| `themes` | pilier[] | appariement à frontière de mot sur les 4 piliers (section 4) | 🟡 |
| `estInstitutionnel` | bool | `themes.length > 0` ET catégorie institutionnelle | 🟡 |
| `estVoixAnsut` | bool | contenu = prise de parole officielle ANSUT | 🟢 |
| `eligibleProfilStrategique` | bool | `estInstitutionnel` ET `dateVerifiee` | 🟡 |
| `eligibleVeilleExterne` | bool | voix NON-ANSUT ET `dateVerifiee` | 🟡 |

> Ces champs sont **déterministes et explicables**. Pour tout contenu on doit
> pouvoir répondre : « pourquoi cette catégorie ? quel mot-clé ? quelle date,
> quelle provenance ? ».

### 3.2 Éligibilités par écran (calculées ici, pas dans l'écran)

La qualification porte les **éligibilités**, une par vue. Un écran ne « décide »
jamais ; il filtre sur un drapeau déjà calculé :

| Éligibilité | Condition (déterministe) |
|---|---|
| `eligibleCeMatin` | daté récemment (fenêtre courte) ET stratégique ET nouveau |
| `eligibleNotreCommunication` | `estVoixAnsut` (récent, étiqueté si événement ancien) |
| `eligibleVeille` | voix externe datée (`eligibleVeilleExterne`) |
| `eligibleInsights` | `estVoixAnsut` ET `dateVerifiee` (compté dans les fenêtres) |
| `eligibleSujet` | tout contenu qualifié rattachable à un sujet |

*(Nommage cible ; aujourd'hui ces conditions sont dispersées dans les écrans /
`insightsCommunication.ts` / `sujets.ts`. L'étage 2 les rapatrie dans la
qualification unique.)*

## 4. Classification — `ÉTAGE 2` 🟡

**Rôle** : ranger sans jeter. **« Hors stratégie » ≠ « hors sujet ».**

- **Normalisation** : minuscules + suppression des diacritiques
  (`/[\u0300-\u036f]/g`), appariement à **frontière de mot** (jamais de
  sous-chaîne) pour éviter les faux positifs.
- **Catégories (8)**, évaluées de la plus spécifique à la plus générale :
  `sportive`, `promotionnelle`, `protocolaire`, `evenementielle`, `programme`,
  `institutionnelle`, `communautaire`, `autre`.
- **Catégories institutionnelles** (seules à pouvoir DÉTERMINER les thèmes) :
  `institutionnelle`, `programme`, `evenementielle`. Les autres (sport, promo,
  protocole, communautaire) restent de **vraies communications** — classées,
  affichables, mais elles ne pèsent pas dans les axes stratégiques.
- **Thèmes = 4 piliers du Plan Stratégique ANSUT 2026-2030**
  ([référence](PLAN_STRATEGIQUE_ANSUT_2026_2030.md),
  [`src/config/missions.ts`](../src/config/missions.ts)) :
  P1 Connectivité universelle · P2 Services, Inclusion & Entrepreneuriat ·
  P3 Usages digitaux (IA, blockchain, big data) · P4 Excellence opérationnelle.
- **Principe** : un contenu sportif/communautaire n'est jamais supprimé ; il est
  **classé** et simplement écarté du profil stratégique.

## 5. Fraîcheur — `ÉTAGE 2` 🟡

**Rôle** : la fraîcheur est une **propriété du contenu, jamais de l'écran**.

- Calculée **exclusivement** depuis `dateEditoriale` (publication vérifiée). La
  date de collecte ne rend **jamais** un contenu « récent ».
- **Contenu non daté** (`dateVerifiee = false`) → n'entre dans **aucune** fenêtre
  temporelle. Il reste consultable, **marqué « date d'origine non vérifiée »**, et
  compté **en transparence** (ex. Insights affiche « N publications à date non
  vérifiée, non comptées »).
- Fenêtres glissantes standard : 7 / 30 / 90 jours, appliquées de façon
  **identique** partout (une seule fonction `dansLaFenetre`).
- Les deux temporalités (section 2) s'appliquent : ne jamais confondre
  « publication récente » et « événement récent ».

## 6. Vues — `ÉTAGE 3` 🟡 → cible : vues pures

**Rôle** : présenter. **Les écrans ne calculent plus.** Ils demandent les
contenus/sujets adaptés à leur mission en lisant les éligibilités de l'étage 2.

| Écran | Ce qu'il demande (lecture seule) |
|---|---|
| **Ce matin** | contenus/sujets `eligibleCeMatin` (nouveaux, stratégiques, résumés) |
| **Veille** | contenus `eligibleVeille` (presse/externe daté) |
| **Notre communication** | contenus `eligibleNotreCommunication` (voix ANSUT récente, étiquetée) |
| **Insights** | agrégats sur contenus `eligibleInsights` (comptages réels, fenêtres) |
| **Cartes-sujet** | sujets construits à partir de contenus `eligibleSujet` |
| **Recherche / Acteurs** | même qualification, filtrée par requête / acteur |

**Interdit dans un composant React** : recalculer une date de fraîcheur, ré-inférer
un thème ou une catégorie, redéfinir une règle de pertinence. Si un écran a besoin
d'une nouvelle règle, elle s'écrit dans l'étage 2 et devient disponible pour tous.

## 7. Conseiller IA — `ÉTAGE 4` 🟡 (référence : `recit-sujet`)

**Rôle** : l'IA lit du **contenu déjà qualifié** (pas les articles bruts) et
produit récits, synthèses, comparaisons, recommandations.

- **Contrat strict** (implémenté par
  [`supabase/functions/recit-sujet`](../supabase/functions/recit-sujet/index.ts)) :
  - **Sortie structurée** (JSON contraint), jamais de prose libre non validée.
  - **Ne cite que des IDs fournis en entrée** ; toute citation est vérifiée contre
    l'ensemble d'entrée (une source inventée est rejetée).
  - **Explique, ne décide pas** : l'IA propose un récit/une reco ; la décision de
    communication reste humaine.
  - **États de sûreté** : « pas assez de matière », « sources insuffisantes »,
    « limites explicites » — préférés à une affirmation fabriquée.
- **Interdit** : que l'IA fixe la fraîcheur, la catégorie ou l'éligibilité — ce
  sont des sorties de l'étage 2, en entrée de l'étage 4, jamais l'inverse.
- Produits IA cibles : **Récit** (d'un sujet), **Synthèse** (d'un ensemble),
  **Comparaison** (écosystème), **Recommandation** (conseiller : opportunité,
  risque de silence, valorisation, calendrier) — tous **traçables** aux contenus
  qualifiés.
- **Conseiller** (implémenté par
  [`supabase/functions/conseiller-editorial`](../supabase/functions/conseiller-editorial/index.ts)) :
  l'opportunité éditoriale (« terrain vacant » : l'écosystème parle d'un pilier,
  l'ANSUT n'y a pas publié) est **détectée déterministiquement** côté vue
  (`detecterOpportunite`, comptage réel) ; l'IA n'enrichit **que la formulation**,
  bornée aux articles de preuve. Deux gardes charte PORTABLES et testées
  ([`_shared/conseiller.ts`](../supabase/functions/_shared/conseiller.ts)) :
  liste blanche d'identifiants (preuve inventée retirée) et **anti-injonction**
  (toute prescription invalide le conseil). Le fondement (chiffres) et les preuves
  ne dépendent jamais de l'IA ; en cas d'échec/indisponibilité, le front conserve
  le conseil **déterministe** — aucune régression.

## 8. Traçabilité — règle transverse à tous les étages

Chaque donnée affichée doit passer le **test du DG**
([Charte](CHARTE_CREDIBILITE.md)) : origine connue, méthode explicable,
reproductible, traçable jusqu'aux sources, utile à une décision de communication.

- **Origine** : toute date porte sa `publication_date_source` ; tout thème/ catégorie
  porte le mot-clé/règle qui l'a produit ; toute affirmation IA porte ses IDs de preuve.
- **Reproductibilité** : la qualification est déterministe — mêmes entrées →
  mêmes sorties. `maintenantMs` sert seulement à calculer un âge, jamais à
  fabriquer une date.
- **Classement des données** : 🟢 réelle / 🟡 calculée (gardée si documentée) /
  🔴 interprétée (gardée seulement si la méthode est exposée).
- **Honnêteté du vide** : à information manquante, afficher « pas de donnée »
  plutôt qu'une précision fabriquée. Jamais de `Math.random()`, de valeur codée en
  dur présentée comme réelle, ni de pourcentage de confiance inexpliqué.

---

## État actuel vs cible

| Étage | Responsabilité | État | Cible |
|---|---|---|---|
| 1 | Ingestion | ✅ | inchangé |
| 1 | Datation (metadata + provenance) | ✅ (PR #22) | inchangé |
| 2 | Qualification unique | 🟡 règles centralisées, **rejouées au rendu** | **persistée à l'ingestion** |
| 2 | Classification / Fraîcheur | 🟡 dans `qualificationContenu.ts` | persistées avec la qualification |
| 3 | Vues | 🟡 consomment la qualification mais **recalculent** encore | vues pures (lecture des éligibilités) |
| 4 | Conseiller IA | 🟢 `recit-sujet` + `conseiller-editorial` (contrat strict, gardes testées) | lecture IA complète persistée |
| — | Sujet / Briefing | 🟡 `sujets.ts` à la volée / 🔴 Briefing absent | tables persistées |

## Prochain incrément — Étage 2 persisté (sans big-bang)

1. **Table de qualification** (ou colonnes) : à la collecte, écrire le contrat de
   la section 3.1 + les éligibilités 3.2, avec leur **traçabilité** (règle/mot-clé
   déclencheur, provenance de date).
2. **Une seule fonction** produit cette qualification (réutilise
   `qualificationContenu.ts`) — appelée **à l'ingestion**, plus au rendu.
3. **Les écrans lisent** la qualification persistée ; on retire progressivement les
   appels à `qualifier()` dans les composants/hook d'affichage.
4. Puis, dans l'ordre : lecture IA persistée → table `sujets` → objet `Briefing` →
   API `RADAR → Cockpit`.

Chaque incrément reste déployable seul. À l'arrivée :
`Collecte → Qualification → Lecture IA → Qualification éditoriale → Sujets →
Briefing → Vues`, chaque contenu traité une fois, chaque règle centralisée.
