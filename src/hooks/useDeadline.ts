import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { registrationPhaseForStatus } from "@/lib/gameStatus";

// Fallback (Giro 2026) if admin hasn't set deadlines yet
const FALLBACK_OPEN = new Date("2026-05-04T00:00:00+02:00");
const FALLBACK_CLOSE = new Date("2026-05-08T11:00:00+02:00");

export type DeadlinePhase = "preview" | "before_open" | "open" | "closed";

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
  // De homepage volgt altijd dezelfde actuele live-first game als Index zelf;
  // een historische switcher-keuze mag de publieke banner niet overschrijven.
  const { data: game } = useCurrentGame({ ignoreSelectedGame: true });
  const gameId = game?.id;
  const query = useQuery({
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

  return { ...query, gameStatus: game?.status };
}

export function useDeadline(): DeadlineState {
  const [now, setNow] = useState(() => new Date());
  const { data: deadlines, gameStatus } = useGameDeadlines();

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

    const statusPhase = registrationPhaseForStatus(gameStatus);

    if (statusPhase === "preview") {
      phase = "preview";
    } else if (statusPhase === "open") {
      phase = "open";
      countdownTarget = closeDate;
      label = "Inschrijving sluit over";
    } else if (statusPhase === "closed") {
      phase = "closed";
      label = "Inschrijving gesloten";
    } else if (now < openDate) {
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
  }, [now, deadlines, gameStatus]);
}
