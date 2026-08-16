-- This newly created season was accidentally marked as finished. Keep the
-- correction scoped to this empty setup game; configured seasons are untouched.
UPDATE public.games AS g
SET status = 'open'
WHERE g.id = '469c7c09-4ace-48ff-a1cf-2dadd55e8b65'
  AND g.game_type = 'meermarathon'
  AND g.status = 'finished'
  AND NOT EXISTS (
    SELECT 1
    FROM public.categories AS c
    WHERE c.game_id = g.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.stages AS s
    WHERE s.game_id = g.id
  );
