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
  schatAfstand,
  verwerkMeting,
  type Meting,
} from "@/lib/liveRink";
import { groepsKopje, groepsRol, type LiveGroup } from "@/lib/liveMarathon";

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
  baanNaam,
}: {
  groups: LiveGroup[];
  mineBeennummers: Set<string>;
  rondeLengte: number | null;
  baanNaam: string;
}) {
  const plaatsen = useMemo(() => {
    const ronden = new Map<string, number>();
    let echt = rondeLengte != null && rondeLengte > 0;
    for (const g of groups)
      for (const l of g.leden) {
        ronden.set(l.rider.beennummer, l.rider.aantalRonden);
        if (l.rider.meter == null) echt = false;
      }
    return {
      echt,
      lijst: placeRiders(groups, { rondeLengte }).map((p) => ({ ...p, ronden: ronden.get(p.beennummer) ?? 0 })),
    };
  }, [groups, rondeLengte]);

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

  const punten = plaatsen.lijst.map((p) => {
    const fraction = doorgereden?.get(p.beennummer) ?? p.fraction;
    return { ...p, fraction, ...baanPositie(fraction, p.offset) };
  });

  // Eigen rijders om en om boven en onder het schijfje, zodat twee labels
  // dicht bij elkaar niet over elkaar heen vallen.
  let eigenTeller = 0;
  const midden = [baanNaam, rondeLengte ? `${rondeLengte} m` : null].filter(Boolean).join(" · ");

  return (
    <div
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
              strokeOpacity="0.18"
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
          const achternaam = mine && i ? i.naam.split(" ").slice(-1)[0] : null;
          const boven = mine ? eigenTeller++ % 2 === 1 : false;
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
              {achternaam && (
                <span
                  className="absolute left-0 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-[var(--mm-hot)] px-[5px] text-[10px] font-bold leading-[15px] text-white"
                  style={boven ? { bottom: 14 } : { top: 14 }}
                >
                  {achternaam}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
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
