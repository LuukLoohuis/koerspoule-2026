-- ───────────────────────────────────────────────────────────────────────────
-- Subpoule-slugs: nette, deelbare URLs (/subpoule/<naam>).
-- Voegt een slug-kolom + slugify/ensure_unique_slug helpers toe, backfilt
-- bestaande rijen, laat create_subpoule een slug zetten en voegt een
-- SECURITY DEFINER resolver toe zodat een niet-lid via de link kan landen.
-- Idempotent waar mogelijk (if not exists / or replace).
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Kolom + unieke (case-insensitive) index.
alter table public.subpoules add column if not exists slug text;
create unique index if not exists subpoules_slug_lower_idx
  on public.subpoules (lower(slug));

-- 2. Slugify — immutable, geen extensie-afhankelijkheid. Accenten via translate
--    (1:1), ß apart, daarna alles behalve [a-z0-9] → '-', samenvouwen, trimmen.
--    Lege uitkomst → 'subpoule'.
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              replace(lower(coalesce(p_text, '')), 'ß', 'ss'),
              'áàâäãåçćčéèêëēěėęíìîïīįıñńňóòôöõøōőśšúùûüūůűýÿžźżğďł',
              'aaaaaaccceeeeeeeeiiiiiiinnnoooooooossuuuuuuuyyzzzgdl'
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          '-{2,}', '-', 'g'
        ),
        '(^-|-$)', '', 'g'
      ),
    ''),
    'subpoule'
  );
$$;

-- 3. Genereer een uniek slug uit een basis-tekst; bij botsing -2, -3, …
create or replace function public.ensure_unique_slug(p_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text := public.slugify(p_base);
  v_slug text := v_base;
  v_n int := 1;
begin
  while exists (select 1 from public.subpoules where lower(slug) = lower(v_slug)) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end $$;

-- 4. Backfill bestaande subpoules (per rij, oudste eerst → stabiele -2/-3).
do $$
declare r record;
begin
  for r in select id, name from public.subpoules where slug is null order by created_at, id loop
    update public.subpoules set slug = public.ensure_unique_slug(r.name) where id = r.id;
  end loop;
end $$;

alter table public.subpoules alter column slug set not null;

-- 5. create_subpoule zet nu ook een uniek slug (returnwaarde ongemoeid).
create or replace function public.create_subpoule(
  p_name text,
  p_game_id uuid,
  p_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text := coalesce(p_code, upper(substr(md5(random()::text), 1, 6)));
  v_slug text := public.ensure_unique_slug(p_name);
begin
  if v_uid is null then raise exception 'Niet ingelogd'; end if;

  insert into public.subpoules(name, game_id, code, owner_user_id, slug)
  values (p_name, p_game_id, v_code, v_uid, v_slug)
  returning id into v_id;

  insert into public.subpoule_members(subpoule_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end $$;

grant execute on function public.create_subpoule(text, uuid, text) to authenticated;

-- 6. Resolver: slug → {id,name,code,game_id}. SECURITY DEFINER omzeilt BEWUST
--    RLS zodat een niet-lid via de link kan landen + joinen (een slug-URL is
--    feitelijk een invite-link, net als de code). Geeft alleen deze velden terug.
create or replace function public.resolve_subpoule_by_slug(p_slug text)
returns table(id uuid, name text, code text, game_id uuid)
language sql
security definer
set search_path = public
as $$
  select id, name, code, game_id
  from public.subpoules
  where lower(slug) = lower(p_slug)
  limit 1;
$$;

grant execute on function public.resolve_subpoule_by_slug(text) to authenticated;