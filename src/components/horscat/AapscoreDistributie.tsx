/**
 * <AapscoreDistributie>
 *
 * FT/Economist-stijl distributiegrafiek op perkament: waar valt jouw team
 * tussen 5.000 willekeurige "apenteams". Custom SVG (geen Recharts) voor
 * exacte controle over gridlines, annotaties en de gereserveerde hoek voor
 * de mascotte.
 *
 * Ontwerpdiscipline:
 *  - Typografie draagt het ontwerp: titel → deck → grafiek → bron.
 *  - Eén kleur voor alle staven (inkt, gedempt); precies één accent: de bin
 *    waarin jouw score valt, in het actieve thema (--primary).
 *  - Geen verticale gridlines, geen chart-box, geen legenda — direct labelen.
 *  - Mascotte = redactionele spot-illustratie, statisch rechtsboven.
 *
 * Zuiver presentatie-component: alle data via props, geen berekeningen die
 * de simulatie raken.
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

/* Tokens: --ink-sepia/--ink-faded zijn volledige kleuren; --primary en
   --vintage-gold zijn HSL-tripletten. */
const INK = "var(--ink-sepia)";
const INK_FADED = "var(--ink-faded)";
const ACCENT = "hsl(var(--primary))";

const FONT_SANS = "'Oswald','Archivo Black',sans-serif";
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

/** Slim key-figures strookje: grote cijfers, hairline-scheiding, geen kaartjes. */
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
    <div
      className="grid grid-cols-2 sm:flex sm:items-stretch mt-3 mb-4"
      style={{ borderTop: "1px solid color-mix(in srgb, var(--ink-sepia) 18%, transparent)" }}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className="flex-1 py-2.5 pr-3"
          style={{
            borderLeft:
              i > 0 ? "1px solid color-mix(in srgb, var(--ink-sepia) 14%, transparent)" : undefined,
            paddingLeft: i > 0 ? 12 : 0,
          }}
        >
          <div
            className="tabular-nums"
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: "clamp(18px, 2.6vw, 22px)",
              lineHeight: 1.1,
              color: it.accent ? ACCENT : INK,
            }}
          >
            {it.value}
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: INK_FADED,
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
  const [shown, setShown] = useState(reduce);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const set = () => setW(el.clientWidth);
    set();
    const obs = new ResizeObserver(set);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Eén rustige 200ms fade bij mount (geen entrance-circus).
  useEffect(() => {
    if (reduce) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [reduce]);

  if (!dist.length) return null;

  const isMobile = w > 0 && w < 480;

  /* ── schaal ───────────────────────────────────────────────────────────── */
  const step = dist.length > 1 ? dist[1].bucket - dist[0].bucket : 1;
  const domainMin = dist[0].bucket - step / 2;
  const domainMax = dist[dist.length - 1].bucket + step / 2;
  const span = Math.max(1, domainMax - domainMin);

  const H = isMobile ? 190 : 230;
  const padL = 6;
  const padR = 10;
  const gridTop = 22; // ruimte voor het bovenste gridline-label
  const baseline = H - 20; // ruimte voor x-labels
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

  /* ── annotatie-plaatsing (expliciet, niet aan een library overgelaten) ── */
  const xUser = Math.max(padL + 1, Math.min(w - padR - 1, xOf(userActual)));
  const userFrac = (xUser - padL) / Math.max(1, plotW);
  // Label aan de kant met de meeste ruimte; elleboog wijst naar de lijn.
  const labelLeft = userFrac > 0.6;
  const elbow = 7;
  const tx = labelLeft ? xUser - elbow - 4 : xUser + elbow + 4;
  const tAnchor: "start" | "end" = labelLeft ? "end" : "start";

  const xMedian = xOf(median);
  const medianFrac = (xMedian - padL) / Math.max(1, plotW);
  // Mediaan-label onderin, aan de tegenovergestelde kant van het Jij-label
  // wanneer de lijnen dicht bij elkaar staan.
  const medianClose = Math.abs(medianFrac - userFrac) < 0.12;
  const medLeft = medianClose ? !labelLeft : medianFrac > 0.6;
  const mtx = medLeft ? xMedian - 6 : xMedian + 6;
  const mAnchor: "start" | "end" = medLeft ? "end" : "start";

  // x-ticks: 4 (mobiel) / 5 nette waarden uit de bins.
  const tickCount = isMobile ? 4 : 5;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    dist[Math.round((i / (tickCount - 1)) * (dist.length - 1))].bucket,
  );

  return (
    <div
      ref={wrapRef}
      className={"relative " + (className ?? "")}
      style={{
        opacity: shown ? 1 : 0,
        transition: reduce ? undefined : "opacity 200ms ease-out",
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl p-4 md:p-5"
        style={{
          background: "linear-gradient(180deg,#f5ecd3 0%,#efe4c4 100%)",
          border: "1px solid color-mix(in srgb, var(--ink-sepia) 18%, transparent)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4), 0 1px 0 rgba(58,42,26,0.06)",
        }}
      >
        {/* Paper-grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(rgba(58,42,26,0.18) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />

        {/* Mascotte — statische redactionele spot-illustratie, rechtsboven.
            Kolom-logo, geen interactie-element. */}
        <img
          src={aapDartpijl}
          alt=""
          aria-hidden
          className="animate-monkey-idle pointer-events-none select-none absolute top-3 right-3 z-10 h-[56px] sm:h-[72px] md:h-[96px] w-auto"
          style={{ filter: "drop-shadow(0 4px 8px rgba(58,42,26,0.2))" }}
        />

        <div className="relative">
          {/* Kop: titel → deck (FT-hiërarchie). Rechts vrijgehouden voor de aap. */}
          <h3
            className="pr-16 sm:pr-24 md:pr-28"
            style={{
              fontFamily: FONT_SANS,
              fontWeight: 700,
              fontSize: "clamp(16px, 3vw, 20px)",
              lineHeight: 1.2,
              color: INK,
            }}
          >
            Hoe scoort jouw team tegen {monkeyCount.toLocaleString("nl-NL")} willekeurige apen?
          </h3>
          <p
            className="pr-16 sm:pr-24 md:pr-28"
            style={{
              fontFamily: "'Source Serif 4',Georgia,serif",
              fontSize: 12,
              color: INK_FADED,
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

          {/* Key figures — FT-strook, geen kaartjes */}
          <KeyFigures mean={mean} median={median} userActual={userActual} beatPct={beatPct} />

          {/* Plot */}
          {w > 0 && (
            <svg
              width={w - (isMobile ? 0 : 0)}
              height={H}
              viewBox={`0 0 ${w} ${H}`}
              style={{ display: "block", maxWidth: "100%" }}
              role="img"
              aria-hidden
            >
              {/* Horizontale hairline-gridlines + labels erboven-links */}
              {gridVals.map((gv, i) => {
                const y = yOf(gv);
                const top = i === gridVals.length - 1;
                return (
                  <g key={gv}>
                    <line
                      x1={padL}
                      x2={w - padR}
                      y1={y}
                      y2={y}
                      stroke={INK}
                      strokeOpacity={0.14}
                      strokeWidth={1}
                    />
                    <text
                      x={padL}
                      y={y - 4}
                      fontFamily={FONT_MONO}
                      fontSize={9}
                      fill={INK_FADED}
                    >
                      {Math.round(gv)}
                      {top ? " aantal apenteams" : ""}
                    </text>
                  </g>
                );
              })}

              {/* Staven — één inkt-tint, accent alleen op de user-bin */}
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
                    fill={isUser ? ACCENT : INK}
                    fillOpacity={isUser ? 0.92 : 0.3}
                  />
                );
              })}

              {/* Mediaan — subtiele dashed hairline, direct gelabeld */}
              <line
                x1={xMedian}
                x2={xMedian}
                y1={gridTop + 6}
                y2={baseline}
                stroke={INK}
                strokeOpacity={0.45}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={mtx}
                y={baseline - 6}
                textAnchor={mAnchor}
                fontFamily={FONT_MONO}
                fontSize={9}
                fill={INK_FADED}
              >
                mediaan {Math.round(median)}
              </text>

              {/* Jij — dunne inkt-lijn over volle plothoogte + FT-annotatie */}
              <line
                x1={xUser}
                x2={xUser}
                y1={gridTop - 2}
                y2={baseline}
                stroke={INK}
                strokeWidth={1.25}
              />
              {/* elleboog */}
              <line
                x1={xUser}
                x2={labelLeft ? xUser - elbow : xUser + elbow}
                y1={gridTop + 6}
                y2={gridTop + 6}
                stroke={INK}
                strokeWidth={1}
              />
              <text
                x={tx}
                y={gridTop + 9}
                textAnchor={tAnchor}
                fontFamily={FONT_SANS}
                fontWeight={700}
                fontSize={isMobile ? 10.5 : 11.5}
                fill={INK}
              >
                Jouw team · {userActual} pt
              </text>
              <text
                x={tx}
                y={gridTop + 21}
                textAnchor={tAnchor}
                fontFamily="'Source Serif 4',Georgia,serif"
                fontStyle="italic"
                fontSize={isMobile ? 9.5 : 10}
                fill={INK_FADED}
              >
                beter dan {Math.round(beatPct)}% van de apen
              </text>

              {/* Baseline + x-labels (mono, geen tick-marks) */}
              <line
                x1={padL}
                x2={w - padR}
                y1={baseline}
                y2={baseline}
                stroke={INK}
                strokeOpacity={0.5}
                strokeWidth={1}
              />
              {ticks.map((t) => {
                const x = Math.max(padL + 8, Math.min(w - padR - 8, xOf(t)));
                return (
                  <text
                    key={t}
                    x={x}
                    y={baseline + 13}
                    textAnchor="middle"
                    fontFamily={FONT_MONO}
                    fontSize={9}
                    fill={INK_FADED}
                  >
                    {t}
                  </text>
                );
              })}
            </svg>
          )}

          {/* Bron-regel */}
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: INK_FADED,
              marginTop: 8,
            }}
          >
            Bron: {monkeyCount.toLocaleString("nl-NL")} Monte Carlo-simulaties · Koerspoule
          </p>
        </div>
      </div>
    </div>
  );
}
