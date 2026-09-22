import { useEffect, useMemo, useRef, useState } from "react";
import {
  baanPositie,
  placeRiders,
  rolColor,
  rolRingColor,
  rolTekstColor,
  rondeBadge,
  EIGEN_KLEUR,
  BAAN_B,
  BAAN_H,
  FINISH_PUNT,
  groepsBand,
  schatAfstand,
  verwerkMeting,
  type Meting,
} from "@/lib/liveRink";
import { groepsRol, type LiveGroup } from "@/lib/liveMarathon";

/**
 * De baan met de rijders erop.
 *
 * Geometrie volgt het ontwerp: een 400 m-ovaal in een vak van 800×400, twee
 * rechte stukken en twee bochten. Rijders staan op hun echte plek in de ronde
 * (meter gedeeld door rondelengte) en rijden linksom -- over het onderste
 * stuk naar rechts, de bocht omhoog, boven naar links terug.
 *
 * Tussen twee metingen rijden de schijfjes door langs het ovaal (zie
 * `useDoorrijden`), zodat de baan beweegt als een uitzending en niet elke
 * twintig seconden een sprong maakt.
 */
export default function LiveRink({
  groups,
  ijsType,
  mineBeennummers,
  rondeLengte,
  baanNaam,
  rondeLabel,
  namen,
}: {
  groups: LiveGroup[];
  ijsType: string | null;
  mineBeennummers: Set<string>;
  rondeLengte: number | null;
  baanNaam: string;
  rondeLabel: string | null;
  /** Naam per beennummer, voor het labeltje bij je eigen rijders. */
  namen?: Map<string, string>;
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

  const doorgereden = useDoorrijden(plaatsen.lijst, plaatsen.echt);

  const punten = plaatsen.lijst.map((p) => {
    const fraction = doorgereden?.get(p.beennummer) ?? p.fraction;
    return { ...p, fraction, ...baanPositie(fraction, p.offset) };
  });

  // Op een telefoon is de baan zo'n 350 px breed: een rugnummer in elk schijfje
  // wordt dan onleesbaar gruis. Daar tonen we alleen stippen, en krijgen je
  // eigen rijders hun nummer groter.
  const svgRef = useRef<SVGSVGElement>(null);
  const klein = useSmal(svgRef, 560);

  // Eigen rijders om en om boven en onder het schijfje, zodat twee labels
  // dicht bij elkaar niet over elkaar heen vallen.
  let eigenTeller = 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BAAN_B} ${BAAN_H}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Baan met de actuele posities van de rijders op ${baanNaam}`}
    >
      <defs>
        <linearGradient id="mm-ijs" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#eef6fd" />
          <stop offset="0.55" stopColor="#dcebfa" />
          <stop offset="1" stopColor="#cfe3f8" />
        </linearGradient>
        <linearGradient id="mm-band" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#cfe3f8" />
          <stop offset="1" stopColor="#b9d6f4" />
        </linearGradient>
        <linearGradient id="mm-midden" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#eef6fd" />
          <stop offset="1" stopColor="#dfeefb" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={BAAN_B} height={BAAN_H} fill="url(#mm-ijs)" />

      {/* Buitenrand van de ijsband. */}
      <rect x="10" y="10" width="780" height="380" rx="190" fill="url(#mm-band)" />
      <rect x="10" y="10" width="780" height="380" rx="190" fill="none" stroke="#fff" strokeWidth="3" />

      {/* Middenterrein: hapt de band uit tot een ring. */}
      <rect x="90" y="90" width="620" height="220" rx="110" fill="url(#mm-midden)" />
      <rect x="90" y="90" width="620" height="220" rx="110" fill="none" stroke="#fff" strokeWidth="3" />

      <rect
        x="136" y="132" width="528" height="136" rx="68"
        fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1" strokeDasharray="7 6"
      />

      <text
        x={BAAN_B / 2} y={BAAN_H / 2 - 6} textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace" fontSize="24" fill="#9dbde3" letterSpacing="10"
      >
        {baanNaam.toUpperCase()}
      </text>
      <text
        x={BAAN_B / 2} y={BAAN_H / 2 + 20} textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace" fontSize="12" fill="#9dbde3" letterSpacing="4"
      >
        {[
          ijsType === "natuurijs" ? "NATUURIJS" : "KUNSTIJS",
          rondeLengte ? `${rondeLengte} M` : null,
          rondeLabel,
        ].filter(Boolean).join(" · ")}
      </text>

      {/* Finish: aan het eind van het rechte stuk, vlak vóór de bocht. */}
      <line
        x1={FINISH_PUNT.x} y1={FINISH_PUNT.y - 30}
        x2={FINISH_PUNT.x} y2={FINISH_PUNT.y + 30}
        stroke="#0f2f5c" strokeWidth="3" strokeLinecap="round"
      />
      <text
        x={FINISH_PUNT.x} y={FINISH_PUNT.y + 50} textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace" fontSize="11" fill="#5b83b3" letterSpacing="2.6"
      >
        START / FINISH
      </text>

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
            stroke={rolColor(groepsRol(groups, gi))}
            strokeOpacity="0.16"
            strokeWidth="64"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Koplopers bovenop, eigen rijders helemaal bovenop. */}
      {[...punten]
        .sort((a, b) => {
          const am = mineBeennummers.has(a.beennummer) ? 1 : 0;
          const bm = mineBeennummers.has(b.beennummer) ? 1 : 0;
          if (am !== bm) return am - bm;
          return b.tier - a.tier;
        })
        .map((p) => {
          const mine = mineBeennummers.has(p.beennummer);
          // De rol van de groep geeft de kleur, niet het ronde-verschil: een
          // kopgroep blijft geel, of hij nu een ronde voorligt of niet.
          const rol = groepsRol(groups, p.groupIndex);
          const fill = rolColor(rol);
          const r = mine ? (klein ? 17 : 14) : klein ? 10 : 13;
          const nummer = p.beennummer.replace(/^0+(?=\d)/, "");
          const toonNummer = mine || !klein;
          const naam = mine ? namen?.get(p.beennummer) ?? null : null;
          const boven = mine ? (eigenTeller++ % 2 === 0) : false;
          // Eén badge per groep: de rest van de groep rijdt per definitie
          // op dezelfde ronde.
          const badge = p.eersteInGroep ? rondeBadge(p.tier) : null;
          // Badge naast het schijfje, buiten de eigen ringen om.
          const badgeX = p.x + (mine ? 15 : 9);
          const labelSchaal = klein ? 1.35 : 1;
          return (
            <g key={p.beennummer}>
              {/* Eigen rijder: groene ring met een witte spleet ertussen. De
                  spleet maakt het groen los van de vulkleur, zodat het ook op
                  geel opvalt. De vulling blijft de kleur van zijn groep. */}
              {mine && (
                <>
                  <circle cx={p.x} cy={p.y} r={r + 6.5} fill="none" stroke={EIGEN_KLEUR} strokeWidth="4" />
                  <circle cx={p.x} cy={p.y} r={r + 2} fill="none" stroke="#fff" strokeWidth="3.5" />
                </>
              )}
              <circle
                cx={p.x} cy={p.y} r={r} fill={fill}
                stroke={mine ? "none" : rolRingColor(rol)} strokeWidth={mine ? 0 : 2.5}
              />
              {toonNummer && (
                <text
                  x={p.x} y={p.y + (klein && mine ? 5 : 4)} textAnchor="middle"
                  fontFamily="'JetBrains Mono', monospace" fontSize={klein && mine ? 15 : mine ? 12 : 11}
                  fontWeight="700" fill={rolTekstColor(rol)}
                >
                  {nummer}
                </text>
              )}
              {badge && (
                <g transform={`translate(${badgeX} ${p.y - r - 6}) scale(${labelSchaal})`}>
                  <rect x="0" y="0" width="23" height="14" rx="4" fill="#1b2f14" />
                  <text
                    x="11.5" y="10.5" textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="700" fill="#fff"
                  >
                    {badge}
                  </text>
                </g>
              )}
              {naam && (
                <g
                  transform={`translate(${p.x} ${boven ? p.y - r - 12 : p.y + r + 12}) scale(${labelSchaal})`}
                >
                  <rect
                    x={-naam.length * 3.1 - 6}
                    y={boven ? -18 : 0}
                    width={naam.length * 6.2 + 12}
                    height="18" rx="4" fill={EIGEN_KLEUR}
                  />
                  <text
                    x="0" y={boven ? -5 : 13}
                    textAnchor="middle" fontFamily="'DM Sans', sans-serif"
                    fontSize="11" fontWeight="600" fill="#fff"
                  >
                    {naam}
                  </text>
                </g>
              )}
            </g>
          );
        })}
    </svg>
  );
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

/** True zolang het element smaller is dan `grens` pixels. */
function useSmal(ref: React.RefObject<Element>, grens: number): boolean {
  const [smal, setSmal] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setSmal(e.contentRect.width < grens));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, grens]);
  return smal;
}
