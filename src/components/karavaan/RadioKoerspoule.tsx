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
      // Master-schakelaar: hele rubriek uit → niets tonen, ongeacht per-etappe.
      const { data: g } = await (supabase as any)
        .from("games")
        .select("radio_koerspoule_enabled")
        .eq("id", gameId)
        .maybeSingle();
      if (g && g.radio_koerspoule_enabled === false) return null;
      // Eerstvolgende rit = de nog-niet-gefiatteerde etappe met de vroegste datum.
      // Zo toont 'ie 's ochtends de rit van vandaag en 's avonds (na fiat) die van morgen.
      const { data: stages } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, date, results_status")
        .eq("game_id", gameId)
        .eq("is_gc", false);
      const upcoming = (stages ?? [])
        .filter((s: any) => String(s.results_status) !== "approved")
        .sort((a: any, b: any) => {
          // Op datum (nulls achteraan), dan op etappenummer.
          if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : a.stage_number - b.stage_number;
          if (a.date) return -1;
          if (b.date) return 1;
          return a.stage_number - b.stage_number;
        })[0];
      if (!upcoming) return null;
      const { data: vb } = await (supabase as any)
        .from("etappe_voorbeschouwingen")
        .select("tekst, zichtbaar")
        .eq("stage_id", upcoming.id)
        .maybeSingle();
      if (!vb?.tekst || !vb?.zichtbaar) return null;
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
      </div>
    </div>
  );
}
