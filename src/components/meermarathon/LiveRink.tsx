import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveGroup } from "@/lib/liveMarathon";
import {
  FINISH_FRACTION,
  offsetFromCenter,
  placeRiders,
  rinkPath,
  RINK_CENTER,
  tierColor,
} from "@/lib/liveRink";

/**
 * De baan met de actuele posities.
 *
 * Rijders met ronde-voorsprong liggen op een eigen baan naar buiten: fysiek
 * rijden ze op dezelfde plek als het peloton, dus zonder eigen baan zouden ze
 * op elkaar vallen en zou de kop onzichtbaar worden.
 */
export default function LiveRink({
  groups,
  ijsType,
  mineBeennummers,
  rondeLengte,
  baanNaam,
  rondeLabel,
}: {
  groups: LiveGroup[];
  ijsType: string | null;
  mineBeennummers: Set<string>;
  rondeLengte: number | null;
  baanNaam: string;
  rondeLabel: string | null;
}) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(0);
  const d = rinkPath(ijsType);

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, [d]);

  const placements = useMemo(() => placeRiders(groups), [groups]);

  // Zonder padlengte kunnen we nog niets positioneren (eerste render).
  const points = useMemo(() => {
    const el = pathRef.current;
    if (!el || pathLength === 0) return [];
    return placements.map((p) => {
      const raw = el.getPointAtLength(p.fraction * pathLength);
      const pos = offsetFromCenter({ x: raw.x, y: raw.y }, p.offset);
      return { ...p, ...pos };
    });
  }, [placements, pathLength]);

  const finish = useMemo(() => {
    const el = pathRef.current;
    if (!el || pathLength === 0) return null;
    const a = el.getPointAtLength(FINISH_FRACTION * pathLength);
    const b = el.getPointAtLength(((FINISH_FRACTION + 0.01) % 1) * pathLength);
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    // Loodrecht op de rijrichting, zodat de lijn bij elke baanvorm klopt.
    const nx = -ty / len;
    const ny = tx / len;
    const label = offsetFromCenter({ x: a.x, y: a.y }, 42);
    return {
      x1: a.x - nx * 26, y1: a.y - ny * 26,
      x2: a.x + nx * 26, y2: a.y + ny * 26,
      lx: Math.max(50, Math.min(262, label.x)),
      ly: Math.max(14, Math.min(226, label.y)),
    };
  }, [pathLength]);

  const leader = groups[0]?.leden[0]?.rider.beennummer ?? null;

  return (
    <svg
      viewBox="0 0 340 232"
      className="block h-auto w-full"
      role="img"
      aria-label={`Baan met de actuele posities van de rijders op ${baanNaam}`}
    >
      <defs>
        <linearGradient id="mm-sky" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fbfeff" /><stop offset="1" stopColor="#dceffb" />
        </linearGradient>
        <linearGradient id="mm-ice" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#eefaff" />
          <stop offset="0.45" stopColor="#cfe8f8" />
          <stop offset="1" stopColor="#aed6ef" />
        </linearGradient>
        <filter id="mm-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0b3a66" floodOpacity="0.2" />
        </filter>
        <filter id="mm-dot" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodColor="#062a4d" floodOpacity="0.42" />
        </filter>
      </defs>

      <rect width="340" height="232" fill="url(#mm-sky)" />
      <g filter="url(#mm-shadow)">
        <path d={d} fill="none" stroke="#ffffff" strokeWidth="52" />
      </g>
      <path ref={pathRef} d={d} fill="none" stroke="url(#mm-ice)" strokeWidth="47" />
      <path d={d} fill="none" stroke="#ffffff" strokeWidth="1.1" strokeDasharray="4 8" opacity="0.8" />

      {finish && (
        <>
          <line
            x1={finish.x1} y1={finish.y1} x2={finish.x2} y2={finish.y2}
            stroke="#0b4c91" strokeWidth="2.6" strokeLinecap="round"
          />
          <text
            x={finish.lx} y={finish.ly} textAnchor="middle" dominantBaseline="middle"
            fontFamily="'JetBrains Mono', monospace" fontSize="7.5" fill="#0b4c91" letterSpacing="1"
          >
            START / FINISH
          </text>
        </>
      )}

      <text
        x={RINK_CENTER.x - 6} y={RINK_CENTER.y - 3} textAnchor="middle"
        fontFamily="Oswald, sans-serif" fontSize="11" fill="rgba(11,76,145,.32)" letterSpacing="2.5"
      >
        {baanNaam.toUpperCase()}
      </text>
      <text
        x={RINK_CENTER.x - 6} y={RINK_CENTER.y + 11} textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace" fontSize="7.5" fill="rgba(11,76,145,.28)" letterSpacing="1.2"
      >
        {[
          ijsType === "natuurijs" ? "NATUURIJS" : "KUNSTIJS",
          rondeLengte ? `${rondeLengte} M` : null,
          rondeLabel,
        ].filter(Boolean).join(" · ")}
      </text>

      {/* Genummerde schijfjes in plaats van kale stippen: op een baan met
          veertig rijders wil je zien wie waar zit, en het beennummer is waar
          een schaatsvolger op stuurt. Witte rand plus donkere ring houdt ze
          leesbaar op het lichte ijs, ook waar een pak dicht op elkaar rijdt. */}
      {[...points]
        // Koplopers als laatste tekenen zodat ze bovenop liggen; eigen rijders
        // helemaal bovenop.
        .sort((a, b) => {
          const am = mineBeennummers.has(a.beennummer) ? 1 : 0;
          const bm = mineBeennummers.has(b.beennummer) ? 1 : 0;
          if (am !== bm) return am - bm;
          return b.tier - a.tier;
        })
        .map((p) => {
          const mine = mineBeennummers.has(p.beennummer);
          const isLeader = p.beennummer === leader;
          const fill = mine ? "#d81f26" : isLeader ? "#e0a020" : tierColor(p.tier);
          const r = mine ? 7.2 : 6.2;
          return (
            <g key={p.beennummer}>
              {/* Eigen rijders krijgen een zachte gloed, zodat je ze in één
                  oogopslag terugvindt tussen de rest. */}
              {mine && <circle cx={p.x} cy={p.y} r={r + 3.2} fill="#d81f26" opacity={0.22} />}
              <circle cx={p.x} cy={p.y} r={r + 1.6} fill="#fff" />
              <circle
                cx={p.x}
                cy={p.y}
                r={r + 1.6}
                fill="none"
                stroke={mine ? "rgba(216,31,38,.85)" : "rgba(9,24,45,.45)"}
                strokeWidth={mine ? 1.4 : 0.9}
              />
              <circle cx={p.x} cy={p.y} r={r} fill={fill} />
              <text
                x={p.x}
                y={p.y + 1.9}
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize={mine ? 6 : 5.4}
                fontWeight="700"
                fill="#fff"
              >
                {p.beennummer.replace(/^0+(?=\d)/, "")}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
