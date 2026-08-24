import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { simuleerRace, type SimulatieOpts } from "@/lib/liveSimulatie";
import type { LiveRace } from "@/hooks/useLiveRace";

/** Hoe vaak de nagebootste stand opschuift. */
const TIK_MS = 1200;

/**
 * Nagebootste live-stand, alleen als er expliciet om gevraagd wordt via
 * ?livesim=1 én de bezoeker admin is.
 *
 * Twee sloten, want dit toont cijfers die er echt uitzien: een deelnemer mag
 * hier nooit per ongeluk in belanden. De URL-schakelaar is bewust niet
 * onthouden -- sluit je het tabblad, dan is het weg.
 */
export function useLiveSimulatie(isAdmin: boolean, opts?: SimulatieOpts): LiveRace | null {
  const [params] = useSearchParams();
  const aan = isAdmin && params.get("livesim") === "1";
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!aan) return;
    const id = window.setInterval(() => setTick((t) => t + 1), TIK_MS);
    return () => window.clearInterval(id);
  }, [aan]);

  if (!aan) return null;
  return simuleerRace(tick, opts);
}
