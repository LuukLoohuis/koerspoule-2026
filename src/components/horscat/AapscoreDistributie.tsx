/**
 * <AapscoreDistributie>
 *
 * FT/Bloomberg-grade distributiegrafiek: waar valt jouw team tussen 5.000
 * willekeurige "apenteams". Pass 3 — clean FT-modus: off-white (FT-salmon)
 * kaart, koele grijze staven, één thema-accent, precieze typografie. Geen
 * perkament, geen grain, geen retro-randen.
 *
 * Custom SVG voor exacte controle over gridlines, annotatieplaatsing en de
 * gereserveerde hoek voor de mascotte (die nu écht aanwezig is: groot,
 * rechtsboven, voeten richting de histogram-rand).
 *
 * Zuiver presentatie-component: alle data via props, simulatie onaangeroerd.
 */

import { useEffect, useRef, useState } from "react";
import aapDartpijl from "@/assets/horscat/aap-dartpijl.png";

export type DistBin = { bucket: number; count: number };

type Props = {
  dist: DistBin[];
  userActual: number;
  mean: number;
  median: number;
  beatPct: number;
  monkeyCount?: number;
  className?: string;
};

/* FT-palet — bewust hardcoded neutralen (geen thema-tokens: dit zijn
   chart-conventies, geen merk-kleuren). Eén accent via het race-thema. */
const CARD_BG = "#FFF1E5"; // FT-salmon, subtiel
const BAR_GREY = "#C8C8C8";
const GRID = "#E6E6E6";
const AXIS_TEXT = "#333333";
const MUTED = "#666666";
const FAINT = "#999999";
const TITLE_INK = "#111111";
const ACCENT = "hsl(var(--primary))";

const FONT_SANS = "'Inter','DM Sans',sans-serif";
const FONT_MONO = "'JetBrains Mono',monospace";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Rond af naar een "nette" bovengrens voor de y-schaal. */
function niceCeil(v: number): number {
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** FT key-numbers rij: kale cijfers, hairline-scheiding, geen kaartjes. */
function KeyFigures({
  mean,
  median,
  userActual,
  beatPct,
}: {
  mean: number;
  median: number;
  userActual: number;
  beatPct: number;
}) {
  const items: { label: string; value: string; accent?: boolean }[] = [
    { label: "Gemiddelde aap", value: `${Math.round(mean)} pt` },
    { label: "Mediaan", value: `${Math.round(median)} pt` },
    { label: "Jouw team", value: `${userActual} pt`, accent: true },
    { label: "Apen verslagen", value: `${Math.round(beatPct)}%` },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 mt-4 mb-3">
      {items.map((it, i) => (
        <div
          key={it.label}
          className="py-1.5 pr-3"
          style={{
            borderLeft: i % 2 === 1 || i >= 1 ? `1px solid ${GRID}` : undefined,
            // mobiel (2×2): alleen kolom 2 een divider; desktop: alle vanaf i>0
            paddingLeft: i > 0 ? 12 : 0,
          }}
        >
          <div
            className="tabular-nums"
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: it.accent ? 24 : 20,
              lineHeight: 1.15,
              color: it.accent ? ACCENT : TITLE_INK,
            }}
          >
            {it.value}
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: MUTED,
              marginTop: 2,
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
  median,
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
  // Desktop: rechts ruimte reserveren zodat de staart-staven vrij blijven van
  // de mascotte die van boven het plotgebied in hangt.
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

  /* ── annotaties: expliciete plaatsing, nooit clippen ─────────────────── */
  const xUser = Math.max(padL + 1, Math.min(padL + plotW - 1, xOf(userActual)));
  const userFrac = (xUser - padL) / Math.max(1, plotW);
  const labelLeft = userFrac > 0.55; // rechterhelft → label links van de lijn
  const elbow = 7;
  const tx = labelLeft ? xUser - elbow - 4 : xUser + elbow + 4;
  const tAnchor: "start" | "end" = labelLeft ? "end" : "start";

  const xMedian = xOf(median);
  const medianFrac = (xMedian - padL) / Math.max(1, plotW);
  const medianClose = Math.abs(medianFrac - userFrac) < 0.12;
  const medLeft = medianClose ? !labelLeft : medianFrac > 0.55;
  const mtx = medLeft ? xMedian - 6 : xMedian + 6;
  const mAnchor: "start" | "end" = medLeft ? "end" : "start";

  const tickCount = isMobile ? 4 : 5;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    dist[Math.round((i / (tickCount - 1)) * (dist.length - 1))].bucket,
  );

  return (
    <div ref={wrapRef} className={"relative " + (className ?? "")}>
      <div
        className="relative rounded-xl p-4 md:p-5"
        style={{
          background: CARD_BG,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {/* Mascotte — grote redactionele aanwezigheid rechtsboven; hangt op
            desktop van boven het plotgebied in (staart-staven zijn laag en
            het plot reserveert rechts padding). Fade-in ná de staven. */}
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
          {/* Titel + deck — FT-hiërarchie, rechts vrijgehouden voor de aap */}
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
            Verdeling van {monkeyCount.toLocaleString("nl-NL")} simulaties; jij scoort{" "}
            {userActual} punten en verslaat {Math.round(beatPct)}% van de apen.
          </p>

          {/* Key figures — kaal, hairline dividers */}
          <KeyFigures mean={mean} median={median} userActual={userActual} beatPct={beatPct} />

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
              {/* Horizontale hairlines + label erboven-links */}
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

              {/* Staven — FT-grijs, accent alleen op de user-bin; groeien bij
                  mount vanaf de baseline (transform-box: fill-box). */}
              {dist.map((b, i) => {
                const x = padL + i * slot + gap / 2;
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

              {/* Mediaan — dashed hairline, direct label */}
              <line
                x1={xMedian}
                x2={xMedian}
                y1={gridTop + 6}
                y2={baseline}
                stroke={FAINT}
                strokeWidth={0.75}
                strokeDasharray="3 3"
              />
              <text
                x={mtx}
                y={baseline - 6}
                textAnchor={mAnchor}
                fontFamily={FONT_MONO}
                fontSize={10}
                fill={FAINT}
              >
                mediaan {Math.round(median)}
              </text>

              {/* Jij — dunne donkere lijn + directe tekst-annotatie */}
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

              {/* Baseline + x-labels (mono, geen tick-marks) */}
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

          {/* Bron-regel */}
          <p style={{ fontFamily: FONT_SANS, fontSize: 10, color: FAINT, marginTop: 8 }}>
            Bron: {monkeyCount.toLocaleString("nl-NL")} Monte Carlo-simulaties · Koerspoule
          </p>
        </div>
      </div>
    </div>
  );
}
