

# Analyse SPDI visible sur les cartes d'acteurs + conseils d'amelioration

## Objectif
Remplacer l'indicateur "Heat" artificiel (calcule localement) par le vrai score SPDI de chaque acteur, et afficher des conseils d'amelioration directement sur les cartes et dans le panneau de detail.

## Changements prevus

### 1. Carte d'acteur (`SmartActeurCard.tsx`)

**Remplacement du badge "Heat"** :
- Supprimer le calcul `calculateMediaHeat` (faux indicateur base uniquement sur `score_influence`)
- A la place, afficher le vrai `score_spdi_actuel` stocke en base quand `suivi_spdi_actif = true`
- Couleur dynamique selon le score :
  - Vert (80+) : Presence forte
  - Bleu (60-79) : Presence solide  
  - Orange (40-59) : Visibilite faible
  - Rouge (0-39) : Risque d'invisibilite
- Si le suivi SPDI n'est pas actif, afficher un petit badge gris "SPDI inactif" avec une icone info

**Ajout d'un mini-conseil** :
- Sous la jauge d'influence, afficher une ligne de texte courte selon le score :
  - Score >= 80 : "Excellente visibilite"
  - Score 60-79 : "Renforcer la presence LinkedIn"
  - Score 40-59 : "Augmenter les prises de parole"
  - Score < 40 : "Action urgente recommandee"
  - Pas de suivi : "Activer le suivi SPDI"

### 2. Panneau de detail (`ActeurDetail.tsx`)

**Section SPDI enrichie** :
- Quand le suivi est actif et qu'il y a des metriques, ajouter un resume textuel des axes faibles :
  - Identifier automatiquement le ou les axes sous 40/100
  - Afficher un conseil cible par axe faible (ex: "Visibilite faible : publier au moins 2 contenus/semaine sur LinkedIn")
- Quand le suivi est actif mais sans metriques, afficher un bouton "Lancer le premier calcul" qui invoque `calculer-spdi`

### 3. Donnees utilisees

Les champs existent deja dans la table `personnalites` :
- `suivi_spdi_actif` (boolean)
- `score_spdi_actuel` (numeric)
- `tendance_spdi` (text)

Aucune modification de base de donnees n'est necessaire.

## Details techniques

### `SmartActeurCard.tsx`
- Supprimer `calculateMediaHeat` et son appel
- Utiliser `personnalite.score_spdi_actuel` et `personnalite.suivi_spdi_actif` directement (ces champs sont deja dans le type `Personnalite`)
- Nouveau composant interne `SPDIBadge` qui affiche le score avec code couleur
- Nouveau texte de conseil dans le footer, a cote de la jauge d'influence

### `ActeurDetail.tsx`
- Ajouter une fonction `getAxesConseil(metriqueSPDI)` qui retourne les conseils pour chaque axe faible
- Afficher les conseils sous la jauge SPDI dans une liste avec des icones
- Ajouter un bouton "Premier calcul" quand metriques absentes + suivi actif

### Conseils par axe (logique cote client, pas d'appel IA)

```text
Visibilite < 40 : "Augmenter la frequence des publications et communiques de presse"
Qualite < 40 : "Ameliorer le sentiment en diversifiant les prises de parole positives"
Autorite < 40 : "Participer a davantage de panels et conferences sectorielles"
Presence < 40 : "Intensifier l'activite LinkedIn et l'engagement communautaire"
```

## Fichiers modifies
- **Modifie** : `src/components/personnalites/SmartActeurCard.tsx` (badge SPDI + mini-conseil)
- **Modifie** : `src/components/personnalites/ActeurDetail.tsx` (conseils par axe faible + bouton premier calcul)

