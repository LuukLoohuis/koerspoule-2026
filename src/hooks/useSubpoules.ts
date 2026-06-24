import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type Subpoule = {
  id: string;
  game_id: string;
  name: string;
  code: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
  member_count: number;
  is_owner: boolean;
  banner_url: string | null;
  banner_enabled: boolean;
  requires_woonplaats: boolean;
  streek_min_deelnemers: number;
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
      const COLS_WITH_SLUG = "id, game_id, name, code, slug, banner_url, banner_enabled, requires_woonplaats, streek_min_deelnemers, owner_user_id, created_at, subpoule_members(user_id)";
      const COLS_NO_SLUG = "id, game_id, name, code, requires_woonplaats, streek_min_deelnemers, owner_user_id, created_at, subpoule_members(user_id)";
      // RLS limits this to subpoules where user is owner or member.
      let { data, error } = await supabase
        .from("subpoules")
        .select(COLS_WITH_SLUG)
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });
      // Robuust: als de slug-migratie nog niet is toegepast (kolom bestaat niet,
      // PostgREST 42703) val terug op een select zonder slug, zodat de lijst +
      // join blijven werken. Slug wordt dan leeg gelaten.
      if (error && (error.code === "42703" || /slug/i.test(error.message ?? ""))) {
        const retry = await supabase
          .from("subpoules")
          .select(COLS_NO_SLUG)
          .eq("game_id", gameId)
          .order("created_at", { ascending: true });
        data = retry.data as typeof data;
        error = retry.error;
      }
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        game_id: s.game_id,
        name: s.name,
        code: s.code,
        slug: (s as { slug?: string }).slug ?? "",
        owner_user_id: s.owner_user_id,
        created_at: s.created_at,
        member_count: (s.subpoule_members as Array<{ user_id: string }> | null)?.length ?? 0,
        is_owner: s.owner_user_id === user.id,
        banner_url: (s as { banner_url?: string | null }).banner_url ?? null,
        banner_enabled: (s as { banner_enabled?: boolean }).banner_enabled ?? true,
        requires_woonplaats: (s as { requires_woonplaats?: boolean }).requires_woonplaats ?? false,
        streek_min_deelnemers: (s as { streek_min_deelnemers?: number }).streek_min_deelnemers ?? 50,
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
    mutationFn: async ({ code, woonplaats, allowEmpty }: { code: string; woonplaats?: string; allowEmpty?: boolean }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const wp = woonplaats?.trim();
      const { data, error } = await supabase.rpc("join_subpoule", {
        p_code: code,
        p_woonplaats: wp ? wp : null,
        p_allow_empty: allowEmpty ?? false,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidate,
  });

  // Eigen woonplaats achteraf zetten/bijwerken (alleen subpoules die 't vragen).
  // Lege invoer = null (verwijdert woonplaats). Invalideer ook de ledenlijst zodat
  // ranking/streekklassement/filter direct meeschuiven.
  const setWoonplaats = useMutation({
    mutationFn: async ({ subpouleId, woonplaats }: { subpouleId: string; woonplaats: string }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const { error } = await supabase.rpc("set_my_subpoule_woonplaats", {
        p_subpoule_id: subpouleId,
        p_woonplaats: woonplaats,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { subpouleId }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["subpoule-members", subpouleId] });
    },
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

  const transferOwnership = useMutation({
    mutationFn: async ({ subpouleId, newOwnerId }: { subpouleId: string; newOwnerId: string }) => {
      if (!supabase) throw new Error("Geen verbinding");
      const { error } = await supabase.rpc("transfer_subpoule_ownership", {
        p_subpoule_id: subpouleId,
        p_new_owner: newOwnerId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { subpouleId }) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["subpoule-members", subpouleId] });
    },
  });

  return {
    ...list,
    subpoules: list.data ?? [],
    create,
    join,
    leave,
    remove,
    removeMember,
    transferOwnership,
    setWoonplaats,
  };
}

export function useSubpouleMembers(subpouleId?: string) {
  return useQuery({
    queryKey: ["subpoule-members", subpouleId],
    enabled: Boolean(supabase && subpouleId),
    queryFn: async () => {
      if (!supabase || !subpouleId) return [];
      // SECURITY DEFINER-RPC: leden + display_name + teamnaam in deze game.
      // entries.team_name is via RLS niet voor andere leden leesbaar; de RPC
      // gate't op subpoule-lidmaatschap en geeft alleen display_name + team_name.
      const { data, error } = await supabase.rpc("subpoule_members_with_team", {
        p_subpoule_id: subpouleId,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        user_id: string;
        joined_at: string;
        display_name: string | null;
        team_name: string | null;
        woonplaats: string | null;
      }>;
      return rows.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        display_name: m.display_name ?? "Onbekend",
        team_name: m.team_name ?? null,
        woonplaats: m.woonplaats ?? null,
      }));
    },
  });
}
