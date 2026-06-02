DO $$
DECLARE
  v_jobid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process-email-queue';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.alter_job(job_id := v_jobid, schedule := '* * * * *');
  END IF;

  TRUNCATE TABLE cron.job_run_details;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-cron-logs') THEN
    PERFORM cron.schedule(
      'cleanup-cron-logs',
      '17 3 * * *',
      'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''7 days'''
    );
  END IF;
END $$;