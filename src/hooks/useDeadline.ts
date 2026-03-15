import { useState, useEffect, useMemo } from "react";

// Hardcoded deadlines for Giro d'Italia 2026
const REGISTRATION_OPEN = new Date("2026-05-04T00:00:00+02:00");  // maandag 4 mei
const REGISTRATION_CLOSE = new Date("2026-05-08T11:00:00+02:00"); // vrijdag 8 mei 11:00

export type DeadlinePhase = "before_open" | "open" | "closed";

export interface DeadlineState {
  phase: DeadlinePhase;
  /** Countdown target: openDate when before_open, closeDate when open, null when closed */
  countdownTarget: Date | null;
  /** Remaining time broken down */
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Formatted label */
  label: string;
  openDate: Date;
  closeDate: Date;
}

export function useDeadline(): DeadlineState {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    let phase: DeadlinePhase;
    let countdownTarget: Date | null = null;
    let label = "";

    if (now < REGISTRATION_OPEN) {
      phase = "before_open";
      countdownTarget = REGISTRATION_OPEN;
      label = "Inschrijving opent over";
    } else if (now < REGISTRATION_CLOSE) {
      phase = "open";
      countdownTarget = REGISTRATION_CLOSE;
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

    return {
      phase,
      countdownTarget,
      days,
      hours,
      minutes,
      seconds,
      label,
      openDate: REGISTRATION_OPEN,
      closeDate: REGISTRATION_CLOSE,
    };
  }, [now]);
}
