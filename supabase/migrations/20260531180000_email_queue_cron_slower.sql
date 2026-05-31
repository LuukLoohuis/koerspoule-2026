-- Kostenbesparing: de pg_cron-job 'process-email-queue' draaide elke 5 seconden
-- (≈17.280 runs/dag), wat Lovable Cloud-credits opslokt — ook als er niets te
-- versturen valt. Voor een poule is e-mailvertraging van ~1 minuut prima.
-- We verlagen alleen het schema (het commando/net.http_post blijft intact).

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- pg_cron aanwezig?
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-email-queue';
  IF v_jobid IS NULL THEN
    RETURN; -- job bestaat niet (lokaal/preview) → niets te doen
  END IF;

  -- Naar elke minuut (standaard 5-veld cron). Houdt command/database/active gelijk.
  PERFORM cron.alter_job(job_id := v_jobid, schedule := '* * * * *');
END $$;
