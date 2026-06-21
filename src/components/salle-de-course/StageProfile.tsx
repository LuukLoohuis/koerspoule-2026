import { useMemo } from "react";
import type { StageProfileData } from "@/hooks/useResults";

/**
 * StageProfile — accuraat hoogteprofiel uit echte profile_data (geen externe
 * bronnen/AI). Stats-balk, assen in km/meters, gevuld amber-verloop met
 * steilheid-gekleurde lijnsegmenten, klim-badges (HC/1–4/neutraal, geschat
 * gemarkeerd) en groene tussensprint-markers. SVG-tekening (preserveAspectRatio
 * none → vult de box) + HTML-gepositioneerde labels (onvervormd, responsive).
 * prefers-reduced-motion: er is geen animatie.
 */

const CREAM = "rgba(237,227,204,";
const GRID = "rgba(237,227,204,0.10)";
// Steilheid-kleuren (vlak/afdaling → rood bij >9%).
const C_FLAT = "#E5B84B";   // gold (≤3% / afdaling)
const C_MID = "#D49A1A";    // amber (3–6%)
const C_STEEP = "#C2410C";  // donker-oranje (6–9%)
const C_WALL = "#DC2626";   // rood (>9%)
const SPRINT = "#22B07A";   // groen

function gradeColor(gradePct: number): string {
  if (gradePct < 3) return C_FLAT;
  if (gradePct < 6) return C_MID;
  if (gradePct < 9) return C_STEEP;
  return C_WALL;
}

function catLabel(categorie: string | null | undefined): string {
  if (categorie == null || categorie === "") return "KLIM";
  return String(categorie).toUpperCase();
}

export default function StageProfile({ data }: { data: StageProfileData }) {
  const pts = useMemo(
    () => (data.points ?? []).filter((p) => typeof p.km === "number" && typeof p.hoogte === "number"),
    [data.points],
  );

  const geom = useMemo(() => {
    if (pts.length < 2) return null;
    const totalKm = data.totalKm && data.totalKm > 0 ? data.totalKm : pts[pts.length - 1].km || 1;
    const elevs = pts.map((p) => p.hoogte);
    const dataMin = data.minEle ?? Math.min(...elevs);
    const dataMax = data.maxEle ?? Math.max(...elevs);
    const span = Math.max(1, dataMax - dataMin);
    const margin = span * 0.12;
    const lo = dataMin - margin;
    const hi = dataMax + margin;
    const range = Math.max(1, hi - lo);

    const toX = (km: number) => (Math.min(Math.max(km, 0), totalKm) / totalKm) * 100;
    const toY = (h: number) => 100 - ((h - lo) / range) * 100;

    const xy = pts.map((p) => ({ x: toX(p.km), y: toY(p.hoogte), km: p.km, h: p.hoogte }));

    // Gevuld gebied (één polygon onder de lijn).
    const area = `M ${xy[0].x.toFixed(2)} 100 ` +
      xy.map((c) => `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ") +
      ` L ${xy[xy.length - 1].x.toFixed(2)} 100 Z`;

    // Steilheid-gekleurde segmenten.
    const segments = xy.slice(1).map((c, i) => {
      const prev = xy[i];
      const dKm = Math.max(0.0001, pts[i + 1].km - pts[i].km);
      const dH = pts[i + 1].hoogte - pts[i].hoogte;
      const grade = (dH / (dKm * 1000)) * 100;
      return { d: `M ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`, color: gradeColor(grade) };
    });

    // Hoogtemeters: data of som van positieve verschillen, afgerond op tientallen.
    let climb = data.climbMeters;
    if (typeof climb !== "number") {
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const d = pts[i].hoogte - pts[i - 1].hoogte;
        if (d > 0) acc += d;
      }
      climb = Math.round(acc / 10) * 10;
    }

    // As-ticks.
    const xStep = totalKm > 220 ? 50 : 25;
    const xTicks: number[] = [0];
    for (let k = xStep; k < totalKm - xStep * 0.4; k += xStep) xTicks.push(k);
    xTicks.push(Math.round(totalKm));
    const yTicks = [dataMin, (dataMin + dataMax) / 2, dataMax].map((v) => Math.round(v));

    const hoogteOpKm = (km: number) =>
      pts.reduce((best, p) => (Math.abs(p.km - km) < Math.abs(best.km - km) ? p : best), pts[0]).hoogte;

    return { totalKm, dataMin, dataMax, climb, area, segments, toX, toY, xTicks, yTicks, hoogteOpKm };
  }, [pts, data.totalKm, data.minEle, data.maxEle, data.climbMeters]);

  if (!geom) return null;

  const cols = (data.cols ?? []).filter(
    (c) => typeof c.km === "number" && (c.km as number) >= 0 && (c.km as number) <= geom.totalKm,
  );
  const sprints = (data.sprints ?? []).filter((s) => typeof s.km === "number" && s.km >= 0 && s.km <= geom.totalKm);

  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ background: "var(--sdc-paper, #1b1712)", border: `1px solid ${CREAM}0.12)` }}
      aria-label="Hoogteprofiel van de etappe"
    >
      {/* ── Stats-balk ── */}
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: `${CREAM}0.12)`, borderBottom: `1px solid ${CREAM}0.12)` }}>
        {[
          { label: "Afstand", value: `${Math.round(geom.totalKm)} km` },
          { label: "Hoogtemeters", value: `${geom.climb} m` },
          { label: "Hoogste punt", value: `${Math.round(geom.dataMax)} m` },
        ].map((s) => (
          <div key={s.label} className="px-3 py-2 text-center" style={{ borderColor: `${CREAM}0.12)` }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: `${CREAM}0.45)` }}>{s.label}</div>
            <div className="font-display font-bold text-sm md:text-base tabular-nums" style={{ color: "#E5B84B" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Profiel + assen ── */}
      <div className="relative px-7 pt-6 pb-5">
        {/* Y-labels (meters) */}
        {geom.yTicks.map((m, i) => (
          <span
            key={`y${i}`}
            className="absolute left-0 font-mono text-[8px] leading-none"
            style={{ color: `${CREAM}0.4)`, top: `calc(${geom.toY(m)}% )`, transform: "translateY(-50%)", paddingTop: 24 }}
          >
            {m}
          </span>
        ))}

        <div className="relative w-full h-28 md:h-32">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ display: "block" }} aria-hidden>
            <defs>
              <linearGradient id="sdc-prof-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D49A1A" stopOpacity="0.36" />
                <stop offset="100%" stopColor="#D49A1A" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {/* Y-raster */}
            {geom.yTicks.map((m, i) => (
              <line key={`g${i}`} x1="0" y1={geom.toY(m)} x2="100" y2={geom.toY(m)} stroke={GRID} strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
            ))}
            {/* Baseline */}
            <line x1="0" y1="100" x2="100" y2="100" stroke={`${CREAM}0.2)`} strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
            {/* Gevuld gebied */}
            <path d={geom.area} fill="url(#sdc-prof-fill)" stroke="none" />
            {/* Steilheid-gekleurde lijnsegmenten */}
            {geom.segments.map((seg, i) => (
              <path key={`s${i}`} d={seg.d} fill="none" stroke={seg.color} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
            {/* Col-stippellijnen tot baseline */}
            {cols.map((c, i) => {
              const x = geom.toX(c.km as number);
              return <line key={`cl${i}`} x1={x} y1={geom.toY(geom.hoogteOpKm(c.km as number))} x2={x} y2="100" stroke={`${CREAM}0.4)`} strokeWidth="0.4" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />;
            })}
            {/* Sprint-tickjes op baseline */}
            {sprints.map((s, i) => {
              const x = geom.toX(s.km);
              return <line key={`sp${i}`} x1={x} y1="92" x2={x} y2="100" stroke={SPRINT} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />;
            })}
          </svg>

          {/* Klim-badges (HTML) */}
          {cols.map((c, i) => {
            const left = Math.max(0, Math.min(100, geom.toX(c.km as number)));
            const isHC = String(c.categorie).toUpperCase() === "HC";
            const neutral = c.categorie == null || c.categorie === "";
            const bg = neutral ? `${CREAM}0.18)` : isHC ? C_WALL : "#D49A1A";
            const fg = neutral ? `${CREAM}0.9)` : "#1a1408";
            const hoogte = Math.round(geom.hoogteOpKm(c.km as number));
            return (
              <div
                key={`cb${i}`}
                className="absolute -top-5 flex flex-col items-center pointer-events-none"
                style={{ left: `${left}%`, transform: "translateX(-50%)", maxWidth: 92 }}
              >
                <span className="font-mono text-[8px] leading-none truncate max-w-[88px]" style={{ color: `${CREAM}0.75)` }} title={c.naam}>
                  {c.naam} · {hoogte}m
                </span>
                <span
                  className="font-mono text-[8px] font-bold leading-none px-1 py-0.5 rounded-sm mt-0.5"
                  style={{ background: bg, color: fg, border: c.geschat ? `1px dashed ${CREAM}0.6)` : "none" }}
                  title={c.geschat ? "Geschatte categorie (geen officiële code)" : undefined}
                >
                  {c.geschat ? "~" : ""}{catLabel(c.categorie)}
                </span>
              </div>
            );
          })}
        </div>

        {/* X-as (km) */}
        <div className="relative mt-1 h-3">
          {geom.xTicks.map((km, i) => (
            <span
              key={`x${i}`}
              className="absolute font-mono text-[8px] leading-none"
              style={{ color: `${CREAM}0.4)`, left: `${geom.toX(km)}%`, transform: i === 0 ? "none" : i === geom.xTicks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
            >
              {km}
            </span>
          ))}
        </div>

        {/* Tussensprint-markers (groen, onder de as) */}
        {sprints.length > 0 && (
          <div className="relative mt-1 h-4">
            {sprints.map((s, i) => (
              <div
                key={`spm${i}`}
                className="absolute flex items-center gap-1 pointer-events-none"
                style={{ left: `${geom.toX(s.km)}%`, transform: "translateX(-50%)" }}
              >
                <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: SPRINT }} />
                <span className="font-mono text-[8px] leading-none whitespace-nowrap" style={{ color: SPRINT }}>
                  {s.naam} · km {Math.round(s.km)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
