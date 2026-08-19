import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { PloegChip } from "@/lib/ploegZoek";

type Props = {
  waarde: string;
  onChange: (v: string) => void;
  /** Ploegen waar al renners uit gekozen zijn, grootste concentratie eerst. */
  verdeling: PloegChip[];
  /** Hoeveel renners de huidige zoekterm oplevert, over alle categorieën. */
  gevonden: number | null;
  className?: string;
};

/**
 * Zoekbalk voor de ploegbouwer, plus je ploegverdeling.
 *
 * De chips zijn geen versiering: ze beantwoorden de vraag "hoeveel renners heb
 * ik uit dezelfde wielerploeg?" zonder dat je je hele selectie hoeft na te
 * lopen. Tikken filtert meteen op die ploeg, zodat je ziet wie het zijn.
 */
export default function ZoekRenners({ waarde, onChange, verdeling, gevonden, className }: Props) {
  const { t } = useTranslation();
  const actief = waarde.trim().length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={waarde}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("team.builder.zoekPlaceholder")}
          aria-label={t("team.builder.zoekLabel")}
          className={cn(
            "w-full rounded-md border-2 bg-card py-2 pl-9 pr-9 text-sm",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
            actief ? "border-[hsl(var(--vintage-gold))]" : "border-border",
          )}
        />
        {actief && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={t("team.builder.zoekWissen")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {actief && gevonden !== null && (
        <p className="text-xs text-muted-foreground" role="status">
          {t("team.builder.zoekResultaat", { count: gevonden })}
        </p>
      )}

      {verdeling.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {t("team.builder.ploegVerdeling")}
          </span>
          {verdeling.map((chip) => (
            <PloegKnop
              key={chip.naam}
              chip={chip}
              gekozen={waarde.trim().toLowerCase() === chip.naam.toLowerCase()}
              onKies={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Eén ploeg in de verdeling: shirt, korte code, aantal.
 *
 * De volledige naam staat in het title-attribuut en het aria-label, niet in
 * beeld -- afgekapte namen als "Team Visma | Leas…" zeggen minder dan het shirt.
 * Laadt het shirt niet (of staat er geen jersey_url), dan komt er een blokje met
 * de korte code voor in de plaats; niet elke ploeg heeft een afbeelding.
 */
function PloegKnop({
  chip, gekozen, onKies,
}: { chip: PloegChip; gekozen: boolean; onKies: (v: string) => void }) {
  const { t } = useTranslation();
  const [truiStuk, setTruiStuk] = useState(false);
  const toonTrui = Boolean(chip.trui) && !truiStuk;

  return (
    <button
      type="button"
      onClick={() => onKies(gekozen ? "" : chip.naam)}
      aria-pressed={gekozen}
      aria-label={t("team.builder.ploegFilterAantal", { ploeg: chip.naam, count: chip.aantal })}
      title={`${chip.naam} — ${chip.aantal}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2 text-[11px] transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
        gekozen
          ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.15] text-foreground"
          : "border-border text-muted-foreground hover:border-[hsl(var(--vintage-gold))/0.6] hover:text-foreground",
        // Drie of meer uit dezelfde ploeg is een risico dat je wilt zien, ook nu
        // de naam uit beeld is.
        chip.aantal >= 3 && !gekozen && "border-amber-500/60 text-amber-700 dark:text-amber-400",
      )}
    >
      {toonTrui ? (
        <img
          src={chip.trui!}
          alt=""
          aria-hidden
          loading="lazy"
          onError={() => setTruiStuk(true)}
          className="h-[22px] w-[22px] shrink-0 rounded-sm object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-sm bg-secondary font-mono text-[8.5px] font-bold text-muted-foreground"
        >
          {chip.kort}
        </span>
      )}
      <span className="font-mono text-[10.5px] font-bold tracking-wide text-foreground">{chip.kort}</span>
      <span className="font-mono font-bold tabular-nums">{chip.aantal}</span>
    </button>
  );
}
