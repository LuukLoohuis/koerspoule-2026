-- Rijke TdF-etappe-kaarten uit de touretappe-scraper (scrape + GPT-analyse +
-- gegenereerde beelden). Aparte tabel — NIET de game-`stages` (game_id/scoring).
-- Idempotent.
do $$ begin
  create type public.tour_stage_type as enum (
    'Flat', 'Hilly', 'Mountain', 'Time Trial', 'Summit Finish', 'Cobbles'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.tour_stage_cards (
  stage               integer       primary key,
  title               text          not null default '',
  distance            text          not null default '',
  elevation           text          not null default '',
  start_city          text          not null default '',
  finish_city         text          not null default '',
  stage_date          date,
  description         text          not null default '',
  source_url          text          not null default '',
  climbs              jsonb         not null default '[]',
  stage_type          public.tour_stage_type,
  visual_theme        text          not null default '',
  key_elements        text[]        not null default '{}',
  atmosphere          text          not null default '',
  notable_climbs      text[]        not null default '{}',
  lighting_condition  text          not null default '',
  profile_description text          not null default '',
  image_prompt        text          not null default '',
  generated_image_path text,
  profile_image_path   text,
  generated_image_url  text,
  profile_image_url    text,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

alter table public.tour_stage_cards enable row level security;

-- Publiek leesbaar (marketing/etappe-pagina's); schrijven via service-role (seed).
drop policy if exists tour_stage_cards_read on public.tour_stage_cards;
create policy tour_stage_cards_read on public.tour_stage_cards for select using (true);

-- Publieke storage-bucket waar de scraper de beelden naartoe seedt.
insert into storage.buckets (id, name, public)
values ('stage-images', 'stage-images', true)
on conflict (id) do nothing;
