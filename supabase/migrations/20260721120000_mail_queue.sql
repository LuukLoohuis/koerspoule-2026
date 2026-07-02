-- Mail-wachtrij voor grote Notify-mailings (10.000+). Eén campagne = één
-- verzending; ontvangers staan als rijen klaar en worden in chunks verwerkt
-- door de edge-functie process-mail-queue (zelf-herhalend). Per rij wordt
-- afgevinkt (sent/failed) → hervatbaar, nooit dubbel. Idempotent.
create table if not exists public.mail_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  title_color text,
  title_size int,
  status text not null default 'sending' check (status in ('sending','done','cancelled')),
  total int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.mail_queue (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.mail_campaigns(id) on delete cascade,
  email text not null,
  unsub_token text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts int not null default 0,
  error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);
create index if not exists mail_queue_pending_idx on public.mail_queue (campaign_id, status);

alter table public.mail_campaigns enable row level security;
alter table public.mail_queue enable row level security;

-- Alleen admins mogen meekijken (voortgang in Notify-tab); schrijven doet de
-- edge-functie met de service-role (bypasst RLS).
drop policy if exists mail_campaigns_admin_read on public.mail_campaigns;
create policy mail_campaigns_admin_read on public.mail_campaigns
  for select using ((select public.is_admin()));

drop policy if exists mail_queue_admin_read on public.mail_queue;
create policy mail_queue_admin_read on public.mail_queue
  for select using ((select public.is_admin()));

grant select on public.mail_campaigns to authenticated;
grant select on public.mail_queue to authenticated;
grant all on public.mail_campaigns to service_role;
grant all on public.mail_queue to service_role;

-- Rijen claimen voor verwerking (voorkomt dubbel verzenden als er per ongeluk
-- twee verwerkers tegelijk draaien): pak max p_limit pending-rijen met
-- SKIP LOCKED en zet ze op 'processing'. Alleen service_role/admin.
create or replace function public.claim_mail_batch(p_limit int)
returns setof public.mail_queue
language plpgsql security definer set search_path = public as $$
begin
  if not (auth.role() = 'service_role' or public.is_admin()) then
    raise exception 'Niet toegestaan';
  end if;
  return query
  update public.mail_queue q
     set status = 'processing', attempts = q.attempts + 1, claimed_at = now()
   where q.id in (
     select id from public.mail_queue
      where status = 'pending'
      order by created_at
      limit greatest(1, least(p_limit, 500))
      for update skip locked
   )
  returning q.*;
end $$;

revoke all on function public.claim_mail_batch(int) from public;
grant execute on function public.claim_mail_batch(int) to authenticated, service_role;
