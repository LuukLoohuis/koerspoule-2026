import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { StageTypeIcon } from "@/components/stages/StageIcons";
import { STAGE_TYPE_COLOR, mapDbTypeToStage } from "@/components/stages/stageBarData";
import type { RitScore } from "@/lib/ploegRanglijst";
import { SoortEmbleem } from "@/components/meermarathon/WedstrijdSoort";

const MONO = "font-['JetBrains_Mono',monospace]";

/** 2ᵉ in het Nederlands, 2nd in het Engels. */
function plaatsTekst(plaats: number, taal: string): string {
  if (!taal.startsWith("en")) return `${plaats}ᵉ`;
  const soort = new Intl.PluralRules("en", { type: "ordinal" }).select(plaats);
  return `${plaats}${{ one: "st", two: "nd", few: "rd" }[soort as "one" | "two" | "few"] ?? "th"}`;
}

/**
 * Het uitklapvak onder een renner op Ploeg C: in welke ritten haalde hij zijn
 * punten. Bovenaan een balkje per rit, zodat je ziet wáár in de koers hij
 * scoorde; daaronder de ritten met punten, met de plaats in de uitslag. De
 * gekozen rit (de kolom in de ranglijst) is aangezet.
 *
 * Alleen opmaak: de ritten komen uit rittenVanRenner, tot en met de rit van de
 * rit-kiezer. De som is dus het totaal in de rij erboven.
 *
 * Bewust zonder intree-animatie: bij een andere sortering of rit verplaatst de
 * rij, en dan zou het vak opnieuw infaden.
 */
export default function RennerRitten({
  id,
  naam,
  ritten,
  gekozenRit,
  gekozenLabel,
  meermarathon = false,
  className,
}: {
  id: string;
  /** Naam van de renner, voor het label van het vak. */
  naam: string;
  /** Alle ritten tot en met de gekozen rit, oplopend. */
  ritten: RitScore[];
  gekozenRit: number | null;
  /** Meermarathon: "Cup 3" voor de gekozen wedstrijd. */
  gekozenLabel?: string;
  meermarathon?: boolean;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const ctx = meermarathon ? "mm" : undefined;
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";
  const fmt = (n: number) => n.toLocaleString(locale);

  const gescoord = ritten.filter((r) => r.punten > 0);
  const hoogste = Math.max(1, ...ritten.map((r) => r.punten));

  return (
    <div
      id={id}
      role="region"
      aria-label={t("ploegC.rittenAria", { naam, context: ctx })}
      className={cn("mb-2 rounded-md bg-foreground/4 px-2.5 pb-2 pt-2.5", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn(MONO, "text-[9px] uppercase tracking-[0.14em] text-muted-foreground")}>
          {t("ploegC.rittenKop", { context: ctx })}
        </span>
        {ritten.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {t("ploegC.rittenGescoord", { aantal: gescoord.length, count: ritten.length, context: ctx })}
          </span>
        )}
      </div>

      {/* Balkje per rit. Versiering: de cijfers staan in de lijst eronder. */}
      {ritten.length > 1 && (
        <div aria-hidden className="mt-2 flex items-end gap-[3px]">
          {ritten.map((r) => (
            <div key={r.nummer} className="flex min-w-0 max-w-[18px] flex-1 flex-col items-center gap-1">
              <div className="flex h-7 w-full items-end">
                <div
                  className={cn("w-full rounded-t-[2px]", r.punten > 0 ? "bg-[var(--vintage-green)]" : "bg-foreground/15")}
                  style={{ height: r.punten > 0 ? `${Math.max(14, Math.round((r.punten / hoogste) * 100))}%` : 2 }}
                />
              </div>
              <span
                className={cn(
                  MONO,
                  "text-[8px] leading-none tabular-nums",
                  r.nummer === gekozenRit ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {r.nummer}
              </span>
            </div>
          ))}
        </div>
      )}

      {gescoord.length === 0 ? (
        <p className="mt-2 font-serif text-[12.5px] italic text-muted-foreground">
          {gekozenRit != null
            ? t("ploegC.geenPunten", { rit: gekozenLabel ?? gekozenRit, context: ctx })
            : t("ploegC.geenUitslag")}
        </p>
      ) : (
        <ul className="mt-1.5 flex flex-col">
          {gescoord.map((r) => {
            const soort = mapDbTypeToStage(r.type);
            return (
              <li
                key={r.nummer}
                className="flex min-h-[30px] items-center gap-2 border-t border-border/70 py-1 text-[12.5px] first:border-t-0"
              >
                {r.soort ? (
                  <SoortEmbleem soort={r.soort} maat={18} />
                ) : (
                  <span className="inline-flex shrink-0" style={{ color: STAGE_TYPE_COLOR[soort] }}>
                    <StageTypeIcon type={soort} size={14} />
                  </span>
                )}
                <span className="min-w-0 grow truncate">
                  <span className={cn(r.nummer === gekozenRit ? "font-bold" : "font-semibold")}>
                    {r.label ?? t("ploegC.kolomRit", { rit: r.nummer })}
                  </span>
                  {r.naam && <span className="text-muted-foreground"> · {r.naam}</span>}
                </span>
                {r.multiplier > 1 && (
                  <span
                    className={cn(MONO, "shrink-0 rounded-[3px] bg-foreground/8 px-1 text-[9px] font-bold text-muted-foreground")}
                    aria-label={t("ploegC.jokerAria", { multiplier: r.multiplier })}
                  >
                    ×{r.multiplier}
                  </span>
                )}
                {r.plaats != null && (
                  <span className={cn(MONO, "w-[30px] shrink-0 text-right text-[11.5px] tabular-nums text-muted-foreground")}>
                    {plaatsTekst(r.plaats, i18n.language)}
                  </span>
                )}
                <span className={cn(MONO, "w-[40px] shrink-0 text-right text-[13px] font-bold tabular-nums text-[var(--vintage-green)]")}>
                  +{fmt(r.punten)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
