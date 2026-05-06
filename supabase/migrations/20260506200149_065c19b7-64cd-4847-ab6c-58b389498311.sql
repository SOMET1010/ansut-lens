
-- Harden RLS on social_api_audit_log
-- Drop existing permissive policies
DROP POLICY IF EXISTS "System inserts social api audit" ON public.social_api_audit_log;
DROP POLICY IF EXISTS "Admins view social api audit" ON public.social_api_audit_log;

-- Ensure RLS is enabled and forced (so even table owner via normal queries is checked)
ALTER TABLE public.social_api_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_api_audit_log FORCE ROW LEVEL SECURITY;

-- SELECT: admins only
CREATE POLICY "Admins can view social api audit"
ON public.social_api_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT: block all client/auth-context inserts. The audit_social_api_credentials()
-- trigger is SECURITY DEFINER and runs as the function owner (a role with BYPASSRLS),
-- so it can still insert. Direct inserts from the client are denied.
CREATE POLICY "Deny direct inserts on social api audit"
ON public.social_api_audit_log
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- UPDATE / DELETE: explicitly denied (no policy = denied, but make intent explicit)
CREATE POLICY "Deny updates on social api audit"
ON public.social_api_audit_log
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny deletes on social api audit"
ON public.social_api_audit_log
FOR DELETE
TO authenticated, anon
USING (false);

-- Lock down the trigger function: ensure it is SECURITY DEFINER, owned by postgres
-- (BYPASSRLS), with locked search_path. Re-set in case any of these drifted.
ALTER FUNCTION public.audit_social_api_credentials() OWNER TO postgres;
ALTER FUNCTION public.audit_social_api_credentials() SET search_path = public;
REVOKE ALL ON FUNCTION public.audit_social_api_credentials() FROM PUBLIC, anon, authenticated;

-- Revoke direct table grants from client roles - RLS + lack of grants = defense in depth
REVOKE INSERT, UPDATE, DELETE ON public.social_api_audit_log FROM anon, authenticated;
GRANT SELECT ON public.social_api_audit_log TO authenticated;
