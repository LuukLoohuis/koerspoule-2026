import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Radio } from "lucide-react";

/**
 * Radio Koerspoule — voorbeschouwing op de eerstvolgende (nog niet gefiatteerde)
 * etappe, in de stem van het eigen personage "Ome Gerrit van de Koers".
 * Toont alleen als er voor die etappe een (door de admin gegenereerde) tekst is.
 */
export default function RadioKoerspoule({ gameId }: { gameId?: string }) {
  const { data } = useQuery({
    queryKey: ["radio-koerspoule", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<{ tekst: string; stage_number: number } | null> => {
      if (!supabase || !gameId) return null;
      // Eerstvolgende etappe = laagste nummer dat nog niet gefiatteerd is.
      const { data: stages } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, results_status")
        .eq("game_id", gameId)
        .eq("is_gc", false)
        .order("stage_number");
      const upcoming = (stages ?? [])
        .sort((a: any, b: any) => a.stage_number - b.stage_number)
        .find((s: any) => String(s.results_status) !== "approved");
      if (!upcoming) return null;
      const { data: vb } = await (supabase as any)
        .from("etappe_voorbeschouwingen")
        .select("tekst")
        .eq("stage_id", upcoming.id)
        .maybeSingle();
      if (!vb?.tekst) return null;
      return { tekst: vb.tekst, stage_number: upcoming.stage_number };
    },
  });

  if (!data) return null;

  return (
    <div className="rounded-xl border-2 border-foreground/15 bg-card overflow-hidden shadow-sm">
      <div className="bolletjes-rule" aria-hidden />
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/50">
        <Radio className="h-4 w-4 text-primary" />
        <span className="overline-stamp text-primary">Radio Koerspoule — voorbeschouwing</span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <p className="text-sm font-serif italic leading-relaxed text-foreground/90 whitespace-pre-line">
          {data.tekst}
        </p>
        <p className="mt-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Ome Gerrit van de Koers · etappe {data.stage_number} · een eigen personage van Radio Koerspoule
        </p>
      </div>
    </div>
  );
}
