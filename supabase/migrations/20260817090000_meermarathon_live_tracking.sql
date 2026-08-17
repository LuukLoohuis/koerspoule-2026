-- Live-uitslagen voor Meermarathon.
--
-- Bron is livemarathon.schaatsen.nl. Dat is een Meteor-app: de HTML is een leeg
-- omhulsel en alle data loopt over DDP/WebSocket. Een server-side poller
-- (edge function) abonneert zich op de publicaties races.inTrack /
-- stand.inTrack / premies.inTrack en schrijft het resultaat genormaliseerd
-- hierheen. Clients lezen uitsluitend deze tabellen, zodat er één verbinding
-- naar de bron nodig is in plaats van één per bezoeker.
--
-- De live stand is NOOIT de bron voor punten. Punten blijven lopen via
-- approve_stage_results; deze tabellen zijn puur informatief.

-- ── Ronde-eigenschappen ────────────────────────────────────────────────────
-- Kunstijs is altijd een 400m-ovaal; natuurijs (Weissensee-achtig) heeft een
-- eigen standaardvorm. De beheerder legt dit per ronde vast.
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS ijs_type text;

ALTER TABLE public.stages
  DROP CONSTRAINT IF EXISTS stages_ijs_type_check;
ALTER TABLE public.stages
  ADD CONSTRAINT stages_ijs_type_check
  CHECK (ijs_type IS NULL OR ijs_type IN ('kunstijs', 'natuurijs'));

-- ── Rennerkoppeling ────────────────────────────────────────────────────────
-- Het KNSB-relatienummer is de enige stabiele sleutel tussen de livebron en
-- onze rennerslijst. Beennummers wisselen per wedstrijd en zijn ongeschikt.
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS knsb_relatienummer text;

CREATE INDEX IF NOT EXISTS riders_knsb_relatienummer_idx
  ON public.riders (knsb_relatienummer)
  WHERE knsb_relatienummer IS NOT NULL;

-- ── Ronde ↔ baan ───────────────────────────────────────────────────────────
-- Bewust een koppeltabel en geen enkele kolom: op natuurijs rijden mannen en
-- vrouwen tegelijk, en de bron levert die als twee losse trackIds. Eén ronde
-- kan dus meerdere livebanen hebben.
CREATE TABLE IF NOT EXISTS public.stage_live_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  label text,
  categorie text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_id, track_id)
);

CREATE INDEX IF NOT EXISTS stage_live_tracks_stage_idx
  ON public.stage_live_tracks (stage_id, sort_order);

-- ── Koersstatus per baan ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_race_state (
  track_id text PRIMARY KEY,
  totaal_ronden integer,
  ronde_lengte integer,
  ronden_te_gaan integer,
  aantal_rijders integer,
  aantal_actief integer,
  max_ronden integer,
  peloton_ronden integer,
  race_time text,
  lap_time text,
  gem_ronde_tijd text,
  gem_ronde_snelheid text,
  snelste_ronde_tijd text,
  snelste_ronde_naam text,
  snelste_ronde_beennummer text,
  snelste_ronde_nr integer,
  snelste_ronde_snelheid text,
  bron_tijd text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- ── Stand per rijder ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_rider_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  beennummer text NOT NULL,
  shownummer text,
  relatienummer text,
  naam text NOT NULL,
  sponsor text,
  positie integer NOT NULL,
  aantal_ronden integer NOT NULL DEFAULT 0,
  aantal_ronden_kop integer,
  meter integer,
  -- tijd_sort is de sorteersleutel in milliseconden; sorteer nooit op de
  -- geformatteerde tijd, want die klopt niet zodra iemand ronden achter ligt.
  tijd_sort bigint,
  tijd text,
  lap text,
  sectie text,
  fastest text,
  groep integer,
  punten integer,
  finished boolean NOT NULL DEFAULT false,
  rider_id uuid REFERENCES public.riders(id) ON DELETE SET NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, beennummer)
);

CREATE INDEX IF NOT EXISTS live_rider_standings_track_pos_idx
  ON public.live_rider_standings (track_id, aantal_ronden DESC, tijd_sort ASC);

CREATE INDEX IF NOT EXISTS live_rider_standings_rider_idx
  ON public.live_rider_standings (rider_id)
  WHERE rider_id IS NOT NULL;

-- ── Premiesprints ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_premies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  volgnr integer NOT NULL,
  ronde integer,
  aantal_ronden integer,
  vastgesteld boolean NOT NULL DEFAULT false,
  -- [{ positie, beennummer, naam }, …] — de bron levert Nr1..Nr10 / Naam1..Naam10
  posities jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, volgnr)
);

CREATE INDEX IF NOT EXISTS live_premies_track_idx
  ON public.live_premies (track_id, volgnr);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Lezen mag iedereen: het gaat om uitslagen die op livemarathon.schaatsen.nl
-- ook publiek staan. Schrijven doet alleen de poller (service_role, die RLS
-- omzeilt) en voor de koppeling de beheerder.
ALTER TABLE public.stage_live_tracks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_race_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_rider_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_premies        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_stage_live_tracks ON public.stage_live_tracks;
CREATE POLICY read_stage_live_tracks ON public.stage_live_tracks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS stage_live_tracks_admin_write ON public.stage_live_tracks;
CREATE POLICY stage_live_tracks_admin_write ON public.stage_live_tracks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS read_live_race_state ON public.live_race_state;
CREATE POLICY read_live_race_state ON public.live_race_state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS read_live_rider_standings ON public.live_rider_standings;
CREATE POLICY read_live_rider_standings ON public.live_rider_standings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS read_live_premies ON public.live_premies;
CREATE POLICY read_live_premies ON public.live_premies
  FOR SELECT USING (true);

-- Rollback:
--   DROP TABLE public.live_premies, public.live_rider_standings,
--              public.live_race_state, public.stage_live_tracks;
--   ALTER TABLE public.riders DROP COLUMN knsb_relatienummer;
--   ALTER TABLE public.stages DROP COLUMN ijs_type;
