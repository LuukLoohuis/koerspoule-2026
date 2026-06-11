SELECT cron.schedule(
  'purge-job-run-details',
  '*/15 * * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 hour'$$
);