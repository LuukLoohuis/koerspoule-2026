import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { isVisibleToUser } from "@/lib/gameStatus";
import {
  bouwGameStatus,
  meermarathonSeizoenGames,
  meermarathonSeizoenJaar,
  vandaagIso,
  type MeermarathonGameStatus,
  type MmEntry,
  type MmKlassement,
  type MmWedstrijd,
} from "@/lib/meermarathonSeizoen";

const WEDSTRIJD_SELECT =
  "id, game_id, stage_number, name, date, status, is_gc, results_status, ijs_type, wedstrijd_type, aantal_rondes, distance_km";

type StandingRow = { user_id: string; rank: number; delta: number | null; total: number };

// game_standings staat niet in de gegenereerde types (zie useGameStandings).
type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * Beide Meermarathon-games van het seizoen in één keer: inschrijving, ploeg,
 * klassement en wedstrijden. Voedt de koersbalk en "Mijn Meermarathon".
 *
 * Maakt bewust géén entry aan (useEntry doet dat wel): alleen kijken naar je
 * games mag je nergens voor inschrijven.
 */
export function useMeermarathonSeizoen() {
  const { user, role } = useAuth();
  const { games: alleGames, selectedGame } = useSelectedGame();
  const isAdmin = role === "admin";

  const seizoen = useMemo(() => {
    const zichtbaar = alleGames.filter((g) => isVisibleToUser(g.status, isAdmin));
    const jaar = meermarathonSeizoenJaar(zichtbaar, selectedGame);
    return jaar == null ? [] : meermarathonSeizoenGames(zichtbaar, jaar);
  }, [alleGames, selectedGame, isAdmin]);

  const ids = seizoen.map((g) => g.id);

  const query = useQuery({
    queryKey: ["mm-seizoen", ids.join(","), user?.id ?? null],
    enabled: Boolean(supabase) && ids.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<MeermarathonGameStatus[]> => {
      if (!supabase) return [];
      const db = supabase;

      const [sluitRes, catRes, wedRes, entryRes] = await Promise.all([
        db.from("games").select("id, registration_closes_at").in("id", ids),
        db.from("categories").select("game_id, max_picks").in("game_id", ids),
        db.from("stages").select(WEDSTRIJD_SELECT).in("game_id", ids).order("stage_number", { ascending: true }),
        user
          ? db.from("entries").select("id, game_id, status, team_name, entry_picks(category_id)").eq("user_id", user.id).in("game_id", ids)
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const res of [sluitRes, catRes, wedRes, entryRes]) if (res.error) throw res.error;

      const sluit = new Map(
        ((sluitRes.data ?? []) as { id: string; registration_closes_at: string | null }[]).map((g) => [g.id, g.registration_closes_at]),
      );
      const vereist = new Map<string, number>();
      for (const c of (catRes.data ?? []) as { game_id: string; max_picks: number | null }[]) {
        vereist.set(c.game_id, (vereist.get(c.game_id) ?? 0) + (c.max_picks ?? 1));
      }
      const wedstrijden = (wedRes.data ?? []) as unknown as MmWedstrijd[];
      const entries = new Map<string, MmEntry>();
      for (const e of (entryRes.data ?? []) as unknown as {
        id: string; game_id: string; status: string; team_name: string | null; entry_picks: { category_id: string }[] | null;
      }[]) {
        entries.set(e.game_id, { id: e.id, status: e.status, teamName: e.team_name, picks: e.entry_picks?.length ?? 0 });
      }

      // Punten per wedstrijd van je eigen ploeg(en).
      const entryIds = [...entries.values()].map((e) => e.id);
      const punten = new Map<string, Map<string, number>>();
      if (entryIds.length > 0) {
        const { data, error } = await db.from("stage_points").select("entry_id, stage_id, points").in("entry_id", entryIds);
        if (error) throw error;
        for (const r of (data ?? []) as { entry_id: string; stage_id: string; points: number }[]) {
          const m = punten.get(r.entry_id) ?? new Map<string, number>();
          m.set(r.stage_id, (m.get(r.stage_id) ?? 0) + r.points);
          punten.set(r.entry_id, m);
        }
      }

      // Klassement: alleen als er al een goedgekeurde uitslag is en je meedoet.
      const rpc = db.rpc.bind(db) as unknown as Rpc;
      const klassementen = await Promise.all(
        seizoen.map(async (game): Promise<MmKlassement | null> => {
          const entry = entries.get(game.id);
          const laatste = wedstrijden
            .filter((w) => w.game_id === game.id && !w.is_gc && w.results_status === "approved")
            .reduce<number | null>((max, w) => (max == null || w.stage_number > max ? w.stage_number : max), null);
          if (!user || !entry || laatste == null) return null;
          const { data, error } = await rpc("game_standings", { p_game_id: game.id, p_upto: laatste, p_include_admins: false });
          if (error) return null; // geen klassement is beter dan geen overzicht
          const rijen = (data ?? []) as StandingRow[];
          const mij = rijen.find((r) => r.user_id === user.id);
          return mij ? { rank: mij.rank, totaal: rijen.length, delta: mij.delta ?? 0, punten: mij.total } : null;
        }),
      );

      const vandaag = vandaagIso();
      return seizoen.map((game, i) => {
        const entry = entries.get(game.id) ?? null;
        return bouwGameStatus({
          game: { ...game, registration_closes_at: sluit.get(game.id) ?? null },
          entry,
          vereist: vereist.get(game.id) ?? 0,
          wedstrijden: wedstrijden.filter((w) => w.game_id === game.id),
          klassement: klassementen[i],
          puntenPerWedstrijd: (entry && punten.get(entry.id)) || new Map(),
          vandaag,
        });
      });
    },
  });

  return { seizoen, statussen: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
