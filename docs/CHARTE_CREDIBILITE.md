# Charte de crédibilité des informations de RADAR

> Règle de développement **permanente**. Elle s'applique à toute information
> affichée dans ANSUT RADAR — indicateur, jauge, score, badge, compteur,
> classement, pourcentage — existante ou nouvelle.

## Principe fondateur

**Dans RADAR, tout ce qui est affiché doit pouvoir être expliqué, justifié et
vérifié.**

On ne supprime pas une information parce qu'elle est complexe. On la supprime
parce qu'elle **ne peut pas être défendue devant un Directeur Général**.

Question de référence, à se poser pour chaque chiffre :

> « Si le DG demande *comment ce chiffre est calculé*, puis-je répondre
> précisément, preuves à l'appui ? »

Si la réponse est non, l'information n'a pas sa place dans RADAR.

Corollaire : **une information simple mais honnête vaut mieux qu'un indicateur
impressionnant mais peu fondé.** En cas de doute, on préfère l'**absence**
d'information à une **information artificielle**.

---

## Le test du DG — 5 critères

Avant de conserver ou d'ajouter un indicateur, il doit satisfaire **les cinq**
critères. Si **un seul** manque, on **masque** plutôt que de donner une illusion
de précision.

| # | Critère | Question |
|---|---------|----------|
| 1 | **Origine connue** | La donnée provient-elle d'une source identifiable ? |
| 2 | **Méthode explicable** | Le calcul peut-il être décrit simplement ? |
| 3 | **Reproductible** | Deux exécutions sur les mêmes données donnent-elles le même résultat ? |
| 4 | **Traçable** | L'utilisateur peut-il retrouver les contenus qui justifient la valeur ? |
| 5 | **Utile à une décision** | Sert-il une décision de communication, ou n'est-ce qu'un chiffre esthétique ? |

---

## Les trois catégories de données

Toute donnée affichée se classe dans l'une de ces catégories.

### 🟢 Donnée réelle — **on conserve**
Issue directement d'une publication, d'un article, d'un réseau social ou d'une
source officielle.
*Exemples :* le texte d'un post ANSUT, la date de publication, le nom du média,
le lien source.

### 🟡 Donnée calculée — **on conserve si le calcul est documenté**
Issue d'un calcul simple et explicable à partir de données réelles.
*Exemples :* nombre de publications sur 30 jours, nombre de partenaires cités,
évolution d'un thème (hausse/baisse), part de voix (rang réel / total réel).
**Obligation :** la méthode doit être documentée et, idéalement, visible par
l'utilisateur (infobulle « Basé sur N publications »).

### 🔴 Donnée interprétée — **conserver uniquement si la méthode est claire ET expliquée, sinon retirer ou reformuler**
*Exemples :* score d'influence, niveau de menace, confiance à 87 %, réputation,
priorité, criticité.
Ces éléments sont les plus dangereux pour la crédibilité. Ils ne sont admis que
s'ils reposent sur une méthode publique et défendable. À défaut, on les retire,
ou on les reformule en langage qualitatif honnête (« tonalité plutôt négative »
plutôt que « sentiment −0,72 »).

---

## Règles permanentes

1. **Jamais de score sans méthode.** Aucun nombre sur 100, aucun pourcentage,
   aucune jauge ne s'affiche sans que sa méthode de calcul soit documentée et
   défendable.
2. **Jamais de valeur simulée présentée comme réelle.** Interdiction absolue de
   `Math.random()`, de valeurs codées en dur (`const x = 85`) ou de « mock »
   déguisés en données. Une donnée d'exemple doit être explicitement étiquetée
   comme telle, hors des écrans de production.
3. **Toujours pouvoir expliquer un classement.** Un tri, un « top N », un
   « le plus actif » doit reposer sur un critère mesurable et nommé.
4. **Toujours pouvoir remonter aux sources.** Chaque affirmation, chaque score
   doit être traçable jusqu'aux contenus qui le justifient.
5. **Préférer l'absence à l'artifice.** Face à un vide de données, on affiche
   « Aucune donnée » — jamais un chiffre inventé pour « remplir ».
6. **Pas de dramatisation.** Pas de « niveau de menace national », de jauge
   spectaculaire ni d'animation d'alerte qui suggère une précision ou une gravité
   non fondées.
7. **Langage honnête.** On préfère un mot simple et vrai (« tonalité négative »)
   à un chiffre faussement précis (« −0,72 »).

---

## Ce que la P0 « Honnêteté du produit » a retiré

Trace des éléments supprimés ou masqués, par catégorie de défaut.

**Fabrications pures (🔴 simulé / codé en dur) — supprimées**
- Taux d'ouverture newsletter en `Math.random()` (`NewsletterHistoryItem`).
- « Complétude 85 % » codée en dur (`CompactStats`).
- Connexions « simulées » entre acteurs (`SmartActeurCard`).
- Page de démonstration `/demo-ux` à chiffres fictifs.

**Scores à coefficients inventés (🔴 interprété, méthode non défendable) — supprimés**
- « Décomposition de l'influence » (6 sous-scores) et « Cartographie des
  risques » (4 scores) dérivés de coefficients arbitraires
  (`ActeurStrategicIntelligence`).
- « Score de visibilité /100 » (pondérations 0,4/0,4/0,2 et ×10 inventés)
  (`AnsutAccountsActivityWidget` + `useAnsutAccountsActivity`).
- Affichages du `score_influence` (champ saisi manuellement, défaut 50) en jauge,
  en étoiles et en taille de bulle (`SmartActeurCard`, `ActeurDetail`,
  `RadarVisualization`, `StatsPanel`). *Le champ de saisie éditorial reste ; seuls
  ses affichages « analytiques » sont retirés.*

**Fausse précision (🔴 / 🟡 mal présenté) — retirée**
- « Impact estimé 60/100 » et « Confiance 78 % » (`ASurveiller`, écran Ce matin).
- « % Alignement » (défaut 50), sentiment à 1–2 décimales, « confiance % »,
  « importance /100 », répartition par quadrant en % (`ArticleCluster`, écran Veille).

**Dramatisation non fondée (🔴 seuils arbitraires) — retirée**
- Bandeau cockpit « Centre de Surveillance Numérique » : « niveau de menace
  national » (seuils codés), 6 KPI, heatmap 🔥, pulsations (`CentreSurveillanceBar`,
  écran Surveillance).

## Ce qui a été conservé (et pourquoi)

- **SPDI (Score de Présence Digitale Institutionnelle)** : méthode documentée
  (4 axes pondérés — Visibilité 30 %, Qualité 25 %, Autorité 25 %, Présence 20 %).
  Conservé, mais sa méthode devra être **rendue visible** à l'utilisateur lors de
  la refonte de l'écran Acteurs. Tant que la méthode n'est pas exposée, éviter la
  fausse précision (pas de décimales superflues).
- **Comptages réels** (publications, partenaires, mentions, part de voix) : 🟡
  conservés, calcul simple et traçable.
- **Tonalité qualitative** (positif / neutre / négatif via icône) : conservée ;
  seule la valeur décimale a été retirée.

---

## Application à toute nouvelle fonctionnalité

Avant de merger une PR qui affiche une information chiffrée ou interprétée :

1. Classer l'information : 🟢 / 🟡 / 🔴.
2. Lui appliquer le test du DG (5 critères).
3. Si 🔴 sans méthode claire et exposable → **ne pas l'afficher**.
4. Documenter la méthode (dans le code et, si pertinent, dans l'UI).
5. Vérifier la traçabilité jusqu'aux sources.

Cette charte prime sur toute considération esthétique ou de richesse
fonctionnelle.
