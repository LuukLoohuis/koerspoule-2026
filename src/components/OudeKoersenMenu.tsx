/**
 * Oude koersen — de afgeronde koersen staan niet meer als segmenten in de
 * koersbalk (die vervuilde de telefoon), maar in het menu: op de telefoon een
 * blokje in het hamburgermenu, op desktop een uitklapper rechts in de
 * navigatiestrook. Kies je er een, dan toont de app die koers (met de
 * terugkijk-strook bovenaan) en ga je zo nodig naar Mijn Peloton.
 */
import { useState } from "react";
import { Archive, Check, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GameRow } from "@/hooks/useAllGames";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { isVisibleToUser, statusOrderRank } from "@/lib/gameStatus";
import { KoersIcoon, MiniStempel, eenSegmentPerSeizoen, naamEnJaar, raceGradient, splitsOudeKoersen } from "@/components/koersSegment";

type LijstProps = {
  games: GameRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

/**
 * De lijst zelf, als archiefkastje: kop met sierlijntjes, per koers een rij
 * met vlag, naam (display), jaartal (mono) en een mini-stempel "Afgerond".
 * De gekozen rij krijgt een gouden vinkje en links een haarlijn in de
 * landskleuren (.kp-archief-rij in index.css). Zonder omkadering.
 */
export function OudeKoersenLijst({ games, selectedId, onSelect, className }: LijstProps) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <div className="flex items-center gap-2 px-1 pb-1 pt-1">
        <span aria-hidden className="h-px flex-1 bg-linear-to-r from-transparent to-foreground/35" />
        <p className="overline-stamp text-[10px] leading-none whitespace-nowrap">
          {t("oudeKoersen.titel")} — {t("oudeKoersen.hint")}
        </p>
        <span aria-hidden className="h-px flex-1 bg-linear-to-l from-transparent to-foreground/35" />
      </div>
      <ul className="flex flex-col divide-y divide-foreground/12" role="listbox" aria-label={t("oudeKoersen.titel")}>
        {games.map((game) => {
          const isGekozen = game.id === selectedId;
          const { naam, jaar } = naamEnJaar(game);
          return (
            <li key={game.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isGekozen}
                onClick={() => onSelect(game.id)}
                className={cn(
                  "kp-archief-rij relative flex w-full min-h-[44px] items-center gap-3 pl-3 pr-2 py-1.5 text-left outline-hidden",
                  "transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60",
                  isGekozen && "bg-secondary/50",
                )}
              >
                <span
                  aria-hidden
                  className="kp-archief-rug absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                  style={{ background: raceGradient(game.game_type) }}
                />
                <KoersIcoon game={game} />
                <span className="min-w-0 flex-1 flex items-baseline gap-1.5">
                  <span className={cn("font-display text-[14.5px] truncate", isGekozen ? "font-bold" : "font-semibold")}>{naam}</span>
                  <span className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground">{jaar}</span>
                </span>
                {isGekozen && <Check className="h-4 w-4 shrink-0 text-[hsl(var(--vintage-gold))]" strokeWidth={2.5} aria-hidden />}
                <MiniStempel>{t("oudeKoersen.afgerond")}</MiniStempel>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Desktop: knop in de navigatiestrook met de lijst als retro-uitklapper. */
export function OudeKoersenMenu({ games, selectedId, onSelect, className }: LijstProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t("oudeKoersen.menuAria")} className={cn("nav-link-editorial gap-1.5", open && "active", className)}>
          <Archive className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          {t("oudeKoersen.titel")}
          {/* Dossard-rondje met het aantal. */}
          <span aria-hidden className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full border-[1.5px] border-current px-1 font-mono text-[10px] font-bold leading-none normal-case tracking-normal">
            {games.length}
          </span>
          <ChevronDown aria-hidden className={cn("h-3 w-3 transition-transform", open && "rotate-180")} strokeWidth={2.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className="w-[288px] rounded-xl border-2 border-foreground bg-card px-1.5 pb-1.5 pt-1 shadow-[3px_3px_0_hsl(var(--foreground))]"
      >
        <OudeKoersenLijst
          games={games}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelect(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Pagina's waar de gekozen koers direct te zien is; elders eerst erheen. */
const KOERS_PAGINAS = ["/mijn-peloton", "/uitslagen", "/karavaan"];

/**
 * Aansluiting op de app-shell: welke oude koersen zijn er, welke is gekozen,
 * en wat gebeurt er bij een keuze (kiezen + zo nodig naar Mijn Peloton).
 */
export function useOudeKoersenShell(isAdmin: boolean, naKeuze?: () => void) {
  const { games, selectedGame, setSelectedGameId } = useSelectedGame();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedId = selectedGame?.id ?? null;
  const ordered = eenSegmentPerSeizoen(
    games.filter((g) => isVisibleToUser(g.status, isAdmin)),
    selectedId,
  ).sort((a, b) => statusOrderRank(a.status) - statusOrderRank(b.status));
  const { oud } = splitsOudeKoersen(ordered);
  const kies = (id: string) => {
    setSelectedGameId(id);
    if (!KOERS_PAGINAS.includes(location.pathname)) navigate("/mijn-peloton");
    naKeuze?.();
  };
  return { oud, selectedId, kies };
}
