# Architecture éditoriale de RADAR

> Règle d'architecture **permanente**. RADAR n'est pas un agrégateur : c'est une
> **rédaction numérique**. Chaque contenu est traité **une seule fois** par un
> **pipeline éditorial unique**, puis les écrans ne sont plus que des **vues**
> d'une même intelligence commune.

## Les objets métier

```
Source  →  Contenu  →  Sujet  →  Briefing
```

- **Source** : un canal (Facebook/LinkedIn/X ANSUT, site, RSS, presse, institution, partenaire).
- **Contenu** : une unité brute collectée (post, article, communiqué), enrichie de sa qualification.
- **Sujet** : l'unité de LECTURE. Un regroupement de contenus autour d'un thème, avec son récit, ses preuves, ses publications ANSUT, ses partenaires, son évolution. *L'article n'est plus l'information — il devient une preuve du sujet.*
- **Briefing** : un **document généré chaque matin** (pas une page). Les écrans le présentent ensuite sous différents angles.

## Le pipeline (une seule fois par contenu)

| Étape | Rôle | Sortie |
|---|---|---|
| **1. Collecte** | Récupérer le contenu brut, sans interprétation | contenu brut |
| **2. Qualification** | Métadonnées : `published_at`, `collected_at`, `updated_at`, type de source, langue, auteur, média, URL, date vérifiée ou non | contenu daté et sourcé |
| **3. Lecture IA** | Proposition explicable : thème principal/secondaires, type de communication, ton, acteurs, partenaires, programmes, résumé, mots-clés, niveau de confiance | lecture (proposition) |
| **4. Qualification éditoriale** | Décision **déterministe et explicable** : récent ? sujet existant ou nouveau ? éligible « Ce matin » / « Notre communication » / veille seule ? à archiver ? | éligibilités |
| **5. Construction des sujets** | Regrouper les contenus ; l'unité devient le **Sujet** (récit, preuves, publications ANSUT, partenaires, évolution) | sujets |
| **6. Briefing quotidien** | Sélectionner et ordonner les sujets du jour en un document argumenté, sourcé, explicable | briefing |

Puis, et seulement ensuite :

```
Ce matin · Veille · Notre communication · Recherche · Acteurs · Publier · Assistant
```

## Le principe fondamental — les écrans ne calculent plus

La **fraîcheur est une propriété du contenu, pas de l'écran.** Il ne doit plus
exister une logique de fraîcheur dans « Ce matin », une autre dans « Veille »,
une troisième dans « Notre communication ». Chaque contenu est qualifié une fois ;
tous les écrans réutilisent cette qualification.

Les écrans ne font que **demander les sujets adaptés à leur mission** :

| Écran | Demande |
|---|---|
| **Ce matin** | les sujets nouveaux, importants aujourd'hui, résumés |
| **Veille** | tous les sujets |
| **Notre communication** | uniquement les sujets contenant des publications ANSUT |
| **Recherche** | les sujets correspondant à une recherche |
| **Acteurs** | les sujets où apparaît un acteur |

## La règle qui gouverne chaque étape

La **[Charte de crédibilité](CHARTE_CREDIBILITE.md)** s'applique à tout le
pipeline : l'IA **explique, ne décide pas** ; chaque affirmation est **traçable**
jusqu'à ses preuves ; aucune date de collecte ne fabrique de la fraîcheur ;
aucune valeur simulée. La qualification éditoriale (étape 4) est **déterministe** :
on doit pouvoir répondre « pourquoi ce contenu est-il ici ? ».

---

## État actuel vs cible (honnête)

Ce qui existe déjà, et où il vit aujourd'hui :

| Étape du pipeline | État aujourd'hui | Cible |
|---|---|---|
| 1. Collecte | ✅ edge functions `collecte-*` | inchangé |
| 2. Qualification (métadonnées) | 🟡 dates en base ; règle de datation dans `qualificationContenu.ts` mais **rejouée côté client** | persistée **à l'ingestion** |
| 3. Lecture IA | 🟡 partielle : `aligner-actualites` (thème/pertinence), `recit-sujet` (récit d'un sujet) | lecture complète à l'ingestion, persistée |
| 4. Qualification éditoriale | 🟡 règles dans `qualificationContenu.ts` (catégorie, institutionnel, éligibilités) mais **calculées à l'affichage** | persistée, déterministe |
| 5. Construction des sujets | 🟡 `sujets.ts` regroupe **côté client**, à la volée | table `sujets` persistée, mise à jour à l'arrivée d'un contenu |
| 6. Briefing | 🔴 n'existe pas encore comme objet | document quotidien généré et stocké |
| Écrans | 🟡 consomment `qualificationContenu` mais **recalculent** encore | vues pures qui interrogent sujets/briefing |

**En clair** : les bonnes RÈGLES sont écrites et centralisées (`qualificationContenu.ts`),
mais elles s'exécutent encore **au rendu de chaque écran**, pas **une fois à
l'ingestion**. C'est la bonne logique au mauvais endroit — temporairement.

## Chemin de migration (incrémental, sans big-bang)

On ne réécrit pas tout d'un coup. On déplace la logique existante vers le
pipeline, étape par étape, chaque incrément restant déployable :

1. **Livrer la logique centrale** *(fait — PR en cours)* : `qualificationContenu.ts`
   règle la datation + la catégorisation + les éligibilités, et corrige déjà
   GITEX / Digital Fanzone. C'est le « cerveau » du pipeline, encore côté client.
2. **Persister la qualification à l'ingestion** : à la collecte, écrire les
   métadonnées + la catégorie + les éligibilités en base. Les écrans lisent la
   qualification persistée au lieu de la recalculer.
3. **Persister la lecture IA à l'ingestion** : une passe IA par contenu (thème,
   ton, acteurs, résumé, confiance), stockée et explicable.
4. **Persister les sujets** : table `sujets` + constructeur incrémental
   (rattacher chaque nouveau contenu à un sujet existant ou en ouvrir un).
5. **Objet Briefing** : génération quotidienne d'un document (sélection + ordre
   des sujets + raisons), stocké et versionné.
6. **Écrans = vues pures** : chaque écran interroge les sujets/briefing selon sa
   mission ; plus aucune règle de fraîcheur ni de pertinence dans les écrans.

À l'arrivée : `Collecte → Qualification → Lecture IA → Qualification éditoriale →
Sujets → Briefing → Écrans`. Chaque contenu traité une fois, chaque règle
centralisée, les écrans devenus de simples vues éditoriales d'une intelligence
commune.
