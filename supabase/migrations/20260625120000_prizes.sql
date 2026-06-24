-- Prijzen-feature: per game beheerbare prijzen + zichtbaarheids-toggle. Idempotent.

alter table public.games
  add column if not exists prizes_visible boolean not null default false;

create table if not exists public.prizes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  soort text not null check (soort in ('podium_1','podium_2','podium_3','dagprijs')),
  titel text not null default '',
  omschrijving text not null default '',
  sponsor_naam text,
  sponsor_logo_url text,
  afbeelding_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists prizes_game_idx on public.prizes (game_id, sort_order);

alter table public.prizes enable row level security;

-- Publiek leesbaar (de prijzen-pagina werkt ook uitgelogd); beheer admin-only.
drop policy if exists prizes_read on public.prizes;
create policy prizes_read on public.prizes for select using (true);
drop policy if exists prizes_admin_write on public.prizes;
create policy prizes_admin_write on public.prizes for all using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.prizes to anon;
-- authenticated heeft DML-grant nodig zodat de admin (authenticated-rol) kan
-- schrijven; de RLS-policy prizes_admin_write (is_admin) blijft de echte gate.
grant select, insert, update, delete on public.prizes to authenticated;
grant all on public.prizes to service_role;

-- Publieke bucket voor sponsorlogo's/prijsfoto's.
insert into storage.buckets (id, name, public)
values ('prize-assets', 'prize-assets', true)
on conflict (id) do nothing;

-- Storage: publiek lezen; schrijven alleen admin (zelfde patroon als stage-profiles).
drop policy if exists prize_assets_read on storage.objects;
create policy prize_assets_read on storage.objects for select using (bucket_id = 'prize-assets');
drop policy if exists prize_assets_admin_insert on storage.objects;
create policy prize_assets_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'prize-assets' and (select public.is_admin()));
drop policy if exists prize_assets_admin_update on storage.objects;
create policy prize_assets_admin_update on storage.objects for update to authenticated using (bucket_id = 'prize-assets' and (select public.is_admin())) with check (bucket_id = 'prize-assets' and (select public.is_admin()));
drop policy if exists prize_assets_admin_delete on storage.objects;
create policy prize_assets_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'prize-assets' and (select public.is_admin()));
