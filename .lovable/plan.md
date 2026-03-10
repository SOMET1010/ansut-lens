

## Cockpit Prédictif : Analyse d'Impact ANSUT + Détection de Signaux Faibles

Transformer le Centre de Veille d'un dashboard descriptif en un cockpit de pilotage prédictif avec deux fonctionnalités clés : (1) l'analyse d'impact automatisée sur les missions ANSUT, et (2) la détection de clusters de signaux faibles.

---

### Fonctionnalité 1 : Analyse d'Impact ANSUT

Chaque article enrichi par l'IA recevra un champ `impact_ansut` — une phrase courte expliquant en quoi cette actualité affecte les missions de l'ANSUT (service universel, 5G rurale, cybersécurité, inclusion numérique).

**Backend** — Modifier la fonction Edge `enrichir-actualite` :
- Ajouter au prompt d'enrichissement IA une instruction pour générer un champ `impact_ansut` (1-2 phrases max) dans le JSON de retour
- Exemple : "Cette régulation au Nigeria pourrait influencer le cadre de déploiement 5G en zone rurale pour l'ANSUT"
- Si l'article n'a aucun lien avec les missions ANSUT, le champ sera `null`

**Database** — Migration :
- Ajouter la colonne `impact_ansut TEXT` à la table `actualites`

**Frontend** — Modifier `IntelligenceCard.tsx` :
- Afficher le champ `impact_ansut` sous le résumé avec une icône cible (Target) et un fond coloré distinctif quand il est présent
- Badge "Impact ANSUT" pour distinguer visuellement ces articles

---

### Fonctionnalité 2 : Détection de Signaux Faibles (Clusters Émergents)

Algorithme de détection : si 3+ sources distinctes mentionnent un sujet similaire en 48h, une alerte "Innovation Émergente" est levée automatiquement.

**Backend** — Nouvelle fonction Edge `detecter-signaux-faibles` :
- Récupère les actualités des dernières 48h
- Utilise Gemini Flash pour regrouper les articles par thème et identifier les sujets mentionnés par 3+ sources distinctes
- Pour chaque cluster détecté :
  - Insère un `signal` dans la table `signaux` avec `niveau: 'warning'`, `quadrant` approprié, et un titre descriptif
  - Insère une `alerte` avec `type: 'signal'` et `niveau: 'warning'`
- Retourne le nombre de signaux faibles détectés

**Frontend** — Nouveau composant `WeakSignalDetector.tsx` :
- Bouton "Scanner les signaux faibles" sur la page Radar (entre le briefing et le radar SVG)
- Affiche les clusters détectés avec : nombre de sources, thème, et articles liés
- Badge pulsant quand de nouveaux signaux faibles sont détectés
- Chaque cluster est cliquable pour voir les articles sources

**Frontend** — Modifier `RadarPage.tsx` :
- Intégrer le nouveau composant `WeakSignalDetector` dans la page

---

### Fichiers concernés

| Action | Fichier |
|--------|---------|
| Migration | `ALTER TABLE actualites ADD COLUMN impact_ansut TEXT` |
| Modifier | `supabase/functions/enrichir-actualite/index.ts` — ajouter `impact_ansut` au prompt |
| Créer | `supabase/functions/detecter-signaux-faibles/index.ts` |
| Modifier | `src/components/radar/IntelligenceCard.tsx` — afficher impact ANSUT |
| Créer | `src/components/radar/WeakSignalDetector.tsx` |
| Modifier | `src/pages/RadarPage.tsx` — intégrer le détecteur |
| Modifier | `src/components/radar/index.ts` — export |
| Modifier | `supabase/config.toml` — ajouter la nouvelle function |

### Détails techniques

**Prompt d'analyse d'impact** (ajouté au prompt existant d'enrichissement) :
```
Si cet article a un lien avec les missions de l'ANSUT (service universel télécom, 
déploiement 5G rural, cybersécurité nationale, inclusion numérique, régulation télécom 
en Côte d'Ivoire ou sous-région), rédige 1-2 phrases d'impact concret. 
Sinon, retourne null.
```

**Algorithme de clustering** (dans l'Edge Function) :
- Envoie les titres + résumés des 48h à Gemini avec tool calling pour extraire des clusters structurés
- Seuil : 3+ sources distinctes (`source_nom`) sur le même thème
- Output structuré via tool calling : `{ clusters: [{ theme, articles_ids, quadrant, urgency }] }`

