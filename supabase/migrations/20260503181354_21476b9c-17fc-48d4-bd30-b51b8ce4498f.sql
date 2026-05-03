DELETE FROM public.teams
WHERE game_id = 'f73a2e0f-5633-459a-b958-47babfa5678f'
  AND NOT EXISTS (SELECT 1 FROM public.riders r WHERE r.team_id = teams.id);