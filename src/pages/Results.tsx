import { useTranslation } from "react-i18next";
import ResultsView from "@/components/ResultsView";
import GameSwitcher from "@/components/GameSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { maySeeLiveContent } from "@/lib/gameStatus";
import SneakPreviewLock from "@/components/SneakPreviewLock";

export default function Results() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  // Gedeelde game-keuze uit de context (één kiezer voor de hele app).
  const { games, selectedGame, setSelectedGameId } = useSelectedGame();

  return (
    <div className="container mx-auto px-5 py-4 md:py-6">
      {/* Game-switcher (vertrekbord) — alleen ingelogd + >1 zichtbare game. */}
      {user && (
        <GameSwitcher
          games={games}
          selectedId={selectedGame?.id ?? null}
          onSelect={setSelectedGameId}
          isAdmin={isAdmin}
          className="max-w-5xl mx-auto mb-4"
        />
      )}

      {maySeeLiveContent(selectedGame?.status, isAdmin, selectedGame?.admin_testmodus ?? false) ? (
        <ResultsView showHeader gameId={selectedGame?.id} gameName={selectedGame?.name} />
      ) : (
        <SneakPreviewLock
          title={t("results.page.sneakPreviewTitle")}
          note={t("results.page.sneakPreviewNote")}
        />
      )}
    </div>
  );
}
