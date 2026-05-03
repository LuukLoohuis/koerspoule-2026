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
  return useQuery({
    queryKey: ["game-deadlines-any"],
    enabled: !!supabase,
    queryFn: async () => {
      // Pak de game waarvan de inschrijvingsperiode het meest relevant is:
      // 1) lopend (open <= nu < close), 2) eerstvolgende open in de toekomst,
      // 3) meest recent gesloten window.
      const { data, error } = await supabase!
        .from("games")
        .select("id, registration_opens_at, registration_closes_at")
        .not("registration_opens_at", "is", null)
        .not("registration_closes_at", "is", null);
      if (error) throw error;

      const now = Date.now();
      const rows = (data ?? []).map((g) => ({
        ...g,
        open: new Date(g.registration_opens_at as string).getTime(),
        close: new Date(g.registration_closes_at as string).getTime(),
      }));

      const ongoing = rows.find((r) => r.open <= now && now < r.close);
      if (ongoing) return ongoing;
      const upcoming = rows
        .filter((r) => r.open > now)
        .sort((a, b) => a.open - b.open)[0];
      if (upcoming) return upcoming;
      const past = rows.sort((a, b) => b.close - a.close)[0];
      return past ?? null;
    },
    refetchInterval: 30000,
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
