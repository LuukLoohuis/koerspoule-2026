import { useMemo } from "react";
import type { StageProfileData } from "@/hooks/useResults";

/**
 * StageProfile — accuraat hoogteprofiel uit echte profile_data (geen verzonnen
 * data). SVG-area (preserveAspectRatio none, vaste box) + HTML-gepositioneerde
 * col-markers/labels (zo blijven labels onvervormd en responsive). Salle de
 * Course-amber. prefers-reduced-motion: geen animatie (er is er ook geen).
 */
const AMBER = "#D49A1A";
const PAPER = "rgba(237,227,204,";

const CAT_LABEL: Record<string, string> = {
  HC: "HC",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
};

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
    // SVG-coords in een 100x100 box (preserveAspectRatio none → vult de container)
    const xy = pts.map((p) => {
      const x = (Math.min(p.km, totalKm) / totalKm) * 100;
      const y = 100 - ((p.hoogte - lo) / range) * 100;
      return { x, y };
    });
    const line = xy.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
    const area = `${line} L 100 100 L 0 100 Z`;
    return { totalKm, dataMin, dataMax, line, area };
  }, [pts, data.totalKm, data.minEle, data.maxEle]);

  if (!geom) return null;
  const cols = (data.cols ?? []).filter((c) => typeof c.km === "number" && c.km <= geom.totalKm);

  return (
    <div className="relative w-full h-24 md:h-28" aria-label="Hoogteprofiel van de etappe">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
        aria-hidden
      >
        <defs>
          <linearGradient id="sdc-prof-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AMBER} stopOpacity="0.34" />
            <stop offset="100%" stopColor={AMBER} stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <line x1="0" y1="99.6" x2="100" y2="99.6" stroke={`${PAPER}0.18)`} strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
        <path d={geom.area} fill="url(#sdc-prof-fill)" stroke="none" />
        <path
          d={geom.line}
          fill="none"
          stroke={AMBER}
          strokeWidth="1.1"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Col-markers (HTML, onvervormd) */}
      {cols.map((c, i) => {
        const left = Math.max(0, Math.min(100, (c.km / geom.totalKm) * 100));
        const cat = CAT_LABEL[String(c.categorie)] ?? String(c.categorie);
        return (
          <div
            key={`${c.km}-${i}`}
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
            style={{ left: `${left}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-px flex-1" style={{ background: `${PAPER}0.35)` }} />
            <div className="flex items-center gap-1 pb-0.5">
              <span
                className="font-mono text-[8px] leading-none px-1 py-0.5 rounded-sm"
                style={{ background: AMBER, color: "#1a1408" }}
              >
                {cat}
              </span>
              <span
                className="font-mono text-[8px] leading-none max-w-[64px] truncate"
                style={{ color: `${PAPER}0.7)` }}
                title={c.naam}
              >
                {c.naam}
              </span>
            </div>
          </div>
        );
      })}

      {/* Km-as + hoogte-labels */}
      <span className="absolute left-0 bottom-0 font-mono text-[8px] leading-none" style={{ color: `${PAPER}0.4)` }}>
        0&nbsp;km
      </span>
      <span className="absolute right-3.5 bottom-0 font-mono text-[8px] leading-none" style={{ color: `${PAPER}0.4)` }}>
        {Math.round(geom.totalKm)}&nbsp;km
      </span>
      <span className="absolute left-0 top-0 font-mono text-[8px] leading-none" style={{ color: `${PAPER}0.4)` }}>
        {Math.round(geom.dataMax)}&nbsp;m
      </span>

      {/* Finishvlag rechts */}
      <div className="absolute right-0 top-1 flex flex-col items-center pointer-events-none">
        <div className="grid grid-cols-2 grid-rows-2" style={{ width: 8, height: 8 }}>
          {[0, 1, 2, 3].map((n) => (
            <span key={n} style={{ background: (n === 0 || n === 3) ? `${PAPER}0.85)` : "transparent" }} />
          ))}
        </div>
        <div className="w-px flex-1" style={{ background: `${PAPER}0.5)`, height: 14 }} />
      </div>
    </div>
  );
}
