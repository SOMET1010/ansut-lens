
-- Audit log table
CREATE TABLE IF NOT EXISTS public.social_api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','rotate','delete')),
  performed_by UUID,
  performed_by_email TEXT,
  value_preview TEXT,
  ip_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_api_audit_connector ON public.social_api_audit_log(connector);
CREATE INDEX IF NOT EXISTS idx_social_api_audit_created_at ON public.social_api_audit_log(created_at DESC);

ALTER TABLE public.social_api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view social api audit"
  ON public.social_api_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts social api audit"
  ON public.social_api_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger function: audits changes to social_api_credentials without storing the secret value
CREATE OR REPLACE FUNCTION public.audit_social_api_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_connector TEXT;
  v_secret_name TEXT;
  v_value TEXT;
  v_preview TEXT;
  v_actor UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_connector := NEW.connector;
    v_secret_name := NEW.secret_name;
    v_value := NEW.secret_value;
    v_actor := NEW.updated_by;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.secret_value IS DISTINCT FROM OLD.secret_value THEN
      v_action := 'update';
    ELSE
      RETURN NEW;
    END IF;
    v_connector := NEW.connector;
    v_secret_name := NEW.secret_name;
    v_value := NEW.secret_value;
    v_actor := NEW.updated_by;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_connector := OLD.connector;
    v_secret_name := OLD.secret_name;
    v_value := OLD.secret_value;
    v_actor := OLD.updated_by;
  END IF;

  IF v_value IS NOT NULL AND length(v_value) > 4 THEN
    v_preview := '••••' || right(v_value, 4);
  ELSE
    v_preview := '••••';
  END IF;

  INSERT INTO public.social_api_audit_log
    (connector, secret_name, action, performed_by, value_preview)
  VALUES
    (v_connector, v_secret_name, v_action, COALESCE(v_actor, auth.uid()), v_preview);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_social_api_credentials ON public.social_api_credentials;
CREATE TRIGGER trg_audit_social_api_credentials
AFTER INSERT OR UPDATE OR DELETE ON public.social_api_credentials
FOR EACH ROW EXECUTE FUNCTION public.audit_social_api_credentials();
