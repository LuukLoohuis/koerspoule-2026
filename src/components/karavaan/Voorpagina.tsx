import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import SubpouleKiezer from "@/components/karavaan/SubpouleKiezer";

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
  /** Emoji i.p.v. een lijnicoon: kleur maakt de rij in één oogopslag leesbaar. */
  emoji: string;
  titel: string;
  /**
   * Unieke stempel voor "nieuw sinds ...", meestal rubriek + etappenummer.
   * Zodra hierop geklikt is verdwijnt de stip, ook na herladen.
   */
  merk?: string;
  onClick: () => void;
};

/**
 * Voorpagina van de Krant: naambalk, hoofdartikel, rubrieken en je standbalk.
 *
 * Volgorde is bewust die van een krant: eerst het nieuws, dan de verwijzingen,
 * en pas onderaan je eigen cijfers. Die cijfers staan er nog wel, maar ze
 * openen de pagina niet meer.
 *
 * Vormgeving leunt op lagen in plaats van kaders -- zachte schaduw op wit,
 * ruime hoeken, systeemletter voor de bediening en serif alleen voor de
 * naambalk en de kop. Zo blijft het een krant terwijl de knoppen als een app
 * voelen.
 */
export default function Voorpagina({
  koers,
  editie,
  subpoules,
  selectedSubpouleId,
  onSelectSubpoule,
  cellen,
  rubrieken,
  artikel,
  className,
}: {
  koers: string;
  editie: string | null;
  subpoules: Array<{ id: string; name: string }>;
  selectedSubpouleId: string | null;
  onSelectSubpoule: (id: string) => void;
  cellen?: StandCel[];
  rubrieken: Rubriek[];
  artikel?: Hoofdartikel | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [meerOpen, setMeerOpen] = useState(false);

  // Gezien-markering per rubriek en per etappe: de stip hoort te verdwijnen
  // zodra je gekeken hebt, anders went hij en trekt hij niets meer.
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
      localStorage.setItem(GEZIEN_SLEUTEL, JSON.stringify([...volgende].slice(-20)));
    } catch {
      /* geblokkeerde opslag → markering geldt alleen deze sessie */
    }
  };

  const kern = cellen?.slice(0, 3) ?? [];
  const rest = cellen?.slice(3) ?? [];

  const cel = (c: StandCel, extra?: string) => (
    <button
      key={c.key}
      type="button"
      onClick={c.onClick}
      disabled={!c.onClick}
      className={cn(
        "min-w-[74px] flex-1 border-l border-border/70 px-1.5 py-2.5 text-center transition-colors",
        c.onClick && "hover:bg-secondary/70",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--vintage-gold))]",
        extra,
      )}
    >
      <span className="block whitespace-nowrap text-[18px] font-semibold leading-none tracking-tight tabular-nums">
        {c.waarde}
        {typeof c.delta === "number" && c.delta !== 0 && (
          <span className={cn("ml-1 text-[10px] font-bold", c.delta > 0 ? "text-emerald-600" : "text-primary")}>
            {c.delta > 0 ? "↑" : "↓"}
            {Math.abs(c.delta)}
          </span>
        )}
      </span>
      <span className="mt-1.5 block text-[9.5px] font-medium text-muted-foreground">{c.label}</span>
    </button>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-b border-border pb-3 text-center">
        <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span className="truncate">{koers}</span>
          {editie && <span className="shrink-0">{editie}</span>}
        </div>
        <p className="mt-2 font-display text-[26px] font-bold leading-none tracking-[-0.03em] sm:text-[33px]">
          {t("karavaan.voorpagina.naam")}
        </p>
        <p className="mt-1 font-serif text-[11.5px] italic text-muted-foreground">
          {t("karavaan.voorpagina.leus")}
        </p>
      </div>

      {artikel && (
        <div className="grid gap-4 md:grid-cols-[1.62fr_1fr] md:gap-[18px]">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[10.5px] font-semibold text-primary">
              {artikel.kicker}
            </span>
            <h2 className="mt-2.5 font-display text-[23px] font-bold leading-[1.08] tracking-[-0.028em] md:text-[30px]">
              {artikel.kop}
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-foreground/75">{artikel.chapeau}</p>
            {artikel.chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {artikel.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
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
                  "mt-3.5 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5",
                  "text-[12.5px] font-semibold text-[hsl(var(--vintage-gold))]",
                  "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_20px_-12px_rgba(0,0,0,0.28)]",
                  "transition-transform duration-200 hover:-translate-y-px active:scale-[0.985]",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                )}
              >
                {artikel.profielKnop.label}
              </button>
            )}
          </div>

          {artikel.quotes.length > 0 && (
            <div className="border-t border-border pt-3.5 md:border-l md:border-t-0 md:pl-[17px] md:pt-0">
              <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {t("karavaan.voorpagina.perszaal")}
              </p>
              {artikel.quotes.map((q) => (
                <div
                  key={q.naam}
                  className="mb-2 rounded-2xl bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] last:mb-0"
                >
                  <p className="mb-1 text-[10.5px] font-semibold text-muted-foreground">{q.naam}</p>
                  <p className="line-clamp-3 font-serif text-[13px] leading-snug text-foreground/75">{q.tekst}</p>
                </div>
              ))}
            </div>
          )}
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
                "relative flex items-center gap-2.5 rounded-2xl bg-card px-2.5 py-2.5 text-left",
                "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
                "transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
                "hover:-translate-y-[1.5px] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_20px_-12px_rgba(0,0,0,0.28)]",
                "active:scale-[0.985] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
              )}
            >
              <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-secondary text-[14px]">
                {r.emoji}
              </span>
              <span className="text-[12.5px] font-semibold leading-tight tracking-[-0.01em]">{r.titel}</span>
              {r.merk && !gezien.has(r.merk) && (
                <span aria-hidden className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {(kern.length > 0 || subpoules.length > 0) && (
        <div className="flex flex-wrap items-stretch overflow-hidden rounded-[20px] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <SubpouleKiezer subpoules={subpoules} selectedId={selectedSubpouleId} onSelect={onSelectSubpoule} />
          {kern.map((c) => cel(c))}
          {rest.length > 0 && (
            <button
              type="button"
              onClick={() => setMeerOpen((v) => !v)}
              aria-expanded={meerOpen}
              className="flex items-center border-l border-border/70 px-3 py-2.5 text-[12px] font-semibold text-[hsl(var(--vintage-gold))] transition-colors hover:bg-secondary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--vintage-gold))]"
            >
              {meerOpen ? t("karavaan.voorpagina.minder") : t("karavaan.voorpagina.meer", { aantal: rest.length })}
            </button>
          )}
          {meerOpen && (
            <div className="flex w-full border-t border-border/70">{rest.map((c) => cel(c, "first:border-l-0"))}</div>
          )}
        </div>
      )}
    </div>
  );
}
