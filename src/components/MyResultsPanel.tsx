import ResultsView from "@/components/ResultsView";

/**
 * Mijn Peloton → Uitslagen tab.
 * Gebruikt exact dezelfde view als de hoofdpagina /uitslagen,
 * zodat ranking, data, filters, styling en componenten identiek zijn.
 * Optioneel een specifieke (bv. afgeronde) game tonen via gameId.
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
