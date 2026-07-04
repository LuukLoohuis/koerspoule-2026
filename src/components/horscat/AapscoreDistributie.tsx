/**
 * <AapscoreDistributie>
 *
 * Premium, editorial verdelingsgrafiek: waar valt jouw team tussen ~5.000
 * willekeurige "apenteams". Div-based staven, ruime witruimte, full-width
 * y/x-as labels, gouden user-bin met balloon-annotatie.
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

const GOLD = "hsl(var(--vintage-gold))";
const BAR = "color-mix(in srgb, var(--ink-sepia) 65%, transparent)";
const BAR_TOP = "color-mix(in srgb, var(--ink-sepia) 90%, transparent)";
const CARD_BG = "#FFF1E5";

const FONT_SANS = "'Inter','DM Sans',sans-serif";
const FONT_SERIF = "'Source Serif 4',Georgia,serif";
const FONT_MONO = "'JetBrains Mono',monospace";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function niceCeil(v: number): number {
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

/** Genereer "ronde" ticks (200/400/500-step) binnen het domein. */
function makeTicks(min: number, max: number, target: number): number[] {
  const span = max - min;
  const rawStep = span / (target - 1);
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const niceStep = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const start = Math.ceil(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = start; v <= max + 0.0001; v += niceStep) ticks.push(Math.round(v));
  return ticks;
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
  // Geen grow-/fade-in-animatie meer (bewust): alles staat direct in eindstand.
  const mounted = true;

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const set = () => setW(el.clientWidth);
    set();
    const obs = new ResizeObserver(set);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!dist.length) return null;

  const isMobile = w > 0 && w < 560;

  /* ── schaal ───────────────────────────────────────────────────────────── */
  const step = dist.length > 1 ? dist[1].bucket - dist[0].bucket : 1;
  const domainMin = dist[0].bucket - step / 2;
  const domainMax = dist[dist.length - 1].bucket + step / 2;
  const span = Math.max(1, domainMax - domainMin);
  const fracOf = (v: number) => Math.max(0, Math.min(1, (v - domainMin) / span));

  const maxCount = Math.max(...dist.map((b) => b.count), 1);
  const yMax = niceCeil(maxCount);
  const gridFracs = [1, 0.75, 0.5, 0.25, 0]; // 5 lijnen incl. baseline

  const userBin = dist.reduce((best, b) =>
    Math.abs(b.bucket - userActual) < Math.abs(best.bucket - userActual) ? b : best,
  ).bucket;
  const userBinCount = dist.find((b) => b.bucket === userBin)?.count ?? 0;
  const userFrac = fracOf(userActual);
  const meanFrac = fracOf(mean);

  // Balloon-uitlijning t.o.v. de plot-rand
  const balloonAlign: "left" | "center" | "right" =
    userFrac > 0.85 ? "right" : userFrac < 0.15 ? "left" : "center";

  const chartH = isMobile ? 240 : 340;
  const yGutter = isMobile ? 44 : 56;

  // x-ticks
  const ticks = makeTicks(dist[0].bucket, dist[dist.length - 1].bucket, isMobile ? 4 : 7);

  return (
    <div ref={wrapRef} className={"relative " + (className ?? "")}>
      <div
        className="relative rounded-xl"
        style={{
          background: CARD_BG,
          border: "1px solid rgba(0,0,0,0.08)",
          padding: isMobile ? 20 : 40,
        }}
      >
        {/* Mascotte — klein, rechtsboven, niet over de chart */}
        <img
          src={aapDartpijl}
          alt=""
          aria-hidden
          className="pointer-events-none select-none absolute"
          style={{
            top: isMobile ? 8 : 12,
            right: isMobile ? 12 : 24,
            height: isMobile ? 140 : 180,
            width: "auto",
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.18))",
            opacity: mounted ? 1 : 0,
            transition: reduce ? undefined : "opacity 200ms ease-out 200ms",
            zIndex: 2,
          }}
        />

        {/* Titel-blok verwijderd (was "Verdeling simulaties" + subtitel); spacer
            houdt de mascotte-clearance boven de KPI-tegels intact. */}
        <div style={{ paddingRight: isMobile ? 140 : 200, minHeight: isMobile ? 44 : 24 }} />

        <p className="sr-only">
          Jij verslaat {Math.round((beatPct / 100) * monkeyCount).toLocaleString("nl-NL")}{" "}
          van de {monkeyCount.toLocaleString("nl-NL")} apen; gemiddelde aap scoort{" "}
          {Math.round(mean)} punten.
        </p>

        {/* ── KPI-header: drie tegels boven de grafiek ── */}
        {(() => {
          const beaten = Math.round((beatPct / 100) * monkeyCount);
          const avg = Math.round(mean);
          const delta = userActual - avg;
          const Label = ({ children }: { children: React.ReactNode }) => (
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-faded)",
                marginTop: 5,
              }}
            >
              {children}
            </div>
          );
          const big = "font-display font-extrabold tabular-nums leading-none text-3xl max-[420px]:text-2xl";
          return (
            <div
              className="grid grid-cols-3 py-4"
              style={{
                marginTop: isMobile ? 16 : 24,
                borderBottom: "1px solid hsl(var(--border))",
              }}
            >
              <div className="pr-3">
                <div className={big} style={{ color: "hsl(var(--primary))" }}>
                  {beaten.toLocaleString("nl-NL")}
                  <span className="text-xl font-medium text-muted-foreground">
                    {" / "}{monkeyCount.toLocaleString("nl-NL")}
                  </span>
                </div>
                <Label>Apen verslagen</Label>
              </div>
              <div className="px-3" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
                <div className={big} style={{ color: "hsl(var(--foreground))" }}>
                  {avg.toLocaleString("nl-NL")}
                  <span className="text-xl font-medium text-muted-foreground"> pt</span>
                </div>
                <Label>Gem. score aap</Label>
              </div>
              <div className="pl-3" style={{ borderLeft: "1px solid hsl(var(--border))" }}>
                <div
                  className={big}
                  style={{ color: delta > 0 ? "#059669" : delta < 0 ? "#E11D48" : "var(--ink-faded)" }}
                >
                  {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
                  {Math.abs(delta).toLocaleString("nl-NL")}
                  <span className="text-xl font-medium text-muted-foreground"> pt</span>
                </div>
                <Label>{delta >= 0 ? "Boven gem. aap" : "Onder gem. aap"}</Label>
              </div>
            </div>
          );
        })()}

        {/* y-as caption */}
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "var(--ink-faded)",
            marginTop: isMobile ? 16 : 20,
            paddingLeft: yGutter,
          }}
        >
          Aantal apenteams
        </div>

        {/* PLOT-AREA */}
        <div
          className="relative"
          style={{ height: chartH, marginTop: 10, paddingLeft: yGutter }}
        >
          {/* gridlines + y-labels */}
          {gridFracs.map((f) => {
            const isBaseline = f === 0;
            return (
              <div
                key={f}
                className="absolute"
                style={{
                  left: 0,
                  right: 0,
                  bottom: `${f * 100}%`,
                  height: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: yGutter,
                    right: 0,
                    borderTop: isBaseline
                      ? "1px solid hsl(var(--foreground) / 0.45)"
                      : "1px dashed hsl(var(--border) / 0.55)",
                  }}
                />
                <span
                  className="tabular-nums"
                  style={{
                    position: "absolute",
                    left: 0,
                    width: yGutter - 10,
                    textAlign: "right",
                    transform: "translateY(-50%)",
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: "var(--ink-faded)",
                  }}
                >
                  {Math.round(yMax * f).toLocaleString("nl-NL")}
                </span>
              </div>
            );
          })}

          {/* gemiddelde-marker (dun, neutraal) */}
          <div
            aria-hidden
            className="absolute top-0 bottom-0"
            style={{
              left: `calc(${yGutter}px + (100% - ${yGutter}px) * ${meanFrac})`,
              borderLeft: "1px dashed hsl(var(--muted-foreground) / 0.28)",
            }}
          />

          {/* staven (binnen het plot-gebied rechts van y-gutter) */}
          <div
            className="absolute inset-y-0 flex items-end"
            style={{ left: yGutter, right: 0, gap: 1 }}
          >
            {dist.map((b, i) => {
              const hPct = (b.count / yMax) * 100;
              const isUser = b.bucket === userBin;
              return (
                <div
                  key={b.bucket}
                  className="flex-1"
                  style={{
                    height: `${hPct}%`,
                    // Staart-bins met lage counts zakten onder de 1px en
                    // verdwenen — daardoor leek de bell-curve afgekapt.
                    // Elke bin met data blijft minimaal 2px zichtbaar.
                    minHeight: b.count > 0 ? 2 : 0,
                    background: isUser ? GOLD : BAR,
                    borderTop: isUser ? undefined : `1px solid ${BAR_TOP}`,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    transformOrigin: "bottom",
                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                    transition: reduce ? undefined : `transform 380ms ease-out ${i * 8}ms`,
                  }}
                />
              );
            })}
          </div>

          {/* Jouw-team annotatie */}
          <div
            className="absolute"
            style={{
              left: `calc(${yGutter}px + (100% - ${yGutter}px) * ${userFrac})`,
              top: 0,
              bottom: 0,
              width: 0,
            }}
          >
            {/* stem */}
            <div
              aria-hidden
              className="absolute"
              style={{
                left: 0,
                bottom: `${(userBinCount / yMax) * 100}%`,
                top: 0,
                borderLeft: `1.5px solid ${GOLD}`,
              }}
            />
            {/* punt op bar-top */}
            <span
              aria-hidden
              className="absolute rounded-full"
              style={{
                width: 8,
                height: 8,
                background: GOLD,
                left: -4,
                bottom: `calc(${(userBinCount / yMax) * 100}% - 4px)`,
                boxShadow: "0 0 0 3px rgba(255,255,255,0.7)",
              }}
            />
            {/* balloon */}
            <div
              className="absolute"
              style={{
                top: -8,
                left:
                  balloonAlign === "center"
                    ? "50%"
                    : balloonAlign === "right"
                      ? "auto"
                      : 0,
                right: balloonAlign === "right" ? 0 : "auto",
                transform: balloonAlign === "center" ? "translateX(-50%)" : undefined,
                opacity: mounted ? 1 : 0,
                transition: reduce ? undefined : "opacity 160ms ease-out 380ms",
              }}
            >
              <div
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--vintage-gold) / 0.45)",
                  borderRadius: 10,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  padding: isMobile ? "10px 12px" : "12px 16px",
                  width: isMobile ? 150 : "max-content",
                  maxWidth: isMobile ? 150 : 220,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 600,
                    fontSize: 13,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Jouw team
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontFamily: FONT_SANS,
                    fontWeight: 800,
                    fontSize: isMobile ? 22 : 28,
                    color: GOLD,
                    lineHeight: 1.1,
                    marginTop: 2,
                  }}
                >
                  {userActual}
                  <span style={{ fontSize: isMobile ? 14 : 16, marginLeft: 4, fontWeight: 500 }}>
                    pt
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: FONT_SERIF,
                    fontStyle: "italic",
                    fontSize: 12,
                    color: "var(--ink-faded)",
                    marginTop: 4,
                  }}
                >
                  beter dan {Math.round(beatPct)}% van de apen
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* x-as ticks */}
        <div
          className="relative"
          style={{ height: 20, marginTop: 6, paddingLeft: yGutter }}
        >
          <div className="relative h-full">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute tabular-nums"
                style={{
                  left: `${fracOf(t) * 100}%`,
                  transform: "translateX(-50%)",
                  top: 0,
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  color: "var(--ink-faded)",
                  whiteSpace: "nowrap",
                }}
              >
                {t.toLocaleString("nl-NL")}
              </span>
            ))}
          </div>
        </div>

        {/* x-as titel */}
        <div
          style={{
            textAlign: "center",
            marginTop: 14,
            paddingLeft: yGutter,
            fontFamily: FONT_SANS,
            fontSize: 12,
            color: "var(--ink-faded)",
          }}
        >
          Score (punten)
        </div>

        {/* Bron */}
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            color: "var(--ink-faded)",
            marginTop: 18,
          }}
        >
          Bron: {monkeyCount.toLocaleString("nl-NL")} Monte Carlo-simulaties · Koerspoule
        </p>
      </div>
    </div>
  );
}
