import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type Game = {
  id: string;
  name: string;
  year: number;
  status: "draft" | "open" | "locked" | "live" | "finished";
};

export function useCurrentGame() {
  return useQuery({
    queryKey: ["current-game"],
    queryFn: async (): Promise<Game | null> => {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("games")
        .select("id, name, year, status")
        .in("status", ["open", "locked", "live"])
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Game | null) ?? null;
    },
  });
}
