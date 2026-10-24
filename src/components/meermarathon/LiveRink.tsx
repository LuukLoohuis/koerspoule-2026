import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  baanPositie,
  placeRiders,
  rolColor,
  rondeBadge,
  BAAN_B,
  BAAN_H,
  FINISH_PUNT,
  groepsBand,
  heeftEchtePositie,
  labelBreedte,
  plaatsLabels,
  seconden,
  type Vak,
  schatAfstand,
  verwerkMeting,
  type Meting,
} from "@/lib/liveRink";
import { GAP_THRESHOLD_S, groepsKopje, groepsRol, type LiveGroup } from "@/lib/liveMarathon";

/**
 * Mono zoals in het ontwerp (JetBrains Mono); Tailwinds font-mono is de
 * systeemletter. De hint family-name is nodig: zonder ziet tailwind-merge dit
 * als een gewicht en gooit cn() het weg zodra er font-bold achter staat.
 */
const MONO = "font-[family-name:'JetBrains_Mono',ui-monospace,monospace]";

/**
 * De baan met de rijders erop.
 *
 * Geometrie volgt het ontwerp: een 400 m-ovaal in een vak van 800×400, twee
 * rechte stukken en twee bochten. Rijders staan op hun echte plek in de ronde
 * (meter gedeeld door rondelengte) en rijden linksom -- over het onderste
 * stuk naar rechts, de bocht omhoog, boven naar links terug.
 *
 * De baan zelf is SVG en schaalt mee; de schijfjes en labels liggen er als
 * HTML overheen, op procenten van hetzelfde vak. Zo blijven ze op een telefoon
 * én op een breed scherm even groot als in het ontwerp (16 en 20 px), in
 * plaats van mee te krimpen tot gruis of op te zwellen tot knikkers.
 *
 * Tussen twee metingen rijden de schijfjes door langs het ovaal (zie
 * `useDoorrijden`), zodat de baan beweegt als een uitzending en niet elke
 * twintig seconden een sprong maakt.
 */
export default function LiveRink({
  groups,
  mineBeennummers,
  rondeLengte,
  rondeTijd = null,
  baanNaam,
}: {
  groups: LiveGroup[];
  mineBeennummers: Set<string>;
  rondeLengte: number | null;
  /** Gemiddelde rondetijd in seconden; daarmee volgt het gat tussen groepen de tijd. */
  rondeTijd?: number | null;
  baanNaam: string;
}) {
  const plaatsen = useMemo(() => {
    // Wie uit koers is rijdt niet meer: die staat niet op de baan. Die groep is
    // altijd de laatste, dus de groepsindex blijft gelijk aan die in `groups`.
    const opBaan = groups.filter((g) => g.soort !== "uitKoers");
    const ronden = new Map<string, number>();
    for (const g of opBaan)
      for (const l of g.leden) ronden.set(l.rider.beennummer, l.rider.aantalRonden);
    return {
      echt: heeftEchtePositie(opBaan, rondeLengte),
      lijst: placeRiders(opBaan, { rondeLengte, rondeTijd }).map((p) => ({ ...p, ronden: ronden.get(p.beennummer) ?? 0 })),
    };
  }, [groups, rondeLengte, rondeTijd]);

  // Naam en plek per rijder, voor het labeltje en de tooltip.
  const info = useMemo(() => {
    const m = new Map<string, { naam: string; positie: number; groep: string }>();
    groups.forEach((g, gi) => {
      const kopje = groepsKopje(groups, gi);
      for (const l of g.leden) m.set(l.rider.beennummer, { naam: l.rider.naam, positie: l.positie, groep: kopje });
    });
    return m;
  }, [groups]);

  const doorgereden = useDoorrijden(plaatsen.lijst, plaatsen.echt);
  const vakRef = useRef<HTMLDivElement>(null);
  const breedte = useBreedte(vakRef);

  const punten = plaatsen.lijst.map((p) => {
    const fraction = doorgereden?.get(p.beennummer) ?? p.fraction;
    return { ...p, fraction, ...baanPositie(fraction, p.offset) };
  });

  const schaal = breedte / BAAN_B;
  const midden = [baanNaam, rondeLengte ? `${rondeLengte} m` : null].filter(Boolean).join(" · ");
  // Vaste teksten op de baan: "Finish" boven de streep en de baannaam in het
  // midden. Breedtes per letter zoals ze in mono met spatiëring uitvallen.
  const finishB = 6 * 8;
  const middenB = midden.length * 9;
  const finishVak: Vak = { left: FINISH_PUNT.x * schaal - finishB / 2, top: (FINISH_PUNT.y - 46) * schaal - 13, b: finishB, h: 13 };
  const raakt = (a: Vak, b: Vak) =>
    a.left < b.left + b.b && b.left < a.left + a.b && a.top < b.top + b.h && b.top < a.top + a.h;

  // Het gat tussen twee groepen in seconden, midden in het gat aan de kant van
  // het middenterrein: zo zie je meteen hoe ver een groep weg is. Van kop tot
  // kop, net als de groepskaarten: opgeteld komen de labels uit op wat de kaart
  // zegt. Alleen waar de tijd iets zegt (zelfde ronde) en het echt een gat is.
  const gaten = groups.flatMap((g, gi) => {
    if (gi === 0 || g.soort === "uitKoers" || g.gapToPrev == null || g.gapToPrev <= GAP_THRESHOLD_S) return [];
    const eigenKop = g.leden[0]?.rider.tijdSort;
    const vorigeKop = groups[gi - 1].leden[0]?.rider.tijdSort;
    if (eigenKop == null || vorigeKop == null) return [];
    const kop = punten.find((p) => p.groupIndex === gi);
    const vorige = punten.filter((p) => p.groupIndex === gi - 1);
    const staart = vorige[vorige.length - 1];
    if (!kop || !staart) return [];
    const tussen = (((staart.fraction - kop.fraction) % 1) + 1) % 1;
    const tekst = seconden((eigenKop - vorigeKop) / 1000);
    const f = kop.fraction + tussen / 2;
    // Valt het label op "Finish", dan dieper het middenterrein in.
    const dicht = baanPositie(f, -50);
    const vak = { left: dicht.x * schaal - gatB(tekst) / 2, top: dicht.y * schaal - 8, b: gatB(tekst), h: 16 };
    return [{ sleutel: `gat-${gi}`, tekst, ...(raakt(vak, finishVak) ? baanPositie(f, -95) : dicht) }];
  });

  // Namen van je eigen rijders op een vrije plek, gerekend in schermpixels
  // (zie plaatsLabels). De badges ("+1"), de gaten en de eigen schijfjes zijn
  // obstakels.
  const eigen = punten
    .filter((p) => mineBeennummers.has(p.beennummer))
    .sort((a, b) => (info.get(a.beennummer)?.positie ?? 0) - (info.get(b.beennummer)?.positie ?? 0));
  const obstakels: Vak[] = [
    finishVak,
    { left: (BAAN_B / 2) * schaal - middenB / 2, top: (BAAN_H / 2) * schaal - 8, b: middenB, h: 16 },
    ...eigen.map((p) => ({ left: p.x * schaal - 12, top: p.y * schaal - 12, b: 24, h: 24 })),
    ...gaten.map((g) => ({ left: g.x * schaal - gatB(g.tekst) / 2, top: g.y * schaal - 8, b: gatB(g.tekst), h: 16 })),
    ...punten
      .filter((p) => p.eersteInGroep && rondeBadge(p.tier))
      .map((p) => {
        const links = mineBeennummers.has(p.beennummer) ? 12 : 9;
        return { left: p.x * schaal + links, top: p.y * schaal - 17, b: 22, h: 14 };
      }),
  ];
  const labels = plaatsLabels(
    eigen.map((p) => {
      const naam = achternaamVan(info.get(p.beennummer)?.naam ?? "");
      return { sleutel: p.beennummer, x: p.x * schaal, y: p.y * schaal, b: labelBreedte(naam) };
    }),
    { b: breedte, h: breedte * (BAAN_H / BAAN_B) },
    obstakels,
  );

  return (
    <div
      ref={vakRef}
      className="relative aspect-[2/1] w-full overflow-hidden rounded-[14px] bg-[var(--mm-rink-bg)]"
      role="img"
      aria-label={`Baan met de actuele posities van de rijders op ${baanNaam}; jouw rijders staan er met naam bij`}
    >
      <svg viewBox={`0 0 ${BAAN_B} ${BAAN_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {/* IJsband, en het middenterrein dat hem uithapt tot een ring. */}
        <rect
          x="10" y="10" width="780" height="380" rx="190"
          style={{ fill: "var(--mm-rink-track)", stroke: "var(--mm-rink-line)" }} strokeWidth="3"
        />
        <rect
          x="90" y="90" width="620" height="220" rx="110"
          style={{ fill: "var(--mm-rink-bg)", stroke: "var(--mm-rink-line)" }} strokeWidth="3"
        />

        {/* Finish: aan het eind van het rechte stuk, vlak vóór de bocht. */}
        <line
          x1={FINISH_PUNT.x} y1={FINISH_PUNT.y - 40}
          x2={FINISH_PUNT.x} y2={FINISH_PUNT.y + 40}
          style={{ stroke: "hsl(var(--muted-foreground))" }} strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round"
        />

        {/* Groepsbanden: een zachte strook onder elk pak, van de laatste tot de
            eerste rijder. Zo lees je groepen als blokken in plaats van losse
            stippen, ook als ze in de bocht door elkaar lijken te lopen. */}
        {groups.map((g, gi) => {
          const leden = punten.filter((p) => p.groupIndex === gi);
          if (leden.length < 2) return null;
          const d = groepsBand(leden.map((p) => p.fraction));
          if (!d) return null;
          return (
            <path
              key={`band-${gi}`}
              d={d}
              fill="none"
              style={{ stroke: rolColor(groepsRol(groups, gi)) }}
              strokeOpacity="0.24"
              strokeWidth="64"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      <span
        className={cn(
          MONO,
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
        )}
        aria-hidden
      >
        {midden}
      </span>
      {/* Label in het middenterrein, boven de streep: onder de baan is geen ruimte. */}
      <span
        className={cn(
          MONO,
          "pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap text-[9px] uppercase tracking-[0.2em] text-muted-foreground",
        )}
        style={{ left: pct(FINISH_PUNT.x, BAAN_B), top: pct(FINISH_PUNT.y - 46, BAAN_H) }}
        aria-hidden
      >
        Finish
      </span>

      {/* Koplopers bovenop, eigen rijders helemaal bovenop. */}
      {[...punten]
        .sort((a, b) => {
          const am = mineBeennummers.has(a.beennummer) ? 1 : 0;
          const bm = mineBeennummers.has(b.beennummer) ? 1 : 0;
          if (am !== bm) return am - bm;
          // Later in de DOM ligt bovenop: achteraan beginnen, de leider als laatste.
          return (info.get(b.beennummer)?.positie ?? 0) - (info.get(a.beennummer)?.positie ?? 0);
        })
        .map((p) => {
          const mine = mineBeennummers.has(p.beennummer);
          const rol = groepsRol(groups, p.groupIndex);
          const i = info.get(p.beennummer);
          const nummer = p.beennummer.replace(/^0+(?=\d)/, "");
          // Eén badge per groep: de rest van de groep rijdt per definitie
          // op dezelfde ronde.
          const badge = p.eersteInGroep ? rondeBadge(p.tier) : null;
          return (
            <div
              key={p.beennummer}
              className="absolute"
              style={{ left: pct(p.x, BAAN_B), top: pct(p.y, BAAN_H) }}
              title={i ? `${nummer} ${i.naam} — ${i.groep} — P${i.positie}` : nummer}
            >
              {/* Eigen rijder: rood met een witte en een halfdoorzichtige rode
                  ring, zoals in het ontwerp. De rest in de kleur van zijn
                  groep met een witte rand, zodat een pak niet samenklontert. */}
              <span
                className={cn(
                  "absolute left-0 top-0 block -translate-x-1/2 -translate-y-1/2 rounded-full",
                  mine
                    ? "size-5 bg-[var(--mm-hot)] shadow-[0_0_0_2px_white,0_0_0_4px_color-mix(in_srgb,var(--mm-hot)_50%,transparent)]"
                    : "size-4 shadow-[0_0_0_2px_white]",
                )}
                style={mine ? undefined : { background: rolColor(rol) }}
              />
              {badge && (
                <span
                  className={cn(
                    MONO,
                    "absolute bottom-1 whitespace-nowrap rounded-[3px] bg-foreground px-1 text-[9px] font-bold leading-[13px] text-background",
                  )}
                  style={{ left: mine ? 12 : 9 }}
                >
                  {badge}
                </span>
              )}
            </div>
          );
        })}

      {gaten.map((g) => (
        <span
          key={g.sleutel}
          className={cn(
            MONO,
            "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[4px] border border-border bg-card px-1.5 text-[10px] font-bold leading-[14px] tabular-nums text-foreground",
          )}
          style={{ left: pct(g.x, BAAN_B), top: pct(g.y, BAAN_H) }}
          aria-hidden
        >
          {g.tekst}
        </span>
      ))}

      {/* Namen als laatste laag: bovenop elk schijfje, ook van andere groepen. */}
      {eigen.map((p) => {
        const plek = labels.get(p.beennummer);
        const naam = achternaamVan(info.get(p.beennummer)?.naam ?? "");
        if (!plek || !naam) return null;
        return (
          <span
            key={`naam-${p.beennummer}`}
            className="pointer-events-none absolute whitespace-nowrap rounded-[4px] bg-[var(--mm-hot)] px-[5px] text-center text-[10px] font-bold leading-[15px] text-white"
            style={{ left: plek.left, top: plek.top, minWidth: plek.b }}
            aria-hidden
          >
            {naam}
          </span>
        );
      })}
    </div>
  );
}

/** Breedte van een gat-label in px (10 px mono, vet). */
function gatB(tekst: string): number {
  return tekst.length * 7 + 14;
}

function achternaamVan(naam: string): string {
  return naam.split(" ").slice(-1)[0] ?? "";
}

/** Breedte van het vak in px; de namen rekenen in schermpixels. */
function useBreedte(ref: { current: HTMLElement | null }): number {
  const [b, setB] = useState(BAAN_B);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const meet = () => setB(el.getBoundingClientRect().width || BAAN_B);
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return b;
}

/** Plek in het 800×400-vak als percentage, voor de HTML-laag boven de SVG. */
function pct(waarde: number, totaal: number): string {
  return `${(waarde / totaal) * 100}%`;
}

/**
 * Laat rijders tussen twee metingen doorrijden, langs de baan (rekenwerk in
 * `verwerkMeting`/`schatAfstand`). Alleen met echte posities (meter per
 * rijder); staat "minder beweging" aan, dan blijft alles stil.
 */
function useDoorrijden(
  plaatsen: { beennummer: string; fraction: number; ronden: number }[],
  echt: boolean,
): Map<string, number> | null {
  const metingen = useRef(new Map<string, Meting>());
  const [nu, setNu] = useState(() => performance.now());
  const stil = useMinderBeweging();
  const aan = echt && !stil;

  // Nieuwe meting verwerken. useMemo i.p.v. een effect: de nieuwe plekken
  // moeten in dezelfde render al meetellen, anders flitst er één beeld met de
  // oude schatting.
  useMemo(() => {
    if (!aan) return;
    const t = performance.now();
    const volgende = new Map<string, Meting>();
    for (const p of plaatsen) {
      volgende.set(p.beennummer, verwerkMeting(metingen.current.get(p.beennummer), p.ronden + p.fraction, t));
    }
    metingen.current = volgende;
  }, [plaatsen, aan]);

  useEffect(() => {
    if (!aan) return;
    let raf = 0;
    let vorige = 0;
    const loop = (t: number) => {
      // ~30 beelden per seconde is ruim genoeg voor schijfjes op een ovaal.
      if (t - vorige > 33 && document.visibilityState === "visible") {
        vorige = t;
        setNu(t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [aan]);

  if (!aan) return null;
  const uit = new Map<string, number>();
  for (const [bn, m] of metingen.current) uit.set(bn, ((schatAfstand(m, nu) % 1) + 1) % 1);
  return uit;
}

function useMinderBeweging(): boolean {
  const [stil, setStil] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const h = () => setStil(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return stil;
}
