

## Plan : Espace Communication Dédié

### Constat

La plateforme possède déjà la plupart des briques nécessaires (veille, sentiment, matinale avec post LinkedIn, assistant IA, studio publication), mais elles sont **dispersées** dans différents menus. L'équipe Com doit naviguer entre 4-5 pages pour assembler sa matière.

### Ce qu'on va construire

**Une page "Espace Communication"** accessible depuis la sidebar, qui regroupe tout en un seul endroit avec 3 sections claires :

#### 1. Tableau de bord du matin (existant, resurfacé)
- Embed du briefing matinale (flash info, veille réputation, tonalité)
- Ajout d'un **post X/Twitter** en plus du LinkedIn existant dans la matinale
- Boutons "Copier" sur chaque suggestion de post

#### 2. Générateur de contenus Com
- Nouveau mode **"Communication"** dans l'assistant IA avec un prompt spécialisé :
  - Résumé du sujet
  - Messages clés
  - Propositions de contenus (LinkedIn, X, email DG)
  - Angles de communication
- Template de **dossier de communication** pré-structuré généré par l'IA à partir d'un sujet ou d'une actualité sélectionnée

#### 3. Boîte à outils rapide
- Raccourcis vers : Studio Publication, Newsletters, Matinale
- Historique des derniers contenus générés

### Modifications techniques

| Fichier | Action |
|---------|--------|
| `src/pages/CommunicationPage.tsx` | Nouvelle page avec les 3 sections |
| `src/components/assistant/ModeSelector.tsx` | Ajout mode "communication" |
| `supabase/functions/assistant-ia/index.ts` | Ajout prompt mode communication |
| `supabase/functions/generer-matinale/index.ts` | Ajout post X/Twitter dans le JSON |
| `src/hooks/useMatinale.ts` | Mise à jour du type pour inclure le post X |
| `src/components/layout/AppSidebar.tsx` | Ajout entrée "Espace Com" dans le menu |
| `src/App.tsx` | Ajout route `/communication` |

### Principe UX

La page est pensée comme un **bureau de la Com** : on arrive le matin, on voit le briefing, on copie les posts suggérés, et si on a un projet à valoriser, on lance le générateur qui prépare tout le kit. La validation reste humaine.

