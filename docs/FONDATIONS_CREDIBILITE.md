# Fondations de crédibilité — reconstruire, pas patcher

L'audit visuel des 10 écrans a rendu un verdict sans appel : **crédibilité 2/10**.
La cause n'est pas cosmétique, elle est structurelle — doublons dans tout le
pipeline, scores opaques, conseils IA non sourcés, corpus contaminé.

Le seul écran crédible, **La Matinale**, l'est parce qu'il a été **reconstruit
proprement** : une vue passive sur un objet métier réel, alimenté par un
adaptateur qui déduplique, source et expose sa méthode — et qui, *par
construction*, ne peut pas afficher de score opaque.

**La stratégie : ne plus corriger les vieux écrans, les reconstruire un par un
sur la même méthode.** Ces trois fondations partagées sont la base commune que
chaque reconstruction réutilise (jamais réinventée localement).

## 1. Déduplication centrale — `src/lib/dedup.ts`

Une même URL n'est jamais comptée deux fois. C'est le point #1 de l'audit :
« 51 preuves », « 29 articles », le ratio d'écho, « 412 total », « 259 articles
pertinents » étaient tous gonflés par le même document répété.

- `urlCanonique(u)` — forme comparable (hôte sans `www`, chemin sans barre finale,
  requête/fragment ignorés).
- `estPageArticle(u)` — rejette les liens vers une simple page d'accueil (pas une
  preuve : ils ne mènent pas au contenu cité).
- `titreNormalise(t)` — dédup de secours quand l'URL manque.
- `dedupParUrl(items, getUrl, getTitre?)` → `{ uniques, nbReprises }` — conserve le
  premier exemplaire, **expose** le nombre de reprises écartées.

## 2. Modèle de preuve — `src/lib/preuve.ts`

Source unique de vérité pour « qu'est-ce qu'une preuve ? ». Une preuve est un
**document vérifiable** : publication ANSUT ou reprise presse **attribuable**
(source nommée), pointant vers un **article stable**, **dédupliquée**. Une
organisation citée (Orange, MTN…) **n'est pas** une preuve : elle est renvoyée à
part et jamais additionnée au compteur.

- `documentsProbants({ publications, articles, organisations })`
  → `{ documents, organisations, nbReprises }`.

## 3. Contrat « zéro score opaque » — `src/lib/indicateur.ts`

Point #2 de l'audit : Résonance « 10/100 », SPDI « 11/73 », « 72 points »,
« 100 % enrichi », « +2033 nouveaux », statut « Aligné »… des verdicts chiffrés
sans méthode. La règle : **un indicateur affiché DOIT porter sa méthode**, sinon
il devient explicitement « donnée indisponible ». Le type rend la règle
impossible à contourner — on ne peut pas fabriquer un indicateur traçable sans
fournir sa méthode.

- `type Indicateur = IndicateurTracable | IndicateurIndisponible`
- `tracable(valeur, methode, sources?)` · `indisponible(raison)`

## Programme de reconstruction

| Écran | État |
|---|---|
| **La Matinale** | Reconstruit (écran #1), reposé sur ces fondations |
| **Veille** | À reconstruire (réutilise le plus les fondations) |
| **Notre communication** | À reconstruire (le pire offenseur de l'audit) |
| **Acteurs** | À reconstruire (SPDI = risque réputationnel) |
| **Surveillance** | À reconstruire |
| **Publier / Assistant** | À reconstruire (consomment le corpus propre) |

Chaque écran reconstruit = **objet métier + adaptateur honnête + vue pure
éditoriale (encre + bleu)**. L'ancien écran n'est pas corrigé : il est remplacé,
puis retiré après recette de crédibilité.
