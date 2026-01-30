
# Mise à jour de la Présentation avec les nouvelles fonctionnalités

## Contexte

La présentation actuelle ne reflète pas les dernières fonctionnalités majeures ajoutées à la plateforme :

1. **Studio de Publication** - Le nouveau workflow unifié pour Notes Stratégiques et Newsletters
2. **Newsletter Studio** - L'éditeur visuel WYSIWYG avec drag-and-drop de blocs
3. **Prévisualisation Responsive** - Le sélecteur Desktop/Tablette/Mobile dans le Studio

## Modifications proposées

### 1. Créer une nouvelle slide "Studio Newsletter"

Nouvelle slide dédiée au Studio Newsletter avec ses 3 fonctionnalités clés :
- **Éditeur de blocs** - Drag-and-drop avec @dnd-kit
- **Blocs ANSUT** - Header, Édito, Articles, Tech, Agenda, Footer
- **Prévisualisation responsive** - Desktop, Tablette, Mobile

### 2. Mettre à jour la slide "Dossiers"

Renommer en "Studio de Publication" et mettre à jour le contenu :
- **Notes Stratégiques** - Rédaction Markdown avec génération IA
- **Newsletters** - Production et édition visuelle
- **Workflow unifié** - Génération, édition, validation, envoi

### 3. Ajouter la nouvelle slide dans la navigation

Insérer la slide "Studio Newsletter" après "Studio de Publication" dans la liste des slides.

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/presentation/slides/NewsletterStudioSlide.tsx` | Nouvelle slide présentant le Studio Newsletter visuel |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/presentation/slides/DossiersSlide.tsx` | Renommer en "Studio de Publication" et mettre à jour le contenu |
| `src/pages/PresentationPage.tsx` | Ajouter NewsletterStudioSlide dans la liste des slides |

## Détails techniques

### NewsletterStudioSlide.tsx

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Studio Newsletter                            │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │                  │  │                  │  │               │ │
│  │  [GripVertical]  │  │  [LayoutGrid]    │  │  [Monitor]    │ │
│  │  Drag & Drop     │  │  Blocs visuels   │  │  Responsive   │ │
│  │                  │  │                  │  │               │ │
│  │  Réorganisation  │  │  Header, Édito,  │  │  Desktop,     │ │
│  │  intuitive des   │  │  Articles, Tech, │  │  Tablette,    │ │
│  │  contenus        │  │  Agenda, Footer  │  │  Mobile       │ │
│  │                  │  │                  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Icônes utilisées : `GripVertical`, `LayoutGrid`, `Smartphone`

### DossiersSlide.tsx (mis à jour)

Nouveau titre : "Studio de Publication"

Nouvelles sections :
1. **Notes Stratégiques** - Icône `FileText`, description du workflow de rédaction
2. **Newsletters** - Icône `Mail`, lien vers le studio visuel
3. **Génération IA** - Icône `Sparkles`, génération automatique de contenu

## Résultat attendu

La présentation PDF inclura :
- Une slide "Studio de Publication" présentant le workflow global
- Une slide "Studio Newsletter" mettant en avant l'éditeur visuel WYSIWYG
- Navigation mise à jour avec les 2 nouvelles slides dans l'ordre logique

## Ordre final des slides

1. Couverture
2. Objectifs
3. Tableau de Bord
4. Actualités
5. Flux de Veille
6. Acteurs
7. **Studio de Publication** (anciennement "Dossiers")
8. **Studio Newsletter** (nouvelle)
9. Assistant IA
10. Alertes
11. Architecture
12. Contact
