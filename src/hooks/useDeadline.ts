import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";

// Fallback (Giro 2026) if admin hasn't set deadlines yet
const FALLBACK_OPEN = new Date("2026-05-04T00:00:00+02:00");
const FALLBACK_CLOSE = new Date("2026-05-08T11:00:00+02:00");

export type DeadlinePhase = "before_open" | "open" | "closed";

export interface DeadlineState {
  phase: DeadlinePhase;
  countdownTarget: Date | null;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  label: string;
  openDate: Date;
  closeDate: Date;
}

function useGameDeadlines() {
  // Multi-game: de deadline volgt de GEKOZEN game (useCurrentGame leest de
  // switcher-keuze uit fase 1), niet de tijdgewijs "meest relevante" game. Zo
  // toont de countdown de deadline van de game die de deelnemer bekijkt.
  const { data: game } = useCurrentGame();
  const gameId = game?.id;
  return useQuery({
    queryKey: ["game-deadlines", gameId],
    enabled: !!supabase && !!gameId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("games")
        .select("id, registration_opens_at, registration_closes_at")
        .eq("id", gameId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    // Stopt met pollen zodra de query faalt (geen eindeloze 60s-rollback-loop).
    refetchInterval: (query) => (query.state.status === "error" ? false : 60000),
  });
}

export function useDeadline(): DeadlineState {
  const [now, setNow] = useState(() => new Date());
  const { data: deadlines } = useGameDeadlines();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const openDate = deadlines?.registration_opens_at
      ? new Date(deadlines.registration_opens_at)
      : FALLBACK_OPEN;
    const closeDate = deadlines?.registration_closes_at
      ? new Date(deadlines.registration_closes_at)
      : FALLBACK_CLOSE;

    let phase: DeadlinePhase;
    let countdownTarget: Date | null = null;
    let label = "";

    if (now < openDate) {
      phase = "before_open";
      countdownTarget = openDate;
      label = "Inschrijving opent over";
    } else if (now < closeDate) {
      phase = "open";
      countdownTarget = closeDate;
      label = "Inschrijving sluit over";
    } else {
      phase = "closed";
      label = "Inschrijving gesloten";
    }

    let diff = countdownTarget ? Math.max(0, countdownTarget.getTime() - now.getTime()) : 0;
    const days = Math.floor(diff / 86400000);
    diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000);
    diff -= hours * 3600000;
    const minutes = Math.floor(diff / 60000);
    diff -= minutes * 60000;
    const seconds = Math.floor(diff / 1000);

    return { phase, countdownTarget, days, hours, minutes, seconds, label, openDate, closeDate };
  }, [now, deadlines]);
}
