

# Correction du bouton "Lire l'analyse"

## Diagnostic

Le bouton "Lire l'analyse" dans `ArticleCluster.tsx` (lignes 204-211) **n'a pas de handler `onClick`** - c'est un bouton purement visuel sans aucune action associée :

```tsx
<Button 
  variant="default" 
  size="sm" 
  className="text-xs font-bold gap-1"
>
  Lire l'analyse  {/* ⚠️ Pas de onClick ! */}
  <ArrowRight className="h-3.5 w-3.5" />
</Button>
```

## Données disponibles

L'interface `Actualite` contient déjà un champ `analyse_ia: string | null` qui stocke l'analyse IA de l'article. Ce champ est rempli par la fonction d'enrichissement.

## Solution proposée

Ajouter une **modale de lecture** qui s'ouvre au clic sur "Lire l'analyse" pour afficher :
- Le titre de l'article
- L'analyse IA (en Markdown si enrichi)
- Un message si l'article n'a pas encore été enrichi

```text
┌─────────────────────────────────────────────────────────────┐
│  ✕  Analyse IA                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📰 [Titre de l'article]                                    │
│                                                             │
│  ─────────────────────────────────────────────              │
│                                                             │
│  [Contenu de l'analyse IA en Markdown]                      │
│                                                             │
│  - Points clés                                              │
│  - Entités mentionnées                                      │
│  - Sentiment détecté                                        │
│                                                             │
│  ─────────────────────────────────────────────              │
│                                                             │
│  Si pas d'analyse :                                         │
│  "Cet article n'a pas encore été enrichi.                   │
│   Cliquez sur 'Enrichir' pour générer l'analyse."           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/actualites/ArticleCluster.tsx` | Ajouter état `isAnalysisOpen` + Dialog + onClick sur le bouton |

---

## Implémentation détaillée

### ArticleCluster.tsx

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, FileText } from 'lucide-react';

// Dans le composant :
const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

// Bouton avec onClick
<Button 
  variant="default" 
  size="sm" 
  className="text-xs font-bold gap-1"
  onClick={() => setIsAnalysisOpen(true)}
  disabled={!mainArticle.analyse_ia && needsEnrichment}
>
  Lire l'analyse
  <ArrowRight className="h-3.5 w-3.5" />
</Button>

// Modale d'analyse
<Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Analyse IA
      </DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      {/* Titre de l'article */}
      <h3 className="font-bold text-lg">{mainArticle.titre}</h3>
      
      <div className="border-t pt-4">
        {mainArticle.analyse_ia ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{mainArticle.analyse_ia}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-center">
              Cet article n'a pas encore été analysé.<br />
              Cliquez sur "Enrichir" pour générer l'analyse.
            </p>
          </div>
        )}
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## Comportement du bouton

| État de l'article | Bouton | Comportement |
|-------------------|--------|--------------|
| Avec `analyse_ia` | Actif (bleu) | Ouvre la modale avec l'analyse |
| Sans `analyse_ia` mais déjà enrichi | Actif | Ouvre la modale avec message "pas encore analysé" |
| Sans `analyse_ia` et `importance=0` | Désactivé (grisé) | Tooltip "Enrichissez d'abord l'article" |

---

## Dépendances existantes

✅ `react-markdown` est déjà installé dans le projet (version ^10.1.0)
✅ `Dialog` de shadcn/ui est déjà disponible

