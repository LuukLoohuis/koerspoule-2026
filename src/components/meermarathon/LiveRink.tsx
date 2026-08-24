import { useMemo } from "react";
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
 * Alles is percentagegebaseerd binnen de viewBox, dus het schaalt mee met de
 * kaart eromheen zonder media queries.
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
  const punten = useMemo(() => {
    const plaatsen = placeRiders(groups, { rondeLengte });
    return plaatsen.map((p) => ({ ...p, ...baanPositie(p.fraction, p.offset) }));
  }, [groups, rondeLengte]);

  // Eigen rijders om en om boven en onder het schijfje, zodat twee labels
  // dicht bij elkaar niet over elkaar heen vallen.
  let eigenTeller = 0;

  return (
    <svg
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
          const r = mine ? 14 : 13;
          const nummer = p.beennummer.replace(/^0+(?=\d)/, "");
          const naam = mine ? namen?.get(p.beennummer) ?? null : null;
          const boven = mine ? (eigenTeller++ % 2 === 0) : false;
          // Eén badge per groep: de rest van de groep rijdt per definitie
          // op dezelfde ronde.
          const badge = p.eersteInGroep ? rondeBadge(p.tier) : null;
          // Badge naast het schijfje, buiten de eigen ringen om.
          const badgeX = p.x + (mine ? 15 : 9);
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
              <text
                x={p.x} y={p.y + 4} textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace" fontSize={mine ? 12 : 11}
                fontWeight="700" fill={rolTekstColor(rol)}
              >
                {nummer}
              </text>
              {badge && (
                <>
                  <rect x={badgeX} y={p.y - r - 6} width="23" height="14" rx="4" fill="#1b2f14" />
                  <text
                    x={badgeX + 11.5} y={p.y - r + 4.5} textAnchor="middle"
                    fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="700" fill="#fff"
                  >
                    {badge}
                  </text>
                </>
              )}
              {naam && (
                <>
                  <rect
                    x={p.x - naam.length * 3.1 - 6}
                    y={boven ? p.y - r - 30 : p.y + r + 12}
                    width={naam.length * 6.2 + 12}
                    height="18" rx="4" fill={EIGEN_KLEUR}
                  />
                  <text
                    x={p.x} y={boven ? p.y - r - 17 : p.y + r + 25}
                    textAnchor="middle" fontFamily="'DM Sans', sans-serif"
                    fontSize="11" fontWeight="600" fill="#fff"
                  >
                    {naam}
                  </text>
                </>
              )}
            </g>
          );
        })}
    </svg>
  );
}
