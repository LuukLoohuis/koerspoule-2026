-- Sponsor-link per prijs (optioneel). Idempotent.
alter table public.prizes
  add column if not exists sponsor_url text;
