-- Tweede sponsor/gever per prijs (extra naam + link). Idempotent.
alter table public.prizes
  add column if not exists sponsor_naam_2 text,
  add column if not exists sponsor_url_2 text;
