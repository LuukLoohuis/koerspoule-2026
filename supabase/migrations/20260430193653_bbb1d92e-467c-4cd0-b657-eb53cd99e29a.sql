
-- Categories: add max_picks + order_index (alias of sort_order)
alter table public.categories add column if not exists max_picks int not null default 1;
alter table public.categories add column if not exists order_index int;
update public.categories set order_index = sort_order where order_index is null;

-- Riders: allow direct game link + legacy team text + game-scoped start number
alter table public.riders add column if not exists game_id uuid references public.games(id) on delete cascade;
alter table public.riders add column if not exists team text;
create unique index if not exists riders_game_startnum_uniq
  on public.riders(game_id, start_number) where start_number is not null;

-- game_riders: optional category link (legacy admin uses this)
alter table public.game_riders add column if not exists category_id uuid references public.categories(id) on delete set null;
