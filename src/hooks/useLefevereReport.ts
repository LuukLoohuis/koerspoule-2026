import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type LefevereReportInput = {
  score: number;
  components: {
    poolRanking: { score: number; weging: number; rang: number; totaalDeelnemers: number };
    monkeyVergelijking: { score: number; weging: number; percentageVerslagen: number };
    jokerPrestatie: { score: number; weging: number; aantalJokers: number };
    differentiaal?: { score: number; weging: number };
  };
  // Pech-index: eigen renners die zijn uitgevallen (DNF) — alleen voor de tekst.
  pech?: { uitvallers: number; namen: string[] };
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
 * useLefeverePreview — éénmalig, gedeeld Patlef-voorproefje per game (sneak
 * preview, status 'open'). De edge function leest/schrijft lefevere_preview
 * server-side met de service-role: één generatie per game, daarna voor iedereen
 * uit de cache. React Query dedupet binnen de sessie → geen per-bezoeker-calls.
 */
export function useLefeverePreview(gameId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["lefevere-preview", gameId ?? "nogame"],
    enabled: Boolean(supabase && enabled && gameId),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<LefevereReportResult> => {
      if (!supabase || !gameId) throw new Error("no game");
      const { data, error } = await supabase.functions.invoke("generate-lefevere-report", {
        body: { preview: true, gameId },
      });
      if (error) throw error;
      const r = data as { directeursAnalyse?: string; ploegKarakterisering?: string };
      if (typeof r?.directeursAnalyse !== "string") throw new Error("Onverwacht antwoord");
      return {
        directeursAnalyse: r.directeursAnalyse,
        ploegKarakterisering: r.ploegKarakterisering ?? "",
      };
    },
  });
}

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

      // ALLEEN uit de DB-cache lezen. Genereren gebeurt uitsluitend via de
      // admin-knop "Genereer Lefevère (alle deelnemers)" in het Fiatteren-tabje
      // (bewust: geen automatische/per-bezoeker OpenAI-calls meer — dat liet de
      // teller "vanzelf" oplopen en kost per bezoeker geld). Geen rij voor deze
      // stand → nette fout; de caller toont zijn fallback ("rapport volgt").
      const { data: cached } = await (supabase as any)
        .from("lefevere_rapporten")
        .select("directeurs_analyse, ploeg_karakterisering")
        .eq("entry_id", entryId)
        .eq("stage_count", stageCount)
        .maybeSingle();
      if (cached?.directeurs_analyse) {
        return {
          directeursAnalyse: cached.directeurs_analyse as string,
          ploegKarakterisering: (cached.ploeg_karakterisering as string) ?? "",
        };
      }
      throw new Error("Rapport is nog niet gegenereerd — de organisatie maakt het na de etappe aan.");
    },
  });
}
