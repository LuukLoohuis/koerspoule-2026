import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Stage } from "@/types/tourStage";

const TABLE = "tour_stage_cards";

/** Alle etappe-kaarten, oplopend op etappenummer. */
export async function getAllStages(): Promise<Stage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLE).select("*").order("stage", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Stage[];
}

/** Eén etappe-kaart op etappenummer. */
export async function getStageByNumber(n: number): Promise<Stage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select("*").eq("stage", n).maybeSingle();
  if (error) throw error;
  return (data as Stage | null) ?? null;
}

// React Query-hooks (zelfde patroon als de overige data-hooks).
export function useTourStages() {
  return useQuery({ queryKey: ["tour-stage-cards"], queryFn: getAllStages, staleTime: 5 * 60 * 1000 });
}

export function useTourStage(n: number | undefined) {
  return useQuery({
    queryKey: ["tour-stage-card", n],
    enabled: typeof n === "number" && !Number.isNaN(n),
    queryFn: () => getStageByNumber(n as number),
    staleTime: 5 * 60 * 1000,
  });
}
