-- Radio Koerspoule: per-etappe voorbeschouwing (gecachet, één per stage). Idempotent.
create table if not exists public.etappe_voorbeschouwingen (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null unique references public.stages(id) on delete cascade,
  tekst text not null,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.etappe_voorbeschouwingen enable row level security;

-- Publiek leesbaar (alle deelnemers zien dezelfde tekst); schrijven via edge
-- function (service_role bypass RLS) of admin.
drop policy if exists etappe_voorb_read on public.etappe_voorbeschouwingen;
create policy etappe_voorb_read on public.etappe_voorbeschouwingen for select using (true);
drop policy if exists etappe_voorb_admin_write on public.etappe_voorbeschouwingen;
create policy etappe_voorb_admin_write on public.etappe_voorbeschouwingen
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.etappe_voorbeschouwingen to anon, authenticated;
grant all on public.etappe_voorbeschouwingen to service_role;
