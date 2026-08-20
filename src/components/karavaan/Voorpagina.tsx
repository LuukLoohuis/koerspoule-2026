import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const GEZIEN_SLEUTEL = "kp_krant_gezien_v1";

export type StandCel = {
  key: string;
  waarde: string;
  label: string;
  /** Rangverschil t.o.v. de vorige etappe; negatief = gezakt. */
  delta?: number;
  onClick?: () => void;
};

export type Hoofdartikel = {
  kicker: string;
  kop: string;
  chapeau: string;
  chips: string[];
  profielKnop?: { label: string; onClick: () => void };
  quotes: Array<{ naam: string; tekst: string }>;
};

export type Rubriek = {
  key: string;
  /** Emoji i.p.v. een lijnicoon: kleur maakt de rij herkenbaar op een oogopslag. */
  emoji: string;
  titel: string;
  /** Eén regel die zegt wát daar te halen valt — geen menu, maar een krant. */
  haak: string;
  /**
   * Unieke stempel voor "nieuw sinds ...", meestal rubriek + etappenummer.
   * Zodra hierop geklikt is verdwijnt het plakkertje, ook na herladen.
   */
  merk?: string;
  onClick: () => void;
};

/**
 * Kop en rubriekenrij van de Krant.
 *
 * De pagina heet de Krant, dus laat hem zich zo gedragen: een naambalk met
 * datum en editie, en daaronder verwijzingen naar de rest van het blad. De haak
 * onder elke rubriek is het verschil met een menu — een menu zegt waar je heen
 * kunt, een krant zegt waarom je zou gaan.
 */
export default function Voorpagina({
  koers,
  editie,
  subpoule,
  onSubpoule,
  cellen,
  rubrieken,
  artikel,
  className,
}: {
  koers: string;
  editie: string | null;
  subpoule?: string | null;
  onSubpoule?: () => void;
  cellen?: StandCel[];
  rubrieken: Rubriek[];
  artikel?: Hoofdartikel | null;
  className?: string;
}) {
  const { t } = useTranslation();
  // Gezien-markering per rubriek en per etappe: het rode plakkertje hoort te
  // verdwijnen zodra je gekeken hebt, anders went het en trekt het niets meer.
  const [gezien, setGezien] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(GEZIEN_SLEUTEL) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  });

  const markeerGezien = (merk: string | undefined) => {
    if (!merk || gezien.has(merk)) return;
    const volgende = new Set(gezien).add(merk);
    setGezien(volgende);
    try {
      // Alleen de laatste twintig bewaren; ouder dan dat komt toch niet terug.
      localStorage.setItem(GEZIEN_SLEUTEL, JSON.stringify([...volgende].slice(-20)));
    } catch {
      /* geblokkeerde opslag → markering geldt alleen deze sessie */
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="border-b-[3px] border-double border-foreground pb-2">
        <div className="flex items-baseline justify-between gap-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="truncate">{koers}</span>
          {editie && <span className="shrink-0">{editie}</span>}
        </div>
        <p className="mt-1.5 text-center font-display text-[26px] font-black leading-none tracking-tight sm:text-[34px]">
          {t("karavaan.voorpagina.naam")}
        </p>
        <p className="mt-1 text-center font-serif text-[11px] italic text-muted-foreground">
          {t("karavaan.voorpagina.leus")}
        </p>
      </div>

      {cellen && cellen.length > 0 && (
        <div className="flex flex-wrap overflow-hidden rounded-xl border border-border bg-card">
          {subpoule && (
            <button
              type="button"
              onClick={onSubpoule}
              disabled={!onSubpoule}
              className={cn(
                "flex w-full shrink-0 items-center justify-between gap-2 bg-foreground px-3 py-2 text-background sm:w-auto sm:min-w-[130px] sm:flex-col sm:items-start sm:justify-center",
                onSubpoule && "transition-opacity hover:opacity-90",
              )}
            >
              <span className="truncate font-display text-[12.5px] font-bold">{subpoule}</span>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.13em] text-background/60">
                {t("karavaan.voorpagina.jouwSubpoule")}
              </span>
            </button>
          )}
          <div className="flex flex-1 flex-wrap">
            {cellen.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.onClick}
                disabled={!c.onClick}
                className={cn(
                  "flex-1 basis-1/3 border-l border-border px-1.5 py-1.5 text-center sm:basis-0",
                  c.onClick && "transition-colors hover:bg-secondary/60",
                )}
              >
                <span className="block whitespace-nowrap font-display text-[19px] font-black leading-none tabular-nums">
                  {c.waarde}
                  {typeof c.delta === "number" && c.delta !== 0 && (
                    <span className={cn("ml-1 text-[10px] font-bold", c.delta > 0 ? "text-emerald-600" : "text-primary")}>
                      {c.delta > 0 ? "↑" : "↓"}{Math.abs(c.delta)}
                    </span>
                  )}
                </span>
                <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {rubrieken.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {rubrieken.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                markeerGezien(r.merk);
                r.onClick();
              }}
              className={cn(
                "relative flex flex-col items-start gap-0.5 overflow-hidden rounded-lg border border-border bg-card px-2.5 py-2 text-left",
                "transition-all hover:-translate-y-px hover:border-[hsl(var(--vintage-gold))]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
              )}
            >
              {r.merk && !gezien.has(r.merk) && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-1.5 py-px font-mono text-[7.5px] font-extrabold uppercase tracking-wider text-primary-foreground">
                  {t("karavaan.voorpagina.nieuw")}
                </span>
              )}
              <span aria-hidden className="text-[15px] leading-none">{r.emoji}</span>
              <span className="mt-0.5 font-display text-[12.5px] font-bold leading-tight">{r.titel}</span>
              <span className="line-clamp-2 font-serif text-[11px] leading-snug text-muted-foreground">{r.haak}</span>
            </button>
          ))}
        </div>
      )}

      {artikel && (
        <div className="grid gap-4 border-t border-border pt-3.5 md:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.19em] text-primary">
              {artikel.kicker}
            </p>
            <h2 className="mt-1.5 font-display text-[21px] font-black leading-[1.08] tracking-tight md:text-[27px]">
              {artikel.kop}
            </h2>
            <p className="mt-1.5 font-serif text-[13.5px] leading-relaxed text-foreground/80">{artikel.chapeau}</p>
            {artikel.chips.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {artikel.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {artikel.profielKnop && (
              <button
                type="button"
                onClick={artikel.profielKnop.onClick}
                className={cn(
                  "mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-dashed px-3.5 py-2.5",
                  "border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.08]",
                  "font-display text-[12px] font-bold text-[hsl(var(--vintage-gold))]",
                  "transition-colors hover:bg-[hsl(var(--vintage-gold))/0.16]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                )}
              >
                {artikel.profielKnop.label}
              </button>
            )}
          </div>

          {artikel.quotes.length > 0 && (
            <div className="border-t border-border pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              <p className="mb-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.17em] text-muted-foreground">
                {t("karavaan.voorpagina.perszaal")}
              </p>
              {artikel.quotes.map((q) => (
                <div key={q.naam} className="mb-2.5 border-l-2 border-[hsl(var(--vintage-gold))] pl-2.5 last:mb-0">
                  <p className="mb-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
                    {q.naam}
                  </p>
                  <p className="line-clamp-3 font-serif text-[12.5px] italic leading-snug text-foreground/80">
                    {q.tekst}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
