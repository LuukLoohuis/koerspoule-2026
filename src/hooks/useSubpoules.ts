import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type Subpoule = {
  id: string;
  game_id: string;
  name: string;
  code: string;
  owner_user_id: string;
  created_at: string;
  member_count: number;
  is_owner: boolean;
};

export function useSubpoules(gameId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const key = ["subpoules", gameId, user?.id];

  const list = useQuery({
    queryKey: key,
    enabled: Boolean(supabase && gameId && user?.id),
    queryFn: async (): Promise<Subpoule[]> => {
      if (!supabase || !gameId || !user?.id) return [];
      // RLS limits this to subpoules where user is owner or member
      const { data, error } = await supabase
        .from("subpoules")
        .select("id, game_id, name, code, owner_user_id, created_at, subpoule_members(user_id)")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        game_id: s.game_id,
        name: s.name,
        code: s.code,
        owner_user_id: s.owner_user_id,
        created_at: s.created_at,
        member_count: (s.subpoule_members as Array<{ user_id: string }> | null)?.length ?? 0,
        is_owner: s.owner_user_id === user.id,
      }));
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async ({ name, code }: { name: string; code: string }) => {
      if (!supabase || !gameId) throw new Error("Geen actieve game");
      const { data, error } = await supabase.rpc("create_subpoule", {
        p_game_id: gameId,
        p_name: name,
        p_code: code,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const join = useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const { data, error } = await supabase.rpc("join_subpoule", { p_code: code });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  const leave = useMutation({
    mutationFn: async ({ subpouleId }: { subpouleId: string }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const { error } = await supabase.rpc("leave_subpoule", { p_subpoule_id: subpouleId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async ({ subpouleId }: { subpouleId: string }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const { error } = await supabase.rpc("delete_subpoule", { p_subpoule_id: subpouleId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: async ({ subpouleId, userId }: { subpouleId: string; userId: string }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const { error } = await supabase.rpc("remove_subpoule_member", {
        p_subpoule_id: subpouleId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    ...list,
    subpoules: list.data ?? [],
    create,
    join,
    leave,
    remove,
    removeMember,
  };
}

export function useSubpouleMembers(subpouleId?: string) {
  return useQuery({
    queryKey: ["subpoule-members", subpouleId],
    enabled: Boolean(supabase && subpouleId),
    queryFn: async () => {
      if (!supabase || !subpouleId) return [];
      const { data, error } = await supabase
        .from("subpoule_members")
        .select("user_id, joined_at")
        .eq("subpoule_id", subpouleId);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ user_id: string; joined_at: string }>;
      if (rows.length === 0) return [];

      const userIds = rows.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      const nameById = new Map<string, string>();
      for (const p of (profs ?? []) as Array<{ id: string; display_name: string | null }>) {
        nameById.set(p.id, p.display_name ?? "Onbekend");
      }
      return rows.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        display_name: nameById.get(m.user_id) ?? "Onbekend",
      }));
    },
  });
}
