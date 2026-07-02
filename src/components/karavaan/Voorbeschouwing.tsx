import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useThema } from "@/contexts/ThemaContext";
import { Mountain, CalendarDays, ExternalLink, Map as MapIcon, ChevronDown, ChevronUp } from "lucide-react";

type UpcomingStage = {
  id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  stage_type: string | null;
  distance_km: number | null;
  results_status: string | null;
};

// Interactief 3D-etappeprofiel (tourview). Lazy: iframe pas na klik laden.
const TOURVIEW_BASE = "https://tourview.pages.dev/tdf2026/stage-";

const TYPE_LABEL: Record<string, string> = {
  vlak: "Vlakke rit",
  heuvelachtig: "Heuvelrit",
  tijdrit: "Tijdrit",
  bergop: "Bergrit",
  ploegentijdrit: "Ploegentijdrit",
};

function ymdLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Eerstvolgende etappe = laagste etappenummer dat nog NIET gefiatteerd is.
 *  Zodra een uitslag gefiatteerd is, schuift de voorbeschouwing door naar de
 *  volgende. Alles gefiatteerd → niets meer te voorbeschouwen. */
function pickUpcoming(stages: UpcomingStage[]): UpcomingStage | null {
  if (stages.length === 0) return null;
  const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number);
  return sorted.find((s) => String(s.results_status) !== "approved") ?? null;
}

function dateBadge(date: string | null): string | null {
  if (!date) return null;
  const today = ymdLocal(new Date());
  const tomorrow = ymdLocal(new Date(Date.now() + 86400000));
  if (date === today) return "Vandaag";
  if (date === tomorrow) return "Morgen";
  try {
    return new Date(date + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return date;
  }
}

export default function Voorbeschouwing({ gameId }: { gameId?: string }) {
  const { thema } = useThema();
  const [showProfiel, setShowProfiel] = useState(false);

  // Sectie staat default uit; admin zet 'm per game aan in Etappes.
  const { data: enabled } = useQuery({
    queryKey: ["voorbeschouwing-enabled", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      if (!supabase || !gameId) return false;
      const { data } = await (supabase as any)
        .from("games")
        .select("voorbeschouwing_visible")
        .eq("id", gameId)
        .maybeSingle();
      return Boolean(data?.voorbeschouwing_visible);
    },
  });

  const { data: stage } = useQuery({
    queryKey: ["voorbeschouwing-stage", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UpcomingStage | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, name, date, stage_type, distance_km, results_status")
        .eq("game_id", gameId)
        .eq("is_gc", false)
        .order("stage_number");
      if (error) return null;
      return pickUpcoming((data ?? []) as UpcomingStage[]);
    },
  });

  // Geen realtime-subscription: `stages` staat niet in de realtime-publicatie, dus
  // een postgres_changes-channel ving toch niks. De query ververst bij focus/remount
  // (staleTime), zodat de voorbeschouwing na een fiat bij de volgende load doorschuift.

  // Nieuwe etappe → profiel weer inklappen (anders blijft de iframe van de
  // vorige etappe hangen).
  useEffect(() => {
    setShowProfiel(false);
  }, [stage?.stage_number]);

  if (!enabled || !stage) return null;

  const typeLabel = TYPE_LABEL[String(stage.stage_type)] ?? "Etappe";
  const wanneer = dateBadge(stage.date);

  return (
    <div className="rounded-xl border-2 border-foreground/15 bg-card overflow-hidden shadow-sm">
      {/* Thema-band — bolletjes (Tour/Vuelta) of accent (Giro) */}
      <div className="bolletjes-rule" aria-hidden />
      {/* Krant-kop */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="overline-stamp text-primary">De Voorbeschouwing</span>
        </div>
        {wanneer && (
          <span className="text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary rounded px-2 py-0.5">
            {wanneer}
          </span>
        )}
      </div>

      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {thema.etappe} {stage.stage_number}
        </p>
        <h3 className="font-display font-bold text-lg leading-tight">
          {stage.name?.trim() || `Etappe ${stage.stage_number}`}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mountain className="h-3 w-3" />{typeLabel}
          </span>
          {stage.distance_km != null && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono tabular-nums">{stage.distance_km} km</span>
            </>
          )}
        </div>

        {/* Interactief 3D-profiel (tourview) — lazy: iframe pas na klik, met
            open-op-tourview-link als terugval mocht embedden ooit blokkeren. */}
        {stage.stage_number != null && (
          <div className="mt-3">
            {!showProfiel ? (
              <button
                type="button"
                onClick={() => setShowProfiel(true)}
                aria-expanded={false}
                className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.06] px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--vintage-gold))/0.12]"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <MapIcon className="w-4 h-4 shrink-0 text-[hsl(var(--vintage-gold))]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-display font-semibold text-[hsl(var(--vintage-gold))]">Bekijk het 3D-profiel</span>
                    <span className="block text-[11px] text-muted-foreground">Interactieve kaart met hoogteprofiel</span>
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-[hsl(var(--vintage-gold))]" />
              </button>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowProfiel(false)}
                  aria-expanded={true}
                  className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.06] px-3 py-1.5 text-left transition-colors hover:bg-[hsl(var(--vintage-gold))/0.12]"
                >
                  <span className="flex items-center gap-2 text-sm font-display font-semibold text-[hsl(var(--vintage-gold))]">
                    <MapIcon className="w-4 h-4 shrink-0" /> 3D-profiel
                  </span>
                  <ChevronUp className="w-4 h-4 shrink-0 text-[hsl(var(--vintage-gold))]" />
                </button>
                <div className="relative w-full overflow-hidden rounded-lg border border-[hsl(var(--vintage-sepia)/0.4)]" style={{ height: 240 }}>
                  <iframe
                    src={`${TOURVIEW_BASE}${stage.stage_number}`}
                    title={`3D-profiel etappe ${stage.stage_number}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }}
                  />
                </div>
                <a
                  href={`${TOURVIEW_BASE}${stage.stage_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:underline"
                >
                  Werkt het profiel niet? Open op tourview <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
