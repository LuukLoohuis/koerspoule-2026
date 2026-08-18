/**
 * <ZwevendeActie> — de hoofdhandeling van een scherm blijft binnen duimbereik.
 *
 * Op de Volgwagen staat "wijzig je ploeg" onderaan een lijst die op een
 * telefoon meerdere schermen lang is. Wie halverwege bedenkt dat hij wil
 * wisselen, moet nu eerst terugscrollen. Deze knop zweeft mee.
 *
 * Linksonder. Rechtsonder kan een tweedelige tab-toggle staan; ze stapelen
 * dus niet.
 *
 * Wegklikbaar, want een knop die altijd over je inhoud ligt is op een klein
 * scherm al gauw te veel. Nooit definitief: `zwevendeActieHersteld` zet hem
 * terug, en de opbeller hangt dat aan dezelfde knop als de andere hulpkaarten.
 */
import { useState } from "react";
import type { ComponentType } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const KEY = "kp_zwevende_actie_weg";

/** Is de knop eerder weggeklikt? */
export function zwevendeActieWeggeklikt(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/** Haal de knop terug (samen met de andere hulpkaarten). */
export function zwevendeActieHerstellen(): void {
  try { localStorage.removeItem(KEY); } catch { /* negeer */ }
}

export default function ZwevendeActie({
  label,
  icon: Icon,
  onClick,
  onDismissed,
  className,
}: {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  /** Vuurt bij wegklikken, zodat de ouder een terughaal-knop kan tonen. */
  onDismissed?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [weg, setWeg] = useState(() => zwevendeActieWeggeklikt());
  if (weg) return null;

  const sluit = () => {
    setWeg(true);
    try { localStorage.setItem(KEY, "1"); } catch { /* negeer */ }
    onDismissed?.();
  };

  return (
    <div
      className={cn(
        "md:hidden fixed left-4 bottom-[72px] z-40 inline-flex items-stretch",
        "rounded-full border-2 border-foreground bg-primary text-primary-foreground",
        "shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-l-full py-2 pl-3.5 pr-2 font-display text-xs font-bold uppercase tracking-wide active:translate-y-px"
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </button>
      <button
        type="button"
        onClick={sluit}
        aria-label={t("common.verbergActie", { actie: label })}
        className="inline-flex items-center rounded-r-full border-l border-primary-foreground/25 px-2 text-primary-foreground/75 active:translate-y-px"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
