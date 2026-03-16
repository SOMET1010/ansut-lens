

## Plan : Tableau de bord "Comptes ANSUT" avec suivi quotidien des publications

### Problème actuel
La collecte existe (`collecte-institutionnelle`, `collecte-social-api`) mais aucun widget ne montre clairement **l'activité quotidienne des comptes ANSUT** (nombre de publications par jour/plateforme). Si aucune publication n'est détectée, rien ne le signale — ce qui est un angle mort critique.

### Solution : nouveau widget "Activité Comptes ANSUT"

#### 1. Nouveau composant `AnsutAccountsActivityWidget.tsx`
- Affiche la liste des comptes VIP ANSUT (depuis `vip_comptes` où `actif = true`)
- Pour chaque compte, montre :
  - Nom, plateforme, dernière publication détectée (depuis `publications_institutionnelles`)
  - Nombre de publications des dernières 24h
  - Badge **vert** si ≥ 1 publication, **rouge** si 0 avec message "⚠ Aucune publication aujourd'hui"
- En haut : compteur global "X publications aujourd'hui sur Y comptes"
- Bouton "Collecter maintenant" qui appelle `collecte-institutionnelle`

#### 2. Nouveau hook `useAnsutAccountsActivity.ts`
- Query 1 : `vip_comptes` actifs
- Query 2 : `publications_institutionnelles` des dernières 24h, groupées par `vip_compte_id`
- Fusionne les deux pour produire un tableau `{ compte, publications_count, derniere_publication }`

#### 3. Intégration dans `CommunicationPage.tsx`
- Ajouter le widget en première position dans la section "E-Réputation & Médias Sociaux", avant les autres widgets
- Rendu pleine largeur pour visibilité maximale

### Fichiers à créer/modifier
- **Créer** : `src/components/communication/AnsutAccountsActivityWidget.tsx`
- **Créer** : `src/hooks/useAnsutAccountsActivity.ts`
- **Modifier** : `src/pages/CommunicationPage.tsx` (import + placement du widget)

Aucune modification backend ou base de données nécessaire — toutes les tables existent déjà.

