import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAllGames, type GameRow } from "@/hooks/useAllGames";

/**
 * SelectedGameContext — één gedeelde game-keuze voor de hele deelnemer-app.
 *
 * Vervangt de losse per-pagina game-state (MijnPeloton, Results) en de dubbele
 * switchers. De keuze is gepersisteerd; de GameSwitcher-kaartenrij staat één keer
 * in de app-shell (Layout). useCurrentGame en useDeadline volgen selectedGameId.
 *
 * De lijst is de VOLLE useAllGames (alle statussen). Zichtbaarheidsfiltering
 * (concept/draft alleen voor admins) doet de GameSwitcher zelf via isAdmin.
 */
const STORAGE_KEY = "koerspoule_selected_game";

const ACTIVE = new Set(["open", "open_inschrijving", "locked", "live"]);
const ADMIN_ONLY = new Set(["concept", "draft"]);

type SelectedGameCtx = {
  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;
  /** Volledige gamelijst (gesorteerd via useAllGames: year desc → type). */
  games: GameRow[];
  /** De opgeloste gekozen game (keuze, of de default als er nog niets gekozen is). */
  selectedGame: GameRow | null;
  loading: boolean;
};

const Ctx = createContext<SelectedGameCtx | null>(null);

/**
 * Default-game (verplaatst uit MijnPeloton): actieve game (open/open_inschrijving/
 * locked/live) met de hoogste year, anders een concept/draft, anders de meest
 * recente. `games` is al gesorteerd, dus .find pakt de hoogste year.
 */
export function resolveDefaultGameId(games: GameRow[]): string | null {
  const active = games.find((g) => ACTIVE.has(String(g.status)));
  if (active) return active.id;
  const adminOnly = games.find((g) => ADMIN_ONLY.has(String(g.status)));
  if (adminOnly) return adminOnly.id;
  return games[0]?.id ?? null;
}

export function SelectedGameProvider({ children }: { children: ReactNode }) {
  const { data: games = [], isLoading } = useAllGames();

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

  // ?game=<id> in de URL (inschrijfbanner "Doe mee") selecteert die game direct.
  const location = useLocation();
  useEffect(() => {
    const qp = new URLSearchParams(location.search).get("game");
    if (qp && qp !== selectedGameId && games.some((g) => g.id === qp)) {
      setSelectedGameId(qp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, games]);

  // Wijst de opgeslagen keuze naar een niet-(meer-)bestaande game, reset dan naar
  // null → de default (selectedGame hieronder) neemt het over.
  useEffect(() => {
    if (selectedGameId && games.length > 0 && !games.some((g) => g.id === selectedGameId)) {
      setSelectedGameId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId, games]);

  // Opgeloste game: de keuze indien geldig, anders de default.
  const selectedGame = useMemo<GameRow | null>(() => {
    if (games.length === 0) return null;
    const byChoice = selectedGameId ? games.find((g) => g.id === selectedGameId) : null;
    if (byChoice) return byChoice;
    const defId = resolveDefaultGameId(games);
    return games.find((g) => g.id === defId) ?? null;
  }, [games, selectedGameId]);

  const value = useMemo<SelectedGameCtx>(
    () => ({ selectedGameId, setSelectedGameId, games, selectedGame, loading: isLoading }),
    [selectedGameId, games, selectedGame, isLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedGame(): SelectedGameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return { selectedGameId: null, setSelectedGameId: () => {}, games: [], selectedGame: null, loading: false };
  }
  return ctx;
}
