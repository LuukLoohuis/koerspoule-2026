import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import PronostiekWeergave, { type Voorspelling } from "@/components/ploeg/PronostiekWeergave";
import PloegSkeleton from "@/components/skeletons/PloegSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { eigenRennerIds, useRidersByIds } from "@/hooks/useRidersByIds";
import { canRegister } from "@/lib/gameStatus";
import { useKlassementUitslag } from "@/hooks/useKlassementUitslag";

/**
 * Pronostiek op een telefoon: de container om PronostiekWeergave. Alleen de
 * inschrijving en de renners op id, dezelfde cache-sleutels als Ploeg C, dus
 * als buur in de veegcarrousel staat hij er meteen.
 */
export default function PronostiekPanel({
  gameId,
  gameStatus,
  gameName,
  meermarathon = false,
  className,
}: {
  gameId?: string;
  gameStatus?: string;
  gameName?: string | null;
  /** Meermarathon: de winnaars van het Cup- en het Grand Prix-klassement. */
  meermarathon?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus, name: gameName ?? "" } : curGame;
  const { entry, picksByCategory, jokerIds, predictions, isLoading } = useEntry(game?.id);
  // Meermarathon: hoe de voorspelling uitpakt, zodra de beheerder de winnaars zette.
  const { data: uitslag } = useKlassementUitslag(game?.id, entry?.id, meermarathon);
  const ids = useMemo(() => {
    const eigen = eigenRennerIds({ picksByCategory, jokerIds, predictions });
    // De winnaars erbij, voor "Winnaar: …" als je iemand anders koos. Zonder
    // uitslag blijft de sleutel die van Ploeg C (warme cache bij het vegen).
    const winnaars = [uitslag?.winnaars.cup, uitslag?.winnaars.grandprix].filter((id): id is string => Boolean(id));
    return winnaars.length > 0 ? [...eigen, ...winnaars] : eigen;
  }, [picksByCategory, jokerIds, predictions, uitslag]);
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
        <div className="mb-2 text-4xl" aria-hidden>{meermarathon ? "⛸️" : "🚴‍♂️"}</div>
        <p className="font-display text-xl font-bold">{t("team.panel.noTeamYet")}</p>
        <p className="mt-1 font-serif text-sm italic text-muted-foreground">
          {t("team.panel.buildBeforeFlamme", { context: meermarathon ? "mm" : undefined })}
        </p>
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
      meermarathon={meermarathon}
      uitslag={uitslag ?? null}
      // Voorspellen gaat in de ploegbouwer, en kan zolang de inschrijving open is.
      bouwerPad={meermarathon && canRegister(game.status) ? `/team-samenstellen?game=${encodeURIComponent(game.id)}` : null}
    />
  );
}
