-- Permettre aux utilisateurs authentifiés d'insérer des insights manuels
CREATE POLICY "Authenticated users can insert manual insights"
  ON social_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ajouter une colonne pour identifier les entrées manuelles
ALTER TABLE social_insights
  ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;