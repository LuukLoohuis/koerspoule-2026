import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSelectedGame } from "@/context/SelectedGameContext";

/**
 * Huidige game met focus-/interval-refresh: status-wissels (open→live→locked)
 * worden opgepikt bij terugkeer naar de tab of na max 15s (staleTime).
 *
 * Géén realtime-subscription: `games` staat niet in de realtime-publicatie, dus
 * een postgres_changes-channel ving toch niks en kostte bij veel gelijktijdige
 * sessies alleen open kanalen. Focus/reconnect-refetch dekt de status-wissels.
 */

export type Game = {
  id: string;
  name: string;
  year: number;
  status: "draft" | "open" | "open_inschrijving" | "locked" | "live" | "finished";
  game_type?: "giro" | "tdf" | "tour" | "femmes" | "vuelta" | null;
  homepage_quote?: string | null;
  homepage_quote_author?: string | null;
  /** Fontgrootte (px) van de hero-quote; null = frontend-default (34). */
  homepage_quote_size?: number | null;
  /** Prijzen-tab zichtbaar voor deelnemers (per game). */
  prizes_visible?: boolean | null;
  /** Admin-only testmodus: admin ziet alles ongeacht status (geen effect op deelnemers). */
  admin_testmodus?: boolean | null;
  /** Homepage-deelnemersteller aan/uit voor deze game (admin, handmatig). */
  deelnemers_teller_visible?: boolean | null;
};

const SELECT =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author, homepage_quote_size, prizes_visible, admin_testmodus, deelnemers_teller_visible";
// Zolang de homepage_quote_size-migratie nog niet op de DB staat zou de
// volle SELECT een 42703 (undefined column) geven en heel current-game
// breken. Dan vallen we terug op de oude kolomlijst.
const SELECT_LEGACY =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author";

export function useCurrentGame({ ignoreSelectedGame = false }: { ignoreSelectedGame?: boolean } = {}) {
  // De EXPLICIET gekozen game (multi-game). Is er nog geen keuze, dan valt de
  // queryFn hieronder terug op de bestaande default-logica.
  const { selectedGameId } = useSelectedGame();
  // De publieke homepage moet altijd de live-first default tonen. Een historische
  // sessiekeuze uit Mijn Peloton mag daar niet de quote, status of teller bepalen.
  const effectiveSelectedGameId = ignoreSelectedGame ? null : selectedGameId;

  return useQuery({
    // selectedGameId in de key → wisselen van game hertriggert alle verbruikers.
    queryKey: ["current-game", effectiveSelectedGameId, ignoreSelectedGame ? "live-default" : "selected"],
    // Status-wissels (open→live→locked) snel oppikken, ook bij terugkeer naar de tab.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async (): Promise<Game | null> => {
      if (!supabase) return null;

      // Expliciet gekozen game: haal precies die op. Bestaat 'ie niet (meer),
      // val door naar de default-logica zodat er nooit een lege staat is.
      const fetchById = async (select: string, id: string) => {
        const { data, error } = await supabase!
          .from("games")
          .select(select)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return (data as unknown as Game | null) ?? null;
      };

      const fetchWith = async (select: string) => {
        if (effectiveSelectedGameId) {
          const chosen = await fetchById(select, effectiveSelectedGameId);
          if (chosen) return chosen;
        }

        // Prefer an actively running game
        const { data: live, error: liveErr } = await supabase!
          .from("games")
          .select(select)
          .in("status", ["open", "open_inschrijving", "locked", "live"])
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
