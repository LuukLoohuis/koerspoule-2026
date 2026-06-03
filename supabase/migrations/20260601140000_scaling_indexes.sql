-- Schaal-indexes: versnellen de zwaarste reads/recalcs naarmate het aantal
-- deelnemers groeit. Allemaal IF NOT EXISTS → veilig en idempotent.
--
-- Bestond al: entries(game_id), entries(user_id), stage_results(stage_id),
-- stage_points UNIQUE(stage_id, entry_id), entry_predictions(entry_id),
-- entry_prediction_points(entry_id).
--
-- Ontbrak (entry-scoped lookups + de 'submitted'-filter):

-- Per-entry punten (useMyStagePointTotal / recalc joins). De bestaande
-- composite (stage_id, entry_id) bedient entry_id-alleen niet efficiënt.
CREATE INDEX IF NOT EXISTS stage_points_entry_idx ON public.stage_points(entry_id);

-- Picks/jokers per entry (recalc, vergelijkingen, opslag).
CREATE INDEX IF NOT EXISTS entry_picks_entry_idx ON public.entry_picks(entry_id);
CREATE INDEX IF NOT EXISTS entry_jokers_entry_idx ON public.entry_jokers(entry_id);

-- Veelgebruikte filter: ingediende teams binnen een game (standings/RPC's).
CREATE INDEX IF NOT EXISTS entries_game_status_idx ON public.entries(game_id, status);

-- Categorie-renners per renner (matching/dreamteam).
CREATE INDEX IF NOT EXISTS category_riders_rider_idx ON public.category_riders(rider_id);
