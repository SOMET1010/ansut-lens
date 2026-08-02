# Base de connaissance institutionnelle de l'ANSUT

> Couche 🟢 « connaissance validée » d'ANSUT RADAR. Elle porte la **stratégie
> officielle** de l'ANSUT (missions, axes, programmes, projets, objectifs,
> indicateurs, partenaires), avec la **preuve documentaire** derrière chaque
> élément et une **maturité granulaire**. Elle est distincte du signal 🟡 déduit
> des communications publiques et de la veille externe 🔵.

## Pourquoi cette couche

Aujourd'hui, les axes affichés dans « Ce matin » sont un **modèle provisoire**
codé en dur. Le système ne peut pas *affirmer* connaître le plan. Cette base rend
la connaissance **explicite, tracée et validable** : chaque affirmation renvoie à
un document, une diapositive, un texte d'origine, et à un statut de validation
humaine. Rien n'est « validé » sans revue.

## Le modèle — d'abord, indépendant du document

La hiérarchie que le schéma doit accueillir durablement :

```
Mission → Axe stratégique → Programme → Projet → Objectif → Indicateur
                                   ↘ Partenaire   ↘ Direction responsable
```

Le PPTX du plan n'est qu'une **première source d'alimentation**, pas la structure
elle-même. D'autres sources viendront (lettre de mission, documents validés).

## Les 5 tables

| Table | Rôle |
|---|---|
| `institutional_sources` | Documents de référence (plan, lettre de mission…). Titre, type, référence, date. |
| `strategic_entities` | Les nœuds : `mission`, `axe`, `programme`, `projet`, `objectif`, `partenaire`, `direction`. Portent la **validation**, le **statut** actif/archivé, la **période de validité**, la **direction responsable**. |
| `strategic_relations` | Les arêtes entre entités (`contient`, `porte`, `responsable_de`, `partenaire_de`, `contribue_a`). Une relation peut être `suppose` (supposée). |
| `strategic_indicators` | Les KPI rattachés à une entité (objectif/projet/axe) : libellé, cible, échéance, `validation` (dont `incomplet`). |
| `knowledge_evidence` | La **preuve** derrière une entité / relation / indicateur : source, localisation (diapositive), **texte d'origine**, méthode d'extraction, date du document. |

`knowledge_evidence.cible_type` + `cible_id` pointent vers une ligne de l'une des
trois tables de contenu (`entity` / `relation` / `indicator`), ce qui permet
d'adosser plusieurs preuves à un même élément.

## Modèle de maturité — granulaire, jamais global

Il n'existe **aucun interrupteur global** « plan intégré ». La maturité est portée
par **chaque élément**, via le champ `validation` :

| `validation` | Signification | Affichage |
|---|---|---|
| `a_valider` | Extrait d'un document, **pas encore revu** | 🟡 Extrait d'un document — à valider |
| `valide` | **Revu et confirmé** par un humain sur pièce | 🟢 Validé par document institutionnel |
| `suppose` | Rapprochement/relation **supposé**, non prouvé | 🟠 Supposé — à confirmer |
| `incomplet` (indicateurs) | Donnée partielle | 🟠 Incomplet |
| `rejete` | Écarté après revue | ⚪️ Rejeté |

Conséquence : le produit peut afficher un **plan partiellement intégré** (axe
validé, programme à valider, indicateur incomplet, partenaire non confirmé) sans
jamais surévaluer sa maturité.

Champs de validation : `validated_by` (qui), `validated_at` / `derniere_validation`
(quand). Tant que `validation = 'a_valider'`, l'élément **ne doit pas** être
présenté comme officiel.

## Workflow extraction → revue → validation

1. **Extraction** (assistée) d'une source → entités/relations/indicateurs en
   `a_valider`, chacun avec sa **preuve** (`knowledge_evidence`).
2. **Seed séparé** : livré comme fichier SQL distinct de la migration, **non
   appliqué** tant qu'il n'est pas revu.
3. **Revue humaine** sur le fichier de revue (`docs/REVUE-*.md`) : on lit le texte
   d'origine, on corrige, on tranche les ambiguïtés.
4. **Validation** : passage à `valide` (ou `suppose` / `rejete`), avec
   `validated_by` et la date.
5. **Intégration** dans « Ce matin » : **seulement après** revue. Un axe devient
   🟢 quand il est `valide` ; les rattachements s'appuient alors sur les
   objectifs/projets validés plutôt que sur le seul appariement lexical.

## Règle d'or

> Aucun élément extrait automatiquement n'apparaît comme **validé** sans revue
> humaine. En l'absence de preuve suffisante, on affiche « à valider » ou « à
> confirmer » — jamais une certitude.

## Ce qui n'est PAS fait ici (volontairement)

- Aucun branchement sur le briefing « Ce matin » tant que le seed n'est pas revu.
- Aucune activation en production : la migration crée le schéma, le seed est
  séparé et manuel.
