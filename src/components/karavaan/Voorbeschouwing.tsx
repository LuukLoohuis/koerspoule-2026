import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useThema } from "@/contexts/ThemaContext";
import { Mountain, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import StageProfile from "@/components/salle-de-course/StageProfile";
import type { StageProfileData } from "@/hooks/useResults";

type UpcomingStage = {
  id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  stage_type: string | null;
  distance_km: number | null;
  profile_image_url: string | null;
  profile_data: StageProfileData | null;
  results_status: string | null;
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
  const qc = useQueryClient();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: stage } = useQuery({
    queryKey: ["voorbeschouwing-stage", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<UpcomingStage | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await (supabase as any)
        .from("stages")
        .select("id, stage_number, name, date, stage_type, distance_km, profile_image_url, profile_data, results_status")
        .eq("game_id", gameId)
        .eq("is_gc", false)
        .order("stage_number");
      if (error) return null;
      return pickUpcoming((data ?? []) as UpcomingStage[]);
    },
  });

  // Ververs zodra een etappe wijzigt (bv. een uitslag wordt gefiatteerd) →
  // de voorbeschouwing schuift dan door naar de volgende etappe.
  useEffect(() => {
    if (!supabase || !gameId) return;
    const ch = supabase
      .channel(`voorbeschouwing-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stages", filter: `game_id=eq.${gameId}` }, () => {
        qc.invalidateQueries({ queryKey: ["voorbeschouwing-stage", gameId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [gameId, qc]);

  if (!stage) return null;

  const typeLabel = TYPE_LABEL[String(stage.stage_type)] ?? "Etappe";
  const wanneer = dateBadge(stage.date);
  const profielUrl = stage.profile_image_url;
  const profielOk = Boolean(profielUrl) && !failed;
  // Eigen render uit echte data heeft voorrang op de geüploade afbeelding.
  const hasProfileData = Array.isArray(stage.profile_data?.points) && stage.profile_data!.points!.length >= 2;

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

      {/* Profiel — eigen render uit profile_data (voorrang); anders geüploade
          afbeelding (klik om uit te vouwen); anders nette lege-staat. */}
      {hasProfileData ? (
        <div className="px-4 pb-4 pt-1">
          <StageProfile data={stage.profile_data as StageProfileData} />
        </div>
      ) : profielOk ? (
        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 104 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setOpen((o) => !o)}
          className="relative overflow-hidden cursor-pointer group select-none"
          role="button"
          aria-expanded={open}
          aria-label={open ? "Profiel inklappen" : "Profiel uitvouwen"}
        >
          <img
            src={profielUrl as string}
            alt={`Profiel ${thema.etappe} ${stage.stage_number}`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="block w-full h-auto"
          />

          {/* Ingeklapt: fade + uitnodiging om te openen */}
          {!open && (
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card via-card/80 to-transparent flex items-end justify-center pb-2 pointer-events-none">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-primary bg-card/90 rounded-full px-2.5 py-1 border border-primary/30 shadow-sm transition-transform group-hover:translate-y-[-1px]">
                <ChevronDown className="h-3 w-3" /> Toon profiel
              </span>
            </div>
          )}

          {/* Uitgeklapt: inklap-knop */}
          {open && (
            <div className="absolute right-2 bottom-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-card/90 rounded-full px-2 py-0.5 border border-border">
                <ChevronUp className="h-3 w-3" /> Inklappen
              </span>
            </div>
          )}
        </motion.div>
      ) : (
        <p className="px-4 pb-4 text-xs text-muted-foreground font-serif italic">
          Nog geen profiel beschikbaar voor deze {thema.etappe.toLowerCase()}.
        </p>
      )}
    </div>
  );
}
