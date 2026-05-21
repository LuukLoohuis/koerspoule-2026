import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type StageCommentary = {
  id: string;
  stage_id: string;
  subpoule_id: string;
  michel_tekst: string;
  jose_tekst: string;
  generated_at: string;
  stage_number: number;
  stage_name: string | null;
};

/**
 * Haalt alle Wuyts/De Cauwer-commentaren op voor een subpoule, gesorteerd
 * van nieuwste etappe naar oudste. Realtime — luistert op INSERT/UPDATE op
 * `etappe_commentaren` voor deze subpoule.
 */
export function useStageCommentary(subpouleId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["stage-commentary", subpouleId],
    enabled: Boolean(supabase && subpouleId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<StageCommentary[]> => {
      if (!supabase || !subpouleId) return [];
      // Cast: types zijn niet geregenereerd na de migratie voor etappe_commentaren.
      const { data, error } = await (supabase as any)
        .from("etappe_commentaren")
        .select("id, stage_id, subpoule_id, michel_tekst, jose_tekst, generated_at, stages!inner(stage_number, name)")
        .eq("subpoule_id", subpouleId)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<{
        id: string;
        stage_id: string;
        subpoule_id: string;
        michel_tekst: string;
        jose_tekst: string;
        generated_at: string;
        stages: { stage_number: number; name: string | null };
      }>;
      return rows
        .map((r) => ({
          id: r.id,
          stage_id: r.stage_id,
          subpoule_id: r.subpoule_id,
          michel_tekst: r.michel_tekst,
          jose_tekst: r.jose_tekst,
          generated_at: r.generated_at,
          stage_number: r.stages.stage_number,
          stage_name: r.stages.name,
        }))
        .sort((a, b) => b.stage_number - a.stage_number);
    },
  });

  // Realtime: ververs cache bij nieuwe/gewijzigde commentaren
  useEffect(() => {
    if (!supabase || !subpouleId) return;
    const channel = supabase
      .channel(`etappe-commentaren-${subpouleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "etappe_commentaren", filter: `subpoule_id=eq.${subpouleId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["stage-commentary", subpouleId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [subpouleId, qc]);

  return query;
}
