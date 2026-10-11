/**
 * TerugkijkStrip — smalle strook bovenaan Mijn Peloton en Uitslagen zodra een
 * AFGERONDE koers gekozen is. Vervangt daar de koersbalk: je ziet in één
 * oogopslag dat je terugkijkt, en één knop brengt je terug naar de lopende
 * koers. Bij de lopende koers zelf staat hier niets.
 *
 * Vorm: een dossiermap uit het archief — papieren kaart met retro-rand, links
 * een rug in de landskleuren, vlag, overline, koersnaam, stempel "Afgerond"
 * en rechts een fysieke knop. Schuift kort in (.kp-terugkijk in index.css).
 */
import { CornerUpLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { GameRow } from "@/hooks/useAllGames";
import Stamp from "@/components/retro/Stamp";
import { KoersIcoon, MiniStempel, raceGradient, segmentName } from "@/components/koersSegment";

type Props = {
  /** De afgeronde koers die nu bekeken wordt. */
  game: GameRow;
  /** De lopende koers om naar terug te keren; null als die er niet is. */
  terugNaar: GameRow | null;
  onSelect: (id: string) => void;
  className?: string;
};

export default function TerugkijkStrip({ game, terugNaar, onSelect, className }: Props) {
  const { t } = useTranslation();
  const naam = segmentName(game, true);
  const terugNaam = terugNaar ? segmentName(terugNaar, false) : null;
  return (
    <div
      role="status"
      className={cn(
        "kp-terugkijk relative flex items-center gap-3 overflow-hidden rounded-[10px] border-2 border-foreground bg-card",
        "py-2 pl-5 pr-2 md:py-2.5 md:pl-6 md:pr-3 shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      {/* Rug van de map in de landskleuren, over de volle hoogte. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-2.5 md:w-3" style={{ background: raceGradient(game.game_type) }} />
      <span aria-hidden className="absolute inset-y-0 left-2.5 md:left-3 w-px bg-foreground/60" />

      <KoersIcoon game={game} />

      <div className="min-w-0 flex-1 leading-tight">
        <p className="overline-stamp text-[10px] md:text-[11px] leading-none">{t("oudeKoersen.kijktTerug")}</p>
        <div className="mt-[3px] flex items-center gap-2 min-w-0">
          <p className="font-display text-[16px] md:text-[19px] font-bold truncate">{naam}</p>
          <MiniStempel className="md:hidden">{t("oudeKoersen.afgerond")}</MiniStempel>
          <Stamp tone="wine" rotation={-3} className="hidden md:inline-block">{t("oudeKoersen.afgerond")}</Stamp>
        </div>
      </div>

      {terugNaar && (
        <button
          type="button"
          onClick={() => onSelect(terugNaar.id)}
          className={cn(
            "kp-knop-fysiek shrink-0 max-w-[50%] inline-flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2",
            "font-mono text-[11px] md:text-[12px] font-bold uppercase tracking-[0.12em] text-foreground",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
          )}
        >
          <CornerUpLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="truncate sm:hidden">{t("oudeKoersen.terug")}</span>
          <span className="truncate hidden sm:inline">{t("oudeKoersen.terugNaar", { koers: terugNaam })}</span>
        </button>
      )}
    </div>
  );
}
