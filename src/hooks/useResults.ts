import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/** Wacht tot auth-state geresolved is (anon óf ingelogd). Voorkomt RPC-storm
 *  tijdens de auth-race bij mount en blokkeert queries terwijl loading=true. */
function useAuthReady(): boolean {
  return !useAuth().loading;
}

export type StageRow = {
  id: string;
  game_id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  status: string | null;
  stage_type: "vlak" | "heuvelachtig" | "tijdrit" | "bergop" | "ploegentijdrit" | null;
  distance_km: number | null;
  is_gc: boolean;
  results_status: "draft" | "pending" | "approved" | null;
};

export type LastApprovedStage = {
  id: string;
  stage_number: number;
  name: string | null;
  approved_at: string | null;
};

export function useLastApprovedStage(gameId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["last-approved-stage", gameId],
    enabled: authReady && Boolean(gameId),
    queryFn: async (): Promise<LastApprovedStage | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await supabase
        .from("stages")
        .select("id, stage_number, name, approved_at")
        .eq("game_id", gameId)
        .eq("results_status", "approved")
        .order("stage_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LastApprovedStage | null;
    },
  });
}

export function useStages(gameId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["stages", gameId],
    enabled: authReady && Boolean(gameId),
    queryFn: async (): Promise<StageRow[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("stages")
        .select("id, game_id, stage_number, name, date, status, stage_type, distance_km, is_gc, results_status")
        .eq("game_id", gameId)
        .order("stage_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StageRow[];
    },
  });
}

export type StageResultRow = {
  id: string;
  stage_id: string;
  rider_id: string;
  rider_name: string | null;
  start_number: number | null;
  finish_position: number | null;
  gc_position: number | null;
  mountain_position: number | null;
  points_position: number | null;
  youth_position: number | null;
  did_finish: boolean | null;
  riders?: {
    id: string;
    name: string;
    start_number: number | null;
    team_id: string | null;
    teams?: { name: string } | null;
  } | null;
};

export function useStageResults(stageId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["stage-results", stageId],
    enabled: authReady && Boolean(stageId),
    queryFn: async (): Promise<StageResultRow[]> => {
      if (!supabase || !stageId) return [];
      const { data, error } = await supabase
        .from("stage_results")
        .select(
          "id, stage_id, rider_id, rider_name, start_number, finish_position, gc_position, mountain_position, points_position, youth_position, did_finish, riders(id, name, start_number, team_id, teams(name))"
        )
        .eq("stage_id", stageId);
      if (error) throw error;
      return ((data ?? []) as unknown) as StageResultRow[];
    },
  });
}

/** Stage points per entry, for the standings list */
export type StagePointsRow = {
  entry_id: string;
  stage_id: string;
  points: number;
};

/** Server-side geaggregeerde stand t/m een rit (schaalt naar veel deelnemers).
 *  Geeft per ingediend team de cumulatieve stand + rang + delta + dag-uitslag,
 *  i.p.v. alle stage_points-rijen naar de client te halen. Faalt de RPC (nog
 *  niet gedeployed e.d.), dan valt de UI terug op de client-berekening. */
export type GameStandingRow = {
  entry_id: string;
  user_id: string;
  team_name: string | null;
  display_name: string | null;
  cum_points: number;
  pred_bonus: number;
  total: number;
  rank: number;
  prev_rank: number;
  delta: number;
  stage_points: number;
  stage_rank: number | null;
};

export function useGameStandings(gameId?: string, uptoStageNumber?: number) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["game-standings", gameId, uptoStageNumber],
    enabled: authReady && Boolean(supabase && gameId && typeof uptoStageNumber === "number"),
    staleTime: 60 * 1000,
    retry: 0, // RPC ontbreekt? meteen terugvallen op client-berekening
    queryFn: async (): Promise<GameStandingRow[]> => {
      if (!supabase || !gameId || typeof uptoStageNumber !== "number") return [];
      const { data, error } = await (supabase as any).rpc("game_standings", {
        p_game_id: gameId,
        p_upto: uptoStageNumber,
      });
      if (error) throw error;
      return (data ?? []) as GameStandingRow[];
    },
  });
}

/** stage_points beperkt tot een set entries (bv. de leden van een subpoule).
 *  Haalt alleen die rijen op i.p.v. de hele game — schaalt naar veel deelnemers. */
/** Jouw dagklassering per etappe (server-side). Map<stage_id, rank>. */
export function useMyStageRanks(gameId?: string, userId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["my-stage-ranks", gameId, userId],
    enabled: authReady && Boolean(supabase && gameId && userId),
    staleTime: 60 * 1000,
    retry: 0,
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || !gameId || !userId) return new Map();
      const { data, error } = await (supabase as any).rpc("my_stage_ranks", {
        p_game_id: gameId,
        p_user_id: userId,
      });
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of (data ?? []) as Array<{ stage_id: string; my_rank: number }>) {
        m.set(r.stage_id, r.my_rank);
      }
      return m;
    },
  });
}

/** Gemiddelde stage-punten per etappe over alle ingediende teams (server-side).
 *  Map<stage_id, avg>. Voor de Hors Catégorie-tijdlijn, i.p.v. alle stage_points. */
export function useStageAverages(gameId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["game-stage-averages", gameId],
    enabled: authReady && Boolean(supabase && gameId),
    staleTime: 60 * 1000,
    retry: 0,
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || !gameId) return new Map();
      const { data, error } = await (supabase as any).rpc("game_stage_averages", {
        p_game_id: gameId,
      });
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of (data ?? []) as Array<{ stage_id: string; avg_points: number }>) {
        m.set(r.stage_id, Number(r.avg_points) || 0);
      }
      return m;
    },
  });
}

export function useStagePointsForEntries(gameId?: string, entryIds?: string[]) {
  const authReady = useAuthReady();
  const ids = entryIds ?? [];
  const idsKey = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["stage-points-entries", gameId, idsKey],
    enabled: authReady && Boolean(supabase && gameId && ids.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StagePointsRow[]> => {
      if (!supabase || !gameId || ids.length === 0) return [];
      const { data, error } = await supabase
        .from("stage_points")
        .select("entry_id, stage_id, points, stages!inner(game_id)")
        .eq("stages.game_id", gameId)
        .in("entry_id", ids)
        .range(0, 199999);
      if (error) throw error;
      return (data ?? []).map((r: { entry_id: string; stage_id: string; points: number }) => ({
        entry_id: r.entry_id,
        stage_id: r.stage_id,
        points: r.points,
      }));
    },
  });
}

export function useStagePoints(gameId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["stage-points", gameId],
    enabled: authReady && Boolean(gameId),
    queryFn: async (): Promise<StagePointsRow[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("stage_points")
        .select("entry_id, stage_id, points, stages!inner(game_id)")
        .eq("stages.game_id", gameId)
        // Zonder expliciete range kapt PostgREST af op 1000 rijen. stage_points =
        // deelnemers × etappes, dus bij ~50+ deelnemers × 21 etappes worden de
        // laatste etappes (o.a. rit 21) afgekapt en tellen niet mee.
        .range(0, 199999);
      if (error) throw error;
      return (data ?? []).map((r: { entry_id: string; stage_id: string; points: number }) => ({
        entry_id: r.entry_id,
        stage_id: r.stage_id,
        points: r.points,
      }));
    },
  });
}

/** All entries in the game with team_name + total_points (for standings) */
export type EntryStanding = {
  id: string;
  user_id: string;
  team_name: string | null;
  total_points: number;
  display_name: string | null;
};

export function useEntries(gameId?: string) {
  const authReady = useAuthReady();
  return useQuery({
    queryKey: ["entries-standings", gameId],
    enabled: authReady && Boolean(gameId),
    queryFn: async (): Promise<EntryStanding[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await (supabase as any).rpc("game_entries_standings", {
        p_game_id: gameId,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string; user_id: string; team_name: string | null; total_points: number; display_name: string | null }>;
      return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        team_name: r.team_name,
        total_points: r.total_points ?? 0,
        display_name: r.display_name ?? null,
      }));
    },
  });
}
