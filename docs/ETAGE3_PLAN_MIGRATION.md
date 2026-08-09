# Étage 3 — « écrans = vues pures » : plan de migration (#45)

Contrat de référence : [`PIPELINE_EDITORIAL.md`](PIPELINE_EDITORIAL.md) ·
[`ARCHITECTURE_EDITORIALE.md`](ARCHITECTURE_EDITORIALE.md). Règle fondatrice :
**le pipeline décide, l'écran présente** — jamais de recalcul de fraîcheur,
catégorie, thème ou éligibilité dans un composant React.

## État des lieux (vérifié)

- **Qualification commune** : `src/lib/qualificationContenu.ts` → `qualifier()`
  produit datation, catégorie, thèmes, éligibilités. Fonction PURE, partagée.
- **Persistée à l'ingestion** (Étage 2 ✅) : table `editorial_qualifications`
  (`primary_theme`, `secondary_themes`, `rules_version`, `content_key`…), peuplée
  par l'edge function `requalifier-contenus`. Un test de **parité**
  (`qualificationParity.test.ts`) garantit persisté == recalculé.
- **Écart Étage 3** : le front **recalcule** `qualifier()` au rendu (insights,
  sujets, profil, briefing) au lieu de **lire** `editorial_qualifications`.
- **Deux mondes** : la Veille (`actualites`) utilise `calculateFreshness()`
  (seuils 24 h / 72 h) + ses colonnes propres ; la Communication
  (`publications_institutionnelles`) utilise `qualifier()`. Modèles distincts.

Nuance importante : la **fraîcheur est time-relative** (elle change chaque heure).
Elle DOIT être calculée à la lecture, à partir de la date persistée, par UNE
fonction partagée. « Persister la fraîcheur » n'a pas de sens ; persister la
**date vérifiée + la catégorie + les thèmes + les éligibilités-inputs**, oui.

## Ce qui est donc réellement à faire

1. **Lire la qualification persistée** au lieu de la recalculer, pour les parties
   NON time-relative (catégorie, thèmes, éligibilités) :
   - Hook `useQualification(contentKeys[])` → lit `editorial_qualifications`.
   - Fallback explicite quand la ligne manque (contenu pas encore requalifié) :
     recalcul `qualifier()` à la volée + `log`, jamais un vide silencieux.
   - Rebrancher les 4 consommateurs (`insightsCommunication`, `sujets`,
     `profilCommunication`, `briefingAdapter`) sur le hook.
   - La fraîcheur reste calculée à la lecture depuis `dateEditoriale`.
2. **Fraîcheur unique** : aligner la Veille sur la fraîcheur de la qualification
   commune (une seule définition de seuils), OU documenter explicitement pourquoi
   deux fenêtres coexistent (72 h éditorial vs seuils d'affichage). Décision
   produit requise — change l'affichage du flagship.
3. **Garde** : étendre le test de parité pour couvrir les écrans (lecture ==
   qualification commune) et empêcher un futur recalcul divergent.

## Risques & vérification (pourquoi ça n'est pas « autonome »)

- Touche des **edge functions Deno** + potentiellement une **migration** :
  non testables end-to-end sans déploiement sur le Supabase réel.
- **Change le comportement du flagship Veille** (lecture DB, fenêtres de
  fraîcheur) → exige une **vérification visuelle** (captures avant/après) et un
  **feu vert produit**.
- Fallback obligatoire pour les contenus **sans ligne de qualification** (sinon
  écran vide sur du contenu récent non encore requalifié).

## Ordre proposé (incrémental, vérifiable)

1. ✅ **FAIT** — `src/lib/politiquesEditoriales.ts` : service PUR et versionné de
   dérivation des éligibilités (datation, âge, `dansFenetre`, éligibilités),
   + `faitsDepuisRow()` pour dériver depuis une ligne `editorial_qualifications`.
   `qualifier()` délègue désormais sa partie éligibilités à ce service (source
   unique). Tests : `politiquesEditoriales.test.ts` (dérivation + parité
   calculé/lu) et `qualificationParity.test.ts`, **gardés en CI**. Aucun
   changement de comportement (parité verte).
2. ✅ **FAIT** — `src/hooks/useQualification.ts` : hook React Query lisant
   `editorial_qualifications`, reconstruisant la `Qualification` via
   `qualifierDepuisRow()` (mapper pur, source unique). API : `parCle`,
   `aQualification(key)`, `qualificationDe(key, brut)` avec **fallback** honnête
   `qualifier()` + `console.warn` quand la ligne manque. Test de parité
   lecture-vs-calcul `qualificationLecture.test.ts`, **gardé en CI**. Non branché
   à un écran (aucun changement produit) — le rebranchement suit avec vérif visuelle.
3. Rebrancher **un** consommateur (Insights) → build + capture → valider.
4. Étendre aux 3 autres, un par un, avec capture à chaque étape.
5. Décision « fraîcheur unique » (produit) → appliquer si go.
6. Garde de parité écrans + doc.

Chaque étape = un commit vérifiable ; on ne bascule l'ingestion qu'une fois le
chemin de lecture prouvé côté front.
