-- Supprimer l'ancienne contrainte sur plateforme
ALTER TABLE social_insights 
  DROP CONSTRAINT IF EXISTS social_insights_plateforme_check;

-- Ajouter la nouvelle contrainte avec toutes les plateformes (sociales + web)
ALTER TABLE social_insights 
  ADD CONSTRAINT social_insights_plateforme_check 
  CHECK (plateforme IN ('linkedin', 'twitter', 'facebook', 'blog', 'forum', 'news'));