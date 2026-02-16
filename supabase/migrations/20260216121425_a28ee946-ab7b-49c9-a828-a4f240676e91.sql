ALTER TABLE public.presence_digitale_metrics 
  ALTER COLUMN regularite_mentions TYPE NUMERIC(5,2),
  ALTER COLUMN pct_themes_strategiques TYPE NUMERIC(5,2),
  ALTER COLUMN coherence_message TYPE NUMERIC(5,2);