CREATE TABLE public.matinale_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  step TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  created_by UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT matinale_jobs_status_check CHECK (status IN ('pending','running','completed','failed'))
);

GRANT SELECT, INSERT ON public.matinale_jobs TO authenticated;
GRANT ALL ON public.matinale_jobs TO service_role;

ALTER TABLE public.matinale_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view matinale jobs"
ON public.matinale_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create matinale jobs"
ON public.matinale_jobs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_matinale_jobs_updated_at
BEFORE UPDATE ON public.matinale_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_matinale_jobs_created_at ON public.matinale_jobs (created_at DESC);