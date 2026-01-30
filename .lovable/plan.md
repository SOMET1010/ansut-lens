
# Ajout de la Prévisualisation Responsive dans le Studio Newsletter

## Objectif

Ajouter un sélecteur de viewport (Desktop / Tablette / Mobile) dans le Studio Newsletter pour permettre de prévisualiser la newsletter dans différentes tailles d'écran, particulièrement utile pour vérifier le rendu sur mobile avant envoi.

## Interface utilisateur proposée

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  Studio Newsletter #5                                                               │
│                                                                                     │
│  [✏️ Édition] [👁 Aperçu] [</> HTML]    [🖥️ Desktop] [📱 Tablet] [📱 Mobile]        │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  BLOCS       │           ┌─────────────────┐           │  PROPRIÉTÉS                │
│              │           │                 │           │                            │
│  [Header]    │           │  CANVAS         │           │  Couleur fond: [■]         │
│  [Edito]     │           │  (width: 375px) │           │  Padding: [20px]           │
│  [Article]   │           │                 │           │                            │
│  ...         │           └─────────────────┘           │                            │
│              │                                         │                            │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Solution technique

### Définition des breakpoints

| Viewport | Largeur | Icône |
|----------|---------|-------|
| Desktop | 650px (maxWidth actuel) | Monitor |
| Tablette | 768px | Tablet |
| Mobile | 375px | Smartphone |

### Modifications

Le sélecteur de viewport sera ajouté dans la barre d'en-tête du Studio, à côté des onglets Edition/Aperçu/HTML. Il sera visible en mode **Édition** et **Aperçu**.

La largeur du canvas central s'adaptera dynamiquement au viewport sélectionné.

## Fichier à modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/newsletter/studio/NewsletterStudio.tsx` | Ajouter l'état `previewViewport`, le sélecteur de viewport dans le header, et passer la largeur au CanvasArea et à l'aperçu |
| `src/components/newsletter/studio/CanvasArea.tsx` | Accepter une prop `viewportWidth` optionnelle pour surcharger la maxWidth du canvas |

## Détails techniques

### 1. NewsletterStudio.tsx

Ajouter un nouvel état pour le viewport :
```typescript
const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

const viewportWidths = {
  desktop: document.globalStyles.maxWidth,
  tablet: '768px',
  mobile: '375px'
};
```

Ajouter un groupe de boutons avec des icônes Lucide (`Monitor`, `Tablet`, `Smartphone`) dans le header, à droite des onglets de mode.

Passer la largeur calculée au `CanvasArea` et à la zone d'aperçu.

### 2. CanvasArea.tsx

Ajouter une prop optionnelle `viewportWidth` :
```typescript
interface CanvasAreaProps {
  // ... existing props
  viewportWidth?: string;
}
```

Utiliser cette prop pour surcharger le `maxWidth` du canvas si elle est fournie.

## Résultat attendu

1. L'utilisateur voit 3 boutons (Desktop / Tablette / Mobile) dans le header du Studio
2. Cliquer sur Mobile réduit le canvas à 375px de large
3. L'aperçu en mode Preview utilise également la largeur sélectionnée
4. Le viewport sélectionné est conservé lors du passage entre modes Edition et Aperçu
5. Les blocs restent entièrement fonctionnels quelle que soit la taille
