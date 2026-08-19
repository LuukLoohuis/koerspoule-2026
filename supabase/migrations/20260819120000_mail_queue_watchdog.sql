-- Vangnet onder de mail-wachtrij.
--
-- process-mail-queue houdt zichzelf in leven: na elke chunk roept hij zichzelf
-- opnieuw aan. Dat is één draad. Die aanroep is een niet-afgewachte fetch met
-- een lege catch -- een cold start, een 5xx of een deploy midden in de
-- verzending knipt de keten door en dan valt de verzending stil zónder dat
-- iemand het merkt. Bij 3000 mails zijn dat tien overdrachten, dus tien kansen.
--
-- Deze job kijkt elke minuut of een campagne stilligt en trapt de verwerker dan
-- opnieuw aan. Dubbel verzenden kan niet: claim_mail_batch claimt met
-- FOR UPDATE SKIP LOCKED en elke rij wordt apart afgevinkt.
--
-- "Stil" = er staan nog rijen open én er is twee minuten lang geen enkele
-- beweging geweest. Een gezonde chunk duurt ~35 s en zet ondertussen continu
-- claimed_at/sent_at, dus twee minuten is ruim boven elke normale tussenpoos --
-- inclusief de cold start van de volgende schakel.
--
-- Frequentie later wijzigen:
--   SELECT cron.alter_job(
--     (SELECT jobid FROM cron.job WHERE jobname = 'mail-queue-watchdog'),
--     schedule := '*/2 * * * *');
-- Stoppen:
--   SELECT cron.unschedule('mail-queue-watchdog');

DO $$
DECLARE
  v_secret_name text;
  v_url text;
  v_command text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ontbreekt — waakhond niet ingepland';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net ontbreekt — waakhond niet ingepland';
    RETURN;
  END IF;

  -- Zelfde sleutel als de andere jobs: één plek om te roteren.
  SELECT name INTO v_secret_name
  FROM vault.secrets
  WHERE name IN ('mail_queue_service_role_key', 'email_queue_service_role_key')
  ORDER BY (name = 'mail_queue_service_role_key') DESC
  LIMIT 1;

  IF v_secret_name IS NULL THEN
    RAISE NOTICE 'geen service-role-sleutel in de vault — waakhond niet ingepland';
    RETURN;
  END IF;

  v_url := 'https://uqjrzozttkbjrdvzeroc.supabase.co/functions/v1/process-mail-queue';

  v_command := format($cmd$
    DO $inner$
    DECLARE
      v_key text;
      v_stil boolean;
    BEGIN
      -- Poort dicht tenzij er echt iets stilligt: buiten een mailing kost deze
      -- job alleen deze ene lookup en gaat er geen HTTP-call uit.
      SELECT EXISTS (
        SELECT 1
        FROM public.mail_campaigns c
        WHERE c.status = 'sending'
          AND EXISTS (
            SELECT 1 FROM public.mail_queue q
            WHERE q.campaign_id = c.id
              AND q.status IN ('pending', 'processing')
          )
          AND greatest(
                c.created_at,
                coalesce((SELECT max(q.claimed_at) FROM public.mail_queue q WHERE q.campaign_id = c.id), c.created_at),
                coalesce((SELECT max(q.sent_at)    FROM public.mail_queue q WHERE q.campaign_id = c.id), c.created_at)
              ) < now() - interval '2 minutes'
      ) INTO v_stil;

      IF NOT v_stil THEN
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

  PERFORM cron.unschedule('mail-queue-watchdog')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mail-queue-watchdog');

  PERFORM cron.schedule('mail-queue-watchdog', '* * * * *', v_command);

  RAISE NOTICE 'mail-waakhond ingepland (elke minuut, sleutel: %)', v_secret_name;
END $$;

-- De verwerker claimt op status en verwerkt op volgorde van binnenkomst; de
-- bestaande index leidt op campaign_id en kan die filter niet bedienen.
CREATE INDEX IF NOT EXISTS mail_queue_status_created_idx
  ON public.mail_queue (status, created_at);

-- Rollback:
--   SELECT cron.unschedule('mail-queue-watchdog');
--   DROP INDEX IF EXISTS public.mail_queue_status_created_idx;
