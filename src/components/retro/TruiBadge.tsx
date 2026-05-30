import { cn } from "@/lib/utils";
import { useThema } from "@/contexts/ThemaContext";
import type { TruiType } from "@/lib/themas";
import truiTourAlgemeen from "@/assets/trui-tour-algemeen.png";
import truiTourPunten from "@/assets/trui-tour-punten.png";
import truiTourBerg from "@/assets/trui-tour-berg.png";
import truiTourJongeren from "@/assets/trui-tour-jongeren.png";
import truiGiroAlgemeen from "@/assets/trui-giro-algemeen.png";
import truiGiroPunten from "@/assets/trui-giro-punten.png";
import truiGiroBerg from "@/assets/trui-giro-berg.png";
import truiGiroJongeren from "@/assets/trui-giro-jongeren.png";

const FORMATEN = {
  klein: { w: 20, h: 28 },
  medium: { w: 32, h: 44 },
  groot: { w: 48, h: 64 },
} as const;

/**
 * Echte trui-afbeeldingen per thema:
 *  - geel (Tour): LCL / Škoda / Leclerc / Krys
 *  - roze (Giro): IUMAN / madeinitaly / Mediolanum (blauw) / Mediolanum (wit)
 * Thema's zonder map (bv. rood/Vuelta) vallen terug op het SVG-silhouet.
 */
const TRUI_IMG: Partial<Record<string, Record<TruiType, string>>> = {
  geel: {
    algemeen: truiTourAlgemeen,
    punten: truiTourPunten,
    berg: truiTourBerg,
    jongeren: truiTourJongeren,
  },
  roze: {
    algemeen: truiGiroAlgemeen,
    punten: truiGiroPunten,
    berg: truiGiroBerg,
    jongeren: truiGiroJongeren,
  },
};

type Formaat = keyof typeof FORMATEN;

/**
 * Klassements-trui van het actieve thema. Effen of bolletjes (berg-trui in
 * Tour/Vuelta). Bij `groot` wordt de naam eronder getoond.
 *
 * <TruiBadge type="algemeen" formaat="klein" />
 */
export default function TruiBadge({
  type,
  formaat = "klein",
  toonNaam,
  className,
}: {
  type: TruiType;
  formaat?: Formaat;
  toonNaam?: boolean;
  className?: string;
}) {
  const { thema } = useThema();
  const trui = thema.truien[type];
  const { w, h } = FORMATEN[formaat];
  const naamZichtbaar = toonNaam ?? formaat === "groot";

  const isBolletjes = trui.patroon === "bolletjes";

  // Echte trui-afbeeldingen voor thema's die een map hebben (geel/roze),
  // anders het SVG-silhouet.
  const themaImg = TRUI_IMG[thema.key]?.[type] ?? null;

  if (themaImg) {
    return (
      <div className={cn("inline-flex flex-col items-center gap-1", className)} title={trui.naam}>
        <img
          src={themaImg}
          alt={trui.naam}
          height={h}
          className="shrink-0 w-auto object-contain drop-shadow-sm"
          style={{ height: h }}
        />
        {naamZichtbaar && (
          <span className="font-display text-[10px] uppercase tracking-wider text-center leading-tight max-w-[5rem]">
            {trui.naam}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)} title={trui.naam}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 24 32"
        role="img"
        aria-label={trui.naam}
        className="shrink-0"
      >
        <defs>
          {isBolletjes && (
            <pattern id={`bol-${type}-${formaat}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#FFFFFF" />
              <circle cx="3" cy="3" r="1.6" fill={trui.bolletjeKleur ?? "#CC0000"} />
            </pattern>
          )}
        </defs>
        {/* Trui-silhouet: schouders + mouwen + romp */}
        <path
          d="M7 3 L9.5 1.5 L11 4 L13 4 L14.5 1.5 L17 3 L21.5 7 L18 9.5 L18 30 L6 30 L6 9.5 L2.5 7 Z"
          fill={isBolletjes ? `url(#bol-${type}-${formaat})` : trui.kleur}
          stroke={trui.rand ?? "rgba(0,0,0,0.25)"}
          strokeWidth={trui.rand ? 1.5 : 1}
          strokeLinejoin="round"
        />
      </svg>
      {naamZichtbaar && (
        <span className="font-display text-[10px] uppercase tracking-wider text-center leading-tight max-w-[5rem]">
          {trui.naam}
        </span>
      )}
    </div>
  );
}
