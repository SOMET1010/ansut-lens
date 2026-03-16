

## Analyse des écarts

En comparant le texte de présentation avec l'outil actuel, trois fonctionnalités manquent sur la page Communication :

| Capacité décrite | État actuel |
|---|---|
| Veille quotidienne réseaux/médias | ✅ Widgets e-réputation + Matinale |
| Sujets émergents numérique/télécoms | ✅ WeakSignalDetector (Radar uniquement) |
| Analyse sentiment conversations | ✅ SocialPulseWidget |
| Suivi comptes écosystème | ✅ Personnalités + Social Insights |
| Synthèse structurée chaque matin | ✅ Matinale briefing |
| Idées de contenus/publications | ✅ Kit Communication + Prêt-à-Poster |
| **Analyse rapide réactions du public** | ❌ Manquant |
| **Sujets à valoriser identifiés** | ❌ Manquant (existe sur Radar, pas sur Com) |
| **Posts à mettre en avant** | ❌ Manquant |

## Plan — 3 nouveaux widgets sur la page Communication

### 1. Widget « Analyseur de Réactions » (nouveau)
Un mini-outil où l'utilisateur colle l'URL d'un post (LinkedIn, X, article) et obtient une analyse rapide des réactions du public via l'assistant IA en mode analyse.

- Champ URL + bouton "Analyser"
- Appel à `assistant-ia` avec un prompt spécialisé demandant : ton général, points positifs/négatifs relevés, recommandations
- Résultat affiché dans une carte structurée (sentiment global, points clés, suggestions)
- Fichier : `src/pages/CommunicationPage.tsx` — nouvelle section `ReactionAnalyzerSection`

### 2. Widget « Sujets à Valoriser » (nouveau)
Une liste IA de 3-5 sujets d'actualité que la com devrait mettre en avant, générée à partir des actualités récentes.

- Au chargement, requête vers `assistant-ia` avec le contexte des dernières actualités et un prompt demandant les sujets porteurs pour l'image de l'ANSUT
- Affichage : cartes avec titre du sujet, angle suggéré, et bouton "Générer un post" qui pré-remplit le Kit Communication
- Fichier : `src/pages/CommunicationPage.tsx` — nouvelle section `SujetsValorisationSection`

### 3. Widget « Posts à Amplifier » (nouveau)
Remontée des publications sociales récentes de l'écosystème qui méritent un partage/engagement de l'ANSUT.

- Requête sur `social_insights` triés par engagement/pertinence récente
- Affichage : carte avec contenu du post, plateforme, auteur, score d'engagement, et bouton "Préparer une réponse" (pré-remplit le Kit Com)
- Fichier : `src/pages/CommunicationPage.tsx` — nouvelle section `PostsAmplifierSection`

### Fichiers modifiés

- `src/pages/CommunicationPage.tsx` — ajout des 3 nouvelles sections entre les widgets e-réputation et la Matinale

### Aucune modification backend requise
Les 3 widgets s'appuient sur des données et fonctions existantes (`assistant-ia`, `social_insights`, `actualites`).

