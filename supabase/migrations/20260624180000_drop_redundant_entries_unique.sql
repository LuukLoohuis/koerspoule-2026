-- Opruimen: entries had TWEE unique-enforcers voor hetzelfde kolompaar —
-- constraint entries_user_id_game_id_key (user_id, game_id) én unique-index
-- entries_game_user_uidx (game_id, user_id). Dubbel werk bij elke insert/update.
-- De index blijft (dekt ook on conflict (game_id,user_id) in get_or_create_entry);
-- user_id-lookups worden gedekt door entries_user_idx. Geen FK verwijst naar dit
-- paar en geen functie noemt de constraint bij naam → veilig te droppen. Idempotent.
alter table public.entries drop constraint if exists entries_user_id_game_id_key;
