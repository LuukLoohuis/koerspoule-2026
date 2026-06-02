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
}: {
  gameId?: string;
  gameName?: string | null;
}) {
  return <ResultsView showHeader={false} gameId={gameId} gameName={gameName} />;
}
