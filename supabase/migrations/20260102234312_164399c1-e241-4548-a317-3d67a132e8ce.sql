-- Fonction pour lister les jobs CRON
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobid, jobname, schedule, command, active
  FROM cron.job
  ORDER BY jobid;
$$;

-- Fonction pour l'historique des exécutions (30 derniers jours, 100 max)
CREATE OR REPLACE FUNCTION public.get_cron_history(limit_count integer DEFAULT 100)
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_name text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  return_message text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.runid, d.jobid, j.jobname, d.status, d.start_time, d.end_time, d.return_message
  FROM cron.job_run_details d
  LEFT JOIN cron.job j ON j.jobid = d.jobid
  WHERE d.start_time > NOW() - INTERVAL '30 days'
  ORDER BY d.start_time DESC
  LIMIT limit_count;
$$;

-- Fonction pour activer/désactiver un job
CREATE OR REPLACE FUNCTION public.toggle_cron_job(job_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cron.job SET active = NOT active WHERE jobid = job_id;
END;
$$;

-- Fonction pour modifier le schedule d'un job
CREATE OR REPLACE FUNCTION public.update_cron_schedule(job_id bigint, new_schedule text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cron.job SET schedule = new_schedule WHERE jobid = job_id;
END;
$$;