-- Add unique constraint for upsert on presence_digitale_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'presence_digitale_metrics_personnalite_date_unique'
  ) THEN
    ALTER TABLE public.presence_digitale_metrics
      ADD CONSTRAINT presence_digitale_metrics_personnalite_date_unique 
      UNIQUE (personnalite_id, date_mesure);
  END IF;
END $$;
