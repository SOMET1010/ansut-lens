

# Page de Revue de Stabilite SPDI globale

## Objectif
Creer une page dediee `/spdi-review` qui offre une vue panoramique de la stabilite et des tendances SPDI de tous les acteurs suivis, avec des indicateurs de risque et des comparaisons croisees.

## Contenu de la page

### Section 1 : KPI globaux (en haut)
Quatre cartes resume :
- **Acteurs suivis** : nombre total avec suivi SPDI actif
- **Score moyen** : moyenne des `score_spdi_actuel` de tous les acteurs
- **En hausse** : nombre d'acteurs avec `tendance_spdi = 'hausse'`
- **En alerte** : nombre d'acteurs avec score < 40 (risque d'invisibilite)

### Section 2 : Tableau de synthese
Un tableau triable affichant pour chaque acteur suivi :
- Nom, cercle
- Score SPDI actuel (badge colore vert/bleu/orange/rouge)
- Tendance (icone fleche + texte hausse/stable/baisse)
- Variation sur 30 jours (calculee depuis `presence_digitale_metrics`)
- Mini-conseil (meme logique que sur les cartes acteurs)

### Section 3 : Graphique de comparaison temporelle
Reutilisation du composant `SPDIComparaisonTemporelle` existant, mais en version pleine largeur avec tous les acteurs pre-selectionnes.

### Section 4 : Classement par axe
Quatre mini-cartes (Visibilite, Qualite, Autorite, Presence) montrant le top 3 et le bottom 3 des acteurs pour chaque axe, bases sur la derniere mesure dans `presence_digitale_metrics`.

## Navigation
- Ajout dans la sidebar sous "Presence Digitale" (meme permission `view_personnalites`)
- Icone : `TrendingUp` de lucide-react
- Label : "Revue SPDI"

## Details techniques

### Fichiers crees
- **`src/pages/SpdiReviewPage.tsx`** : la page principale avec les 4 sections
- **`src/components/spdi/SPDIStabilityTable.tsx`** : le tableau de synthese triable
- **`src/components/spdi/SPDIAxesRanking.tsx`** : les mini-cartes de classement par axe

### Fichiers modifies
- **`src/App.tsx`** : ajout de la route `/spdi-review` sous le meme groupe `view_personnalites`
- **`src/components/layout/AppSidebar.tsx`** : ajout de l'entree "Revue SPDI" dans le menu
- **`src/components/spdi/index.ts`** : export des deux nouveaux composants

### Donnees utilisees
Toutes les donnees existent deja :
- `personnalites` : `score_spdi_actuel`, `tendance_spdi`, `suivi_spdi_actif`, `cercle`
- `presence_digitale_metrics` : `score_spdi`, `score_visibilite`, `score_qualite`, `score_autorite`, `score_presence`, `date_mesure`, `personnalite_id`

Aucune modification de base de donnees requise.

### Requetes principales
1. **KPI globaux** : `SELECT count(*), avg(score_spdi_actuel), count(CASE WHEN tendance_spdi='hausse'), count(CASE WHEN score_spdi_actuel < 40)` depuis `personnalites WHERE suivi_spdi_actif = true`
2. **Tableau** : tous les acteurs avec `suivi_spdi_actif = true` + jointure avec la derniere mesure de `presence_digitale_metrics` pour la variation 30j
3. **Classement axes** : derniere mesure par acteur depuis `presence_digitale_metrics`, tri par chaque score d'axe

### Logique de variation 30j
Pour chaque acteur, comparer le score SPDI le plus recent avec celui d'il y a ~30 jours dans `presence_digitale_metrics`. La difference donne la variation affichee dans le tableau.

