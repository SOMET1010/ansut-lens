# Audit des écrans legacy — ANSUT RADAR

> Inventaire issu d'un audit systématique (4 axes : fausses données · terminologie
> legacy · stubs/écrans cassés · cartographie des routes). Sert de **tracker** :
> on coche au fur et à mesure. Dernière passe : refonte crédibilité + navigation.

## Constat général

- ✅ **Aucune fausse donnée en production.** Le travail « P0 Honnêteté » tient :
  pas de `Math.random` sur une métrique, pas de score fabriqué, pas de fausse
  précision. Les seuls `Math.random` restants sont des IDs techniques / largeurs
  de skeleton. Les valeurs en dur affichées (`revueConnaissance`) sont des données
  réelles sourcées et étiquetées « à valider ».
- Le « legacy » restant est surtout du **vocabulaire d'ancien produit resté
  visible**, quelques **stubs**, du **code mort**, et deux **décisions produit**
  (SPDI, Quadrants) qui ne sont PAS des bugs.

---

## ✅ Lot 1 — corrections sûres (FAIT dans cette passe)

- [x] **Ce matin** : bandeau « La matinale » → « Ce matin ».
- [x] **Ce matin** : bouton **« Partager le briefing »** (5 canaux promis, 0
  implémenté) retiré — fausse affordance.
- [x] **Veille** : bouton **« Exporter »** (ne faisait qu'un toast « pas encore
  disponible ») retiré.
- [x] **Recherche** : « Balayage 30 jours » → « Recherche · 30 jours » ;
  « Console de balayage » → « Lancer une recherche » ; toasts « balayage » →
  « recherche ».
- [x] **Surveillance** : placeholder générique « Concurrence Fintech, E-Réputation »
  → exemples ANSUT (« Zones blanches, FTTH & 5G, Réputation ANSUT »).
- [x] **Code mort supprimé** : `src/pages/CeMatinPage.tsx` (ancien tableau de bord,
  remplacé par `LaMatinelePage`), `src/pages/ReseauxSociauxPage.tsx` (migré dans
  l'onglet social de « Notre communication »).

---

## 🟠 Lot 2 — nettoyages sûrs à venir (pas de décision produit requise)

- [ ] **Glossaire** (`src/config/glossaire.ts`, affiché au survol + page Aide) :
  entrées de termes retirés/renommés — « Balayage », « Capteur »,
  « Revue de stabilité », « Matinale ». À aligner sur le vocabulaire actuel.
- [ ] **Empty-states « capteurs »** (`MatinaleSections.tsx` L.699, L.920) :
  « Vérifiez les capteurs stratégiques » / « Les capteurs continuent de scanner »
  → vocabulaire « capteur/agent autonome » proscrit (cf. AppSidebar:44).
- [ ] **Routes admin orphelines legacy atteignables par URL** :
  `/admin/presentation` (deck décrivant l'ancien produit), `/admin/formation`
  (guides en dur legacy), `/admin/auto-veille` (métriques d'écho IA jugées non
  crédibles, retirée du menu). Décider : retirer la route ou réécrire le contenu.
- [ ] **Newsletters** (`/admin/newsletters`) : feature réelle et complète mais
  **orpheline du menu**. À rebrancher (onglet de « Publier » ?) ou assumer le retrait.

---

## 🔴 Décisions produit — NE PAS toucher sans arbitrage (ce ne sont pas des bugs)

### SPDI — Score de Présence Digitale Institutionnelle
Présent partout dans l'écran **Acteurs** (onglets « Scores de présence » / « Revue
de stabilité », sous-pages `PresenceDigitalePage`/`SpdiReviewPage`, dossier
`components/spdi/` — 14 composants, hooks, tables `presence_digitale_*`).
**C'est une fonctionnalité réelle et documentée** (méthode à 4 axes, cf. CLAUDE.md),
pas de la fausse donnée. Question ouverte :
- **Garder** SPDI tel quel (fonctionnalité assumée) ;
- **Renommer** (vocabulaire plus clair, sans « SPDI ») ;
- **Retirer** l'ensemble (concept jugé obsolète).

### Quadrants (regulation / reputation / tech / market)
Ancienne taxonomie encore câblée dans le radar, les mots-clés, la DB
(`quadrant*`), et visible dans `MotsClesPage`, `FluxDetailPage`, le glossaire.
La refonte a introduit les **4 piliers stratégiques ANSUT**. Question ouverte :
- **Migrer** quadrants → piliers (gros chantier : UI + DB + hooks radar) ;
- **Conserver** les deux (piliers pour l'éditorial, quadrants pour le radar) ;
- **Retirer** le radar à quadrants.

### Admin « Matinale » (outil de génération)
`admin/MatinalePage`, `ScoringPage`, `FreshnessPage`, `SpdiStatusPage` portent
encore « Matinale »/« SPDI » dans des libellés techniques. À réaligner une fois
les décisions SPDI/Matinale tranchées.

---

## Cartographie — pages orphelines (référence)

| Route | Verdict |
|---|---|
| `src/pages/CeMatinPage.tsx` | ✅ supprimé (mort) |
| `src/pages/ReseauxSociauxPage.tsx` | ✅ supprimé (mort) |
| `/admin/newsletters` | feature intacte, menu coupé → rebrancher ou retirer |
| `/admin/shadow-tracker`, `/admin/coffre-contenu` | wrappers de transition (onglets ailleurs) → nettoyer l'accès |
| `/admin/auto-veille` | parkée (écho IA non crédible) → décision |
| `/admin/presentation`, `/admin/formation` | contenu legacy → réécrire ou retirer |
| `PersonnalitesPage`, `PresenceDigitalePage`, `SpdiReviewPage` | **valables** (montés en onglets d'Acteurs) — dépend de la décision SPDI |
