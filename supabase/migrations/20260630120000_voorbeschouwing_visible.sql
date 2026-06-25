-- Per-game toggle voor de Voorbeschouwing-sectie (karavaan). Default uit.
-- Idempotent.
alter table public.games
  add column if not exists voorbeschouwing_visible boolean not null default false;
