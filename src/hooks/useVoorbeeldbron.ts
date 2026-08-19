/**
 * Echte cijfers uit een afgeronde koers, als voorbeeld voor een koers die nog
 * niet gereden is.
 *
 * Verzonnen percentages ogen nooit helemaal geloofwaardig: een peloton kiest
 * met uitschieters en staarten die je niet zomaar nabootst. De Tour de France
 * 2026 is uitgereden en levert een echte verdeling. We tonen die als
 * voorbeeld — met de Tour-renners erbij, want de cijfers horen bij die namen.
 *
 * Uitdrukkelijk niet Tour de France Femmes: dat is een eigen koers met een
 * eigen deelnemersveld, en "de Tour" betekent hier de mannenkoers.
 *
 * Alleen geaggregeerde cijfers (hoe vaak is renner X gekozen). Er komt geen
 * enkele deelnemersnaam uit die oude poule mee.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type VoorbeeldCategorie = {
  id: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  category_riders: Array<{ rider_id: string; riders: { id: string; name: string; start_number: number | null } | null }>;
};

export type VoorbeeldPickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
export type VoorbeeldJokerStat = { rider_id: string; joker_count: number; total_entries: number };

export type Voorbeeldbron = {
  /** Game-id van de voorbeeldkoers; queries die etappes of uitslagen nodig
   *  hebben wijzen hier in demomodus naartoe. */
  gameId: string | null;
  categorieen: VoorbeeldCategorie[];
  pickStats: VoorbeeldPickStat[];
  jokerStats: VoorbeeldJokerStat[];
  /** Naam van de koers waar de cijfers vandaan komen, voor de bijschriften. */
  koers: string | null;
};

const LEEG: Voorbeeldbron = { gameId: null, categorieen: [], pickStats: [], jokerStats: [], koers: null };

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

export function useVoorbeeldbron(actief: boolean) {
  return useQuery({
    queryKey: ["voorbeeldbron", "tour-2026"],
    enabled: Boolean(supabase) && actief,
    // Een afgeronde koers verandert niet meer.
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<Voorbeeldbron> => {
      if (!supabase) return LEEG;

      // De mannen-Tour van 2026. 'femmes' is een eigen game_type en valt hier
      // dus vanzelf buiten.
      const { data: games } = await supabase
        .from("games")
        .select("id, name, year, game_type, status")
        .in("game_type", ["tour", "tdf"])
        .eq("year", 2026)
        .limit(1);

      const game = (games ?? [])[0] as { id: string; name: string } | undefined;
      if (!game) return LEEG;

      const [catRes, pickRes, jokerRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, short_name, sort_order, category_riders(rider_id, riders(id, name, start_number))")
          .eq("game_id", game.id)
          .order("sort_order", { ascending: true }),
        (supabase as unknown as Rpc).rpc("game_pick_stats", { p_game_id: game.id }),
        (supabase as unknown as Rpc).rpc("game_joker_stats", { p_game_id: game.id }),
      ]);

      return {
        gameId: game.id,
        categorieen: (catRes.data ?? []) as unknown as VoorbeeldCategorie[],
        pickStats: (pickRes.data ?? []) as VoorbeeldPickStat[],
        jokerStats: (jokerRes.data ?? []) as VoorbeeldJokerStat[],
        koers: game.name,
      };
    },
  });
}
