/**
 * Gedeelde bouwstenen voor alles wat een koers als "segment" toont: de
 * koersbalk (GameSwitcher), de lijst met oude koersen in het menu en de
 * terugkijk-strook. Pure helpers, geen context.
 */
import { Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import FlagIcon from "@/components/FlagIcon";
import { gameTheme, type GameRow } from "@/hooks/useAllGames";
import { isFinishedLike } from "@/lib/gameStatus";
import { isMeermarathonGame, meermarathonCategorieRang, meermarathonSeasonKort } from "@/lib/gameTypes";

export const raceGradient = (type: string | null | undefined) => {
  if (isMeermarathonGame(type)) {
    return "linear-gradient(135deg, var(--mm-m), var(--mm-m2))";
  }
  const c = gameTheme(type).colors;
  return `linear-gradient(135deg, ${c[0]}, ${c[1]}, ${c[2]})`;
};

/** Vlag van de koers, of het sneeuwvlok-rondje van de Meermarathon. */
export function KoersIcoon({ game, actief = false }: { game: GameRow; actief?: boolean }) {
  const theme = gameTheme(game.game_type);
  if (isMeermarathonGame(game.game_type)) {
    return (
      <span
        aria-hidden
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
          actief ? "bg-white/12 text-white" : "bg-[var(--mm-chip)] text-[var(--mm-m)]",
        )}
      >
        <Snowflake className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <FlagIcon
      country={theme.country}
      className={cn("w-6 h-[17px] shrink-0", actief ? "ring-1 ring-white/60 border-white/40" : "")}
    />
  );
}

/** Segment-naam: afgeronde games kort (Giro 2026), overige compact-vol. */
export function segmentName(game: GameRow, finished: boolean): string {
  const y = game.year;
  const t = String(game.game_type ?? "").toLowerCase();
  // Verkort seizoen: "Meermarathon 2026-2027" liep in dit smalle segment
  // tegen de afkapping aan. Vrouwen en Mannen delen één segment; de keuze
  // daartussen maakt de pelotonbalk.
  if (isMeermarathonGame(t)) return `Meermarathon ${meermarathonSeasonKort(y)}`;
  if (finished) {
    if (t === "giro") return `Giro ${y}`;
    if (t === "vuelta" || t === "vta") return `Vuelta ${y}`;
    if (t === "femmes") return `Tour Femmes ${y}`;
    return `Tour ${y}`;
  }
  if (t === "giro") return `Giro d'Italia ${y}`;
  if (t === "vuelta" || t === "vta") return `Vuelta ${y}`;
  if (t === "femmes") return `Tour Femmes ${y}`;
  return `Tour de France ${y}`;
}

/** Naam en jaartal apart (archiefkastje: naam in display, jaar in mono). */
export function naamEnJaar(game: GameRow): { naam: string; jaar: string } {
  const t = String(game.game_type ?? "").toLowerCase();
  if (isMeermarathonGame(t)) return { naam: "Meermarathon", jaar: meermarathonSeasonKort(game.year) };
  const naam = t === "giro" ? "Giro" : t === "vuelta" || t === "vta" ? "Vuelta" : t === "femmes" ? "Tour Femmes" : "Tour";
  return { naam, jaar: String(game.year) };
}

/** "Afgerond" als klein stempeltje (typmachine, gestippelde rand, scheef). */
export function MiniStempel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block font-stamp uppercase tracking-[0.15em] text-[9px] leading-none px-1.5 py-[3px] rounded-sm",
        "border border-dashed border-[hsl(var(--bolletjes-bright))/0.7] text-[hsl(var(--bolletjes-bright))] bg-[hsl(var(--bolletjes-bright))/0.06]",
        "select-none whitespace-nowrap -rotate-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Meermarathon Vrouwen en Mannen van één seizoen worden hier één segment: de
 * keuze daartussen hoort bij de pelotonbalk, niet bij de keuze van de koers.
 * Het segment staat voor de gekozen categorie als die in dit seizoen zit,
 * anders voor de eerste (vrouwen).
 */
export function eenSegmentPerSeizoen<T extends { id: string; game_type?: string | null; year: number; categorie?: string | null }>(
  games: T[],
  selectedId: string | null,
): T[] {
  const perSeizoen = new Map<number, T[]>();
  for (const g of games) {
    if (!isMeermarathonGame(g.game_type)) continue;
    perSeizoen.set(g.year, [...(perSeizoen.get(g.year) ?? []), g]);
  }
  const vertegenwoordiger = new Map<number, string>();
  for (const [jaar, groep] of perSeizoen) {
    const gekozen = groep.find((g) => g.id === selectedId);
    const eerste = [...groep].sort((a, b) => meermarathonCategorieRang(a.categorie) - meermarathonCategorieRang(b.categorie))[0];
    vertegenwoordiger.set(jaar, (gekozen ?? eerste).id);
  }
  return games.filter((g) => !isMeermarathonGame(g.game_type) || vertegenwoordiger.get(g.year) === g.id);
}

/**
 * Lopende koersen horen in de balk; afgeronde zijn "oude koersen" (menu).
 * Is er niets lopends (de zomerpauze), dan geldt de nieuwste afgeronde koers
 * als de lopende — anders zou de site zonder koers staan.
 */
export function splitsOudeKoersen<T extends { status?: string | null }>(ordered: T[]): { actief: T[]; oud: T[] } {
  const actief = ordered.filter((g) => !isFinishedLike(g.status));
  const oud = ordered.filter((g) => isFinishedLike(g.status));
  if (actief.length === 0 && oud.length > 0) return { actief: [oud[0]], oud: oud.slice(1) };
  return { actief, oud };
}
