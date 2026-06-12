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
};

const SELECT =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author";

export function useCurrentGame() {
  return useQuery({
    queryKey: ["current-game"],
    queryFn: async (): Promise<Game | null> => {
      if (!supabase) return null;
      // Prefer an actively running game
      const { data: live, error: liveErr } = await supabase
        .from("games")
        .select(SELECT)
        .in("status", ["open", "locked", "live"])
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (liveErr) throw liveErr;
      if (live) return live as Game;

      // Fallback: most recent game of any status
      const { data: any, error: anyErr } = await supabase
        .from("games")
        .select(SELECT)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyErr) throw anyErr;
      return (any as Game | null) ?? null;
    },
  });
}
