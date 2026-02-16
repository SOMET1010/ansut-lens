
# Fusion des menus "Acteurs cles" et "Presence Digitale" + Mise a jour de toute la documentation

## Objectif

1. **Fusionner** les 3 entrees de menu separees ("Acteurs cles", "Presence Digitale", "Revue SPDI") en une seule entree "Acteurs & Influence" avec navigation par onglets interne.
2. **Mettre a jour** tous les fichiers de documentation pour refleter l'etat actuel de la plateforme (modules, Edge Functions, hooks, composants, fonctionnalites recentes).

---

## Partie 1 : Fusion des menus

### Situation actuelle

Le sidebar contient 3 entrees separees partageant la meme permission `view_personnalites` :
- **Acteurs cles** (`/personnalites`) - Cartographie des acteurs
- **Presence Digitale** (`/presence-digitale`) - Dashboard SPDI individuel
- **Revue SPDI** (`/spdi-review`) - Vue panoramique stabilite

### Solution proposee

Creer une page unifiee `/acteurs` avec un systeme d'onglets (Tabs) :

```text
+--------------------------------------------------------------+
| Acteurs & Influence                                           |
| [Cartographie] [Dashboard SPDI] [Revue Stabilite] [Benchmark]|
+--------------------------------------------------------------+
|                                                               |
|   Contenu de l'onglet actif                                   |
|                                                               |
+--------------------------------------------------------------+
```

### Fichiers modifies

**`src/components/layout/AppSidebar.tsx`**
- Remplacer les 3 entrees (Acteurs cles, Presence Digitale, Revue SPDI) par une seule : "Acteurs & Influence" avec icone `Users`, URL `/acteurs`

**`src/pages/ActeursInfluencePage.tsx`** (nouveau)
- Page conteneur avec `Tabs` (Radix) et 4 onglets :
  - **Cartographie** : contenu actuel de `PersonnalitesPage`
  - **Dashboard SPDI** : contenu actuel de `PresenceDigitalePage`
  - **Revue Stabilite** : contenu actuel de `SpdiReviewPage`
  - **Benchmark** : acces direct au `SPDIBenchmarkPanel`
- Les onglets seront synchronises avec l'URL via un query param `?tab=cartographie|spdi|revue|benchmark`

**`src/App.tsx`**
- Remplacer les 3 routes (`/personnalites`, `/presence-digitale`, `/spdi-review`) par une route unique `/acteurs`
- Ajouter des redirections depuis les anciennes URLs vers `/acteurs` avec le bon parametre d'onglet :
  - `/personnalites` -> `/acteurs?tab=cartographie`
  - `/presence-digitale` -> `/acteurs?tab=spdi`
  - `/spdi-review` -> `/acteurs?tab=revue`

**Pages existantes conservees** (mais plus utilisees comme routes directes)
- `PersonnalitesPage.tsx`, `PresenceDigitalePage.tsx`, `SpdiReviewPage.tsx` restent comme composants internes importes par la nouvelle page unifiee. Ils seront refactores en composants (retrait du wrapper `div` de page si necessaire).

---

## Partie 2 : Mise a jour de la documentation

### Etat actuel des docs vs realite

Les docs mentionnent "9 Edge Functions" et "17 tables" alors qu'il y a maintenant **23 Edge Functions** et de nombreuses nouvelles fonctionnalites (Newsletters, SPDI, Benchmark, Formation PDF, etc.).

### Fichiers a mettre a jour

**`docs/OVERVIEW.md`**
- Mettre a jour la liste des modules : passer de 7 a 9 modules (ajouter Flux personnalises, Presence Digitale/SPDI)
- Fusionner la description "Acteurs cles" avec "Presence Digitale" en un seul module
- Mettre a jour la feuille de route (retirer les elements deja implementes comme Export PDF)
- Actualiser le schema d'architecture (mentionner Gemini au lieu de Grok)

**`docs/ARCHITECTURE.md`**
- Mettre a jour le nombre de tables (17 -> nombre reel + `social_insights`, `newsletters`, `role_permissions`, etc.)
- Mettre a jour le nombre d'Edge Functions (9 -> 23)
- Ajouter les hooks manquants (`useActeurDigitalDashboard`, `useBenchmarkData`, `useNewsletters`, `useNewsletterScheduler`, `useSocialInsights`, `useSpdiStatus`, etc.)
- Ajouter les dossiers de composants manquants (`newsletter/`, `newsletter/studio/`, `formation/`, `presentation/`, `import-acteurs/`, `radar/`)
- Mettre a jour les APIs externes (Gemini via Lovable AI au lieu de Grok/xAI)

**`docs/EDGE-FUNCTIONS.md`**
- Ajouter les 14 Edge Functions manquantes : `analyser-spdi`, `calculer-spdi`, `collecte-social`, `collecte-social-api`, `diffuser-resume`, `envoyer-newsletter`, `envoyer-sms`, `generate-password-link`, `generer-briefing`, `generer-newsletter`, `generer-requete-flux`, `list-users-status`, `reset-user-password`, `scheduler-newsletter`
- Mettre a jour les secrets requis

**`docs/DATABASE.md`**
- Ajouter les tables manquantes (`social_insights`, `newsletters`, `newsletter_destinataires`, `role_permissions`, `flux_actualites`, etc.)
- Mettre a jour le schema entite-relation

**`docs/API.md`**
- Ajouter les endpoints des nouvelles Edge Functions
- Mettre a jour les exemples

**`docs/README.md`**
- Mettre a jour les compteurs (hooks 13+ -> 20+, composants 50+ -> 80+, Edge Functions 9 -> 23)
- Mettre a jour la date de derniere modification

**`docs/formation/USER.md`**
- Fusionner les sections "Acteurs cles" avec la documentation sur la Presence Digitale et le Benchmark
- Mettre a jour le tableau de navigation (nouveau menu unifie)
- Ajouter la section sur les Newsletters et le Studio Newsletter

**`docs/formation/ADMIN.md`**
- Mettre a jour le tableau de navigation
- Ajouter les sections SPDI Status, Diffusion, Sources, Roles & Permissions
- Documenter les nouvelles Edge Functions d'administration

**`docs/formation/COUNCIL-USER.md`**
- Mettre a jour la navigation avec le menu unifie
- Ajouter la mention du Dashboard d'Influence accessible

**`docs/formation/GUEST.md`**
- Aucun changement majeur (acces limite inchange)

**`CHANGELOG.md`**
- Ajouter une entree `[1.4.0]` documentant :
  - Fusion des menus Acteurs/SPDI
  - Module complet d'Analyse d'Influence Digitale (5 US)
  - Mode Benchmark "Duel d'Influence"
  - 23 Edge Functions (14 nouvelles)
  - Studio Newsletter avec editeur WYSIWYG
  - Systeme de permissions granulaires
  - Guides de formation PDF

---

## Details techniques

### Navigation par onglets

- Utilisation de `Tabs` / `TabsList` / `TabsContent` de Radix (deja installe via shadcn)
- Le parametre URL `?tab=` permet le deep linking et le partage d'URLs
- L'onglet par defaut est "cartographie"

### Redirections

Les anciennes URLs (`/personnalites`, `/presence-digitale`, `/spdi-review`) resteront fonctionnelles via des `<Navigate>` dans le routeur, assurant la retrocompatibilite pour les favoris et liens existants.

### Aucune nouvelle dependance

Tout repose sur des composants et bibliotheques deja installes.

### Impact sur les permissions

Aucun changement : la permission `view_personnalites` reste la seule requise pour acceder a la page unifiee, comme c'etait deja le cas pour les 3 pages separees.
