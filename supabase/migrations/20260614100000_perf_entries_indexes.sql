-- ───────────────────────────────────────────────────────────────────────────
-- Performance + integriteit (hygiëne, idempotent):
--  DEEL 2: ontbrekende indexen op stages / stage_results.
--  DEEL 3: dubbele entries dedupen (alleen LEGE drafts) → unique index →
--          atomaire get_or_create_entry zodat de insert-on-read geen rollbacks
--          en geen duplicaten meer geeft.
-- VEILIG: verwijdert UITSLUITEND lege draft-duplicaten; nooit submitted entries
-- of drafts met data. Geen tabel-drops/truncates.
-- ───────────────────────────────────────────────────────────────────────────

-- ── DEEL 2: indexen ──
-- results_status staat op public.stages (filter s.results_status='approved' per
-- game), niet op stage_results. Composite index dekt die hot-path-lookup.
create index if not exists stages_game_idx on public.stages(game_id);
create index if not exists stages_game_status_idx
  on public.stages(game_id, results_status);

-- ── DEEL 3a: conservatieve dedup van entries ──
-- Per (game_id,user_id) houden we ÉÉN winnaar (submitted eerst, dan meeste data,
-- dan nieuwste). Van de rest verwijderen we ALLEEN lege drafts (status='draft'
-- én 0 picks/jokers/predictions). Het aantal verwijderde rijen wordt gelogd.
do $$
declare v_count int;
begin
  with ranked as (
    select
      e.id,
      e.status,
      row_number() over (
        partition by e.game_id, e.user_id
        order by (e.status = 'submitted') desc,
                 (coalesce(p.cnt, 0) + coalesce(j.cnt, 0) + coalesce(pr.cnt, 0)) desc,
                 e.created_at desc
      ) as rn,
      coalesce(p.cnt, 0) + coalesce(j.cnt, 0) + coalesce(pr.cnt, 0) as data_cnt
    from public.entries e
    left join (select entry_id, count(*) cnt from public.entry_picks group by entry_id) p on p.entry_id = e.id
    left join (select entry_id, count(*) cnt from public.entry_jokers group by entry_id) j on j.entry_id = e.id
    left join (select entry_id, count(*) cnt from public.entry_predictions group by entry_id) pr on pr.entry_id = e.id
  ),
  del as (
    delete from public.entries e
    using ranked r
    where e.id = r.id
      and r.rn > 1
      and r.status = 'draft'
      and r.data_cnt = 0
    returning e.id
  )
  select count(*) into v_count from del;
  raise notice 'entries-dedup: % lege draft-duplicaten verwijderd', v_count;
end $$;

-- ── DEEL 3b: unique index (één entry per game/gebruiker) ──
create unique index if not exists entries_game_user_uidx
  on public.entries(game_id, user_id);

-- ── DEEL 3c: atomaire get-or-create (geen rollback meer) ──
create or replace function public.get_or_create_entry(p_game_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  insert into public.entries(game_id, user_id, status)
  values (p_game_id, v_uid, 'draft')
  on conflict (game_id, user_id) do nothing;

  select id into v_id
  from public.entries
  where game_id = p_game_id and user_id = v_uid;

  return v_id;
end $$;

grant execute on function public.get_or_create_entry(uuid) to authenticated;
