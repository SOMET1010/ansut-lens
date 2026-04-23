INSERT INTO public.config_seuils (cle, valeur, description) VALUES
  ('freshness_alert_drop_rate_pct', '40'::jsonb, 'Seuil (en %) du taux d''articles écartés (trop anciens) au-delà duquel une alerte est créée lors de la génération de la Matinale.'),
  ('freshness_alert_min_raw_articles', '5'::jsonb, 'Nombre minimum d''articles bruts requis pour évaluer le taux et déclencher une alerte (évite les faux positifs sur petits échantillons).')
ON CONFLICT (cle) DO NOTHING;