-- Periodieke live-sync voor Meermarathon.
--
-- De edge function livemarathon-sync haalt de koersstand op bij
-- livemarathon.schaatsen.nl. Tijdens een wedstrijd moet dat vaak genoeg
-- gebeuren om "live" te mogen heten; daarbuiten hoort het niets te kosten.
--
-- Daarom bewaakt de cron-job zélf of er iets te halen valt: alleen wanneer een
-- Meermarathon-game op live staat én er een baan aan een ronde gekoppeld is,
-- gaat er een HTTP-call uit. Staat er niets live, dan blijft het bij één
-- goedkope index-lookup en wordt de edge function niet eens aangeroepen.
-- Zo kan het interval kort zijn zonder dat het buiten het seizoen geld kost.
--
-- Aanpassen van de frequentie later:
--   SELECT cron.alter_job(
--     (SELECT jobid FROM cron.job WHERE jobname = 'livemarathon-sync'),
--     schedule := '*/30 * * * * *');
-- Stoppen:
--   SELECT cron.unschedule('livemarathon-sync');

DO $$
DECLARE
  v_secret_name text;
  v_url text;
  v_command text;
BEGIN
  -- Zonder pg_cron of pg_net (lokaal, preview) is er niets in te plannen.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ontbreekt — live-sync niet ingepland';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net ontbreekt — live-sync niet ingepland';
    RETURN;
  END IF;

  -- De service-role-sleutel staat al in de vault voor de mailwachtrij. Die
  -- hergebruiken we bewust: één sleutel op één plek, zodat roteren ook één
  -- handeling blijft. Een eigen naam krijgt voorrang als die bestaat.
  SELECT name INTO v_secret_name
  FROM vault.secrets
  WHERE name IN ('livemarathon_service_role_key', 'email_queue_service_role_key')
  ORDER BY (name = 'livemarathon_service_role_key') DESC
  LIMIT 1;

  IF v_secret_name IS NULL THEN
    RAISE NOTICE 'geen service-role-sleutel in de vault — live-sync niet ingepland';
    RETURN;
  END IF;

  v_url := 'https://uqjrzozttkbjrdvzeroc.supabase.co/functions/v1/livemarathon-sync';

  -- De job draait dit statement. De poort staat dicht tenzij er echt gereden
  -- wordt; let op de dubbele dollar-quoting omdat dit binnen cron.schedule valt.
  v_command := format($cmd$
    DO $inner$
    DECLARE
      v_key text;
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM public.stage_live_tracks slt
        JOIN public.stages s ON s.id = slt.stage_id
        JOIN public.games  g ON g.id = s.game_id
        WHERE g.status = 'live'
          AND g.game_type = 'meermarathon'
      ) THEN
        RETURN;
      END IF;

      SELECT decrypted_secret INTO v_key
      FROM vault.decrypted_secrets
      WHERE name = %L;
      IF v_key IS NULL THEN
        RETURN;
      END IF;

      PERFORM net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body    := '{}'::jsonb,
        timeout_milliseconds := 25000
      );
    END $inner$;
  $cmd$, v_secret_name, v_url);

  -- Opnieuw draaien mag: eerst de oude job weg.
  PERFORM cron.unschedule('livemarathon-sync')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'livemarathon-sync');

  -- Elke 30 seconden (pg_cron 1.5+ kent secondes). Buiten een live wedstrijd
  -- kost dat alleen de lookup hierboven.
  PERFORM cron.schedule('livemarathon-sync', '*/30 * * * * *', v_command);

  RAISE NOTICE 'live-sync ingepland (elke 30 s, sleutel: %)', v_secret_name;
END $$;

-- Rollback:
--   SELECT cron.unschedule('livemarathon-sync');
