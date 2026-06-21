-- Eenmalig, gedeeld Patlef-voorproefje per game (sneak preview / status 'open').
-- Eén rij per game; gegenereerd door de edge function met de service-role en
-- daarna voor iedereen uit deze cache geserveerd (nooit per bezoeker een call).
create table if not exists public.lefevere_preview (
  game_id uuid primary key references public.games(id) on delete cascade,
  directeurs_analyse text not null,
  ploeg_karakterisering text not null,
  model text,
  generated_at timestamptz not null default now()
);

alter table public.lefevere_preview enable row level security;

-- Iedereen mag het voorproefje lezen; schrijven gebeurt uitsluitend via de
-- edge function (service-role omzeilt RLS) — geen client insert/update policy.
drop policy if exists lefevere_preview_read on public.lefevere_preview;
create policy lefevere_preview_read on public.lefevere_preview
  for select using (true);
