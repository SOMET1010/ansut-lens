
# Plan de correction : Contrainte CHECK sur social_insights

## Problème identifié

La collecte web fonctionne correctement :
- CIO Mag Afrique : 3 insights extraits
- Réseau Télécom : 7 insights extraits

Mais l'insertion échoue car la contrainte `social_insights_plateforme_check` n'accepte que les valeurs `linkedin`, `twitter`, `facebook`.

## Solution

Modifier la contrainte CHECK pour inclure les nouvelles plateformes web.

## Migration SQL

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE social_insights 
  DROP CONSTRAINT IF EXISTS social_insights_plateforme_check;

-- Ajouter la nouvelle contrainte avec toutes les plateformes
ALTER TABLE social_insights 
  ADD CONSTRAINT social_insights_plateforme_check 
  CHECK (plateforme IN ('linkedin', 'twitter', 'facebook', 'blog', 'forum', 'news'));
```

## Résultat attendu

Après cette migration, la collecte web pourra insérer les insights avec les plateformes `blog`, `forum` et `news`, et le widget Veille Web affichera les données collectées.
