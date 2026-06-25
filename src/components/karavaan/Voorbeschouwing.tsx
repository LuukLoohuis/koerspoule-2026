import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useThema } from "@/contexts/ThemaContext";
import { Mountain, CalendarDays } from "lucide-react";

type UpcomingStage = {
  id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  stage_type: string | null;
  distance_km: number | null;
  results_status: string | null;
  profile_image_url: string | null;
};

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

  const { data: stage } = useQuery({
    queryKey: ["voorbeschouwing-stage", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UpcomingStage | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, name, date, stage_type, distance_km, results_status, profile_image_url")
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

  if (!stage) return null;

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

        {/* Hoogteprofiel van de etappe */}
        {stage.profile_image_url && (
          <img
            src={stage.profile_image_url}
            alt={`Hoogteprofiel etappe ${stage.stage_number}`}
            className="block w-full h-auto max-h-32 object-contain rounded-lg border border-border mt-3"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
