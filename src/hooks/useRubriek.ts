import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type RubriekOption = {
  id: string;
  text: string;
  sort_order: number;
};

export type RubriekItem = {
  id: string;
  game_id: string;
  type: "text" | "poll";
  content: string | null;
  question: string | null;
  is_active: boolean;
  created_at: string;
  options: RubriekOption[];
};

// ── Active item for De Courant ────────────────────────────────────────────────

export function useActiveRubriek(gameId?: string) {
  return useQuery({
    queryKey: ["active-rubriek", gameId],
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async (): Promise<RubriekItem | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await supabase
        .from("rubriek_items")
        .select("id, game_id, type, content, question, is_active, created_at, rubriek_options(id, text, sort_order)")
        .eq("game_id", gameId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const options = ((data as Record<string, unknown>).rubriek_options as RubriekOption[] ?? []);
      return {
        ...(data as Omit<RubriekItem, "options">),
        options: [...options].sort((a, b) => a.sort_order - b.sort_order),
      } as RubriekItem;
    },
  });
}

// ── Vote counts for a rubriek (public, keyed by option_id) ───────────────────

export function useRubriekVoteCounts(rubriekId?: string) {
  return useQuery({
    queryKey: ["rubriek-votes", rubriekId],
    enabled: Boolean(rubriekId),
    staleTime: 15_000,
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || !rubriekId) return new Map();
      const { data, error } = await supabase
        .from("rubriek_votes")
        .select("option_id")
        .eq("rubriek_id", rubriekId);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        counts.set(row.option_id, (counts.get(row.option_id) ?? 0) + 1);
      }
      return counts;
    },
  });
}

// ── Which option the current user has voted for (null = not voted) ────────────

export function useMyRubriekVote(rubriekId?: string, userId?: string) {
  return useQuery({
    queryKey: ["my-rubriek-vote", rubriekId, userId],
    enabled: Boolean(rubriekId && userId),
    staleTime: 60_000,
    queryFn: async (): Promise<string | null> => {
      if (!supabase || !rubriekId || !userId) return null;
      const { data, error } = await supabase
        .from("rubriek_votes")
        .select("option_id")
        .eq("rubriek_id", rubriekId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data as { option_id: string } | null)?.option_id ?? null;
    },
  });
}

// ── Admin: all items for a game ───────────────────────────────────────────────

export function useAllRubriekItems(gameId?: string) {
  return useQuery({
    queryKey: ["rubriek-items-admin", gameId],
    enabled: Boolean(gameId),
    staleTime: 0,
    queryFn: async (): Promise<RubriekItem[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("rubriek_items")
        .select("id, game_id, type, content, question, is_active, created_at, rubriek_options(id, text, sort_order)")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((item) => ({
        ...(item as Omit<RubriekItem, "options">),
        options: [...((item.rubriek_options as RubriekOption[]) ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      })) as RubriekItem[];
    },
  });
}

// ── Vote mutation (uses RPC to enforce one-vote-per-user atomically) ──────────

export function useRubriekVoteMutation() {
  const qc = useQueryClient();
  return async (rubriekId: string, optionId: string): Promise<"ok" | "already_voted" | "error"> => {
    if (!supabase) return "error";
    const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, string>) => Promise<{ data: { success: boolean; error?: string } | null; error: unknown }> })
      .rpc("cast_rubriek_vote", { p_rubriek_id: rubriekId, p_option_id: optionId });
    if (error) return "error";
    if (!data?.success) {
      return data?.error === "already_voted" ? "already_voted" : "error";
    }
    await qc.invalidateQueries({ queryKey: ["rubriek-votes", rubriekId] });
    await qc.invalidateQueries({ queryKey: ["my-rubriek-vote", rubriekId] });
    return "ok";
  };
}
