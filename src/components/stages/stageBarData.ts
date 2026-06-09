// Gedeelde helpers om StageBar-props te bouwen uit onze Supabase-stages.
// Gebruikt door zowel de Uitslagen-tab (ResultsView) als de subpoule-grafiek
// (SubpouleStandings), zodat de etappe-bar er overal IDENTIEK uitziet.

import type { Stage as StageBarStage } from "@/components/stages/StageBar";
import type { StageType as StageBarType } from "@/components/stages/StageIcons";

/** Minimale stage-vorm die we nodig hebben (subset van StageRow). */
export type StageBarSourceRow = {
  id: string;
  stage_number: number;
  stage_type: string | null;
  distance_km: number | null;
  is_gc: boolean;
};

/** Map onze NL DB-stage_type naar het StageBar engelse type. */
export function mapDbTypeToStage(t: string | null | undefined): StageBarType {
  switch ((t ?? "").toLowerCase()) {
    case "heuvel":
    case "heuvelachtig":
    case "hilly":
      return "hilly";
    case "berg":
    case "bergop":
    case "mountain":
      return "mountain";
    case "tijdrit":
    case "ploegentijdrit":
    case "tt":
    case "timetrial":
      return "timetrial";
    case "vlak":
    case "flat":
    default:
      return "flat";
  }
}

/** Bouwt StageBar-props uit onze DB-stages + points-map.
 *  `totalPointsOverride` (meestal myEntry.total_points uit
 *  game_entries_standings) is de authoritative totale punten incl.
 *  eindklassement-bonus. Wanneer aanwezig wordt 'ie gebruikt voor de
 *  GC-kolom; anders valt de functie terug op een lokale som van de
 *  etappepunten + GC-bonus uit de points-map (best-effort).
 */
export function buildStageBarData(
  stages: StageBarSourceRow[],
  pointsByStageId: Map<string, number>,
  selectedStageId: string | undefined,
  totalPointsOverride?: number,
): { data: StageBarStage[]; gcTotal: number; selectedNumber: number | null } {
  const nonGc = stages.filter((s) => !s.is_gc);
  const data: StageBarStage[] = nonGc.map((s) => ({
    stageNumber: s.stage_number,
    type: mapDbTypeToStage(s.stage_type),
    distanceKm: s.distance_km ?? 0,
    earnedPoints: pointsByStageId.get(s.id) ?? 0,
  }));

  let gcTotal: number;
  if (typeof totalPointsOverride === "number") {
    gcTotal = totalPointsOverride;
  } else {
    const gcStageId = stages.find((s) => s.is_gc)?.id;
    const gcBonus = gcStageId ? pointsByStageId.get(gcStageId) ?? 0 : 0;
    gcTotal = data.reduce((acc, s) => acc + s.earnedPoints, 0) + gcBonus;
  }

  const selectedRow = stages.find((s) => s.id === selectedStageId);
  const selectedNumber = selectedRow ? selectedRow.stage_number : null;
  return { data, gcTotal, selectedNumber };
}
