-- "Dagprijs van vandaag"-banner: markeer max. één dagprijs per game. Idempotent.
alter table public.prizes
  add column if not exists is_dagprijs_vandaag boolean not null default false;

-- Hard garanderen: hooguit één actieve dagprijs per game (partial unique index).
create unique index if not exists prizes_one_dagprijs_vandaag_idx
  on public.prizes (game_id) where (is_dagprijs_vandaag);
