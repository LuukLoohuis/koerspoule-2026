import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PredictionEntry = {
  classification: string; // 'gc' | 'points' | 'kom' | 'youth'
  position: number;
  rider_id: string;
};

export type SubpouleEntry = {
  user_id: string;
  display_name: string;
  entry_id: string | null;
  team_name: string | null;
  total_points: number;
  picks: Map<string, string[]>; // category_id → rider_ids
  jokers: Set<string>;
  predictions: PredictionEntry[];
};

export type SubpouleEntriesData = {
  entries: SubpouleEntry[];
  ridersById: Map<string, { name: string; team: string | null }>;
};

type SubpouleEntryDetailRow = {
  user_id: string;
  display_name: string | null;
  entry_id: string | null;
  team_name: string | null;
  total_points: number | null;
  picks: Array<{ category_id: string; rider_id: string }> | null;
  jokers: Array<{ rider_id: string }> | null;
  predictions: Array<{ classification: string; position: number; rider_id: string }> | null;
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

      const { data: rowsData, error } = await (supabase as any).rpc("subpoule_entries_detail", {
        p_subpoule_id: subpouleId,
        p_game_id: gameId,
      });
      if (error) throw error;

      const rows = (rowsData ?? []) as SubpouleEntryDetailRow[];
      if (rows.length === 0) return { entries: [], ridersById: new Map() };

      const entries: SubpouleEntry[] = rows.map((r) => {
        const picks = new Map<string, string[]>();
        const jokers = new Set<string>();
        for (const p of r.picks ?? []) {
          const existing = picks.get(p.category_id) ?? [];
          picks.set(p.category_id, [...existing, p.rider_id]);
        }
        for (const j of r.jokers ?? []) jokers.add(j.rider_id);
        return {
          user_id: r.user_id,
          display_name: r.display_name ?? "Onbekend",
          entry_id: r.entry_id,
          team_name: r.team_name,
          total_points: r.total_points ?? 0,
          picks,
          jokers,
          predictions: (r.predictions ?? []) as PredictionEntry[],
        };
      });

      // 3. Rider names (1 query)
      const riderIds = new Set<string>();
      for (const e of entries) {
        for (const ids of e.picks.values()) {
          for (const id of ids) riderIds.add(id);
        }
        for (const id of e.jokers) riderIds.add(id);
        for (const p of e.predictions) riderIds.add(p.rider_id);
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
