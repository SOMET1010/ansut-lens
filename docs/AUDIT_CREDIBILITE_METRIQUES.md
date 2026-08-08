# Audit — métriques IA non vérifiées (dette crédibilité)

**Date :** 2026-08-07 · **Référentiel :** [`docs/CHARTE_CREDIBILITE.md`](CHARTE_CREDIBILITE.md)

Objectif : recenser puis purger/étiqueter les indicateurs affichés qui ne
passent pas le « test du DG » (origine connue, méthode explicable, reproductible,
traçable, utile) — `Math.random`, valeurs codées en dur, pourcentages de
confiance inexpliqués, scores composites opaques, fausse précision.

## Résultat principal

**La surface produit vivante (les 8 écrans DIRCOM) est déjà exempte de métriques
IA non vérifiées.** Le travail antérieur l'a assainie :

- **P0 honnêteté** (retrait des données fictives, fausse précision) ;
- **Retrait SPDI** (PR #85) — scores composites 0-100 hors produit ;
- **Qualification commune** + refonte **Matinale/Briefing** — chiffres traçables
  à leurs preuves ;
- **Écran Acteurs** — scores remplacés par des faits (mentions reliées).

Vérifications (grep + traçage des arbres de rendu) :

| Écran | Métriques affichées | Verdict |
|-------|--------------------|---------|
| Ce matin (`CarteSujetBriefing`) | aucune métrique opaque | 🟢 |
| Veille (`ArticleCluster`, `SmartSidebar`, `PourVousFeed`, `TitrologieWidget`) | comptages réels sourcés ; `score_pertinence`/`confiance_ia` présents dans le type mais **non affichés** | 🟢 |
| Recherche | — | 🟢 |
| Notre communication (`CommunicationPage`) | agrégations réelles + méthode | 🟢 |
| Insights | ratio d'écho + méthode exposée ; `%` = parts réelles calculées | 🟡 documenté |
| Acteurs | faits (mentions), aucun score | 🟢 |
| Publier | comptages bruts | 🟢 |
| Assistant | pas de métrique fabriquée | 🟢 |

`Math.random` restant : uniquement des **générateurs d'ID** (newsletter) et la
largeur d'un **skeleton** shadcn (`components/ui/`, non modifiable, non affiché
comme donnée). Aucune métrique.

## Dette résiduelle — dormante, hors produit

Les indicateurs opaques restants ne sont **montés sur aucun des 8 écrans** :

- **`components/spdi/*`** (gauge, radar 4 axes, share-of-voice, stabilité…) :
  dormants depuis le retrait SPDI. **Conservés volontairement** (réversibles,
  décision produit). Risque : latent si ré-montés.
- **`components/radar/*`** (`DailyBriefing`, `SocialPulseWidget`,
  `RadarProximiteWidget`, `InfluenceursMetierWidget`, `MediaImpactWidget`…) :
  legacy de l'ancien tableau de bord, plus référencés par les pages vivantes.
- **Composeur admin** (`MatinaleSections` → `MatinaleDrillDownModal`) : réservé
  aux éditeurs (`admin/matinale`), affiche un `score_pertinence` **réel**
  (calculé, écrit en base) — 🟡 acceptable, à documenter d'une méthode.
- **`AnsutAccountsActivityWidget`** : **code mort** (0 référence) → supprimé.

## Recommandations

1. **Ne pas ré-monter** les composants `spdi/*` et `radar/*` sans repasser leurs
   affichages au crible de la charte (score → fait, ou méthode exposée).
2. **Garde anti-régression** ✅ *fait* : `src/lib/__tests__/credibiliteGuard.test.ts`
   échoue en CI si `Math.random()` réapparaît dans `src/pages` ou `src/components`
   (hors génération d'ID / primitives shadcn, via ALLOWLIST). Câblé au workflow
   `citation-tests.yml`. Extension possible plus tard aux libellés de score nus
   (`/100`, `%` de confiance).
3. Le composeur admin peut afficher `score_pertinence` s'il **expose sa méthode**
   (une infobulle « pertinence calculée sur … »).

## Conclusion

La tâche #56 est **satisfaite sur la surface qui compte** (le produit DIRCOM).
Le nettoyage restant est du **code dormant/mort**, sans impact utilisateur — à
traiter par suppression (si legacy) ou garde anti-régression, au choix produit.
