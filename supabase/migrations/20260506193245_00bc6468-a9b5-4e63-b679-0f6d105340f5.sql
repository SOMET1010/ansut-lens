
CREATE TABLE IF NOT EXISTS public.social_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  secret_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connector, secret_name)
);

ALTER TABLE public.social_api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage social_api_credentials"
ON public.social_api_credentials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_social_api_credentials_updated_at
BEFORE UPDATE ON public.social_api_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_social_api_credentials_connector
ON public.social_api_credentials(connector);
