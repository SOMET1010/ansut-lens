
# Fix : Barre de sentiment affichant 100% Negatif a tort

## Diagnostic

Deux bugs distincts causent l'affichage "0% Positif, 0% Neutre, 100% Negatif" pour Djibril Ouattara :

### Bug 1 -- Affichage : `SentimentBar` gere mal le cas "aucune donnee"

Quand aucune mention n'a de sentiment (`positif=0, neutre=0, negatif=0`), le calcul fait :
```
total = 0 + 0 + 0 || 1 = 1
pPos = 0%
pNeu = 0%
pNeg = 100 - 0 - 0 = 100%   <-- faux !
```

Le 100% Negatif est un artefact mathematique, pas un vrai sentiment.

### Bug 2 -- Donnees : le hook ne cherche le sentiment qu'au mauvais endroit

Le hook `useActeurDigitalDashboard` cherche le sentiment uniquement dans la table `personnalites_mentions` -> `mentions`. Or pour Djibril Ouattara :
- `personnalites_mentions` : **0 lignes** liees
- `actualites` : **73 articles** le mentionnant, mais **tous ont `sentiment = null`**
- `social_insights` : **0 lignes**

Le hook ignore completement les articles de la table `actualites`, qui sont pourtant la source principale de donnees pour cet acteur.

---

## Corrections

### 1. `SentimentBar.tsx` -- Gerer le cas "aucune donnee"

Quand `positif + neutre + negatif === 0`, afficher un etat vide au lieu du calcul trompeur :
- Afficher "Aucune donnee de sentiment" en texte grise
- Barre grise uniforme en mode compact

### 2. `useActeurDigitalDashboard.ts` -- Inclure les actualites dans le calcul du sentiment

Modifier la query sentiment (lignes 69-91) pour aussi chercher dans `actualites` les articles mentionnant l'acteur par nom. Fusionner les resultats des deux sources (mentions + actualites) pour le decompte positif/neutre/negatif.

Le hook doit :
- Recuperer le nom/prenom de l'acteur (via `personnalites`)
- Chercher les actualites correspondantes filtrees par periode
- Combiner avec les mentions existantes

### 3. Enrichir le sentiment des articles existants (optionnel mais recommande)

Les 73 articles de Djibril Ouattara ont tous `sentiment = null`. La fonction Edge `enrichir-actualite` pourrait etre invoquee pour combler ce manque. Ce point est secondaire car le fix principal (point 1) evitera deja l'affichage trompeur.

---

## Fichiers concernes

| Fichier | Modification |
|---------|-------------|
| `src/components/spdi/SentimentBar.tsx` | Ajouter gestion du cas total=0, afficher "Aucune donnee" |
| `src/hooks/useActeurDigitalDashboard.ts` | Inclure `actualites` dans le calcul du sentiment |

## Impact

- Corrige l'affichage trompeur "100% Negatif" pour tous les acteurs sans donnees
- Enrichit le calcul sentiment en utilisant les articles (source principale)
- Aucune modification de base de donnees requise
