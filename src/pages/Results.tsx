import { useTranslation } from "react-i18next";
import ResultsView from "@/components/ResultsView";
import GameSwitcher from "@/components/GameSwitcher";
import MeermarathonPelotonbalk from "@/components/meermarathon/Pelotonbalk";
import MeermarathonTotaalklassement from "@/components/meermarathon/Totaalklassement";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { maySeeLiveContent } from "@/lib/gameStatus";
import SneakPreviewLock from "@/components/SneakPreviewLock";
import { useLocation } from "react-router-dom";
import { parseResultsStageParam } from "@/lib/resultSelection";
import { isMeermarathonGame } from "@/lib/gameTypes";

export default function Results() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialView = params.get("view") === "etappes" ? "etappes" : "klassement";
  const { preferGc: initialGc, stageNumber: initialStageNumber } = parseResultsStageParam(params.get("stage"));
  // Gedeelde game-keuze uit de context (één kiezer voor de hele app).
  const { games, selectedGame, setSelectedGameId } = useSelectedGame();
  // Meermarathon: naast vrouwen en mannen het totaal van beide pelotons. Met
  // één peloton biedt de pelotonbalk geen Totaal, dan ook geen totaalstand.
  const pelotons = games.filter((g) => isMeermarathonGame(g.game_type) && g.year === selectedGame?.year).length;
  const totaal = isMeermarathonGame(selectedGame?.game_type) && pelotons >= 2 && params.get("klassement") === "totaal";

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
      {/* Meermarathon: vrouwen en mannen zijn twee pelotons van één game. De
          koersbalk kiest de game, de pelotonbalk het peloton of het totaal;
          bij een wielerkoers blijft hij weg. */}
      {user && <MeermarathonPelotonbalk metTotaal className="mb-2 md:mx-auto md:mb-4 md:max-w-2xl" />}

      {maySeeLiveContent(selectedGame?.status, isAdmin, selectedGame?.admin_testmodus ?? false) ? (
        totaal ? (
          <MeermarathonTotaalklassement />
        ) : (
          <ResultsView
            showHeader
            gameId={selectedGame?.id}
            gameName={selectedGame?.name}
            initialView={initialView}
            initialStageNumber={initialStageNumber}
            initialGc={initialGc}
          />
        )
      ) : (
        <SneakPreviewLock
          title={t("results.page.sneakPreviewTitle")}
          note={t("results.page.sneakPreviewNote")}
        />
      )}
    </div>
  );
}
