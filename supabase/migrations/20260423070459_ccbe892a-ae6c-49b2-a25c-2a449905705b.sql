INSERT INTO public.config_seuils (cle, valeur, description) VALUES
  ('freshness_default_window_hours', '24'::jsonb, 'Fenêtre par défaut (en heures) pour la Matinale et les briefings : 24, 48 ou 168.'),
  ('freshness_publication_tolerance_hours', '24'::jsonb, 'Tolérance ajoutée à la fenêtre de publication pour conserver les articles publiés peu avant.'),
  ('freshness_max_articles', '20'::jsonb, 'Nombre maximum d''articles retenus après filtrage de fraîcheur.'),
  ('freshness_drop_without_pub_date', 'false'::jsonb, 'Si true, écarte les articles sans date de publication. Si false, ils sont conservés.')
ON CONFLICT (cle) DO NOTHING;