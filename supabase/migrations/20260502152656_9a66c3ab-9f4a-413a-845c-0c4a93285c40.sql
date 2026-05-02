-- Opschonen van vervuilde startlijst-data voor de actieve Giro-game
DELETE FROM public.riders WHERE game_id = 'f73a2e0f-5633-459a-b958-47babfa5678f';
DELETE FROM public.teams WHERE game_id = 'f73a2e0f-5633-459a-b958-47babfa5678f';

-- Unique constraints zodat upsert (onConflict) werkt en dubbele teams/renners voorkomen worden
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_game_name_unique;
ALTER TABLE public.teams ADD CONSTRAINT teams_game_name_unique UNIQUE (game_id, name);

ALTER TABLE public.riders DROP CONSTRAINT IF EXISTS riders_game_startnumber_unique;
ALTER TABLE public.riders ADD CONSTRAINT riders_game_startnumber_unique UNIQUE (game_id, start_number);