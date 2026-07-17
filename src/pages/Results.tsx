import { useTranslation } from "react-i18next";
import ResultsView from "@/components/ResultsView";
import { useAuth } from "@/hooks/useAuth";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { maySeeLiveContent } from "@/lib/gameStatus";
import SneakPreviewLock from "@/components/SneakPreviewLock";

export default function Results() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  // Gedeelde game-keuze uit de shell (geen eigen kiezer/state meer hier).
  const { selectedGame } = useSelectedGame();

  return (
    <div className="container mx-auto px-5 py-4 md:py-6">
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
