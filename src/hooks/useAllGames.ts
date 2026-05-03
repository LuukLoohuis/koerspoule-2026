import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type GameRow = {
  id: string;
  name: string;
  year: number;
  status: "draft" | "open" | "locked" | "live" | "finished" | string;
  game_type: "giro" | "tour" | "vuelta" | string | null;
};

export function useAllGames() {
  return useQuery({
    queryKey: ["all-games"],
    queryFn: async (): Promise<GameRow[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("games")
        .select("id, name, year, status, game_type")
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GameRow[];
    },
  });
}

export function gameTheme(type: string | null | undefined): {
  country: "IT" | "FR" | "ES";
  colors: string[];
} {
  switch ((type ?? "").toLowerCase()) {
    case "tour":
      return { country: "FR", colors: ["#002395", "#ffffff", "#ED2939"] };
    case "vuelta":
      return { country: "ES", colors: ["#AA151B", "#F1BF00", "#AA151B"] };
    case "giro":
    default:
      return { country: "IT", colors: ["#009246", "#ffffff", "#CE2B37"] };
  }
}
