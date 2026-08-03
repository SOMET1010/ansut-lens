# ANSUT RADAR — Architecture produit

> **Document fondateur.** Il fixe le cap de RADAR au même titre que `CLAUDE.md`
> (qualité de développement) et que la Charte de crédibilité (honnêteté des
> informations). Ce n'est pas un document technique : c'est un **manifeste
> d'architecture produit**. Toute évolution doit s'y conformer.

---

## Vision

ANSUT RADAR n'est pas un outil de veille.

ANSUT RADAR est une **rédaction numérique assistée par IA**.

Sa mission n'est pas de collecter des informations. Sa mission est de **transformer
un grand volume de contenus en une compréhension immédiatement exploitable** par
la Direction de la Communication.

Le produit n'organise pas des contenus. **Il organise la compréhension.**

---

## Le pipeline éditorial

Chaque contenu traverse le même pipeline.

```
Collecte
      ↓
Qualification
      ↓
Lecture IA
      ↓
Qualification éditoriale
      ↓
Construction des sujets
      ↓
Briefing quotidien
      ↓
Écrans RADAR
```

Cette architecture est la **règle permanente**.

---

## Les objets métier

Le produit repose sur six objets.

### 1. Source
L'origine. *Facebook, LinkedIn, presse, UIT, GSMA…*

### 2. Contenu
L'unité brute. *Un article, une publication, un communiqué, une vidéo.*

### 3. Sujet
Le regroupement intelligent. *Connectivité, cybersécurité, IA, inclusion numérique…*

### 4. Récit
L'interprétation éditoriale. Produit par l'IA. **Toujours explicable, toujours
relié à ses preuves.**

### 5. Briefing
La synthèse quotidienne. **Ce n'est plus un écran — c'est un objet.** Chaque
matin, les sujets, les récits, les écarts et les preuves sont assemblés pour
produire le briefing.

### 6. Vue
Les écrans : « Ce matin », Veille, Notre communication, Recherche, Acteurs,
Publier, Assistant. **Ils ne calculent plus. Ils présentent.**

---

## Les responsabilités

**Le pipeline décide. Les écrans présentent.**

Il ne doit plus exister de logique métier dans les composants React.

---

## Le rôle de l'IA

L'IA intervient à **trois moments seulement**.

**Lecture** — lire les contenus et identifier : thèmes, partenaires, ton, résumé.

**Récit** — transformer les contenus d'un sujet en un texte éditorial.

**Briefing** — assembler les récits pour créer la lecture du matin.

**L'IA ne décide jamais. Elle explique.**

---

## Les preuves

Toute affirmation doit pouvoir afficher **« Pourquoi cette information ? »**, puis :

- les publications ANSUT ;
- les articles ;
- les partenaires ;
- les sources.

**Aucune phrase sans preuve.**

---

## Les principes fondateurs

- Une donnée est qualifiée **une seule fois**.
- Un contenu appartient à **un sujet**.
- Un sujet possède **un récit**.
- Un récit possède **des preuves**.
- Un briefing possède **des sujets**.
- Les écrans **présentent** le briefing.

---

## Ce que RADAR mesure — et ce qu'il ne mesure pas

RADAR mesure la **communication**, jamais la **gestion**. C'est le garde-fou qui
l'empêche de dériver vers un cockpit de pilotage.

**Dans RADAR — deux niveaux :**

1. **Indicateurs de communication** (aident la DIRCOM à comprendre son impact et
   à orienter ses prises de parole) :
   - *Notre communication* : volumes par réseau, répartition par thème et par
     **type** (institutionnelle / communautaire / événementielle / sportive…),
     fréquence, évolution 7 / 30 / 90 j, part vidéo/image/texte, partenaires les
     plus cités, hashtags, engagement réel, reprises médias.
   - *Écosystème* : qui parle le plus, sujets qui montent / disparaissent,
     acteurs les plus visibles, médias qui influencent la conversation.
   - *Comparaison* : mêmes sujets que l'écosystème ? sujets non couverts ?
     surexposés ? où est l'opportunité de prise de parole ?
2. **Recommandations IA** — comme **conseiller, jamais décideur** : opportunité
   de communication, risque de silence, valorisation, calendrier. Toujours
   expliquées, sourcées, jamais une injonction.

**PAS dans RADAR (relève du Cockpit) :** KPI de projets, avancement de
programmes, budget, objectifs 2030, taux d'exécution, planning opérationnel,
indicateurs RH, tableaux de bord de gestion.

**Nommage :** la surface s'appelle **« Insights »** (ou « Indicateurs de
communication »), jamais « Tableau de bord » — ce mot évoque le pilotage.

**Charte oblige :** chaque indicateur reste soumis au test du DG (origine,
méthode, reproductibilité, traçabilité, utilité). Pas de chiffre sans méthode,
pas de fausse précision. Un indicateur dont la donnée n'est pas fiable n'est pas
affiché.

**RADAR comme moteur :** ces mêmes analyses seront exposées via une **API**
(REST/GraphQL) pour alimenter le Cockpit — sans dupliquer la logique entre les
deux applications. RADAR produit l'intelligence ; le Cockpit la consomme.

## Les deux temporalités

La fraîcheur n'est **pas une valeur unique**. Deux temporalités coexistent et le
pipeline doit conserver les **deux** :

- **Fraîcheur de la communication** — quand la prise de parole a été *publiée*.
- **Fraîcheur du sujet** — quand l'*événement* traité a réellement eu lieu.

Une publication peut être **récente tout en portant sur un événement ancien**
(une vidéo publiée aujourd'hui qui célèbre une victoire d'il y a deux ans). Les
écrans restituent ces deux dimensions **différemment** :

- **« Ce matin »** privilégie les **sujets nouveaux** (fraîcheur du sujet).
- **« Notre communication »** montre les **nouvelles prises de parole**, même
  lorsqu'elles concernent des événements passés — mais les **étiquette
  explicitement** comme telles.

La **date de collecte ne sert jamais** à déterminer la fraîcheur éditoriale, quelle
que soit la temporalité.

## Ce qui ne devra plus jamais arriver

Un écran qui recalcule :

- la fraîcheur ;
- les thèmes ;
- la pertinence ;
- les catégories.

Ces décisions appartiennent au **pipeline**.

---

## Les règles permanentes

1. La **Charte de crédibilité** — [`docs/CHARTE_CREDIBILITE.md`](docs/CHARTE_CREDIBILITE.md)
2. Le **Pipeline éditorial** — [`docs/ARCHITECTURE_EDITORIALE.md`](docs/ARCHITECTURE_EDITORIALE.md) *(mise en œuvre technique et chemin de migration)*
3. Le **Test du DG** — origine connue, méthode explicable, reproductible, traçable, utile à une décision.
4. **Une PR = une question utilisateur.**
5. **Une information = un propriétaire.**
6. **L'IA explique. Elle ne décide jamais.**

---

## La question qui gouverne chaque évolution

À partir de maintenant, chaque fonctionnalité doit répondre à **une seule
question** :

> **« À quel étage du pipeline éditorial appartient-elle ? »**

Collecte · Qualification · Lecture IA · Qualification éditoriale · Sujets ·
Briefing · Vue.

Si elle n'appartient à **aucun** étage du pipeline, elle ne doit probablement pas
être développée.

---

## La promesse du produit

> **ANSUT RADAR est l'assistant éditorial de la Direction de la Communication.**
>
> **Chaque matin, il lit pour vous les communications de l'ANSUT, celles de son
> écosystème, les transforme en sujets, construit un briefing argumenté et
> fournit toutes les preuves permettant d'en vérifier les conclusions.**
