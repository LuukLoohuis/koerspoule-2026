import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Realtime + focus-refresh op de games-tabel: zet de admin de koers live/locked,
 * dan pikt een al-open sessie dat direct op (geen handmatige reload nodig).
 *
 * useCurrentGame mount op veel plekken tegelijk. Eén gedeeld, ref-geteld channel
 * — anders maken meerdere instances een channel met dezelfde topic en gooit
 * supabase-js "cannot add postgres_changes callbacks ... after subscribe()".
 */
let gamesChannel: RealtimeChannel | null = null;
let gamesRefCount = 0;

function subscribeGames(qc: QueryClient): () => void {
  if (!supabase) return () => {};
  gamesRefCount += 1;
  if (!gamesChannel) {
    gamesChannel = supabase
      .channel("games-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        qc.invalidateQueries({ queryKey: ["current-game"] });
        qc.invalidateQueries({ queryKey: ["all-games"] });
      })
      .subscribe();
  }
  return () => {
    gamesRefCount -= 1;
    if (gamesRefCount <= 0 && gamesChannel) {
      supabase!.removeChannel(gamesChannel);
      gamesChannel = null;
      gamesRefCount = 0;
    }
  };
}

function useGamesAutoRefresh() {
  const qc = useQueryClient();
  useEffect(() => subscribeGames(qc), [qc]);
}

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
  useGamesAutoRefresh();
  return useQuery({
    queryKey: ["current-game"],
    // Status-wissels (open→live→locked) snel oppikken, ook bij terugkeer naar de tab.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
