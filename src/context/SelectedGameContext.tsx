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
 * Default-game — live-first: de LIVE game (of locked), anders open_inschrijving,
 * anders open, anders concept/draft (admin), anders de meest recente afgeronde.
 * `games` is al gesorteerd op year desc, dus .find pakt de hoogste year.
 */
export function resolveDefaultGameId(games: GameRow[]): string | null {
  const byStatus = (set: Set<string> | string) =>
    games.find((g) =>
      typeof set === "string" ? String(g.status) === set : set.has(String(g.status)),
    )?.id ?? null;
  return (
    byStatus(new Set(["live", "locked"])) ??
    byStatus("open_inschrijving") ??
    byStatus("open") ??
    byStatus(ADMIN_ONLY) ??
    byStatus(new Set(["finished", "closed"])) ??
    games[0]?.id ??
    null
  );
}

export function SelectedGameProvider({ children }: { children: ReactNode }) {
  const { data: games = [], isLoading } = useAllGames();

  // Selectie geldt per SESSIE (sessionStorage): binnen dezelfde sessie blijft de
  // keuze; een nieuw bezoek start weer op de live-first default.
  const [selectedGameId, setSelectedGameIdState] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    } catch {
      return null;
    }
  });

  const setSelectedGameId = (id: string | null) => {
    setSelectedGameIdState(id);
    try {
      if (id) window.sessionStorage.setItem(STORAGE_KEY, id);
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sessionStorage geblokkeerd → alleen in-memory */
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
