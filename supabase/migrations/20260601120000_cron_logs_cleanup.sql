-- Kostenbesparing Cloud: cron.job_run_details was ~1,43 GB (≈100% van de DB)
-- doordat de pg_cron-job 'process-email-queue' elke 5s draaide en elke run een
-- rij logde die nooit werd opgeschoond.
--
-- Deze migratie:
--   1) zet de email-cron op elke minuut (idempotent, faalt stil als de job/extensie
--      ontbreekt — bv. lokaal/preview),
--   2) maakt de opgehoopte run-logs eenmalig leeg (TRUNCATE → directe ruimte terug,
--      geen per-rij WAL),
--   3) plant een nachtelijke retentie-job die run-logs ouder dan 7 dagen verwijdert.

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  -- 1) Email-cron naar elke minuut (5-veld cron). Command/database/active blijven.
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-email-queue';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(job_id := v_jobid, schedule := '* * * * *');
  END IF;

  -- 2) Eénmalige opschoning van de opgehoopte run-logs (≈1,4 GB).
  TRUNCATE TABLE cron.job_run_details;

  -- 3) Nachtelijke retentie-job (03:17): bewaar max 7 dagen aan run-logs.
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-cron-logs') THEN
    PERFORM cron.schedule(
      'cleanup-cron-logs',
      '17 3 * * *',
      'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''7 days'''
    );
  END IF;
END $$;
