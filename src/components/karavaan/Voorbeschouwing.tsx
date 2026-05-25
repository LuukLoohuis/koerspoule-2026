import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useThema } from "@/contexts/ThemaContext";
import { Mountain, CalendarDays } from "lucide-react";
import EtappeProfiel, { type ProfielData } from "@/components/karavaan/EtappeProfiel";

type UpcomingStage = {
  id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  stage_type: string | null;
  distance_km: number | null;
  profile_image_url: string | null;
  profile_data: ProfielData | null;
  status: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  vlak: "Vlakke rit",
  heuvelachtig: "Heuvelrit",
  tijdrit: "Tijdrit",
  bergop: "Bergrit",
  ploegentijdrit: "Ploegentijdrit",
};

// touretappe.nl host statische, voorspelbare profiel-URL's per koers/jaar/etappe.
const RACE_SEG: Record<string, string> = { giro: "giro", tdf: "tour", tour: "tour", vuelta: "vuelta" };

/** Leid de profiel-URL af van touretappe.nl. Null als koers/jaar onbekend. */
function touretappeProfileUrl(gameType: string | null | undefined, year: number | null | undefined, stageNumber: number): string | null {
  const seg = RACE_SEG[String(gameType)];
  if (!seg || !year) return null;
  return `https://cdn.touretappe.nl/images/${seg}/${year}/etappe-${stageNumber}-profiel.jpg`;
}

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

export default function Voorbeschouwing({
  gameId,
  gameType,
  year,
}: {
  gameId?: string;
  gameType?: string | null;
  year?: number | null;
}) {
  const { thema } = useThema();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const { data: stage } = useQuery({
    queryKey: ["voorbeschouwing-stage", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<UpcomingStage | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, name, date, stage_type, distance_km, profile_image_url, profile_data, status")
        .eq("game_id", gameId)
        .eq("is_gc", false)
        .order("stage_number");
      if (error) return null;
      return pickUpcoming((data ?? []) as UpcomingStage[]);
    },
  });

  // Bronbeeld-URL: handmatige admin-URL wint, anders afgeleid van touretappe.nl.
  const profielUrl = stage
    ? stage.profile_image_url || touretappeProfileUrl(gameType, year, stage.stage_number)
    : null;
  const heeftData = Boolean(stage?.profile_data?.punten?.length);

  // Lazy: laat het vision-model het profiel uitlezen als er nog geen data is.
  const extract = useQuery({
    queryKey: ["stage-profiel-extract", stage?.id, profielUrl],
    enabled: Boolean(supabase && stage?.id && profielUrl && !heeftData),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 0,
    queryFn: async (): Promise<ProfielData | null> => {
      if (!supabase || !stage?.id || !profielUrl) return null;
      const { data, error } = await supabase.functions.invoke("generate-stage-profile", {
        body: { stage_id: stage.id, image_url: profielUrl },
      });
      if (error) return null;
      return ((data as { profile_data?: ProfielData })?.profile_data ?? null) as ProfielData | null;
    },
  });

  if (!stage) return null;

  const typeLabel = TYPE_LABEL[String(stage.stage_type)] ?? "Etappe";
  const wanneer = dateBadge(stage.date);
  const profileData: ProfielData | null = stage.profile_data ?? extract.data ?? null;
  const profielOk = Boolean(profielUrl) && profielUrl !== failedUrl;

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

      <div className="p-4 space-y-3">
        <div>
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

        {/* Profiel: strakke AI-SVG zodra data binnen is, anders bronbeeld als fallback. */}
        {profileData ? (
          <div className="rounded-lg border border-primary/25 bg-card px-1 py-2">
            <EtappeProfiel data={profileData} />
          </div>
        ) : profielOk ? (
          <div className="overflow-hidden rounded-lg border border-primary/30 bg-white shadow-sm ring-1 ring-foreground/[0.04]">
            <img
              src={profielUrl as string}
              alt={`Profiel ${thema.etappe} ${stage.stage_number}`}
              loading="lazy"
              onError={() => setFailedUrl(profielUrl)}
              className="w-full h-28 md:h-36 object-cover object-center"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-serif italic">
            Nog geen profiel beschikbaar voor deze {thema.etappe.toLowerCase()}.
          </p>
        )}
      </div>
    </div>
  );
}
