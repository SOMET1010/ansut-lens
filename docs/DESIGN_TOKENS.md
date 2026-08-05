# Design tokens — palette sémantique de RADAR

> Règle permanente. Toute couleur affichée doit exprimer un **rôle**, jamais une
> décoration. Les couleurs métier ne sont **jamais** codées en dur dans un
> composant : elles passent par les tokens ci-dessous (variables CSS dans
> `src/index.css`, exposées à Tailwind dans `tailwind.config.ts`).

## Les cinq rôles

| Rôle | Token Tailwind | Variable CSS | Usage |
|---|---|---|---|
| 🔵 **Navigation** | `primary` | `--primary` | liens, éléments actifs, actions principales, écosystème neutre |
| 🟢 **Confirmé / ANSUT** | `confirme` | `--confirme` | validation, contenu ANSUT, état positif confirmé |
| 🟠 **Attention** | `attention` | `--attention` | signal à examiner, alerte modérée, action requise |
| 🔴 **Incident** | `incident` / `destructive` | `--incident` | incident avéré, erreur critique |
| ⚪ **Neutre** | `muted`, `secondary`, `accent` | `--muted`… | descriptions, métadonnées, sous-titres, survols, badges neutres |

Chaque rôle sémantique dispose de variantes : `DEFAULT`, `foreground`, `soft`
(fond clair) et `border`. Exemple d'encart d'attention :

```tsx
<div className="bg-attention-soft border border-attention-border text-attention">…</div>
```

## Règle stricte de l'orange (ambre)

L'ambre (`attention`) attire l'œil **parce qu'il est rare**. Il est **interdit** pour :

- les sous-titres de navigation ;
- les descriptions et métadonnées ;
- les éléments sélectionnés ordinaires ;
- les icônes purement décoratives ;
- les badges neutres.

Conséquence appliquée : les tokens shadcn `secondary` et `accent` — qui
coloraient auparavant en orange **tous** les `Badge variant="secondary"` et
**tous** les survols `hover:bg-accent` — sont désormais **neutres**. L'orange ne
subsiste que via `attention` (et les couleurs de graphes/`signal-warning`).

## Palette de référence

```
Fond principal   #F6F4EF     Texte principal   #17211D
Surface          #FCFBF8     Texte secondaire  #66706B
Bordure          #D9DDD8

🔵 Bleu   #2E5F8A   (navigation / primary)
🟢 Vert   #185C47   soft #EAF3EF   bordure #B9D5C9
🟠 Ambre  #C56B1A   soft #FFF3E6
🔴 Rouge  #B8423A   soft #FCECEA
```

## Méthode d'application (par vagues)

1. **Fondation** (fait) : neutralisation de `secondary`/`accent`, ajout des
   tokens `confirme` / `attention` / `incident`, alignement de la famille bleue
   de navigation. Recolore d'un coup les primitives shadcn (boutons, badges,
   onglets, sidebar) **sans toucher** `components/ui`.
2. **Balayage des couleurs codées en dur** (à venir) : remplacer les
   `bg-orange-*` / `text-orange-*` résiduels des composants par le token de leur
   rôle réel (attention, confirmé, neutre…). À faire par écran, sans changer la
   structure ni les données.

## Recette

- aucun texte descriptif en ambre ;
- l'ambre est devenu rare → il signale réellement ;
- la navigation utilise une seule famille de bleu ;
- confirmé / neutre / à examiner / incident sont immédiatement distinguables ;
- contraste lisible en thème clair **et** sombre ;
- aucune couleur métier codée directement dans un composant.
