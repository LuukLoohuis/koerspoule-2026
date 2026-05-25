import { useState } from "react";
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
  profile_image_url: string | null;
  status: string | null;
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

/** Kies de eerstvolgende relevante etappe: vandaag → eerstvolgende toekomstige →
 *  anders de laagste nog niet-afgewerkte etappe. */
function pickUpcoming(stages: UpcomingStage[]): UpcomingStage | null {
  if (stages.length === 0) return null;
  const today = ymdLocal(new Date());
  const withDate = stages.filter((s) => s.date);
  const vandaag = withDate.find((s) => s.date === today);
  if (vandaag) return vandaag;
  const toekomst = withDate
    .filter((s) => (s.date as string) > today)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));
  if (toekomst.length) return toekomst[0];
  const open = stages
    .filter((s) => !["approved", "finished"].includes(String(s.status)))
    .sort((a, b) => a.stage_number - b.stage_number);
  return open[0] ?? null;
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
  const [failed, setFailed] = useState(false);

  const { data: stage } = useQuery({
    queryKey: ["voorbeschouwing-stage", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<UpcomingStage | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, name, date, stage_type, distance_km, profile_image_url, status")
        .eq("game_id", gameId)
        .eq("is_gc", false)
        .order("stage_number");
      if (error) return null;
      return pickUpcoming((data ?? []) as UpcomingStage[]);
    },
  });

  if (!stage) return null;

  const typeLabel = TYPE_LABEL[String(stage.stage_type)] ?? "Etappe";
  const wanneer = dateBadge(stage.date);
  const profielUrl = stage.profile_image_url;
  const profielOk = Boolean(profielUrl) && !failed;

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
      </div>

      {/* Profiel — full-bleed, geen wit, beslaat de volle breedte */}
      {profielOk ? (
        <img
          src={profielUrl as string}
          alt={`Profiel ${thema.etappe} ${stage.stage_number}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="block w-full h-auto"
        />
      ) : (
        <p className="px-4 pb-4 text-xs text-muted-foreground font-serif italic">
          Nog geen profiel beschikbaar voor deze {thema.etappe.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
