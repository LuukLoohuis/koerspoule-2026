/**
 * <AapscoreDistributie>
 *
 * FT-stijl distributiegrafiek: waar valt jouw team tussen 5.000 willekeurige
 * "apenteams". Boven de plot drie absolute kerncijfers (apen verslagen,
 * gemiddelde aap-score, jouw voorsprong op de aap). De grafiek zelf is
 * clean: één thema-accent op jouw bin, koele grijze rest, dunne Jij-lijn
 * met directe annotatie. Geen mediaan-lijn, geen tweede referentielijn.
 *
 * Zuiver presentatie-component: alle data via props.
 */

import { useEffect, useRef, useState } from "react";
import aapDartpijl from "@/assets/horscat/aap-dartpijl.png";

export type DistBin = { bucket: number; count: number };

type Props = {
  dist: DistBin[];
  userActual: number;
  mean: number;
  beatPct: number;
  monkeyCount?: number;
  className?: string;
};

/* FT-palet — bewust hardcoded neutralen (chart-conventies). Eén accent via
   het race-thema (--primary). */
const CARD_BG = "#FFF1E5";
const BAR_GREY = "#C8C8C8";
const GRID = "#E6E6E6";
const AXIS_TEXT = "#333333";
const MUTED = "#666666";
const FAINT = "#999999";
const TITLE_INK = "#111111";
const POSITIVE = "#2E8B57"; // groen voor "+x pt boven gemiddelde"
const NEGATIVE = "#C0392B"; // rood voor onder gemiddelde
const ACCENT = "hsl(var(--primary))";

const FONT_SANS = "'Inter','DM Sans',sans-serif";
const FONT_MONO = "'JetBrains Mono',monospace";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Nette bovengrens voor y-as. */
function niceCeil(v: number): number {
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** rAF-count-up van 0 → target. Reduced-motion → direct. */
function useCountUp(target: number, duration = 900, reduce = false): number {
  const [v, setV] = useState(reduce ? target : 0);
  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target;
    if (reduce) {
      setV(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const from = 0;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(from + (targetRef.current - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return v;
}

/** Boven-de-grafiek drie kerncijfers (FT key-numbers strook).
 *
 * Layout: kale tekst, hairline-dividers, géén kaartjes. Grote tabular cijfers
 * op rij 1, kleine uppercase-labels eronder.
 */
function KeyFigures({
  beatenApes,
  monkeyCount,
  mean,
  delta,
  reduce,
}: {
  beatenApes: number;
  monkeyCount: number;
  mean: number;
  delta: number;
  reduce: boolean;
}) {
  const apes = useCountUp(beatenApes, 1100, reduce);
  const meanV = useCountUp(Math.round(mean), 1100, reduce);
  const deltaV = useCountUp(Math.abs(delta), 1100, reduce);

  const deltaColor = delta > 0 ? POSITIVE : delta < 0 ? NEGATIVE : TITLE_INK;
  const deltaPrefix = delta > 0 ? "+" : delta < 0 ? "−" : "±";

  const items: { label: string; node: React.ReactNode }[] = [
    {
      label: "Apen verslagen",
      node: (
        <span style={{ color: ACCENT }}>
          {apes.toLocaleString("nl-NL")}
          <span style={{ fontSize: "0.6em", color: MUTED, fontWeight: 600, marginLeft: 4 }}>
            /{monkeyCount.toLocaleString("nl-NL")}
          </span>
        </span>
      ),
    },
    {
      label: "Gem. score aap",
      node: (
        <span style={{ color: TITLE_INK }}>
          {meanV.toLocaleString("nl-NL")}
          <span style={{ fontSize: "0.55em", color: MUTED, fontWeight: 600, marginLeft: 3 }}>pt</span>
        </span>
      ),
    },
    {
      label: delta >= 0 ? "Boven gem. aap" : "Onder gem. aap",
      node: (
        <span style={{ color: deltaColor }}>
          {deltaPrefix}
          {deltaV.toLocaleString("nl-NL")}
          <span style={{ fontSize: "0.55em", color: MUTED, fontWeight: 600, marginLeft: 3 }}>pt</span>
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 mt-4 mb-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className="py-2"
          style={{
            borderLeft: i > 0 ? `1px solid ${GRID}` : undefined,
            paddingLeft: i > 0 ? 14 : 0,
            paddingRight: 8,
          }}
        >
          <div
            className="tabular-nums"
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: "clamp(20px, 3.8vw, 26px)",
              lineHeight: 1.1,
            }}
          >
            {it.node}
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
              marginTop: 4,
            }}
          >
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AapscoreDistributie({
  dist,
  userActual,
  mean,
  beatPct,
  monkeyCount = 5000,
  className,
}: Props) {
  const reduce = prefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [mounted, setMounted] = useState(reduce);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const set = () => setW(el.clientWidth);
    set();
    const obs = new ResizeObserver(set);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Staven groeien bij mount; aap fadet daarna in. Reduced motion → direct.
  useEffect(() => {
    if (reduce) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  if (!dist.length) return null;

  const isMobile = w > 0 && w < 480;

  /* ── schaal ───────────────────────────────────────────────────────────── */
  const step = dist.length > 1 ? dist[1].bucket - dist[0].bucket : 1;
  const domainMin = dist[0].bucket - step / 2;
  const domainMax = dist[dist.length - 1].bucket + step / 2;
  const span = Math.max(1, domainMax - domainMin);

  const H = isMobile ? 200 : 250;
  const padL = 6;
  // Desktop: rechts ruimte reserveren voor de mascotte die boven in hangt.
  const padR = isMobile ? 10 : 96;
  const gridTop = 24;
  const baseline = H - 22;
  const plotW = Math.max(0, w - padL - padR);
  const plotH = baseline - gridTop;

  const maxCount = Math.max(...dist.map((b) => b.count), 1);
  const yMax = niceCeil(maxCount);
  const gridStep = yMax / 3;
  const gridVals = [gridStep, gridStep * 2, gridStep * 3];

  const xOf = (v: number) => padL + ((v - domainMin) / span) * plotW;
  const yOf = (c: number) => baseline - (c / yMax) * plotH;

  // Bin waarin de speler valt = het enige accent.
  const userBin = dist.reduce((best, b) =>
    Math.abs(b.bucket - userActual) < Math.abs(best.bucket - userActual) ? b : best,
  ).bucket;

  const slot = plotW / dist.length;
  const gap = 2;
  const barW = Math.max(1, slot - gap);

  /* ── Jij-annotatie: explicit, nooit clippen ─────────────────────────── */
  const xUser = Math.max(padL + 1, Math.min(padL + plotW - 1, xOf(userActual)));
  const userFrac = (xUser - padL) / Math.max(1, plotW);
  const labelLeft = userFrac > 0.55;
  const elbow = 7;
  const tx = labelLeft ? xUser - elbow - 4 : xUser + elbow + 4;
  const tAnchor: "start" | "end" = labelLeft ? "end" : "start";

  const tickCount = isMobile ? 4 : 5;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    dist[Math.round((i / (tickCount - 1)) * (dist.length - 1))].bucket,
  );

  // Afgeleide cijfers voor de key-figures strook
  const beatenApes = Math.round((beatPct / 100) * monkeyCount);
  const delta = userActual - Math.round(mean);

  return (
    <div ref={wrapRef} className={"relative " + (className ?? "")}>
      <div
        className="relative rounded-xl p-4 md:p-5"
        style={{
          background: CARD_BG,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Mascotte — fade-in ná de staven */}
        <img
          src={aapDartpijl}
          alt=""
          aria-hidden
          className="animate-monkey-idle pointer-events-none select-none absolute z-10 w-auto h-[110px] md:h-[180px] top-3 right-3 md:top-4 md:right-4"
          style={{
            filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.18))",
            opacity: mounted ? 1 : 0,
            transition: reduce ? undefined : "opacity 150ms ease-out 320ms",
          }}
        />

        <div className="relative">
          {/* Titel + deck */}
          <h3
            className="pr-28 md:pr-48"
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1.25,
              color: TITLE_INK,
            }}
          >
            Hoe scoort jouw team tegen {monkeyCount.toLocaleString("nl-NL")} willekeurige apen?
          </h3>
          <p
            className="pr-28 md:pr-48"
            style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              color: MUTED,
              marginTop: 3,
            }}
          >
            Verdeling van gesimuleerde apenteams, zelfde puntentelling als jouw ploeg
          </p>

          {/* a11y-samenvatting */}
          <p className="sr-only">
            Verdeling van {monkeyCount.toLocaleString("nl-NL")} simulaties; jij verslaat{" "}
            {beatenApes.toLocaleString("nl-NL")} apen, de gemiddelde aap scoort{" "}
            {Math.round(mean)} punten en jij ligt {delta} punten {delta >= 0 ? "boven" : "onder"}{" "}
            de gemiddelde aap.
          </p>

          {/* Drie kerncijfers boven de grafiek */}
          <KeyFigures
            beatenApes={beatenApes}
            monkeyCount={monkeyCount}
            mean={mean}
            delta={delta}
            reduce={reduce}
          />

          {/* Plot */}
          {w > 0 && (
            <svg
              width={w}
              height={H}
              viewBox={`0 0 ${w} ${H}`}
              style={{ display: "block", maxWidth: "100%" }}
              role="img"
              aria-hidden
            >
              {/* Horizontale hairlines + label boven-links */}
              {gridVals.map((gv, i) => {
                const y = yOf(gv);
                const top = i === gridVals.length - 1;
                return (
                  <g key={gv}>
                    <line
                      x1={padL}
                      x2={padL + plotW}
                      y1={y}
                      y2={y}
                      stroke={GRID}
                      strokeWidth={0.75}
                    />
                    <text x={padL} y={y - 4} fontFamily={FONT_MONO} fontSize={10} fill={MUTED}>
                      {Math.round(gv)}
                      {top ? " aantal apenteams" : ""}
                    </text>
                  </g>
                );
              })}

              {/* Staven — FT-grijs, accent alleen op de user-bin; groeien
                  bij mount vanaf de baseline. */}
              {dist.map((b) => {
                const x = padL + (b.bucket === userBin ? 0 : 0) +
                  (dist.indexOf(b) * slot) + gap / 2;
                const y = yOf(b.count);
                const isUser = b.bucket === userBin;
                return (
                  <rect
                    key={b.bucket}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(0, baseline - y)}
                    fill={isUser ? ACCENT : BAR_GREY}
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "bottom",
                      transform: mounted ? "scaleY(1)" : "scaleY(0)",
                      transition: reduce ? undefined : "transform 300ms ease-out",
                    }}
                  />
                );
              })}

              {/* Jij — dunne lijn + directe annotatie (mediaan is verwijderd) */}
              <line
                x1={xUser}
                x2={xUser}
                y1={gridTop - 2}
                y2={baseline}
                stroke={AXIS_TEXT}
                strokeWidth={1}
              />
              <line
                x1={xUser}
                x2={labelLeft ? xUser - elbow : xUser + elbow}
                y1={gridTop + 7}
                y2={gridTop + 7}
                stroke={AXIS_TEXT}
                strokeWidth={1}
              />
              <text
                x={tx}
                y={gridTop + 10}
                textAnchor={tAnchor}
                fontFamily={FONT_SANS}
                fontWeight={700}
                fontSize={12}
                fill={TITLE_INK}
              >
                Jouw team · {userActual} pt
              </text>
              <text
                x={tx}
                y={gridTop + 24}
                textAnchor={tAnchor}
                fontFamily={FONT_SANS}
                fontStyle="italic"
                fontSize={11}
                fill={MUTED}
              >
                beter dan {Math.round(beatPct)}% van de apen
              </text>

              {/* Baseline + x-labels */}
              <line
                x1={padL}
                x2={padL + plotW}
                y1={baseline}
                y2={baseline}
                stroke={AXIS_TEXT}
                strokeOpacity={0.6}
                strokeWidth={1}
              />
              {ticks.map((t) => {
                const x = Math.max(padL + 10, Math.min(padL + plotW - 10, xOf(t)));
                return (
                  <text
                    key={t}
                    x={x}
                    y={baseline + 14}
                    textAnchor="middle"
                    fontFamily={FONT_MONO}
                    fontSize={11}
                    fill={AXIS_TEXT}
                  >
                    {t}
                  </text>
                );
              })}
            </svg>
          )}

          {/* Bron */}
          <p style={{ fontFamily: FONT_SANS, fontSize: 10, color: FAINT, marginTop: 8 }}>
            Bron: {monkeyCount.toLocaleString("nl-NL")} Monte Carlo-simulaties · Koerspoule
          </p>
        </div>
      </div>
    </div>
  );
}
