

# Option A : Mode Comparatif "Duel d'Influence"

## Objectif

Ajouter un mode de benchmarking cote a cote sur la page Personnalites, permettant de selectionner deux acteurs et de comparer visuellement leurs metriques d'influence sur un meme ecran.

## Pourquoi commencer par l'Option A

- Les composants de base existent deja : `SPDIComparaisonTemporelle` (graphique Recharts multi-acteurs) et `SPDIComparaisonPairs` (rang, ecart a la moyenne)
- Pas de nouvelle table ni de fonction Edge a creer
- Valeur immediate pour les decideurs : "Qui gagne le narratif ?"

---

## Architecture de la fonctionnalite

### Nouveau composant : `SPDIBenchmarkPanel`

Un panneau plein ecran (Dialog ou Sheet large) accessible depuis la page Personnalites via un bouton "Comparer". L'utilisateur selectionne deux acteurs et voit :

```text
+---------------------------+---------------------------+
|       ACTEUR A            |       ACTEUR B            |
|  [Avatar] Nom Prenom     |  [Avatar] Nom Prenom      |
|  Cercle 1 - DG ANSUT     |  Cercle 2 - Ministre      |
+---------------------------+---------------------------+
| Score SPDI: 72.4  +12%   | Score SPDI: 58.1  -3%     |
| [====Sparkline 30j====]  | [====Sparkline 30j====]   |
+---------------------------+---------------------------+
|     SPARKLINES SUPERPOSEES SUR UN MEME GRAPHIQUE      |
|  [Recharts LineChart avec 2 courbes colorees]         |
+-------------------------------------------------------+
| Sentiment A              | Sentiment B                |
| [===Positif===][Neu][Neg]| [==Pos==][===Neutre===][N] |
+---------------------------+---------------------------+
| Part de Voix A           | Part de Voix B             |
| [Donut] 18% du cercle    | [Donut] 12% du cercle     |
+---------------------------+---------------------------+
| Thematiques A            | Thematiques B              |
| #Cloud #5G #IA           | #Regulation #PME #Infra    |
+---------------------------+---------------------------+
| VERDICT IA :                                          |
| "L'acteur A domine sur LinkedIn (+40% de posts),      |
|  mais B a un meilleur sentiment (+15 pts). B gagne    |
|  sur les thematiques regulatoires."                   |
+-------------------------------------------------------+
```

### Selecteur d'acteurs

- Deux `<Select>` (Radix) filtres par nom/cercle
- Auto-completion avec recherche
- Possibilite de pre-remplir un acteur depuis sa fiche detail (bouton "Comparer avec...")

---

## Modifications prevues

### Fichiers crees

**`src/components/spdi/SPDIBenchmarkPanel.tsx`**
- Dialog pleine largeur avec layout en deux colonnes
- Deux selecteurs d'acteurs (Radix Select avec recherche)
- Affichage cote a cote : score, sparkline individuelle, sentiment, share of voice, thematiques
- Graphique Recharts superpose avec les deux courbes
- Section "Verdict IA" en bas (texte genere par le hook existant ou affichage statique des ecarts)

**`src/hooks/useBenchmarkData.ts`**
- Appelle `useActeurDigitalDashboard` pour chacun des deux acteurs selectionnes
- Fusionne les sparkline data pour le graphique superpose
- Calcule les ecarts : delta score, delta sentiment, delta share of voice
- Genere un "verdict" textuel base sur les ecarts (logique locale, pas d'appel IA pour la v1)

### Fichiers modifies

**`src/pages/PersonnalitesPage.tsx`**
- Ajout d'un bouton "Comparer" a cote du toggle Liste/Radar dans le header
- State `benchmarkOpen` pour ouvrir/fermer le panneau
- Import et rendu de `SPDIBenchmarkPanel`

**`src/components/personnalites/ActeurDetail.tsx`**
- Ajout d'un bouton "Comparer avec un pair" dans la section SPDI (visible uniquement si suivi actif)
- Ce bouton ouvre le `SPDIBenchmarkPanel` avec l'acteur pre-selectionne en position A

**`src/components/spdi/index.ts`**
- Export du nouveau `SPDIBenchmarkPanel`

---

## Details techniques

### Donnees utilisees (aucune nouvelle table)

Toutes les donnees proviennent des hooks existants :
- `useActeurDigitalDashboard` : sparkline, sentiment, canaux, share of voice, thematiques
- `usePersonnalites` : liste des acteurs pour les selecteurs
- `presence_digitale_metrics` : scores SPDI pour le graphique superpose (via Recharts, comme `SPDIComparaisonTemporelle`)

### Graphique superpose

Reutilisation du pattern de `SPDIComparaisonTemporelle` (Recharts `LineChart` avec deux `Line`) mais limite a exactement 2 acteurs pour la lisibilite, avec des couleurs fixes (bleu vs orange).

### Verdict textuel (v1 - logique locale)

Pas d'appel a l'IA pour la v1. Le verdict est genere par une fonction utilitaire qui compare les metriques :
- Si ecart score > 10 pts : "X domine largement"
- Si ecart sentiment > 20% : "Y a un meilleur sentiment"
- Si share of voice A > B : "A a une plus grande part de voix"
- Combinaison de ces constats en 2-3 phrases

### Aucune nouvelle dependance

- Recharts (deja installe) pour le graphique superpose
- Radix Select (deja installe) pour les selecteurs
- SVG existants (MiniSparkline, SentimentBar, ShareOfVoiceDonut) reutilises dans les colonnes

### Responsive

- Sur desktop : 2 colonnes cote a cote
- Sur mobile : empilement vertical (1 colonne)

