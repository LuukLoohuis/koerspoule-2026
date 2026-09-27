import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useKoersThema } from "@/contexts/KoersThemaContext";
import { HORS_BLANCO, HORS_MASKER, horsTrui, type HorsTrui } from "@/lib/wielertruien";

/**
 * De trui is versiering: geen sleep-voorbeeld of callout bij een lange
 * aanraking (zie Wielertrui).
 */
const NIET_SLEPEN = { WebkitUserDrag: "none", WebkitTouchCallout: "none" } as CSSProperties;

const MASKER: CSSProperties = {
  WebkitMaskImage: `url(${HORS_MASKER})`,
  maskImage: `url(${HORS_MASKER})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

// ── De opdruk, in de maten van het doek van de tekeningen (534 × 712) ────────
// Overgenomen van het ontwerp: icoon, cijfer, lijn en label onder elkaar op
// de borst, gecentreerd op de rits.
const DOEK = { b: 534, h: 712 };
const MIDDEN = 267;
const ICOON_TOP = 145;
//
// Het cijfer staat in Archivo Black, 12% smaller gezet: het ontwerp heeft een
// smallere vette letter. Het label staat in Oswald en wordt juist iets
// opgerekt. Beide krijgen een vaste lengte mee (textLength), zodat ze tussen
// de mouwen en tussen de bollen blijven, welk cijfer of welke taal er ook staat.
const CIJFER = { basislijn: 310, letter: 146, eenheid: 0.57, smal: 0.88, maxBreedte: 232 };
const LIJN = { y: 332, breedte: 138, dikte: 5 };
const LABEL = { basislijn: 389, letter: 39.5, rek: 1.12, maxBreedte: 218 };

/** Breedte van een teken in Archivo Black, in em: cijfers zijn even breed. */
const tekenBreedte = (teken: string) => (teken === "," || teken === "." ? 0.333 : teken === "–" ? 0.5 : 0.667);
const PROCENT_BREEDTE = 1;
/** Gemiddelde breedte van een hoofdletter in Oswald 700, in em. */
const LABEL_TEKEN = 0.52;

/** Kroon: drie punten op een band. */
function Kroon() {
  return (
    <g transform={`translate(${MIDDEN - 28} ${ICOON_TOP})`}>
      <path d="M0 8 L15.6 15.6 L28 0 L41 15.6 L56 8 L50 29.4 L7 29.4 Z" />
      <rect x={8} y={33} width={41} height={4} />
    </g>
  );
}

/** Berg: twee toppen, met de sneeuwgrens als hap uit de voet. */
function Berg() {
  return (
    <path
      transform={`translate(${MIDDEN - 40} ${ICOON_TOP})`}
      d="M0 38 L22.2 10 L30.6 19 L46.8 0 L80 38 L69.2 38 L55.6 25 L46.2 33 L43.2 28 L24.2 38 Z"
    />
  );
}

/**
 * Een Hors-cijfer op zijn trui, zoals in het ontwerp: icoon, cijfer, lijn en
 * label als opdruk op de borst. De trui is de tekening als die er is (geel,
 * bolletjes, wit), anders de witte trui ingekleurd in de kleur van het thema.
 *
 * De opdruk is tekst, geen plaatje: het cijfer wisselt per deelnemer en per
 * rit. Hij staat in een svg met het doek van de tekening als viewBox, dus hij
 * schaalt mee met de trui, hoe breed die ook staat. Een lang cijfer of label
 * wordt kleiner gezet zodat het tussen de mouwen blijft.
 */
export default function CijferTrui({
  trui,
  waarde,
  eenheid,
  label,
  className,
}: {
  trui: HorsTrui;
  /** Het cijfer zoals het getoond wordt; null als het er nog niet is. */
  waarde: string | null;
  eenheid?: string;
  /** Wat het cijfer is, in hoofdletters op de borst. */
  label: string;
  /** Bepaalt de breedte; de hoogte volgt (3:4). */
  className?: string;
}) {
  const thema = useKoersThema();
  const opmaak = horsTrui(thema, trui);

  const cijfer = waarde ?? "–";
  const metEenheid = waarde != null && eenheid ? eenheid : "";
  const cijferEm =
    [...cijfer].reduce((som, teken) => som + tekenBreedte(teken), 0) + (metEenheid ? PROCENT_BREEDTE * CIJFER.eenheid : 0);
  const cijferGewenst = cijferEm * CIJFER.letter * CIJFER.smal;
  const cijferKrimp = Math.min(1, CIJFER.maxBreedte / cijferGewenst);
  const cijferLetter = CIJFER.letter * cijferKrimp;

  const opdruk = label.toLocaleUpperCase();
  const labelNatuurlijk = opdruk.length * LABEL_TEKEN * LABEL.letter;
  const labelKrimp = Math.min(1, LABEL.maxBreedte / labelNatuurlijk);
  const labelLetter = LABEL.letter * labelKrimp;
  const labelLengte = Math.min(LABEL.maxBreedte, labelNatuurlijk * labelKrimp * LABEL.rek);

  return (
    <span className={cn("relative isolate block aspect-[3/4]", className)}>
      {opmaak.src ? (
        <img
          src={opmaak.src}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          style={NIET_SLEPEN}
          draggable={false}
        />
      ) : (
        <>
          <span aria-hidden className="absolute inset-0" style={{ background: opmaak.kleur, ...MASKER }} />
          <img
            src={HORS_BLANCO}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain mix-blend-multiply"
            style={NIET_SLEPEN}
            draggable={false}
          />
        </>
      )}
      <svg
        viewBox={`0 0 ${DOEK.b} ${DOEK.h}`}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        fill={opmaak.inkt}
        focusable="false"
      >
        {trui === "leider" ? <Kroon /> : <Berg />}
        <text
          x={MIDDEN}
          y={CIJFER.basislijn}
          textAnchor="middle"
          fontFamily="'Archivo Black', 'Inter', sans-serif"
          fontSize={cijferLetter}
          textLength={cijferGewenst * cijferKrimp}
          lengthAdjust="spacingAndGlyphs"
        >
          {cijfer}
          {metEenheid && <tspan fontSize={cijferLetter * CIJFER.eenheid}>{metEenheid}</tspan>}
        </text>
        <rect x={MIDDEN - LIJN.breedte / 2} y={LIJN.y} width={LIJN.breedte} height={LIJN.dikte} />
        <text
          x={MIDDEN}
          y={LABEL.basislijn}
          textAnchor="middle"
          fontFamily="'Oswald', 'Helvetica Neue', sans-serif"
          fontWeight={700}
          fontSize={labelLetter}
          textLength={labelLengte}
          lengthAdjust="spacingAndGlyphs"
        >
          {opdruk}
        </text>
      </svg>
    </span>
  );
}
