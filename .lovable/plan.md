

# Montee en gamme du module "Analyse d'Influence Digitale"

## Etat des lieux

La majorite des composants visuels existent deja (SentimentBar, MiniSparkline, ShareOfVoiceDonut, PresenceCanaux, SPDIDashboardCompact, SPDIRecommandations). Cependant, plusieurs lacunes subsistent par rapport aux criteres d'acceptation demandes.

## Ecarts identifies et corrections prevues

### US #1 : Tooltips sur la barre de sentiment
- **Existant** : La barre segmentee tri-couleur est en place
- **Manquant** : Aucun tooltip au survol des segments
- **Action** : Ajouter des Radix Tooltips sur chaque segment de `SentimentBar.tsx` affichant le pourcentage exact et le label ("62% Positif", etc.)

### US #2 : Sparkline 30 jours + filtre de periode
- **Existant** : Sparkline SVG avec 7 points, delta affiche
- **Manquant** : La sparkline ne montre que 7 mesures quel que soit le contexte ; aucun filtre de periode
- **Action** :
  - Ajouter un `useState` de periode (7j / 30j / 1an) dans `SPDIDashboardCompact` avec un sélecteur de boutons
  - Modifier `useActeurDigitalDashboard` pour accepter un parametre `periode` et adapter la requete sparkline (limit 7 / 30 / 365 et filtre `date_mesure >= now - X jours`)
  - Filtrer aussi la requete sentiment et canaux selon la meme periode

### US #3 : Share of Voice - pourcentage dans le donut
- **Existant** : Donut SVG + rang + ecart vs moyenne
- **Manquant** : Le pourcentage de part de voix reelle (mentions acteur / total mentions cercle) n'est pas affiche
- **Action** : Calculer `sharePercent = (monScore / totalMentionsCercle) * 100` dans le hook et l'afficher au centre du donut

### US #4 : Extraction des thematiques depuis les donnees NLP
- **Existant** : Le bloc badges affiche `personnalite.thematiques` mais `topThematiques` du hook retourne toujours un tableau vide
- **Manquant** : Agregation des `entites_detectees` et `hashtags` depuis la table `social_insights` liee a l'acteur
- **Action** :
  - Ajouter une requete dans `useActeurDigitalDashboard` qui joint `personnalites_mentions` avec `social_insights` (via `mention_id`) pour agreger les hashtags et entites les plus frequents
  - Retourner les 6 termes les plus recurrents dans `topThematiques`
  - Fusionner avec les thematiques manuelles de la personnalite (sans doublon)

### US #5 : IA Insights - deja fonctionnel
- **Existant** : La carte "IA Insights" remonte les 2 premieres recommandations avec icones, priorite, canal et thematique
- **Action** : Aucune modification majeure. Le filtrage par periode (US#2) s'appliquera aussi aux recommandations affichees

### Contrainte : Filtre de periode global
- Ajout de 3 boutons (7j / 30j / 1an) dans le header du dashboard compact
- Propagation de la periode selectionnee a toutes les requetes du hook

---

## Details techniques

### Fichiers modifies

**`src/components/spdi/SentimentBar.tsx`**
- Importer `Tooltip, TooltipContent, TooltipTrigger, TooltipProvider` depuis Radix
- Envelopper chaque segment `<div>` dans un `<TooltipTrigger>` avec un `<TooltipContent>` affichant : "{X}% {Label}" + nombre brut de mentions
- Le mode `compact` reste sans tooltip (trop petit)

**`src/hooks/useActeurDigitalDashboard.ts`**
- Ajouter un parametre `periode: '7j' | '30j' | '1an'` (defaut: '30j')
- Sparkline : adapter `limit` et ajouter un filtre `gte('date_mesure', dateDebut)` calcule depuis la periode
- Sentiment : filtrer les mentions par date via jointure avec `social_insights.date_publication` ou `mentions.date_mention`
- Canaux : pas de changement (toujours la derniere mesure)
- Share of Voice : calculer `totalMentionsCercle` (somme de toutes les mentions du cercle) et retourner `sharePercent`
- Nouvelle requete thematiques : agreger `hashtags` et `entites_detectees` depuis `social_insights` lies via `personnalites_mentions`, compter les occurrences, retourner le top 6
- Typer strictement le retour avec des interfaces dediees (pas de `any`)

**`src/components/spdi/SPDIDashboardCompact.tsx`**
- Ajouter un `useState<'7j' | '30j' | '1an'>('30j')` pour la periode
- Afficher 3 boutons segmentes sous le titre "Presence Digitale Institutionnelle"
- Passer la periode au hook `useActeurDigitalDashboard`
- Le Bloc E (thematiques) utilisera desormais les `topThematiques` du hook au lieu du tableau vide

**`src/components/spdi/ShareOfVoiceDonut.tsx`**
- Ajouter une prop `sharePercent: number`
- Afficher le pourcentage au centre du donut en superposition SVG `<text>`

### Aucune modification de base de donnees
Toutes les tables necessaires existent : `presence_digitale_metrics`, `personnalites_mentions`, `mentions`, `social_insights`, `personnalites`.

### Aucune nouvelle dependance
Tooltips via Radix (deja installe), SVG pur pour les micro-visualisations.
