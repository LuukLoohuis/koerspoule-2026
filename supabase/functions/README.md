# Supabase Backend – Cycling Pool

## 1. Apply the SQL schema

```bash
# Option A: paste supabase/migrations/0001_cycling_pool_schema.sql in the SQL editor
# Option B (CLI):
supabase link --project-ref <your-ref>
supabase db push
```

## 2. Deploy edge functions

```bash
supabase functions deploy import-stage-results
supabase functions deploy recalculate-game
supabase functions deploy reset-stage
```

The functions use `SUPABASE_URL` and `SUPABASE_ANON_KEY`, which Supabase
injects automatically. The caller's JWT is forwarded so RLS + the
`is_admin()` check inside each RPC are enforced.

## 3. Promote yourself to admin (run once in SQL editor)

```sql
insert into public.user_roles(user_id, role)
values ('<your-auth-uid>', 'admin')
on conflict do nothing;
```

## 4. RPCs available from the frontend

| RPC                          | Params                                      |
| ---------------------------- | ------------------------------------------- |
| `import_stage_results`       | `p_stage_id uuid, p_results jsonb`          |
| `calculate_stage_points`     | `p_stage_id uuid`                           |
| `update_total_ranking`       | `p_game_id uuid`                            |
| `full_recalculation`         | `p_game_id uuid`                            |
| `reset_stage_results`        | `p_stage_id uuid`                           |

## 5. Enforced data rules

- `team_picks_unique_rider` – a team can never pick the same rider twice
  (joker or category – they share the same uniqueness).
- `team_picks_unique_category` – exactly one pick per category per team
  (partial unique index on `is_joker = false`).
- `team_picks_joker_check` – jokers must have `category_id IS NULL`,
  category picks must have a `category_id`.
- All write paths require `is_admin()` except a user's own team / picks.

## 6. Scoring model

`calculate_stage_points` joins:

```
stage_results → points_schema (by position)
              → team_picks (by rider_id)
              → user_teams (game match)
```

Joker picks count **2×**. Edit the multiplier in
`calculate_stage_points` if you want a different value.
