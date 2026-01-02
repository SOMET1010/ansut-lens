-- Activer REPLICA IDENTITY pour capturer toutes les colonnes
ALTER TABLE collectes_log REPLICA IDENTITY FULL;

-- Ajouter à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE collectes_log;