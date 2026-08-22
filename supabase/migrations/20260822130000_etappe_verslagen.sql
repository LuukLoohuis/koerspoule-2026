-- Etappeverslagen: de tekst die in de Koerskrant als hoofdartikel staat.
--
-- Spiegelbeeld van etappe_voorbeschouwingen: die kijkt vooruit, deze kijkt
-- terug. Bewust een aparte tabel en geen kolom op stages, zodat een verslag
-- kan ontbreken zonder dat de etappe zelf een lege kolom meesleept.
--
-- bron/bron_url zijn er omdat de tekst van een externe partij kan komen.
-- Bronvermelding is dan geen nette bijkomstigheid maar de voorwaarde waaronder
-- het mag: staat er een bron, dan toont de app die onder het verslag.
create table if not exists public.etappe_verslagen (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null unique references public.stages(id) on delete cascade,
  tekst text not null,
  -- Naam van de bron, bv. 'WielerFlits'. Leeg = eigen tekst.
  bron text,
  -- Link naar het oorspronkelijke artikel.
  bron_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.etappe_verslagen enable row level security;

-- Publiek leesbaar (alle deelnemers zien dezelfde tekst); schrijven alleen door
-- admins of via een edge function met service_role.
drop policy if exists etappe_verslag_read on public.etappe_verslagen;
create policy etappe_verslag_read on public.etappe_verslagen for select using (true);

drop policy if exists etappe_verslag_admin_write on public.etappe_verslagen;
create policy etappe_verslag_admin_write on public.etappe_verslagen
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

create index if not exists etappe_verslagen_stage_idx on public.etappe_verslagen(stage_id);

-- updated_at bijhouden, zodat "bijgewerkt op" klopt zonder dat de client dat
-- hoeft mee te sturen.
create or replace function public.touch_etappe_verslag()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists etappe_verslagen_touch on public.etappe_verslagen;
create trigger etappe_verslagen_touch
  before update on public.etappe_verslagen
  for each row execute function public.touch_etappe_verslag();

notify pgrst, 'reload schema';
