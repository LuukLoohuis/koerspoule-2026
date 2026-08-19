import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Props = {
  waarde: string;
  onChange: (v: string) => void;
  /** Ploegen waar al renners uit gekozen zijn, grootste concentratie eerst. */
  verdeling: Array<[string, number]>;
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
          {verdeling.map(([ploeg, aantal]) => {
            const gekozen = waarde.trim().toLowerCase() === ploeg.toLowerCase();
            return (
              <button
                key={ploeg}
                type="button"
                onClick={() => onChange(gekozen ? "" : ploeg)}
                aria-pressed={gekozen}
                title={t("team.builder.ploegFilter", { ploeg })}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                  gekozen
                    ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.15] text-foreground"
                    : "border-border text-muted-foreground hover:border-[hsl(var(--vintage-gold))/0.6] hover:text-foreground",
                  // Drie of meer uit dezelfde ploeg is een risico dat je wilt zien.
                  aantal >= 3 && !gekozen && "border-amber-500/60 text-amber-700 dark:text-amber-400",
                )}
              >
                <span className="truncate max-w-[110px]">{ploeg}</span>
                <span className="font-mono font-bold tabular-nums">{aantal}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
