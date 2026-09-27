import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import PronostiekWeergave, { type Voorspelling } from "@/components/ploeg/PronostiekWeergave";
import PloegSkeleton from "@/components/skeletons/PloegSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { eigenRennerIds, useRidersByIds } from "@/hooks/useRidersByIds";

/**
 * Pronostiek op een telefoon: de container om PronostiekWeergave. Alleen de
 * inschrijving en de renners op id, dezelfde cache-sleutels als Ploeg C, dus
 * als buur in de veegcarrousel staat hij er meteen.
 */
export default function PronostiekPanel({
  gameId,
  gameStatus,
  gameName,
  className,
}: {
  gameId?: string;
  gameStatus?: string;
  gameName?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus, name: gameName ?? "" } : curGame;
  const { entry, picksByCategory, jokerIds, predictions, isLoading } = useEntry(game?.id);
  const ids = useMemo(() => eigenRennerIds({ picksByCategory, jokerIds, predictions }), [picksByCategory, jokerIds, predictions]);
  const { data: riders = [] } = useRidersByIds(ids);
  const ridersById = useMemo(() => Object.fromEntries(riders.map((r) => [r.id, r])), [riders]);

  if (!user) {
    return <div className="ornate-frame retro-border bg-card p-6 text-muted-foreground">{t("team.panel.loginToView")}</div>;
  }
  if (isLoading) return <PloegSkeleton />;
  if (!game) {
    return <div className="ornate-frame retro-border bg-card p-6 text-muted-foreground">{t("team.panel.noActiveRace")}</div>;
  }
  if (!entry || picksByCategory.size === 0) {
    return (
      <div className={"retro-border bg-card p-5 text-center " + (className ?? "")}>
        <div className="mb-2 text-4xl" aria-hidden>🚴‍♂️</div>
        <p className="font-display text-xl font-bold">{t("team.panel.noTeamYet")}</p>
        <p className="mt-1 font-serif text-sm italic text-muted-foreground">{t("team.panel.buildBeforeFlamme")}</p>
        <Link
          to="/team-samenstellen"
          className="mt-4 inline-flex h-10 items-center rounded-full border-[1.5px] border-foreground px-4 text-[13px] font-bold shadow-[1.5px_1.5px_0_hsl(var(--foreground))]"
        >
          {t("team.panel.toTeamBuilder")}
        </Link>
      </div>
    );
  }

  return (
    <PronostiekWeergave
      className={className}
      gameName={game.name ?? ""}
      predictions={predictions as Voorspelling[]}
      ridersById={ridersById}
      dnfZichtbaar={game.status === "live" || game.status === "finished"}
    />
  );
}
