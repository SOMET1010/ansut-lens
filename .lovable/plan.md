
# Génération de Guides de Formation PDF Téléchargeables

## Objectif

Créer une nouvelle page d'administration `/admin/formation` permettant de visualiser et télécharger les guides de formation en format PDF pour les Administrateurs et les Utilisateurs.

## Approche technique

La bibliothèque `react-to-pdf` est déjà installée et utilisée dans le projet (voir `PresentationPage.tsx`). Nous allons réutiliser cette approche pour générer les PDFs des guides de formation.

Le contenu Markdown sera rendu avec `react-markdown` + `remark-gfm` (déjà utilisés dans `MarkdownEditor.tsx` et `DossierView.tsx`).

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/pages/admin/FormationPage.tsx` | Page principale avec visualisation et export PDF |
| `src/components/formation/GuideViewer.tsx` | Composant de visualisation Markdown stylisé pour PDF |
| `src/components/formation/GuidePDFLayout.tsx` | Layout PDF avec en-tête ANSUT et pagination |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Ajouter la route `/admin/formation` |
| `src/pages/AdminPage.tsx` | Ajouter le lien vers la page Formation |

## Architecture de la page

```text
┌─────────────────────────────────────────────────────────────┐
│  Guides de Formation                    [PDF Admin] [PDF User]│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┤
│  │ 📚 Guides       │  │                                     │
│  │                 │  │    [Rendu Markdown du guide]        │
│  │ ● Administrateur│  │                                     │
│  │ ○ Utilisateur   │  │    - Table des matières             │
│  │                 │  │    - Sections avec icônes           │
│  │                 │  │    - Tableaux formatés              │
│  │                 │  │    - Code blocks                    │
│  │                 │  │                                     │
│  └─────────────────┘  └─────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

## Fonctionnalités

### 1. Sélection du guide
- Boutons ou onglets pour choisir entre "Administrateur" et "Utilisateur"
- Affichage du contenu Markdown formaté dans la zone principale

### 2. Prévisualisation PDF
- Le contenu affiché correspond exactement au rendu PDF
- Layout optimisé pour impression A4 portrait

### 3. Export PDF
- Bouton "Télécharger PDF Administrateur" → `ANSUT-RADAR-Guide-Admin.pdf`
- Bouton "Télécharger PDF Utilisateur" → `ANSUT-RADAR-Guide-User.pdf`
- En-tête ANSUT sur chaque page avec logo
- Pied de page avec numéro de page et date de génération

## Détails techniques

### FormationPage.tsx

Structure principale :
```typescript
// Import du contenu Markdown directement
import { useState } from 'react';
import { usePDF } from 'react-to-pdf';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, BookOpen, Shield } from 'lucide-react';
import { GuideViewer } from '@/components/formation/GuideViewer';
import { GuidePDFLayout } from '@/components/formation/GuidePDFLayout';

// Contenu des guides (importés comme chaînes raw)
const ADMIN_GUIDE = `...`; // Contenu de ADMIN.md
const USER_GUIDE = `...`;  // Contenu de USER.md
```

### GuidePDFLayout.tsx

Layout PDF avec :
- En-tête avec logo ANSUT et titre du guide
- Zone de contenu avec styles optimisés pour impression
- Pied de page avec date et version

### GuideViewer.tsx

Composant de rendu Markdown avec :
- `ReactMarkdown` + `remarkGfm`
- Styles prose Tailwind adaptés
- Support des tableaux, listes, code blocks

## Intégration

### Route dans App.tsx

```typescript
<Route element={<PermissionRoute permission="access_admin" />}>
  {/* ... autres routes admin ... */}
  <Route path="/admin/formation" element={<FormationPage />} />
</Route>
```

### Lien dans AdminPage.tsx

Ajouter une carte dans la grille d'administration :
```typescript
{
  title: 'Guides de Formation',
  description: 'Documentation PDF téléchargeable',
  icon: GraduationCap,
  href: '/admin/formation',
  permission: 'access_admin'
}
```

## Styles PDF optimisés

Pour garantir un rendu PDF de qualité :
- Fond blanc forcé (`bg-white`)
- Texte noir (`text-black`)
- Marges généreuses pour impression
- Police système pour compatibilité
- Tableaux avec bordures visibles
- Breaks de page automatiques

## Résultat attendu

Les administrateurs pourront :
1. Accéder à `/admin/formation`
2. Prévisualiser les guides Administrateur et Utilisateur
3. Télécharger les PDFs formatés avec branding ANSUT
4. Distribuer ces PDFs aux nouveaux utilisateurs pour la formation
