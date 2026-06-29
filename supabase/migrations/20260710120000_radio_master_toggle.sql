-- Master-schakelaar: hele Radio Koerspoule-rubriek per game aan/uit. Idempotent.
-- Staat 'ie uit, dan verschijnt Radio Koerspoule nergens bij deelnemers, ongeacht
-- de per-etappe zichtbaarheid.
alter table public.games
  add column if not exists radio_koerspoule_enabled boolean not null default true;
