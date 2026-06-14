/**
 * <EmptyState> — herbruikbare lege-staat met karakter: icoon óf illustratie,
 * optionele titel, korte tekst (huisstijl-toon) en een duidelijke CTA.
 */
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Action = { label: string; to?: string; onClick?: () => void };

const CTA =
  "inline-flex items-center justify-center gap-2 mt-1 px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:brightness-105 active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all";

export default function EmptyState({
  icon: Icon,
  illustration,
  title,
  message,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  illustration?: string;
  title?: string;
  message: string;
  action?: Action;
  className?: string;
}) {
  return (
    <div className={cn("retro-border bg-card p-6 text-center flex flex-col items-center gap-2", className)}>
      {illustration ? (
        <img src={illustration} alt="" aria-hidden className="w-24 md:w-28 h-auto mb-1 select-none pointer-events-none" />
      ) : Icon ? (
        <Icon className="h-9 w-9 text-muted-foreground/50" />
      ) : null}
      {title && <p className="font-display font-bold text-foreground">{title}</p>}
      <p className="text-sm text-muted-foreground font-serif max-w-sm">{message}</p>
      {action &&
        (action.to ? (
          <Link to={action.to} className={CTA}>{action.label}</Link>
        ) : (
          <button type="button" onClick={action.onClick} className={CTA}>{action.label}</button>
        ))}
    </div>
  );
}
