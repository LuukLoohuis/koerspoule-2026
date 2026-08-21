-- Admins uit de totaalstand van de Krant, maar wél in de subpoulestand.
--
-- 20260731120000 regelde dit al voor de Uitslagen-pagina: admins mogen
-- meedoen en blijven zichtbaar in etappe- en subpoulestanden, maar tellen niet
-- mee in het algemene klassement. De Krant hangt aan een andere bron --
-- game_entries_standings -- en die kende die regel niet.
--
-- Zolang admins hun inzending op 'draft' lieten staan viel dat niet op: het
-- status-filter hieronder hield ze overal buiten. Zodra er één op 'submitted'
-- gezet werd, dook hij op in de totaalstand van de Krant terwijl hij op de
-- Uitslagen-pagina terecht ontbrak.
--
-- Bewust géén uitsluiting in de query zelf: de Krant gebruikt deze ene lijst
-- voor de subpoulestand én de totaalstand. Admins er hier uit filteren zou ze
-- ook uit hun eigen subpoule laten verdwijnen. Daarom een kolom is_admin, zodat
-- de aanroeper per stand kan beslissen.

DROP FUNCTION IF EXISTS public.game_entries_standings(uuid);

CREATE FUNCTION public.game_entries_standings(p_game_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  team_name text,
  total_points integer,
  display_name text,
  is_admin boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    e.id,
    e.user_id,
    e.team_name,
    CASE WHEN public.results_zichtbaar(p_game_id) THEN e.total_points ELSE 0 END AS total_points,
    COALESCE(p.display_name, 'Onbekend') AS display_name,
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = e.user_id AND ur.role = 'admin'
    ) AS is_admin
  FROM public.entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE auth.uid() IS NOT NULL
    AND e.game_id = p_game_id
    AND e.status = 'submitted'
  ORDER BY
    CASE WHEN public.results_zichtbaar(p_game_id) THEN e.total_points ELSE 0 END DESC,
    COALESCE(p.display_name, e.team_name, '') ASC;
$$;

GRANT EXECUTE ON FUNCTION public.game_entries_standings(uuid) TO anon, authenticated;

-- Rollback: draai 20260727120000 opnieuw; die zet de versie zonder is_admin terug.
