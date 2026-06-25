-- Perf: daguitslag-rang (my_stage_ranks / stage_rank window) sorteert per call
-- stage_points op (stage_id, points DESC). Index dekt die window-ordering →
-- geen volledige sort over ~stages×users rijen op de fiat-piek. Idempotent.
create index if not exists stage_points_stage_points_idx
  on public.stage_points (stage_id, points desc);
