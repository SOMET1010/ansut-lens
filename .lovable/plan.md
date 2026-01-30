

# Correction de l'affichage de la modale "Analyse IA"

## Diagnostic

Le champ `analyse_ia` contient du **JSON stringifié** avec cette structure :

```json
{
  "tags": ["5G", "Orange Côte d'Ivoire", ...],
  "categorie": "Technologies & Infrastructures",
  "importance": 98,
  "quadrant_dominant": "market",
  "quadrant_distribution": { "tech": 97, "regulation": 0, "market": 100, "reputation": 0 },
  "alertes_declenchees": [],
  "analyse_summary": "4 mots-clés détectés",
  "enrichi_le": "2026-01-30T04:28:39.608Z"
}
```

ReactMarkdown essaie de rendre ce JSON comme du texte Markdown, ce qui affiche le JSON brut.

---

## Solution proposée

Parser le JSON et afficher un dashboard structuré avec :
- Score d'importance (jauge visuelle)
- Catégorie détectée
- Tags en badges
- Distribution des quadrants (barres)
- Alertes déclenchées (si présentes)
- Date d'enrichissement

```text
┌─────────────────────────────────────────────────────────────┐
│  ✕  Analyse IA                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📰 Côte d'Ivoire/Internet par Satellite : ...              │
│                                                             │
│  ─────────────────────────────────────────────              │
│                                                             │
│  ⭐ Importance : 98/100   │  📁 Technologies & Infra        │
│  ████████████████████░░   │                                 │
│                                                             │
│  ─────────────────────────────────────────────              │
│                                                             │
│  🏷️ Mots-clés détectés (4)                                  │
│  ┌────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│  │  5G    │ │ Orange CI       │ │ Inclusion num.  │         │
│  └────────┘ └─────────────────┘ └─────────────────┘         │
│                                                             │
│  ─────────────────────────────────────────────              │
│                                                             │
│  📊 Répartition par quadrant                                │
│  Tech       ████████████████████░░░  97%                    │
│  Market     ██████████████████████   100%                   │
│  Regulation ░░░░░░░░░░░░░░░░░░░░░░   0%                     │
│  Reputation ░░░░░░░░░░░░░░░░░░░░░░   0%                     │
│                                                             │
│  ─────────────────────────────────────────────              │
│  🕐 Enrichi le 30/01/2026 à 04:28                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/actualites/ArticleCluster.tsx` | Remplacer ReactMarkdown par un parser JSON + affichage structuré |

---

## Implémentation

### 1. Interface pour le JSON d'analyse

```typescript
interface AnalyseIA {
  tags: string[];
  categorie: string;
  importance: number;
  quadrant_dominant: string;
  quadrant_distribution: Record<string, number>;
  alertes_declenchees: string[];
  analyse_summary: string;
  enrichi_le: string;
}
```

### 2. Parser et affichage dans la modale

```tsx
// Parser le JSON (avec gestion d'erreur)
const parseAnalyseIA = (analyseString: string | null): AnalyseIA | null => {
  if (!analyseString) return null;
  try {
    return JSON.parse(analyseString) as AnalyseIA;
  } catch {
    return null;
  }
};

// Dans le Dialog
const analyseData = parseAnalyseIA(mainArticle.analyse_ia);

{analyseData ? (
  <div className="space-y-6">
    {/* Score + Catégorie */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Importance</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${analyseData.importance}%` }}
            />
          </div>
          <span className="font-bold text-sm">{analyseData.importance}/100</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Catégorie</p>
        <Badge variant="secondary">{analyseData.categorie}</Badge>
      </div>
    </div>

    {/* Tags */}
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Mots-clés détectés ({analyseData.tags.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {analyseData.tags.map(tag => (
          <Badge key={tag} variant="outline">{tag}</Badge>
        ))}
      </div>
    </div>

    {/* Quadrants */}
    <div>
      <p className="text-xs text-muted-foreground mb-2">Répartition par quadrant</p>
      <div className="space-y-2">
        {Object.entries(analyseData.quadrant_distribution).map(([quadrant, score]) => (
          <div key={quadrant} className="flex items-center gap-2">
            <span className="w-24 text-xs capitalize">{quadrant}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary/70 transition-all" 
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs w-8 text-right">{score}%</span>
          </div>
        ))}
      </div>
    </div>

    {/* Alertes */}
    {analyseData.alertes_declenchees.length > 0 && (
      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
        <p className="text-xs font-medium text-destructive mb-1">Alertes déclenchées</p>
        <p className="text-sm">{analyseData.alertes_declenchees.join(', ')}</p>
      </div>
    )}

    {/* Date */}
    <p className="text-xs text-muted-foreground pt-2 border-t">
      Enrichi le {new Date(analyseData.enrichi_le).toLocaleString('fr-FR')}
    </p>
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
```

---

## Récapitulatif

| Élément | Avant | Après |
|---------|-------|-------|
| Parsing | Aucun (JSON brut) | `JSON.parse()` avec fallback |
| Affichage tags | Texte JSON | Badges cliquables |
| Score importance | Nombre brut | Barre de progression |
| Quadrants | Objet JSON | Barres horizontales |
| Alertes | Array JSON | Encart rouge si présent |
| Date | ISO string | Format `fr-FR` lisible |

