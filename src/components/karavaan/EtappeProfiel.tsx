export type ProfielPunt = { km: number; hoogte: number; label?: string; soort?: string };
export type ProfielData = {
  afstandKm: number;
  hoogtemeters: number | null;
  start: string;
  finish: string;
  punten: ProfielPunt[];
};

const W = 1000;
const H = 260;
const M = { top: 26, right: 14, bottom: 26, left: 14 };

/**
 * Strakke, thema-gekleurde SVG van een etappeprofiel, getekend uit kernpunten
 * (km/hoogte) die door het vision-model uit het bronbeeld zijn gelezen.
 */
export default function EtappeProfiel({ data }: { data: ProfielData }) {
  const punten = [...(data.punten ?? [])].filter((p) => Number.isFinite(p.km) && Number.isFinite(p.hoogte)).sort((a, b) => a.km - b.km);
  if (punten.length < 2) return null;

  const afstand = data.afstandKm || punten[punten.length - 1].km || 1;
  const hoogtes = punten.map((p) => p.hoogte);
  const minH = Math.min(...hoogtes);
  const maxH = Math.max(...hoogtes);
  const padH = Math.max(20, (maxH - minH) * 0.12);
  const lo = minH - padH;
  const hi = maxH + padH;

  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const x = (km: number) => M.left + (Math.min(Math.max(km, 0), afstand) / afstand) * innerW;
  const y = (h: number) => M.top + innerH - ((h - lo) / (hi - lo || 1)) * innerH;
  const baseline = M.top + innerH;

  const linePts = punten.map((p) => `${x(p.km).toFixed(1)},${y(p.hoogte).toFixed(1)}`);
  const linePath = `M ${linePts.join(" L ")}`;
  const areaPath = `M ${x(punten[0].km).toFixed(1)},${baseline.toFixed(1)} L ${linePts.join(" L ")} L ${x(punten[punten.length - 1].km).toFixed(1)},${baseline.toFixed(1)} Z`;

  // Te labelen punten: toppen/klimmen + finish (anders te druk).
  const labelPunten = punten.filter((p) => ["top", "klim", "finish"].includes(String(p.soort)) && (p.label?.trim() || p.soort === "finish"));

  const kmTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(afstand * f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Profiel ${data.start} → ${data.finish}`}>
      <defs>
        <linearGradient id="profielVlak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.38" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* basislijn */}
      <line x1={M.left} y1={baseline} x2={W - M.right} y2={baseline} stroke="hsl(var(--foreground) / 0.18)" strokeWidth={1} />

      {/* km-ticks */}
      {kmTicks.map((km, i) => (
        <text key={i} x={x(km)} y={H - 6} textAnchor={i === 0 ? "start" : i === kmTicks.length - 1 ? "end" : "middle"} className="fill-muted-foreground" style={{ fontSize: 13, fontFamily: "monospace" }}>
          {km}
        </text>
      ))}

      {/* vlak + lijn */}
      <path d={areaPath} fill="url(#profielVlak)" />
      <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* markers + labels voor toppen/finish */}
      {labelPunten.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.km)} cy={y(p.hoogte)} r={3.2} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1.5} />
          <text x={x(p.km)} y={y(p.hoogte) - 8} textAnchor="middle" className="fill-foreground" style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>
            {p.soort === "finish" ? (data.finish || "Finish") : p.label}
          </text>
          <text x={x(p.km)} y={y(p.hoogte) - 21} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10, fontFamily: "monospace" }}>
            {Math.round(p.hoogte)}m
          </text>
        </g>
      ))}

      {/* start- en finish-vlaggen */}
      <g>
        <circle cx={x(0)} cy={y(punten[0].hoogte)} r={4} fill="hsl(var(--vintage-gold))" stroke="hsl(var(--background))" strokeWidth={1.5} />
        <text x={x(0)} y={baseline + 18} textAnchor="start" className="fill-foreground" style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>
          {data.start || "Start"}
        </text>
      </g>
    </svg>
  );
}
