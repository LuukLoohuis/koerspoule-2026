import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import SubpouleKiezer from "@/components/karavaan/SubpouleKiezer";

const GEZIEN_SLEUTEL = "kp_krant_gezien_v1";

/** Initiaal op kolombreedte: zelfde gebaar als boven het hoofdartikel. */
const INITIAAL_KLEIN =
  "[&::first-letter]:float-left [&::first-letter]:pr-1.5 [&::first-letter]:pt-[3px] " +
  "[&::first-letter]:font-display [&::first-letter]:text-[27px] " +
  "[&::first-letter]:font-black [&::first-letter]:leading-[0.8] [&::first-letter]:text-foreground";

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
  /**
   * Het etappeverslag, als dat er is. Vervangt de chapeau: die meldt alleen dát
   * de uitslag binnen is, en zodra er een verslag ligt is dat het nieuws.
   */
  verslag?: ReactNode;
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
  uitslag,
  dagstand,
  legende,
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
  /** Uitslag en stand, onder de perszaal in de rechterkolom. */
  uitslag?: ReactNode;
  /** Daguitslag binnen je subpoule; op mobiel een eigen segment. */
  dagstand?: ReactNode;
  /** Archiefverhaal onderaan de perszaalkolom; ontbreekt als er geen is. */
  legende?: ReactNode;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const [meerOpen, setMeerOpen] = useState(false);
  // Per commentator onthouden of zijn quote uitstaat.
  const [quotesOpen, setQuotesOpen] = useState<Set<string>>(new Set());
  const toggleQuote = (naam: string) =>
    setQuotesOpen((vorig) => {
      const volgende = new Set(vorig);
      if (volgende.has(naam)) volgende.delete(naam);
      else volgende.add(naam);
      return volgende;
    });

  // Op een telefoon past de hele voorpagina niet in één kolom; drie segmenten
  // verdelen wat op desktop naast elkaar staat. Boven lg blijft alles zichtbaar,
  // dus dit is puur een mobiele indeling en geen tweede versie van de pagina.
  type Segment = "voorpagina" | "daguitslag" | "perszaal";
  const [segment, setSegment] = useState<Segment>("voorpagina");
  /** Verbergt een sectie op mobiel als hij niet bij het gekozen segment hoort. */
  const alleenIn = (s: Segment) => (segment === s ? "" : "hidden lg:block");

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

  // Datum in de kioskregel: een krant zonder datum is geen krant.
  const datum = new Date().toLocaleDateString(i18n.language === "en" ? "en-GB" : "nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  /** Het krantgebaar: een dikke lijn met een dunne eronder. */
  const DubbeleRegel = ({ className: c }: { className?: string }) => (
    <div aria-hidden className={cn("h-[4px] border-b border-t-[2.5px] border-foreground", c)} />
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Kioskregel ─────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 border-b border-border pb-[7px] font-oswald text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="truncate">{koers}</span>
        <span className="hidden shrink-0 sm:block">{datum}</span>
        {editie && <span className="shrink-0 text-primary">{editie}</span>}
      </div>

      {/* ── Naambalk: haarlijn / titel / haarlijn ──────────────────────── */}
      <div className="grid items-center gap-[18px] sm:grid-cols-[1fr_auto_1fr]">
        <div aria-hidden className="hidden h-px bg-border sm:block" />
        <div className="text-center">
          <p className="font-display text-[38px] font-black leading-[0.9] tracking-[-0.035em] sm:text-[54px] lg:text-[70px]">
            {t("karavaan.voorpagina.naam")}
          </p>
          <p className="mt-1.5 font-serif text-[13.5px] italic text-muted-foreground">
            {t("karavaan.voorpagina.leus")}
          </p>
        </div>
        <div aria-hidden className="hidden h-px bg-border sm:block" />
      </div>

      <DubbeleRegel />

      {/* Segmentschakelaar, alleen op mobiel. Krantstijl: inverse blok in
          plaats van een pil -- zelfde taal als de binnenpagina. */}
      <div className="flex border-y border-foreground lg:hidden">
        {([
          ["voorpagina", t("karavaan.voorpagina.segVoorpagina")],
          ["daguitslag", t("karavaan.voorpagina.segDaguitslag")],
          ["perszaal", t("karavaan.voorpagina.segPerszaal")],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSegment(k)}
            aria-pressed={segment === k}
            className={cn(
              "flex-1 py-2 font-oswald text-[10px] uppercase tracking-[0.18em] transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              segment === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tweekolomsgrid. De kolomlijn is een border op kolom 2, dus geen
             gap: in een krant staat een kolom tegen de lijn aan. ─────────── */}
      {artikel && (
        <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:gap-0">
          {/* Kolom 1 — hoofdartikel */}
          <div className={cn("min-w-0 lg:pr-[22px]", alleenIn("voorpagina"))}>
            <span className="inline-flex items-center bg-primary px-[7px] py-[3px] font-oswald text-[9.5px] uppercase tracking-[0.14em] text-primary-foreground">
              {artikel.kicker}
            </span>
            <h2 className="mt-2.5 font-display text-[30px] font-black leading-[1.02] tracking-[-0.032em] lg:text-[47px]">
              {artikel.kop}
            </h2>
            {!artikel.verslag && (
              <p className="mt-2 font-serif text-[16px] italic leading-snug text-muted-foreground">
                {artikel.chapeau}
              </p>
            )}
            <DubbeleRegel className="mt-3" />
            {artikel.verslag}

            {artikel.chips.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {artikel.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-secondary px-2.5 py-1 font-sans text-[11px] font-medium text-muted-foreground"
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
                  "mt-3 inline-flex items-center gap-2 font-oswald text-[10.5px] uppercase tracking-[0.14em]",
                  "text-[hsl(var(--vintage-gold))] underline underline-offset-[5px] decoration-[hsl(var(--vintage-gold))/0.5]",
                  "transition-colors hover:decoration-[hsl(var(--vintage-gold))]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                )}
              >
                {artikel.profielKnop.label}
              </button>
            )}
          </div>

          {/* Kolom 2 — perszaal. Quotes gescheiden door haarlijnen, geen
              kaartjes: kaartjes waren de app-look, dit is de krant-look. */}
          {(artikel.quotes.length > 0 || uitslag || dagstand || legende) && (
            <div className="min-w-0 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-[22px] lg:pt-0 max-lg:border-t-0 max-lg:pt-0">
              {/* Daguitslag uit je eigen poule: alléén op mobiel, als eigen
                  segment. Op desktop stond hij bovenaan de rechterkolom en
                  duwde hij de perszaal en de uitslagen naar beneden, terwijl
                  diezelfde cijfers ook in de standbalk onderaan staan. */}
              {dagstand && segment === "daguitslag" && <div className="mb-4 lg:hidden">{dagstand}</div>}

              {artikel.quotes.length > 0 && (
                <div className={alleenIn("perszaal")}>
                  {/* Kolomkoppen in volle inkt met een haarlijn eronder: in
                      grijs op grijs zakten ze weg tegen de quotes eronder. */}
                  <p className="mb-2.5 border-b border-foreground/25 pb-1.5 font-oswald text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground">
                    {t("karavaan.voorpagina.perszaal")}
                  </p>
                  {artikel.quotes.map((q) => {
                    const uit = quotesOpen.has(q.naam);
                    return (
                      <div key={q.naam} className="border-b border-border/70 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                        <p className="mb-1 font-oswald text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
                          {q.naam}
                        </p>
                        {/* Twee regels in plaats van vier: de kolom moet ook de
                            uitslag en het archiefverhaal kwijt kunnen. */}
                        {/* Initiaal, net als boven het hoofdartikel. Drie
                            regels in plaats van twee: een initiaal is zelf al
                            twee regels hoog, dus bij twee bleef er niets van
                            de quote over. */}
                        <p
                          className={cn(
                            "font-serif text-[12px] leading-[1.45] text-foreground/90",
                            INITIAAL_KLEIN,
                            !uit && "line-clamp-3",
                          )}
                        >
                          {q.tekst}
                        </p>
                        {/* Stil gebaar, geen rode regel: rood hoort hier bij de
                            uitslag en de legende, en drie rode links onder
                            elkaar schreeuwen. */}
                        <button
                          type="button"
                          onClick={() => toggleQuote(q.naam)}
                          aria-expanded={uit}
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 border-b border-border pb-px",
                            "font-oswald text-[9px] uppercase tracking-[0.14em] text-muted-foreground",
                            "transition-colors hover:text-foreground",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        >
                          {uit ? t("karavaan.voorpagina.quoteMinder") : t("karavaan.voorpagina.quoteMeer")}
                          <span aria-hidden className={cn("inline-block transition-transform", uit && "rotate-180")}>⌄</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* De uitslag onder de perszaal, gescheiden door de dubbele regel:
                  de kolom liep leeg terwijl het artikel ernaast doorging, en het
                  nieuws waar alles op rust stond nergens op de voorpagina. */}
              {uitslag && (
                <div className={alleenIn("daguitslag")}>
                  {artikel.quotes.length > 0 && <DubbeleRegel className="my-4 max-lg:hidden" />}
                  {uitslag}
                </div>
              )}
              {/* Het archiefverhaal sluit de kolom af. Op mobiel hoort het bij
                  de perszaal: dat segment bestaat al, dus er komt geen tabje
                  bij. Geen verhaal → geen blok én geen dubbele regel. */}
              {legende && (
                <div className={alleenIn("perszaal")}>
                  <DubbeleRegel className="my-4" />
                  {legende}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      <DubbeleRegel className={alleenIn("voorpagina")} />

      {rubrieken.length > 0 && (
        <div className={cn("space-y-3", alleenIn("voorpagina"))}>
          <p className="font-oswald text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("karavaan.voorpagina.verderInDeKrant")}
          </p>
          {/* Vijf rubrieken passen niet netjes in vier kolommen: dan blijft er
              één alleen op een tweede regel staan. Bij vijf dus 3+2 op tablet
              en alles op één rij zodra er ruimte is. */}
          <div
            className={cn(
              "grid grid-cols-2 gap-3",
              rubrieken.length === 5 ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-4",
            )}
          >
            {rubrieken.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  markeerGezien(r.merk);
                  r.onClick();
                }}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-[18px] px-[14px] py-[13px] text-left",
                  "bg-background",
                  "shadow-[0_0_0_1px_rgba(20,18,16,0.09),0_1px_2px_rgba(0,0,0,0.05),0_10px_22px_-14px_rgba(0,0,0,0.4)]",
                  "transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
                  "hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(20,18,16,0.12),0_2px_4px_rgba(0,0,0,0.06),0_18px_30px_-16px_rgba(0,0,0,0.45)]",
                  "active:scale-[0.985] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                )}
              >
                <span
                  aria-hidden
                  className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-secondary text-[15px]"
                >
                  {r.emoji}
                </span>
                <span className="min-w-0 font-sans text-[13.5px] font-bold leading-tight tracking-[-0.01em]">
                  {r.titel}
                </span>
                {r.merk && !gezien.has(r.merk) && (
                  <span aria-hidden className="absolute right-3 top-3 h-[7px] w-[7px] rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {(kern.length > 0 || subpoules.length > 0) && (
        <div className={cn(
          "flex flex-wrap items-stretch overflow-hidden rounded-[20px] bg-background shadow-[0_0_0_1px_rgba(20,18,16,0.09),0_1px_2px_rgba(0,0,0,0.05),0_10px_22px_-14px_rgba(0,0,0,0.4)]",
          alleenIn("voorpagina"),
        )}>
          <SubpouleKiezer subpoules={subpoules} selectedId={selectedSubpouleId} onSelect={onSelectSubpoule} />
          {kern.map((c) => cel(c))}
          {rest.length > 0 && (
            <button
              type="button"
              onClick={() => setMeerOpen((v) => !v)}
              aria-expanded={meerOpen}
              className="flex items-center border-l border-border/70 px-3 py-2.5 font-sans text-[12px] font-bold text-[hsl(var(--vintage-gold))] transition-colors hover:bg-secondary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--vintage-gold))]"
            >
              {meerOpen ? t("karavaan.voorpagina.minder") : t("karavaan.voorpagina.meer", { aantal: rest.length })}
            </button>
          )}
          {meerOpen && (
            <div className="flex w-full border-t border-border/70">{rest.map((c) => cel(c, "first:border-l-0"))}</div>
          )}
        </div>
      )}

      {/* ── Folio ──────────────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 font-oswald text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="truncate">{t("karavaan.voorpagina.naam")}</span>
        <span className="hidden shrink-0 sm:block">{t("karavaan.voorpagina.folioPagina")}</span>
        <span className="truncate text-right">{koers}</span>
      </div>
    </div>
  );
}
