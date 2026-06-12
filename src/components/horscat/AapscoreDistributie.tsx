/**
 * <AapscoreDistributie>
 *
 * Financial-grade verdelingsgrafiek: waar valt jouw team tussen 5.000
 * willekeurige "apenteams". Div-based staven (geen Recharts) voor volledige
 * styling-controle, met een KPI-header van drie tegels erboven.
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

const ACCENT = "hsl(var(--primary))";
const GOLD = "hsl(var(--vintage-gold))";
const BAR = "hsl(var(--ink-sepia) / 0.22)"; // warm greige op het salmon-papier
const CARD_BG = "#FFF1E5";

const FONT_SANS = "'Inter','DM Sans',sans-serif";
const FONT_MONO = "'JetBrains Mono',monospace";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Nette bovengrens voor de y-as. */
function niceCeil(v: number): number {
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** rAF count-up 0 → target; reduced-motion → direct. */
function useCountUp(target: number, duration = 900, reduce = false): number {
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) {
      setV(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      setV(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return v;
}

/* ── KPI-header: drie tegels met verticale dividers ──────────────────────── */
function StatsHeader({
  beaten,
  monkeyCount,
  avg,
  delta,
  reduce,
}: {
  beaten: number;
  monkeyCount: number;
  avg: number;
  delta: number;
  reduce: boolean;
}) {
  const aBeaten = useCountUp(beaten, 1100, reduce);
  const aAvg = useCountUp(avg, 1100, reduce);
  const aDelta = useCountUp(Math.abs(delta), 1100, reduce);

  const deltaColor = delta > 0 ? "#059669" : delta < 0 ? "#E11D48" : "var(--ink-faded)";
  const deltaPrefix = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  const deltaLabel = delta > 0 ? "Boven gem. aap" : delta < 0 ? "Onder gem. aap" : "Gem. aap";

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        fontFamily: FONT_MONO,
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--ink-faded)",
        marginTop: 6,
      }}
      className="max-[420px]:text-[8px]"
    >
      {children}
    </div>
  );

  const bigCls =
    "font-display font-extrabold tabular-nums leading-none text-3xl max-[420px]:text-2xl";

  return (
    <div className="grid grid-cols-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      {/* 1 — Apen verslagen (hero) */}
      <div className="py-5 pr-3">
        <div className={bigCls} style={{ color: ACCENT }}>
          {aBeaten.toLocaleString("nl-NL")}
          <span className="font-display text-xl text-muted-foreground">{" / "}</span>
          {monkeyCount.toLocaleString("nl-NL")}
        </div>
        <Label>Apen verslagen</Label>
      </div>

      {/* 2 — Gem. score aap */}
      <div className="py-5 px-3" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
        <div className={bigCls} style={{ color: "hsl(var(--foreground))" }}>
          {aAvg.toLocaleString("nl-NL")}
          <span className="text-lg text-muted-foreground"> pt</span>
        </div>
        <Label>Gem. score aap</Label>
      </div>

      {/* 3 — Boven / onder gem. aap */}
      <div className="py-5 pl-3" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
        <div className={bigCls} style={{ color: deltaColor }}>
          {deltaPrefix}
          {aDelta.toLocaleString("nl-NL")}
          <span className="text-lg" style={{ opacity: 0.7 }}> pt</span>
        </div>
        <Label>{deltaLabel}</Label>
      </div>
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
  const fracOf = (v: number) => Math.max(0, Math.min(1, (v - domainMin) / span));

  const maxCount = Math.max(...dist.map((b) => b.count), 1);
  const yMax = niceCeil(maxCount);
  // 4 gridlines (incl. top); waarden van boven naar beneden
  const gridFracs = [1, 0.75, 0.5, 0.25];

  const userBin = dist.reduce((best, b) =>
    Math.abs(b.bucket - userActual) < Math.abs(best.bucket - userActual) ? b : best,
  ).bucket;
  const userFrac = fracOf(userActual);
  const meanFrac = fracOf(mean);

  // Balloon-uitlijning t.o.v. de plot-rand
  const balloonAlign = userFrac > 0.72 ? "right" : userFrac < 0.28 ? "left" : "center";

  const chartH = isMobile ? 180 : 220;

  // x-ticks: 4 (mobiel) / 6 (desktop), even verspreid uit de bins
  const tickCount = isMobile ? 4 : 6;
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    dist[Math.round((i / (tickCount - 1)) * (dist.length - 1))].bucket,
  );

  const beaten = Math.round((beatPct / 100) * monkeyCount);
  const delta = userActual - Math.round(mean);

  return (
    <div ref={wrapRef} className={"relative " + (className ?? "")}>
      <div
        className="relative rounded-xl p-4 md:p-5"
        style={{ background: CARD_BG, border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Mascotte — ongewijzigd */}
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
            style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: 18, lineHeight: 1.25, color: "#111111" }}
          >
            Hoe scoort jouw team tegen {monkeyCount.toLocaleString("nl-NL")} willekeurige apen?
          </h3>
          <p className="pr-28 md:pr-48" style={{ fontFamily: FONT_SANS, fontSize: 13, color: "#666", marginTop: 3 }}>
            Verdeling van gesimuleerde apenteams, zelfde puntentelling als jouw ploeg
          </p>

          <p className="sr-only">
            Verdeling van {monkeyCount.toLocaleString("nl-NL")} simulaties; jij verslaat{" "}
            {beaten.toLocaleString("nl-NL")} apen, de gemiddelde aap scoort {Math.round(mean)} punten.
          </p>

          {/* ── PART 1 — KPI-header ── */}
          <StatsHeader
            beaten={beaten}
            monkeyCount={monkeyCount}
            avg={Math.round(mean)}
            delta={delta}
            reduce={reduce}
          />

          {/* ── PART 2 — Histogram (div-based) ── */}
          <div className="mt-4">
            {/* y-as caption */}
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "var(--ink-faded)", marginBottom: 4 }}>
              Aantal apenteams
            </div>

            <div className="relative" style={{ height: chartH }}>
              {/* gridlines + labels top-left */}
              {gridFracs.map((f) => (
                <div
                  key={f}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ bottom: `${f * 100}%`, transform: "translateY(50%)" }}
                >
                  <div
                    className="w-full"
                    style={{ borderTop: "1px dashed hsl(var(--border) / 0.5)" }}
                  />
                  <span
                    className="absolute -top-3 left-0 tabular-nums"
                    style={{ fontFamily: FONT_MONO, fontSize: 10, color: "var(--ink-faded)" }}
                  >
                    {Math.round(yMax * f)}
                  </span>
                </div>
              ))}

              {/* gemiddelde-marker (dashed) */}
              <div
                aria-hidden
                className="absolute top-0 bottom-0"
                style={{
                  left: `${meanFrac * 100}%`,
                  borderLeft: "1px dashed hsl(var(--muted-foreground) / 0.35)",
                }}
              />

              {/* staven */}
              <div className="absolute inset-0 flex items-end gap-px">
                {dist.map((b, i) => {
                  const hPct = (b.count / yMax) * 100;
                  const isUser = b.bucket === userBin;
                  return (
                    <div
                      key={b.bucket}
                      className="flex-1"
                      style={{
                        height: `${hPct}%`,
                        background: isUser ? ACCENT : BAR,
                        transformOrigin: "bottom",
                        transform: mounted ? "scaleY(1)" : "scaleY(0)",
                        transition: reduce ? undefined : `transform 320ms ease-out ${i * 6}ms`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Jouw-team annotatie (stem + balloon) */}
              <div
                className="absolute"
                style={{ left: `${userFrac * 100}%`, top: 0, bottom: 0, width: 0 }}
              >
                {/* stem */}
                <div
                  aria-hidden
                  className="absolute"
                  style={{ left: 0, top: 0, bottom: 0, borderLeft: `1px solid ${GOLD}` }}
                />
                {/* punt op de bar-top */}
                <span
                  aria-hidden
                  className="absolute rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: GOLD,
                    left: -2.5,
                    bottom: `${(userBinCount(dist, userBin) / yMax) * 100}%`,
                  }}
                />
                {/* balloon */}
                <div
                  className="absolute"
                  style={{
                    top: -2,
                    left: balloonAlign === "center" ? "50%" : balloonAlign === "right" ? "auto" : 0,
                    right: balloonAlign === "right" ? 0 : "auto",
                    transform: balloonAlign === "center" ? "translateX(-50%)" : undefined,
                    opacity: mounted ? 1 : 0,
                    transition: reduce ? undefined : "opacity 120ms ease-out 350ms",
                  }}
                >
                  <div
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--vintage-gold) / 0.5)",
                      borderRadius: 8,
                      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
                      padding: "6px 10px",
                      width: isMobile ? 130 : "max-content",
                      maxWidth: isMobile ? 130 : 200,
                    }}
                  >
                    <div style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: isMobile ? 12 : 14, color: "hsl(var(--foreground))" }}>
                      Jouw team
                    </div>
                    <div
                      className="tabular-nums"
                      style={{ fontFamily: FONT_SANS, fontWeight: 800, fontSize: isMobile ? 16 : 20, color: GOLD, lineHeight: 1.1 }}
                    >
                      {userActual} pt
                    </div>
                    <div style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontStyle: "italic", fontSize: 11, color: "var(--ink-faded)", marginTop: 1 }}>
                      beter dan {Math.round(beatPct)}% van de apen
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* x-as: baseline + ticks */}
            <div style={{ borderTop: "1px solid hsl(var(--foreground) / 0.15)" }} />
            <div className="relative h-4 mt-1">
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute tabular-nums"
                  style={{
                    left: `${fracOf(t) * 100}%`,
                    transform: "translateX(-50%)",
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "var(--ink-faded)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t}
                </span>
              ))}
              {/* gemiddelde-label onder de baseline */}
              <span
                className="absolute tabular-nums"
                style={{
                  left: `${meanFrac * 100}%`,
                  transform: "translateX(-50%)",
                  top: 14,
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: "var(--ink-faded)",
                  whiteSpace: "nowrap",
                }}
              >
                gemiddelde {Math.round(mean)}
              </span>
            </div>
          </div>

          {/* Bron */}
          <p style={{ fontFamily: FONT_MONO, fontSize: 9, color: "var(--ink-faded)", marginTop: 18 }}>
            Bron: {monkeyCount.toLocaleString("nl-NL")} Monte Carlo-simulaties · Koerspoule
          </p>
        </div>
      </div>
    </div>
  );
}

/** Count van de user-bin (voor de hoogte van de stem-punt). */
function userBinCount(dist: DistBin[], bucket: number): number {
  return dist.find((b) => b.bucket === bucket)?.count ?? 0;
}
