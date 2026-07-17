import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAllGames, type GameRow } from "@/hooks/useAllGames";

/**
 * SelectedGameContext — fase 1 multi-game.
 *
 * Houdt de EXPLICIET gekozen game bij (gepersisteerd in localStorage), zodat er
 * meerdere games tegelijk actief kunnen zijn en een afgeronde game raadpleegbaar
 * blijft. useCurrentGame leest selectedGameId hieruit; is er (nog) geen keuze,
 * dan valt useCurrentGame terug op zijn bestaande default-logica — dus bestaande
 * gebruikers zonder keuze zien exact hetzelfde als voorheen.
 *
 * "Kiesbare" games = alleen deelnemer-zichtbare statussen (concept/draft niet).
 */
const STORAGE_KEY = "koerspoule_selected_game";

const SELECTABLE = new Set(["open", "open_inschrijving", "locked", "live", "finished"]);
const ACTIVE = new Set(["open", "open_inschrijving", "locked", "live"]);

type SelectedGameCtx = {
  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;
  /** Kiesbare games, gesorteerd (year desc → type-volgorde via useAllGames). */
  games: GameRow[];
  loading: boolean;
};

const Ctx = createContext<SelectedGameCtx | null>(null);

/**
 * Default-game wanneer nog niets gekozen is: de eerste ACTIEVE game (open/
 * open_inschrijving/locked/live) met de hoogste year; anders de meest recente
 * finished. Repliceert het oude useCurrentGame-gedrag. `games` is al gesorteerd.
 */
export function resolveDefaultGameId(games: GameRow[]): string | null {
  const active = games.filter((g) => ACTIVE.has(String(g.status)));
  if (active.length) return active[0].id; // reeds year desc gesorteerd
  const finished = games.filter((g) => String(g.status) === "finished");
  if (finished.length) return finished[0].id;
  return games[0]?.id ?? null;
}

export function SelectedGameProvider({ children }: { children: ReactNode }) {
  const { data: allGames = [], isLoading } = useAllGames();
  const games = useMemo(
    () => allGames.filter((g) => SELECTABLE.has(String(g.status))),
    [allGames],
  );

  const [selectedGameId, setSelectedGameIdState] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    } catch {
      return null;
    }
  });

  const setSelectedGameId = (id: string | null) => {
    setSelectedGameIdState(id);
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage geblokkeerd → alleen in-memory */
    }
  };

  // Wijst de opgeslagen keuze naar een niet-(meer-)kiesbare game (verwijderd of
  // terug naar concept), reset dan naar null → useCurrentGame pakt de default.
  useEffect(() => {
    if (selectedGameId && games.length > 0 && !games.some((g) => g.id === selectedGameId)) {
      setSelectedGameId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId, games]);

  const value = useMemo<SelectedGameCtx>(
    () => ({ selectedGameId, setSelectedGameId, games, loading: isLoading }),
    [selectedGameId, games, isLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedGame(): SelectedGameCtx {
  const ctx = useContext(Ctx);
  // Veilige no-op buiten de provider (losse tests / vroege SSR-render).
  if (!ctx) return { selectedGameId: null, setSelectedGameId: () => {}, games: [], loading: false };
  return ctx;
}
