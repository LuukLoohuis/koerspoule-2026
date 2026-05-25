import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type LefevereReportInput = {
  score: number;
  components: {
    poolRanking: { score: number; weging: 0.5; rang: number; totaalDeelnemers: number };
    monkeyVergelijking: { score: number; weging: 0.3; percentageVerslagen: number };
    jokerPrestatie: { score: number; weging: 0.2; aantalJokers: number };
  };
  stage?: { nummer?: number; beschrijving?: string; type?: string };
  deelnemer?: { ploegnaam?: string };
  etappePrestatie?: {
    dagPositie?: number;
    dagPunten?: number;
    gescoordeRenners?: string[];
    gemistRenners?: string[];
    jokerRenners?: string[];
    jokerResultaat?: "gescoord" | "gemist" | "gedeeltelijk";
  };
  horsCategorieScores?: {
    emirates?: { percentage: number; droomploegPunten: number; jouwPunten: number };
    monkeyIQ?: { score: number; interpretatie: "genie" | "slim" | "gemiddeld" | "aap" };
  };
  // Variatie-guard: recente eigen rapporten (laatste etappes) om herhaling te vermijden.
  recenteAnalyses?: string[];
  recenteKarakteriseringen?: string[];
};

export type LefevereReportResult = {
  directeursAnalyse: string;
  ploegKarakterisering: string;
};

/**
 * useLefevereReport — roept de Supabase edge function `generate-lefevere-report`
 * aan met de huidige rapport-context en cachet het resultaat (5 min) op een
 * key die afgeleid is van het cijfer + voornaamste context. Bij significante
 * wijziging van de score regenereert het rapport.
 *
 * `enabled` controle vanuit de caller. Faalt 't — caller toont fallback.
 */
export function useLefevereReport(
  input: LefevereReportInput | null,
  opts: { entryId?: string; stageCount?: number; enabled: boolean },
) {
  const { entryId, stageCount, enabled } = opts;

  // Cache-key op (entry, aantal gefiatteerde etappes). De DB persisteert het
  // rapport per dat tweetal, dus we genereren pas opnieuw als er een etappe
  // bijkomt (stageCount verandert). React Query dedupet binnen de sessie.
  const canRun = Boolean(supabase && enabled && input && entryId && typeof stageCount === "number" && stageCount > 0);

  return useQuery({
    queryKey: ["lefevere-report", entryId ?? "noentry", stageCount ?? 0],
    enabled: canRun,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<LefevereReportResult> => {
      if (!supabase || !input || !entryId || typeof stageCount !== "number") throw new Error("no input");

      // 1) Probeer uit de DB-cache te lezen — geen LLM-call nodig als 't er staat
      //    én het opgeslagen cijfer overeenkomt met het huidige (zelf-herstel:
      //    een rij die tijdens het laden met een fout cijfer is opgeslagen wordt
      //    zo opnieuw gegenereerd en overschreven).
      const { data: cached } = await (supabase as any)
        .from("lefevere_rapporten")
        .select("directeurs_analyse, ploeg_karakterisering, score")
        .eq("entry_id", entryId)
        .eq("stage_count", stageCount)
        .maybeSingle();
      const cachedScoreMatches =
        cached && cached.score != null &&
        Math.round(Number(cached.score) * 10) === Math.round(input.score * 10);
      if (cached?.directeurs_analyse && cachedScoreMatches) {
        return {
          directeursAnalyse: cached.directeurs_analyse as string,
          ploegKarakterisering: (cached.ploeg_karakterisering as string) ?? "",
        };
      }

      // 2) Niet in cache → genereer via de edge function. Eerst de laatste paar
      //    eigen rapporten ophalen (lagere stage_count) zodat de generator
      //    herhaling van openingen/boutades kan vermijden (variatie-guard).
      let recenteAnalyses: string[] = [];
      let recenteKarakteriseringen: string[] = [];
      const { data: recent } = await (supabase as any)
        .from("lefevere_rapporten")
        .select("directeurs_analyse, ploeg_karakterisering, stage_count")
        .eq("entry_id", entryId)
        .lt("stage_count", stageCount)
        .order("stage_count", { ascending: false })
        .limit(5);
      if (Array.isArray(recent)) {
        recenteAnalyses = recent.map((r: any) => r.directeurs_analyse).filter(Boolean);
        recenteKarakteriseringen = recent.map((r: any) => r.ploeg_karakterisering).filter(Boolean);
      }

      const { data, error } = await supabase.functions.invoke("generate-lefevere-report", {
        body: { ...input, recenteAnalyses, recenteKarakteriseringen },
      });
      if (error) {
        let detail = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try { const body = await ctx.text(); if (body) detail = body; } catch { /* keep */ }
        }
        throw new Error(detail);
      }
      const result = data as { directeursAnalyse?: string; ploegKarakterisering?: string; model?: string };
      if (typeof result?.directeursAnalyse !== "string" || typeof result?.ploegKarakterisering !== "string") {
        throw new Error("Onverwacht antwoord van generator");
      }

      // 3) Sla op in de DB-cache; overschrijf een bestaande (mogelijk foute) rij
      //    op dezelfde (entry, stage_count)-sleutel.
      await (supabase as any)
        .from("lefevere_rapporten")
        .upsert(
          {
            entry_id: entryId,
            stage_count: stageCount,
            directeurs_analyse: result.directeursAnalyse,
            ploeg_karakterisering: result.ploegKarakterisering,
            score: input.score,
            model: result.model ?? null,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "entry_id,stage_count" },
        );

      return {
        directeursAnalyse: result.directeursAnalyse,
        ploegKarakterisering: result.ploegKarakterisering,
      };
    },
  });
}
