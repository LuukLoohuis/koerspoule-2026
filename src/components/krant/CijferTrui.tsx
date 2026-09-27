import Wielertrui, { TruiBorst } from "@/components/retro/Wielertrui";
import { useKoersThema } from "@/contexts/KoersThemaContext";
import { horsTrui, type HorsTrui } from "@/lib/wielertruien";

const GLOED = "0 0 1px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff, 0 0 3px #fff";

/**
 * Een Hors-cijfer op de borst van zijn trui, voor de mobiele Krant en de
 * bijlage van de webkrant. Het cijfer schaalt mee met de trui: 24 px op de
 * trui van 96 px uit de handoff.
 *
 * De schaduw blijft op de 1,5 px van Wielertrui. De tekening heeft zelf een
 * dikke omlijning; met de 2,5 px van de handoff erbij wordt de rechterrand een
 * balk.
 */
export default function CijferTrui({
  trui,
  waarde,
  eenheid,
  breedte = 96,
  className,
}: {
  trui: HorsTrui;
  /** Het cijfer zoals het getoond wordt; null als het er nog niet is. */
  waarde: string | null;
  eenheid?: string;
  breedte?: number;
  className?: string;
}) {
  const thema = useKoersThema();
  const opmaak = horsTrui(thema, trui);

  return (
    <Wielertrui
      breedte={breedte}
      hoogte={Math.round(breedte * 1.125)}
      src={opmaak.src}
      kleur={opmaak.kleur}
      bolletjes={opmaak.bolletjes}
      className={className}
    >
      <TruiBorst>
        <span
          className="font-display font-black leading-none tracking-[-0.02em] tabular-nums"
          style={{ color: opmaak.tekst, fontSize: breedte / 4, textShadow: opmaak.gloed ? GLOED : undefined }}
        >
          {waarde ?? "–"}
          {waarde != null && eenheid && (
            <span className="font-bold" style={{ fontSize: breedte / 8 }}>
              {eenheid}
            </span>
          )}
        </span>
      </TruiBorst>
    </Wielertrui>
  );
}
