CREATE OR REPLACE FUNCTION public.is_cron_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'::app_role), false)
      OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      OR COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') = 'service_role'
      OR current_user = 'service_role'
      OR current_user = 'postgres';
$$;

CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobid, jobname, schedule, command, active
  FROM cron.job
  WHERE public.is_cron_manager()
  ORDER BY jobid;
$$;

CREATE OR REPLACE FUNCTION public.get_cron_history(limit_count integer DEFAULT 100)
RETURNS TABLE(runid bigint, jobid bigint, job_name text, status text, start_time timestamp with time zone, end_time timestamp with time zone, return_message text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.runid, d.jobid, j.jobname, d.status, d.start_time, d.end_time, d.return_message
  FROM cron.job_run_details d
  LEFT JOIN cron.job j ON j.jobid = d.jobid
  WHERE d.start_time > NOW() - INTERVAL '30 days'
    AND public.is_cron_manager()
  ORDER BY d.start_time DESC
  LIMIT limit_count;
$$;

CREATE OR REPLACE FUNCTION public.toggle_cron_job(job_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_cron_manager() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  UPDATE cron.job SET active = NOT active WHERE jobid = job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cron_schedule(job_id bigint, new_schedule text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_cron_manager() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  UPDATE cron.job SET schedule = new_schedule WHERE jobid = job_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cron_history(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_cron_job(bigint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_cron_schedule(bigint, text) FROM anon;