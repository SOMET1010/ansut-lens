

## Analyse de l'existant

La majorité de l'infrastructure demandée **existe déjà** :

| Composant | Statut |
|-----------|--------|
| Table `publications_institutionnelles` | Existe |
| Table `echo_metrics` + `part_de_voix` | Existe |
| Table `vip_comptes` + `vip_alertes` | Existe |
| Edge function `collecte-institutionnelle` (scraping Firecrawl + Gemini) | Existe |
| Edge function `analyser-echo-resonance` (score, gap, recommandation IA) | Existe |
| Page `AutoVeillePage` avec 4 onglets | Existe |
| Widgets Radar (`EchoResonanceWidget`, `ShareOfVoiceWidget`) | Existe |
| Comptes VIP ANSUT (LinkedIn, Facebook, X) | Configurés |

## Ce qui manque

### 1. Injection dans la table `actualites`
Les publications institutionnelles restent isolées dans leur propre table. Elles ne remontent pas dans le flux principal de veille (Actualités / RADAR). Il faut un pont : après collecte, injecter automatiquement chaque publication comme actualité avec `source_type = 'institutionnel'`.

### 2. Architecture "4 Sources" (tableau de bord visuel)
Le user demande un tableau synthétique montrant les 4 catégories de sources (Interne, Directeurs, Externe, Citoyenne) avec leurs stats respectives. Ce n'est pas présent dans l'UI actuelle.

### 3. RSS natif ansut.ci
Actuellement le site est scrappé via Firecrawl. Pas de parsing RSS dédié.

---

## Plan d'implémentation

### Tache 1 — Pont publications → actualites
Dans `collecte-institutionnelle/index.ts`, après chaque insertion dans `publications_institutionnelles`, insérer aussi dans `actualites` avec :
- `source_type = 'institutionnel'`
- `source_nom = auteur` (ex: "ANSUT Officiel")
- `titre` extrait du contenu (premiers 100 chars ou titre AI)
- `source_url = url_original`
- Déduplication par `source_url`

### Tache 2 — Dashboard "Architecture des Sources"
Ajouter un 5e onglet "Architecture" dans `AutoVeillePage` avec un tableau visuel des 4 types de sources :
- **Interne** : count depuis `publications_institutionnelles` WHERE `est_officiel = true`
- **Directeurs** : count depuis `vip_comptes` + leurs publications
- **Externe** : count depuis `actualites` WHERE `source_type != 'institutionnel'`
- **Citoyenne** : count depuis `social_insights` ou `mentions`

Chaque ligne affiche : type, origine, nb items ce mois, utilité Com.

### Tache 3 — Améliorer le résumé commentaires dans l'UI Echo
Le champ `resume_commentaires` et `action_com` sont concaténés dans `recommandation_ia`. Les séparer dans l'affichage de l'onglet Echo pour plus de lisibilité (sentiment citoyens + action Com distincte).

### Fichiers modifiés
- `supabase/functions/collecte-institutionnelle/index.ts` — ajout insertion `actualites`
- `src/pages/admin/AutoVeillePage.tsx` — ajout onglet Architecture + amélioration onglet Echo
- `src/hooks/useAutoVeille.ts` — ajout hook stats par type de source

