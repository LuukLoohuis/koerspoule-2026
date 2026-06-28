import { useEffect, useMemo, useState } from "react";
import ResultsView from "@/components/ResultsView";
import GameSwitcher from "@/components/GameSwitcher";
import { useAllGames } from "@/hooks/useAllGames";
import { useAuth } from "@/hooks/useAuth";
import { isVisibleToUser, maySeeLiveContent } from "@/lib/gameStatus";
import SneakPreviewLock from "@/components/SneakPreviewLock";

export default function Results() {
  const { data: allGames = [] } = useAllGames();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  // concept/draft niet tonen aan gewone gebruikers.
  const games = useMemo(
    () => allGames.filter((g) => isVisibleToUser(g.status, isAdmin)),
    [allGames, isAdmin],
  );

  // Standaard-game voor de uitslagen: een lopende game heeft voorrang, anders de
  // meest recente afgeronde game (afgerond ≠ verborgen — de uitslagen blijven zo
  // beschikbaar). games is al gesorteerd op jaar (desc) en type (giro eerst).
  const defaultGameId = useMemo(() => {
    const live = games.find((g) => ["open_inschrijving", "open", "live", "locked"].includes(g.status));
    if (live) return live.id;
    const finished = games.find((g) => g.status === "finished");
    return (finished ?? games[0])?.id ?? null;
  }, [games]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && defaultGameId) setSelectedId(defaultGameId);
  }, [defaultGameId, selectedId]);

  const selectedGame = games.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="container mx-auto px-5 py-4 md:py-6">
      {games.length > 1 && (
        <div className="mb-4 -mx-5">
          <GameSwitcher
            games={games}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {maySeeLiveContent(selectedGame?.status, isAdmin, selectedGame?.admin_testmodus ?? false) ? (
        <ResultsView showHeader gameId={selectedGame?.id} gameName={selectedGame?.name} />
      ) : (
        <SneakPreviewLock
          title="Uitslagen volgen binnenkort"
          note="Deze koers staat in de sneak preview. Zodra de inschrijving opengaat verschijnen hier het klassement en de daguitslagen."
        />
      )}
    </div>
  );
}
