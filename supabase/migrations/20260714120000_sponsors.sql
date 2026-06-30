-- Platform-sponsoren (losstaand van games/prizes/subpoules). Publiek leesbaar
-- zodat de landingspagina's de logo-strook tonen; schrijven alleen admin.
-- Idempotent.
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  naam text not null default '',
  logo_url text,
  link_url text,
  zichtbaar boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sponsors_sort_idx on public.sponsors (sort_order, created_at);

alter table public.sponsors enable row level security;

drop policy if exists sponsors_read on public.sponsors;
create policy sponsors_read on public.sponsors for select using (true);

drop policy if exists sponsors_admin_write on public.sponsors;
create policy sponsors_admin_write on public.sponsors
  for all
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.sponsors to anon;
grant select, insert, update, delete on public.sponsors to authenticated;
grant all on public.sponsors to service_role;

-- Publieke bucket voor sponsorlogo's (zelfde patroon als prize-assets).
insert into storage.buckets (id, name, public)
values ('sponsor-assets', 'sponsor-assets', true)
on conflict (id) do update set public = true;

drop policy if exists sponsor_assets_read on storage.objects;
create policy sponsor_assets_read on storage.objects
  for select
  using (bucket_id = 'sponsor-assets');

drop policy if exists sponsor_assets_admin_insert on storage.objects;
create policy sponsor_assets_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sponsor-assets' and (select public.is_admin()));

drop policy if exists sponsor_assets_admin_update on storage.objects;
create policy sponsor_assets_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'sponsor-assets' and (select public.is_admin()))
  with check (bucket_id = 'sponsor-assets' and (select public.is_admin()));

drop policy if exists sponsor_assets_admin_delete on storage.objects;
create policy sponsor_assets_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'sponsor-assets' and (select public.is_admin()));
