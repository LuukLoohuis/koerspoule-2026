import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Game = {
  id: string;
  name: string;
  year: number;
  status: "draft" | "open" | "locked" | "live" | "finished";
  game_type?: "giro" | "tdf" | "vuelta" | null;
  homepage_quote?: string | null;
  homepage_quote_author?: string | null;
  /** Fontgrootte (px) van de hero-quote; null = frontend-default (34). */
  homepage_quote_size?: number | null;
};

const SELECT =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author, homepage_quote_size";
// Zolang de homepage_quote_size-migratie nog niet op de DB staat zou de
// volle SELECT een 42703 (undefined column) geven en heel current-game
// breken. Dan vallen we terug op de oude kolomlijst.
const SELECT_LEGACY =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author";

export function useCurrentGame() {
  return useQuery({
    queryKey: ["current-game"],
    queryFn: async (): Promise<Game | null> => {
      if (!supabase) return null;

      const fetchWith = async (select: string) => {
        // Prefer an actively running game
        const { data: live, error: liveErr } = await supabase!
          .from("games")
          .select(select)
          .in("status", ["open", "locked", "live"])
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (liveErr) throw liveErr;
        if (live) return live as unknown as Game;

        // Daarna: een concept/draft-game telt ook als "actieve" game, zodat de
        // subpoule-/dashboard-context al laadt voordat de inschrijving opengaat.
        const { data: upcoming, error: upcomingErr } = await supabase!
          .from("games")
          .select(select)
          .in("status", ["concept", "draft"])
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (upcomingErr) throw upcomingErr;
        if (upcoming) return upcoming as unknown as Game;

        // Fallback: most recent game of any status
        const { data: any, error: anyErr } = await supabase!
          .from("games")
          .select(select)
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (anyErr) throw anyErr;
        return (any as unknown as Game | null) ?? null;
      };

      try {
        return await fetchWith(SELECT);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "42703") return await fetchWith(SELECT_LEGACY);
        throw e;
      }
    },
  });
}
