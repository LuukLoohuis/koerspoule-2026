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
  enabled: boolean,
) {
  // Cache-key: niet alle input meenemen (dan invalideert bij elk klein verschil),
  // maar wel score (afgerond) + kernlocatie + recent-totalen, zodat updates wel triggeren.
  const cacheKey = input
    ? [
        "lefevere-report",
        Math.round(input.score * 10) / 10,
        input.stage?.nummer ?? null,
        input.components.poolRanking.rang,
        input.components.monkeyVergelijking.percentageVerslagen,
        input.horsCategorieScores?.emirates?.percentage ?? null,
      ]
    : ["lefevere-report", "noop"];

  return useQuery({
    queryKey: cacheKey,
    enabled: Boolean(supabase && enabled && input),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<LefevereReportResult> => {
      if (!supabase || !input) throw new Error("no input");
      const { data, error } = await supabase.functions.invoke("generate-lefevere-report", {
        body: input,
      });
      if (error) {
        let detail = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try { const body = await ctx.text(); if (body) detail = body; } catch { /* keep */ }
        }
        throw new Error(detail);
      }
      const result = data as { directeursAnalyse?: string; ploegKarakterisering?: string };
      if (typeof result?.directeursAnalyse !== "string" || typeof result?.ploegKarakterisering !== "string") {
        throw new Error("Onverwacht antwoord van generator");
      }
      return {
        directeursAnalyse: result.directeursAnalyse,
        ploegKarakterisering: result.ploegKarakterisering,
      };
    },
  });
}
