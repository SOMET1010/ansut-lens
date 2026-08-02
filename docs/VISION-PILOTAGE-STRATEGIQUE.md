# ANSUT RADAR — d'un outil de veille à un outil de pilotage stratégique

Document de référence produit & technique. Il fige la vision, les décisions
prises et la feuille de route par phases. Il guide la construction et sert de
contrat partagé.

## 1. Le principe directeur

ANSUT RADAR ne répond pas à « Quelles sont les nouvelles ? » mais à :

> **« Qu'est-ce qui, depuis hier, influence les objectifs stratégiques confiés à
> l'ANSUT par le Ministère, et que devons-nous faire ? »**

Conséquence : **l'article n'est plus le contenu, c'est la preuve.** Le contenu,
ce sont les missions de l'ANSUT et ce qui bouge dessus. Un agrégateur montre des
informations ; ANSUT RADAR interprète l'actualité à travers le prisme de la
stratégie de l'organisation.

## 2. Le pivot conceptuel : de la pertinence absolue à l'alignement stratégique

La question posée à chaque article change de nature :

| Avant | Après |
|---|---|
| « Cette information est-elle importante ? » | « Cette information a-t-elle un impact sur une priorité **actuelle** de l'ANSUT ? » |

Exemples (veille contextualisée) :

| Information | Décision du système |
|---|---|
| Cyberattaque dans une banque au Kenya | Faible alignement |
| Nouvelle politique de couverture rurale en Côte d'Ivoire | Très fort alignement |
| Nouveau satellite Direct-to-Cell | Fort alignement |
| Rapport GSMA sur l'inclusion numérique | Fort alignement |
| OpenAI lance un nouveau modèle | Moyen, sauf impact identifié sur les services publics |

Techniquement, le `score_pertinence` (récemment corrigé côté collecte) devient un
**score d'alignement à l'ADN stratégique**, accompagné de métadonnées d'aide à la
décision (programme concerné, direction concernée, action suggérée, confiance).

## 3. L'ADN stratégique de l'ANSUT (le socle)

Le système **apprend** les priorités de l'organisation plutôt que de les deviner.
L'ADN est un ensemble de thèmes prioritaires (ex. : connectivité rurale, Service
Universel, infrastructures numériques, IA, inclusion numérique, innovation,
transformation digitale, coopération internationale) **dérivé automatiquement**
puis **validé par un humain**.

**Sources de l'ADN** (retenues) :
1. Publications propres de l'ANSUT déjà collectées dans l'app (réseaux sociaux,
   auto-veille institutionnelle « Résonance de nos publications », `mentions`,
   `content_vault`) — disponibles immédiatement, ADN v1.
2. Site institutionnel de l'ANSUT (indexation Firecrawl, déjà intégré).
3. Documents stratégiques à fournir : Plan stratégique 2026-2030, lettre de
   mission du Ministère, discours du DG, rapports d'activité — **dépendance
   externe**, intègrés dès réception pour l'ADN fidèle.

**Gouvernance (décidée) : référentiel éditable en admin.** L'ADN est auto-amorcé
puis présenté pour validation/édition dans un écran Réglages ; la Direction
maintient missions, programmes et mots-clés sans intervention de développeur. On
s'appuie sur la table existante `territoires_expression` (`nom`, `concepts`,
`mots_cles_associes`, `pays_cibles`, `priorite`), enrichie et renommée « missions »
dans l'expérience.

## 4. La page « Ce matin » réorganisée

Elle ne dit plus « voici les actualités ». Elle est structurée en couches :

1. **Synthèse exécutive** en tête (moteur décidé : **Matinale riche**,
   `generer-matinale` / `MatinaleData` — priorité exécutive, synthèse 60 s,
   actions immédiates avec responsable/délai).
2. **🎯 Objectifs stratégiques impactés aujourd'hui** — une carte par mission
   avec compteur et niveau (🟢 / 🟠 / 🔴). Exemple : « Programme Zones Blanches —
   risque ÉLEVÉ — parce que : Orange accuse 3 semaines de retard, 2 offres
   satellites concurrentes, nouveau guide UIT. »
3. **Les preuves** : les articles, regroupés sous leur mission, chacun répondant
   à 5 questions (résumé, pourquoi important, qui est concerné, impact ANSUT,
   action proposée) + badges de contexte (« pourquoi je vois ça » : alignement,
   programme, direction, zone).
4. Les 4 cartes KPI (Mentions / Articles / Alertes / Score) **disparaissent** :
   elles n'aident pas la décision à 8 h.

Chaque actualité affiche à terme :
`Alignement 95 % · Impact Élevé · Direction DTDI/DSIS · Programme RNHD · Action : préparer une note`.

## 5. Ce qui existe déjà (réutilisation) vs à créer

**Réutilisable immédiatement**
- `generer-matinale` + `MatinaleData` (`src/types/matinale.ts`) : structure
  décideur riche (priorité exécutive, actions immédiates, signaux faibles).
- `DailyBriefing` + `useDailyBriefing` + `generer-briefing` : briefing prose 30 s
  (composant orphelin, prêt à monter) — option de synthèse légère.
- `territoires_expression` (+ hooks) : embryon du référentiel des missions.
- `score_pertinence`, `sentiment`, `categorie`, `tags`, `analyse_ia.quadrant_dominant` :
  champs peuplés par la collecte.
- `useRadarTimeline()` : données de chronologie prêtes (UI à créer).
- `ProchaineAction`, widgets `src/components/radar/*`, `useArticleClusters`.
- Tables `signaux`, `alertes`, `evenements_strategiques`, `categories_veille`,
  `mots_cles_veille`.

**Partiel**
- `impact_ansut` : peuplé seulement en enrichissement d'un article, pas en
  collecte de masse.
- Regroupement géographique : `territoires_expression.pays_cibles` existe mais
  n'est pas persisté sur l'article.

**À créer**
- Dérivation de l'**ADN** (pipeline IA : thèmes dominants du corpus ANSUT).
- **Score d'alignement** par article + métadonnées (programme, direction, action,
  confiance), persistés à la collecte.
- `pourquoi_important` (colonne existante, jamais peuplée).
- Score de **confiance IA** par actualité.
- Écran admin de **validation/édition de l'ADN**.
- Composant **chronologie**, colonne **« À faire aujourd'hui »**, **briefing vocal**
  (`window.speechSynthesis`).

## 6. Feuille de route par phases

Chaque phase est livrable et validable sur données réelles avant la suivante.

### Phase 1 — La page pilotée par les missions (surtout front, sans migration)
- Lire `territoires_expression` comme référentiel de missions.
- Rattacher côté client les articles déjà collectés à leur mission (appariement
  par mots-clés, logique `contientTerme` réutilisée).
- Réorganiser « Ce matin » : synthèse en tête, section « Objectifs stratégiques
  impactés » (compteurs + niveau), articles en preuves regroupés ; retrait des
  cartes KPI.
- **But** : prouver le concept de bout en bout sur vos données, tout en code
  dans la PR, réversible.

### Phase 2 — L'ADN et l'alignement (backend)
- Pipeline de dérivation de l'ADN depuis publications ANSUT + site (+ documents
  fournis) → thèmes prioritaires, proposés en admin pour validation.
- Écran admin de validation/édition de l'ADN (gouvernance éditable).
- Calcul et **persistance** du score d'alignement + métadonnées (programme,
  direction, action, confiance) sur chaque article à la collecte ; peuplement de
  `pourquoi_important` / `impact_ansut` en masse.
- Cartes de **risque par mission** (réutilisation `impact_projets_ansut` /
  `priorite_executive`) et badges de contexte.
- **Migration DB + edge functions.**

### Phase 3 — Les couches d'usage
- **Chronologie** horodatée (données `useRadarTimeline`, UI à créer).
- **« À faire aujourd'hui »** multi-actions (depuis `actions_immediates`, table de
  suivi d'état optionnelle).
- **Briefing vocal** (`window.speechSynthesis` sur la synthèse).

## 7. Décisions figées

| Décision | Choix |
|---|---|
| Gouvernance du référentiel | **Éditable en admin** (auto-amorcé, validé par la Direction) |
| Moteur de synthèse d'accueil | **Matinale riche** (`generer-matinale` / `MatinaleData`) |
| Sources de l'ADN | Publications ANSUT collectées + site institutionnel + documents stratégiques (à fournir) |
| Nature du score par article | **Alignement stratégique** (évolution de `score_pertinence`), + métadonnées décision |

## 8. Dépendances et points ouverts

- **Documents stratégiques** (Plan 2026-2030, lettre de mission, discours,
  rapports) à transmettre pour l'ADN fidèle. L'ADN v1 fonctionne sans, sur le
  corpus déjà collecté.
- **Déploiement** : les changements backend de la Phase 2 (migration + edge
  functions) touchent le projet Lovable en production — à valider en
  préproduction avant publication. Le projet n'a pas de tests automatisés
  au-delà des suites de citations.
- Axe **géographique** (Côte d'Ivoire / Afrique / Monde) : à dériver de
  `territoires_expression.pays_cibles` puis à persister par article (Phase 2).

---

*Document vivant — mis à jour à mesure de l'avancement.*
