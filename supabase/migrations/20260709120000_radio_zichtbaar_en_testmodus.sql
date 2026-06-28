-- A) Radio Koerspoule per etappe aan/uit voor deelnemers. Idempotent.
alter table public.etappe_voorbeschouwingen
  add column if not exists zichtbaar boolean not null default false;

-- B) Admin-only testmodus per game: admin ziet alles ongeacht status.
--    Beïnvloedt NIET wat deelnemers zien. Idempotent.
alter table public.games
  add column if not exists admin_testmodus boolean not null default false;
