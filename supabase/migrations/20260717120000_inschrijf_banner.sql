-- Multi-game fase 3: per-game "inschrijving open"-banner, analoog aan de
-- support_banner. Admin zet 'm handmatig aan in GoLive; getoond op de homepage
-- en in de app met een doorlink naar het inschrijven van díe game. Idempotent.

alter table public.games
  add column if not exists inschrijf_banner_visible boolean not null default false;

alter table public.games
  add column if not exists inschrijf_banner_updated_at timestamptz;
