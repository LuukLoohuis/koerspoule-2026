import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeadline } from "@/hooks/useDeadline";
import { Clock, Lock, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-xl md:text-2xl font-bold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </span>
    </div>
  );
}

export default function CountdownBanner({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { phase, days, hours, minutes, seconds, closeDate, openDate } = useDeadline();

  // De hook levert een NL label; hier vertalen we op basis van de fase zodat
  // de tekst de actieve taal volgt (de hook zelf blijft ongemoeid).
  const label =
    phase === "before_open"
      ? t("shell.countdown.beforeOpenLabel")
      : phase === "open"
        ? t("shell.countdown.openLabel")
        : t("shell.countdown.closedLabel");

  // Hydration-gate: de homepage wordt geprerenderd (SSG) en deze banner toont
  // tikkende tijd — de server-HTML bevat de bouwtijd-stand, de client een andere
  // → React #418/#423 (hele root valt terug op client-render). Daarom renderen
  // server én eerste client-render dezelfde neutrale skeleton; de echte cijfers
  // verschijnen pas na mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className={cn("retro-border bg-card p-3 md:p-5 min-h-[118px] md:min-h-[132px]", className)} aria-hidden />;
  }

  const fmt = (d: Date) =>
    d.toLocaleString(i18n.language === "en" ? "en-GB" : "nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (phase === "before_open") {
    return (
      <div className={cn("retro-border bg-card p-3 md:p-5 text-center", className)}>
        <div className="flex items-center justify-center gap-2 mb-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span className="text-sm font-medium font-sans">{label}</span>
        </div>
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <TimeUnit value={days} label={t("shell.countdown.days")} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={hours} label={t("shell.countdown.hours")} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={minutes} label={t("shell.countdown.minutes")} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={seconds} label={t("shell.countdown.seconds")} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-sans">
          {t("shell.countdown.opensOn", { date: fmt(openDate) })}
        </p>
      </div>
    );
  }

  if (phase === "open") {
    return (
      <div className={cn("retro-border-primary bg-card p-3 md:p-5 text-center", className)}>
        <div className="flex items-center justify-center gap-2 mb-2 text-primary">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-bold font-sans">{label}</span>
        </div>
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <TimeUnit value={days} label={t("shell.countdown.days")} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={hours} label={t("shell.countdown.hours")} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={minutes} label={t("shell.countdown.minutes")} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <TimeUnit value={seconds} label={t("shell.countdown.seconds")} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-sans">
          {t("shell.countdown.deadline", { date: fmt(closeDate) })}
        </p>
      </div>
    );
  }

  // closed
  return (
    <div className={cn("retro-border bg-card p-4 text-center", className)}>
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="text-sm font-medium font-sans">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 font-sans">
        {t("shell.countdown.started")}
      </p>
    </div>
  );
}
