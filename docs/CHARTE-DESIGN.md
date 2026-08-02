# Charte ANSUT — contrat de design opposable

Ce document est la référence unique pour toute intervention visuelle sur ANSUT
Radar Pro. Les valeurs proviennent des tokens réellement définis dans
`src/index.css` et `tailwind.config.ts`. Aucune couleur, aucune police et aucune
taille ne doivent être introduites en dehors de ce contrat.

## Couleurs de marque

| Rôle | Token CSS | Valeur HSL | Usage |
|---|---|---|---|
| Bleu institutionnel | `--ansut-blue` / `--primary` | `212 65% 42%` | Actions principales, liens, éléments actifs |
| Orange d'accent | `--ansut-orange` / `--accent` | `27 87% 54%` | Mise en avant, état sélectionné, badges |
| Noir de texte | `--ansut-noir` | `60 6% 11%` | Texte courant |
| Gris secondaire | `--ansut-gris` | `0 0% 53%` | Texte secondaire, légendes |

## Couleurs fonctionnelles

Les niveaux de signal et de sentiment sont déjà normalisés et ne doivent jamais
être remplacés par des couleurs Tailwind brutes.

| Sens | Token | Valeur HSL |
|---|---|---|
| Critique | `--signal-critical` | `0 84% 60%` |
| Avertissement | `--signal-warning` | `38 92% 50%` |
| Positif | `--signal-positive` | `142 72% 40%` |
| Neutre | `--signal-neutral` | `212 65% 42%` |

Les cercles de proximité disposent de leurs propres tokens, de `--cercle-1` à
`--cercle-4`. Les graphiques utilisent `--chart-1` à `--chart-5`.

## Règle absolue sur les couleurs

Tout code doit référencer les classes sémantiques Tailwind adossées à ces tokens
(`bg-primary`, `text-muted-foreground`, `border-border`). L'emploi de couleurs
littérales du type `bg-blue-600`, `text-gray-500` ou `#1B4F9C` est proscrit : ces
valeurs ne suivent pas le thème et cassent le mode sombre.

## Typographie

La police déclarée est **Inter**, avec `system-ui` en repli, pour les styles
`sans` et `display`.

**Défaut constaté** : Inter n'est chargée nulle part. Elle n'est ni importée dans
`index.html`, ni installée en dépendance locale. L'application s'affiche donc
avec la police système du poste, ce qui explique une part de l'impression de
rendu daté et produit un aspect différent selon que l'utilisateur est sous
Windows, macOS ou Android. Cette anomalie doit être corrigée par une auto-hébergement
de la police plutôt que par un appel à Google Fonts, afin de ne pas ajouter de
dépendance réseau au chemin critique.

Échelle imposée, pour mettre fin aux tailles décidées au cas par cas :

| Niveau | Classe | Emploi |
|---|---|---|
| Titre de page | `text-2xl font-semibold` | Une seule fois par écran, via `PageHeader` |
| Titre de section | `text-lg font-semibold` | Regroupements dans la page |
| Sous-titre | `text-sm text-muted-foreground` | Phrase explicative sous un titre |
| Corps | `text-sm` | Texte courant |
| Légende | `text-xs text-muted-foreground` | Sources, horodatages, mentions |

## Dégradés et effets

Trois utilitaires seulement sont autorisés, déjà définis : `gradient-primary`,
`gradient-accent` et `gradient-subtle`. Les effets `glow-*` sont réservés aux
états critiques et ne doivent pas servir de décoration. Les utilitaires `glass`
et `glass-strong` restent disponibles mais ne doivent pas être appliqués à des
surfaces portant du texte de lecture longue, faute de contraste suffisant.

Le rayon de bordure est unifié par `--radius`, fixé à `0.75rem`.

## Exigence d'inclusion — non négociable

L'application est destinée à des agents dont la familiarité avec l'informatique
varie fortement. Quatre règles s'appliquent donc à toute intervention.

Chaque libellé doit être **compréhensible sans connaissance interne**. Un sigle ou
un terme métier affiché doit être enveloppé dans le composant `TermeMetier`, qui
en donne la définition au survol et au focus clavier.

Aucun **point médian** ni parenthèse d'accord ne doit apparaître dans les textes
d'interface. La recette a relevé « 1 signal·aux classé·s critiques n'ont pas
encore été traité·s », illisible pour le public visé. L'accord réel doit être
calculé selon le nombre et deux phrases distinctes rédigées si nécessaire.

Chaque **chiffre affiché doit porter une phrase d'interprétation**. Un nombre seul
n'informe pas : le composant `ChiffreCle` impose cette lecture.

Tout bouton composé d'une seule icône doit porter un **libellé accessible** et une
infobulle. Les actions primaires respectent une hauteur tactile de 44 pixels.

## Structure imposée de chaque écran

Tout écran se compose dans cet ordre : `PageContainer`, puis `PageHeader` unique
portant titre, sous-titre explicatif et actions, puis le contenu. Un écran ne doit
comporter **qu'un seul titre de niveau page** : la recette a relevé « Veille »
suivi de « Actualités & Veille », deux titres concurrents pour un même écran.

Aucun contenu ne doit être masqué par `hidden lg:block`. Le composant
`SectionRepliable` rend le contenu accessible sur petit écran en le repliant.
