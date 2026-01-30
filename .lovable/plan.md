
# Integration d'un Editeur Visuel de Newsletter (Studio Pro)

## Analyse de l'existant

L'architecture actuelle du workflow newsletter est :

1. **Generation IA** : `NewsletterGenerator.tsx` configure les parametres et appelle l'edge function
2. **Edge Function** : `generer-newsletter/index.ts` genere le contenu JSON + HTML statique
3. **Edition** : `NewsletterEditor.tsx` permet de modifier le contenu JSON via formulaires
4. **Preview** : `NewsletterPreview.tsx` rend le HTML avec des templates React fixes

**Limitation actuelle** : L'edition est limitee a la modification du texte dans des champs de formulaire. Pas de modification de la mise en page visuelle (couleurs, disposition, styles).

---

## Solution proposee : Editeur WYSIWYG Block-Based

Plutot qu'un editeur externe lourd (Unlayer = iframe + API payante), je propose un **editeur de blocs drag-and-drop natif React** base sur le concept de "newsletter builder" :

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  📧 Studio Newsletter - Edition Visuelle                                [Apercu] [Sauver]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  BARRE OUTILS BLOCS                ZONE CANVAS                    PANNEAU PROPRIETES       │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  ┌────────────────────────┐    │
│  │                  │  │                                  │  │                        │    │
│  │  [📝 Texte    ]  │  │  ┌──────────────────────────┐   │  │  📐 Proprietes         │    │
│  │  [🖼️ Image   ]  │  │  │  HEADER ANSUT (editable) │   │  │                        │    │
│  │  [📊 Chiffre ]  │  │  └──────────────────────────┘   │  │  Couleur fond: [■    ] │    │
│  │  [📰 Article ]  │  │                                  │  │  Padding:      [20px ] │    │
│  │  [➗ Separateur]│  │  ┌──────────────────────────┐   │  │  Taille texte: [16px ] │    │
│  │  [📅 Evenement] │  │  │  "Cet été, la Côte..."   │   │  │                        │    │
│  │  [🔗 Bouton   ] │  │  │         EDITO            │   │  │  ⚡ Actions rapides    │    │
│  │                  │  │  └──────────────────────────┘   │  │  [Dupliquer]           │    │
│  │  ─────────────  │  │                                  │  │  [Supprimer]           │    │
│  │                  │  │  ┌──────────────────────────┐   │  │  [Monter] [Descendre]  │    │
│  │  Templates:      │  │  │  🎯 L'ESSENTIEL ANSUT   │   │  │                        │    │
│  │  [Section ANSUT] │  │  │  ┌────┐ ┌────┐ ┌────┐   │   │  └────────────────────────┘    │
│  │  [Tech Block  ]  │  │  │  │ 1  │ │ 2  │ │ 3  │   │   │                                │
│  │  [Footer      ]  │  │  └──────────────────────────┘   │                                │
│  │                  │  │                                  │                                │
│  └──────────────────┘  └──────────────────────────────────┘                                │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture technique

### Option 1 : Editeur de blocs custom (Recommande)

Creer un systeme de blocs React avec :
- Drag-and-drop via `@dnd-kit/core` (gratuit, leger)
- Blocs pre-definis adaptes au format newsletter ANSUT
- Edition inline (contentEditable ou Textarea)
- Export HTML inline vers la base

**Avantages** :
- 100% gratuit et controle total
- Adapte exactement aux besoins ANSUT
- Pas de dependance externe
- Performance optimale

### Option 2 : Integration react-email-editor (Unlayer)

Utiliser la librairie open-source `react-email-editor` :
```typescript
import EmailEditor from 'react-email-editor';
const ref = useRef<EditorRef>(null);
ref.current?.editor?.exportHtml((data) => { /* save */ });
```

**Inconvenients** :
- Interface en anglais
- Design non adapte (generique)
- Iframe lourd (~3MB)
- Version gratuite limitee

---

## Implementation proposee (Option 1)

### Nouveaux composants

| Composant | Description |
|-----------|-------------|
| `NewsletterStudio.tsx` | Layout principal 3 colonnes (blocs/canvas/proprietes) |
| `BlockToolbar.tsx` | Liste des blocs disponibles a glisser |
| `CanvasArea.tsx` | Zone centrale de drop avec rendu des blocs |
| `BlockRenderer.tsx` | Rendu d'un bloc individuel (texte, image, article...) |
| `PropertiesPanel.tsx` | Panneau de modification des proprietes du bloc selectionne |
| `blocks/*.tsx` | Composants individuels par type de bloc |

### Types de blocs

```typescript
type NewsletterBlock = {
  id: string;
  type: 'header' | 'edito' | 'article' | 'tech' | 'chiffre' | 'agenda' | 'image' | 'separator' | 'button' | 'footer';
  content: Record<string, string | number | boolean>;
  style: {
    backgroundColor?: string;
    padding?: string;
    textColor?: string;
    borderRadius?: string;
  };
  order: number;
};

type NewsletterDocument = {
  blocks: NewsletterBlock[];
  globalStyles: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    maxWidth: string;
  };
};
```

### Flux de donnees

```text
┌────────────────┐     ┌───────────────────┐     ┌────────────────┐
│  Newsletter    │     │  NewsletterStudio │     │  HTML Export   │
│  contenu JSON  │ ──► │  (Edition blocs)  │ ──► │  html_court    │
│  essentiel...  │     │  NewsletterDoc    │     │  (inlined)     │
└────────────────┘     └───────────────────┘     └────────────────┘
```

1. **Conversion entree** : Le JSON `contenu` existant est converti en `NewsletterDocument` avec des blocs
2. **Edition** : L'utilisateur manipule les blocs visuellement
3. **Export** : A la sauvegarde, les blocs sont :
   - Reconvertis en `contenu` JSON (pour compatibilite)
   - Exportes en HTML inline (pour envoi email)

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/components/newsletter/studio/NewsletterStudio.tsx` | Layout principal du studio |
| `src/components/newsletter/studio/BlockToolbar.tsx` | Sidebar des blocs disponibles |
| `src/components/newsletter/studio/CanvasArea.tsx` | Zone de drop avec DnD |
| `src/components/newsletter/studio/BlockRenderer.tsx` | Rendu conditionnel des blocs |
| `src/components/newsletter/studio/PropertiesPanel.tsx` | Panneau de proprietes |
| `src/components/newsletter/studio/blocks/HeaderBlock.tsx` | Bloc header ANSUT |
| `src/components/newsletter/studio/blocks/EditoBlock.tsx` | Bloc edito |
| `src/components/newsletter/studio/blocks/ArticleBlock.tsx` | Bloc article essentiel |
| `src/components/newsletter/studio/blocks/TechBlock.tsx` | Bloc tendance tech |
| `src/components/newsletter/studio/blocks/ChiffreBlock.tsx` | Bloc chiffre marquant |
| `src/components/newsletter/studio/blocks/AgendaBlock.tsx` | Bloc agenda |
| `src/components/newsletter/studio/blocks/ImageBlock.tsx` | Bloc image libre |
| `src/components/newsletter/studio/blocks/SeparatorBlock.tsx` | Separateur |
| `src/components/newsletter/studio/blocks/ButtonBlock.tsx` | Bouton CTA |
| `src/components/newsletter/studio/blocks/FooterBlock.tsx` | Footer ANSUT |
| `src/components/newsletter/studio/utils/blockConverter.ts` | Conversion JSON <> Blocs |
| `src/components/newsletter/studio/utils/htmlExporter.ts` | Export HTML inline |
| `src/components/newsletter/studio/index.ts` | Exports |
| `src/types/newsletter-studio.ts` | Types pour le studio |

### Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/DossiersPage.tsx` | Ajouter vue 'studio' dans le workflow newsletter |
| `src/components/newsletter/NewsletterPreview.tsx` | Ajouter bouton "Ouvrir dans le Studio" |
| `package.json` | Ajouter dependance `@dnd-kit/core` et `@dnd-kit/sortable` |

---

## Dependances a installer

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

---

## Workflow utilisateur final

1. **Generer** : L'utilisateur genere une newsletter via IA (existant)
2. **Preview** : Il voit l'apercu (existant)
3. **Studio** : Clic sur "Modifier la mise en page" ouvre le Studio visuel
4. **Edition** : Il peut :
   - Reordonner les blocs par drag-and-drop
   - Modifier le texte en inline
   - Changer les couleurs et styles
   - Ajouter/supprimer des blocs
   - Ajouter des images
5. **Sauvegarder** : Les modifications mettent a jour `contenu` + `html_court`
6. **Valider/Envoyer** : Workflow existant

---

## Recapitulatif

| Aspect | Valeur |
|--------|--------|
| Approche | Editeur de blocs custom avec @dnd-kit |
| Nouveaux fichiers | ~18 fichiers |
| Dependances | 3 packages @dnd-kit |
| Cout | Gratuit |
| Integration | Ajoute vue "studio" au workflow existant |
| Export | HTML inline compatible email |
| Complexite | Moyenne (3-4 heures de dev) |

