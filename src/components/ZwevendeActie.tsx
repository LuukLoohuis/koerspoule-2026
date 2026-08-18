/**
 * <ZwevendeActie> — de hoofdhandeling van een scherm blijft binnen duimbereik.
 *
 * Op de Volgwagen staat "wijzig je ploeg" onderaan een lijst die op een
 * telefoon meerdere schermen lang is. Wie halverwege bedenkt dat hij wil
 * wisselen, moet nu eerst terugscrollen. Deze knop zweeft mee.
 *
 * Linksonder. Rechtsonder kan een tweedelige tab-toggle staan; ze stapelen
 * dus niet.
 */
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export default function ZwevendeActie({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "md:hidden fixed left-4 bottom-[72px] z-40 inline-flex items-center gap-1.5",
        "rounded-full border-2 border-foreground bg-primary px-3.5 py-2",
        "font-display text-xs font-bold uppercase tracking-wide text-primary-foreground",
        "shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-px",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
