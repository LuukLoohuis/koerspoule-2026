import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ChatPollRow, ChatPollVoteRow } from "@/hooks/useChatRealtime";

// ── Rubriek item (DB row) ─────────────────────────────────────────────────────

export type RubriekItem = {
  id: string;
  game_id: string;
  type: "text" | "poll";
  content: string | null;
  question: string | null;
  options: string[] | null;   // jsonb array, same shape as chat_polls.options
  deadline: string | null;
  is_active: boolean;
  created_at: string;
};

// ── Helper: map RubriekItem → ChatPollRow so PollCard can be reused as-is ─────

export function toPollRow(item: RubriekItem): ChatPollRow {
  return {
    id: item.id,
    subpoule_id: "",               // not used by PollCard
    message_id: null,
    question: item.question ?? "",
    options: item.options ?? [],
    deadline: item.deadline,
    created_by: "",
    created_at: item.created_at,
  };
}

// ── Helper: map rubriek_votes row → ChatPollVoteRow ───────────────────────────

export type RubriekVoteRow = {
  rubriek_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
};

export function toVoteRow(v: RubriekVoteRow): ChatPollVoteRow {
  return {
    poll_id: v.rubriek_id,
    user_id: v.user_id,
    option_index: v.option_index,
    created_at: v.created_at,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useActiveRubriek(gameId?: string) {
  return useQuery({
    queryKey: ["active-rubriek", gameId],
    enabled: Boolean(gameId),
    staleTime: 30_000,
    queryFn: async (): Promise<RubriekItem | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await supabase
        .from("rubriek_items")
        .select("id, game_id, type, content, question, options, deadline, is_active, created_at")
        .eq("game_id", gameId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as RubriekItem | null);
    },
  });
}

export function useRubriekVotes(rubriekId?: string) {
  return useQuery({
    queryKey: ["rubriek-votes", rubriekId],
    enabled: Boolean(rubriekId),
    staleTime: 15_000,
    queryFn: async (): Promise<ChatPollVoteRow[]> => {
      if (!supabase || !rubriekId) return [];
      const { data, error } = await supabase
        .from("rubriek_votes")
        .select("rubriek_id, user_id, option_index, created_at")
        .eq("rubriek_id", rubriekId);
      if (error) throw error;
      return (data as RubriekVoteRow[]).map(toVoteRow);
    },
  });
}

// Admin: all items for a game
export function useAllRubriekItems(gameId?: string) {
  return useQuery({
    queryKey: ["rubriek-items-admin", gameId],
    enabled: Boolean(gameId),
    staleTime: 0,
    queryFn: async (): Promise<RubriekItem[]> => {
      if (!supabase || !gameId) return [];
      const { data, error } = await supabase
        .from("rubriek_items")
        .select("id, game_id, type, content, question, options, deadline, is_active, created_at")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RubriekItem[];
    },
  });
}

// ── Vote mutation (SECURITY DEFINER RPC, mirrors cast_chat_poll_vote) ─────────

export function useRubriekVoteMutation() {
  const qc = useQueryClient();
  return async (rubriekId: string, optionIndex: number): Promise<void> => {
    if (!supabase) throw new Error("Supabase niet beschikbaar");
    const { error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
    }).rpc("cast_rubriek_vote", {
      p_rubriek_id: rubriekId,
      p_option_index: optionIndex,
    });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["rubriek-votes", rubriekId] });
  };
}
