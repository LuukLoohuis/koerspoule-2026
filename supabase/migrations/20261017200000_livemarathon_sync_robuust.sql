-- Live-sync Meermarathon robuuster, na Cup 1 Amsterdam (17-10-2026).
--
-- 1. live_race_state onthoudt welke wedstrijd er op de baan stond. De bron
--    hergebruikt een trackId per plaats: "Amsterdam" droeg eerst Topdivisie
--    Vrouwen en daarna Topdivisie Mannen. Met categorie/geslacht verbergt de
--    Live-tab de race van de andere categorie, en ziet de sync wanneer de
--    stand van de vorige race weg moet.
--
-- 2. Leesrechten op de live-tabellen opnieuw vastgelegd. In productie
--    ontbraken de policies op live_rider_standings en live_premies, waardoor
--    iedereen een lege stand zag terwijl de sync gewoon schreef.
--
-- 3. De cron-poort kijkt naar de datum van de ronde in plaats van naar
--    games.status = 'live'. Een seizoensspel staat soms op open_inschrijving
--    terwijl er gereden wordt; de sync viel daardoor midden in de race stil.
--    Schema '30 seconds': een cron-regel met zes velden draait niet.
--
-- Volgorde bij uitrollen: eerst deze migratie, dan de edge function. Andersom
-- werkt ook — de functie schrijft de nieuwe kolommen pas als ze bestaan.

-- ── 1. Welke wedstrijd staat er op de baan ─────────────────────────────────
ALTER TABLE public.live_race_state
  ADD COLUMN IF NOT EXISTS categorie text,
  ADD COLUMN IF NOT EXISTS wedstrijd text,
  ADD COLUMN IF NOT EXISTS geslacht text;

COMMENT ON COLUMN public.live_race_state.categorie IS
  'Categorie van de wedstrijd op de baan volgens de bron, bv. "Topdivisie Vrouwen".';
COMMENT ON COLUMN public.live_race_state.wedstrijd IS
  'Naam van de wedstrijd op de baan volgens de bron, bv. "Marathon Cup 1".';
COMMENT ON COLUMN public.live_race_state.geslacht IS
  'vrouwen | mannen | NULL — uit categorie; vergelijkbaar met games.categorie.';

-- ── 2. Leesrechten ─────────────────────────────────────────────────────────
-- Zelfde policies als in 20260817090000; publiek omdat de bron ze ook
-- publiek toont. Schrijven blijft voorbehouden aan de sync (service_role).
DROP POLICY IF EXISTS read_live_race_state ON public.live_race_state;
CREATE POLICY read_live_race_state ON public.live_race_state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS read_live_rider_standings ON public.live_rider_standings;
CREATE POLICY read_live_rider_standings ON public.live_rider_standings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS read_live_premies ON public.live_premies;
CREATE POLICY read_live_premies ON public.live_premies
  FOR SELECT USING (true);

-- ── 3. Cron op rondedatum ──────────────────────────────────────────────────
DO $$
DECLARE
  v_secret_name text;
  v_url text;
  v_command text;
BEGIN
  -- Zonder pg_cron of pg_net (lokaal, preview) is er niets in te plannen.
  -- WARNING in plaats van NOTICE: een overgeslagen job viel eerder niet op.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron ontbreekt — live-sync niet ingepland';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE WARNING 'pg_net ontbreekt — live-sync niet ingepland';
    RETURN;
  END IF;

  -- livemarathon-sync vergelijkt letterlijk met SUPABASE_SERVICE_ROLE_KEY uit
  -- de edge-runtime; op dit project is dat de sb_secret_…-sleutel, niet de
  -- legacy service_role-JWT (die gaf op 17-10-2026 elke run een 401).
  SELECT name INTO v_secret_name
  FROM vault.secrets
  WHERE name IN ('livemarathon_service_role_key', 'email_queue_service_role_key')
  ORDER BY (name = 'livemarathon_service_role_key') DESC
  LIMIT 1;

  IF v_secret_name IS NULL THEN
    RAISE WARNING 'geen livemarathon_service_role_key in de vault — live-sync niet ingepland';
    RETURN;
  END IF;

  v_url := 'https://uqjrzozttkbjrdvzeroc.supabase.co/functions/v1/livemarathon-sync';

  -- De poort staat alleen open op een dag met een Meermarathon-ronde waar een
  -- baan aan hangt. Datum in Nederlandse tijd: de cron zelf draait in UTC.
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
        WHERE g.game_type = 'meermarathon'
          AND s.date = (now() AT TIME ZONE 'Europe/Amsterdam')::date
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

  PERFORM cron.unschedule('livemarathon-sync')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'livemarathon-sync');

  PERFORM cron.schedule('livemarathon-sync', '30 seconds', v_command);

  RAISE NOTICE 'live-sync ingepland (elke 30 s op rondedagen, sleutel: %)', v_secret_name;
END $$;

-- Rollback:
--   ALTER TABLE public.live_race_state
--     DROP COLUMN IF EXISTS categorie, DROP COLUMN IF EXISTS wedstrijd, DROP COLUMN IF EXISTS geslacht;
--   en 20260817120000_livemarathon_sync_cron.sql opnieuw draaien voor de oude poort.
