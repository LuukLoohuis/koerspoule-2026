import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SubpouleEntry = {
  user_id: string;
  display_name: string;
  entry_id: string | null;
  team_name: string | null;
  total_points: number;
  picks: Map<string, string>; // category_id → rider_id
  jokers: Set<string>;
};

export type SubpouleEntriesData = {
  entries: SubpouleEntry[];
  ridersById: Map<string, { name: string; team: string | null }>;
};

/**
 * One-shot read of all picks/jokers for every member of a subpoule.
 * Cached aggressively (no realtime, no polling) — entries don't change after deadline.
 */
export function useSubpouleEntries(subpouleId?: string, gameId?: string) {
  return useQuery({
    queryKey: ["subpoule-entries", subpouleId, gameId],
    enabled: Boolean(supabase && subpouleId && gameId),
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async (): Promise<SubpouleEntriesData> => {
      if (!supabase || !subpouleId || !gameId) {
        return { entries: [], ridersById: new Map() };
      }

      // 1. Members + profile names
      const { data: members, error: mErr } = await supabase
        .from("subpoule_members")
        .select("user_id, profiles:user_id(display_name)")
        .eq("subpoule_id", subpouleId);
      if (mErr) throw mErr;

      const userIds = (members ?? []).map((m) => m.user_id);
      if (userIds.length === 0) return { entries: [], ridersById: new Map() };

      // 2. Entries + nested picks + jokers (1 query)
      const { data: entryRows, error: eErr } = await supabase
        .from("entries")
        .select("id, user_id, team_name, total_points, entry_picks(category_id, rider_id), entry_jokers(rider_id)")
        .eq("game_id", gameId)
        .in("user_id", userIds);
      if (eErr) throw eErr;

      type Row = {
        id: string;
        user_id: string;
        team_name: string | null;
        total_points: number;
        entry_picks: Array<{ category_id: string; rider_id: string }> | null;
        entry_jokers: Array<{ rider_id: string }> | null;
      };
      const rows = (entryRows ?? []) as Row[];

      const entries: SubpouleEntry[] = (members ?? []).map((m) => {
        const r = rows.find((x) => x.user_id === m.user_id);
        const picks = new Map<string, string>();
        const jokers = new Set<string>();
        if (r) {
          for (const p of r.entry_picks ?? []) picks.set(p.category_id, p.rider_id);
          for (const j of r.entry_jokers ?? []) jokers.add(j.rider_id);
        }
        const profile = (m as { profiles?: { display_name?: string | null } | null }).profiles;
        return {
          user_id: m.user_id,
          display_name: profile?.display_name ?? "Onbekend",
          entry_id: r?.id ?? null,
          team_name: r?.team_name ?? null,
          total_points: r?.total_points ?? 0,
          picks,
          jokers,
        };
      });

      // 3. Rider names (1 query)
      const riderIds = new Set<string>();
      for (const e of entries) {
        for (const id of e.picks.values()) riderIds.add(id);
        for (const id of e.jokers) riderIds.add(id);
      }
      const ridersById = new Map<string, { name: string; team: string | null }>();
      if (riderIds.size > 0) {
        const { data: rs } = await supabase
          .from("riders")
          .select("id, name, team")
          .in("id", Array.from(riderIds));
        for (const r of (rs ?? []) as Array<{ id: string; name: string; team: string | null }>) {
          ridersById.set(r.id, { name: r.name, team: r.team });
        }
      }

      return { entries, ridersById };
    },
  });
}
