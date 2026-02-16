

# Redesign du Dashboard d'Influence - Presence Digitale dans les fiches acteurs

## Objectif

Transformer la section "Presence Digitale Institutionnelle" du panneau de detail acteur (`ActeurDetail.tsx`) d'un simple interrupteur ON/OFF en un veritable tableau de bord analytique compact. Enrichir egalement la carte acteur (`SmartActeurCard.tsx`) avec des indicateurs visuels plus riches.

## Vue d'ensemble des changements

Le redesign se concentre sur deux zones : la carte acteur (apercu rapide) et le panneau lateral de detail (analyse approfondie). Toutes les donnees necessaires existent deja dans la base : `presence_digitale_metrics`, `personnalites_mentions`, `mentions`, `social_insights` et `actualites`.

---

## 1. Panneau de detail acteur - Nouveau Dashboard SPDI

Remplacement de la section SPDI actuelle (lignes 252-348 de `ActeurDetail.tsx`) par un dashboard structure en blocs visuels compacts.

### Bloc A : Vitalite Digitale (Sparkline + Score)
- Remplacer le simple score numerique par une **micro-courbe sparkline** (7 derniers jours) a cote du score SPDI
- Indicateur de tendance avec fleche et pourcentage de variation
- Donnees : `presence_digitale_metrics` (derniers 7 points de `score_spdi`)

### Bloc B : Barre de Sentiment Tri-couleur
- Barre horizontale segmentee montrant la repartition **Positif / Neutre / Negatif**
- Calcul depuis `mentions` liees a l'acteur via `personnalites_mentions` (champ `sentiment` : -1 a 1)
- Seuils : sentiment > 0.2 = positif, -0.2 a 0.2 = neutre, < -0.2 = negatif
- Affichage des pourcentages a cote de la barre

### Bloc C : Matrice de Presence par Canal
- Mini-jauges horizontales pour chaque canal : **LinkedIn**, **Presse**, **Conferences**
- Donnees issues de `presence_digitale_metrics` : `activite_linkedin`, `nb_citations_directes` (proxy presse), `nb_invitations_panels` (proxy conferences)
- Normalisation sur 100 pour l'affichage en jauge

### Bloc D : Share of Voice (Part de Voix)
- Mini donut chart comparant le nombre de mentions de l'acteur vs la moyenne de son cercle
- Donnees : `presence_digitale_metrics.nb_mentions` de l'acteur vs moyenne des acteurs du meme cercle
- Affichage du rang et de l'ecart a la moyenne

### Bloc E : Mots-cles / Thematiques
- Affichage des thematiques de l'acteur (`personnalite.thematiques`) sous forme de badges cliquables
- Enrichissement avec les `entites_detectees` et `hashtags` des `social_insights` lies (si disponibles)

### Bloc F : Carte IA Insights (Actionnable)
- Remonter les 1-2 recommandations IA les plus prioritaires directement dans le panneau
- Format "carte conseil" avec icone, texte court et action recommandee
- Donnees : `presence_digitale_recommandations` (deja utilise, mais mis en avant visuellement)

---

## 2. Carte acteur - Indicateurs enrichis

### Ajout d'une micro-sparkline
- Sous le score SPDI badge, ajouter une ligne de 7 points montrant la tendance recente
- Composant SVG leger inline (pas de Recharts pour la carte, trop lourd)

### Barre de sentiment compacte
- Petite barre tri-couleur (3px de haut) sous les tags thematiques
- Meme logique de calcul que le Bloc B mais en version ultra-compacte

---

## 3. Nouveau hook : `useActeurDigitalDashboard`

Un hook dedie qui regroupe toutes les donnees necessaires au dashboard en un seul appel optimise :

```text
Entrees : personnaliteId
Sorties :
  - sparklineData: number[] (7 derniers scores SPDI)
  - sentimentDistribution: { positif: number, neutre: number, negatif: number }
  - canauxPresence: { linkedin: number, presse: number, conferences: number }
  - shareOfVoice: { monScore: number, moyenneCercle: number, rang: number, total: number }
  - topThematiques: string[]
```

### Requetes :
1. **Sparkline** : `presence_digitale_metrics` filtre sur les 7 derniers jours, champ `score_spdi`
2. **Sentiment** : jointure `personnalites_mentions` -> `mentions`, agregation du champ `sentiment`
3. **Canaux** : derniere ligne de `presence_digitale_metrics` pour `activite_linkedin`, `nb_citations_directes`, `nb_invitations_panels`
4. **Share of Voice** : `presence_digitale_metrics.nb_mentions` pour tous les acteurs du meme cercle

---

## 4. Nouveau composant : `SPDIDashboardCompact`

Composant dedie qui encapsule les Blocs A a F dans une mise en page structuree. Il remplace la section SPDI actuelle dans `ActeurDetail.tsx`.

Structure visuelle :
```text
+---------------------------------------+
| Vitalite Digitale    [Sparkline] 72.4  |
|   +12% sur 7j                         |
+---------------------------------------+
| Sentiment  [====Positif===][Neutre][N] |
|            62%        28%    10%       |
+---------------------------------------+
| Canaux          | Part de Voix        |
| LinkedIn  ===== | [Donut] 2e/8        |
| Presse    ====  | +5.2 pts vs moy     |
| Conf.     ==    |                     |
+---------------------------------------+
| #Cloud  #5G  #Inclusion  #Innovation  |
+---------------------------------------+
| IA Insight : "Renforcer presence..."  |
|              [Action recommandee]     |
+---------------------------------------+
```

---

## Details techniques

### Fichiers crees
- **`src/components/spdi/SPDIDashboardCompact.tsx`** : le nouveau dashboard compact (Blocs A-F)
- **`src/components/spdi/SentimentBar.tsx`** : barre de sentiment tri-couleur reutilisable
- **`src/components/spdi/MiniSparkline.tsx`** : composant SVG sparkline leger
- **`src/components/spdi/ShareOfVoiceDonut.tsx`** : mini donut chart SVG
- **`src/components/spdi/PresenceCanaux.tsx`** : mini-jauges par canal
- **`src/hooks/useActeurDigitalDashboard.ts`** : hook de donnees agregees

### Fichiers modifies
- **`src/components/personnalites/ActeurDetail.tsx`** : remplacement de la section SPDI (lignes 252-348) par `<SPDIDashboardCompact />`
- **`src/components/personnalites/SmartActeurCard.tsx`** : ajout sparkline + barre sentiment compacte
- **`src/components/spdi/index.ts`** : export des nouveaux composants

### Bibliotheques
- Pas de nouvelles dependances : les micro-visualisations (sparkline, donut, barres) seront en SVG pur pour la performance
- Recharts est utilise uniquement dans les pages dediees, pas dans les cartes

### Compatibilite dark mode
- Tous les composants utilisent les variables CSS Tailwind (`text-foreground`, `bg-muted`, etc.)
- Les couleurs de sentiment utilisent des classes semantiques avec variantes dark

### Aucune modification de base de donnees
- Toutes les donnees existent deja dans les tables `presence_digitale_metrics`, `personnalites_mentions`, `mentions` et `personnalites`
