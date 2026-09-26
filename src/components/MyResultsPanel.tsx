import ResultsView from "@/components/ResultsView";
import UitslagenMeermarathon from "@/components/meermarathon/UitslagenMeermarathon";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { isMeermarathonGame } from "@/lib/gameTypes";

/**
 * Mijn Peloton → Uitslagen tab.
 * Gebruikt exact dezelfde view als de hoofdpagina /uitslagen,
 * zodat ranking, data, filters, styling en componenten identiek zijn.
 * Optioneel een specifieke (bv. afgeronde) game tonen via gameId.
 *
 * De Meermarathon heeft een eigen indeling (Klassement · Kalender · Per
 * wedstrijd); de uitslag per wedstrijd is daarbinnen weer deze ResultsView.
 */
export default function MyResultsPanel({
  gameId,
  gameName,
  initialView,
  initialStageNumber,
}: {
  gameId?: string;
  gameName?: string | null;
  initialView?: "etappes" | "klassement";
  initialStageNumber?: number | null;
}) {
  const { games } = useSelectedGame();
  const game = gameId ? games.find((g) => g.id === gameId) : undefined;

  if (game && isMeermarathonGame(game.game_type)) {
    return (
      <UitslagenMeermarathon
        gameId={game.id}
        gameName={gameName}
        categorie={game.categorie}
        initialView={initialView}
        initialStageNumber={initialStageNumber}
      />
    );
  }

  return (
    <ResultsView
      showHeader={false}
      gameId={gameId}
      gameName={gameName}
      initialView={initialView}
      initialStageNumber={initialStageNumber}
    />
  );
}
