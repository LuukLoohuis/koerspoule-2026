import { useEffect, useMemo } from "react";
import KrantCWeergave from "@/components/krant/KrantCWeergave";
import type { HorsTabKey } from "@/components/karavaan/MiniStrip";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useAllGames } from "@/hooks/useAllGames";
import { useSubpoules } from "@/hooks/useSubpoules";
import { useGekozenSubpoule } from "@/hooks/useGekozenSubpoule";
import { markKaravaanVisited, useKaravaanFeed } from "@/hooks/useKaravaanFeed";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import { useEtappeVerslag } from "@/hooks/useEtappeVerslag";
import { useEtappeVoorbeschouwing } from "@/hooks/useEtappeVoorbeschouwing";
import { useStages } from "@/hooks/useResults";
import { useKoersThema } from "@/contexts/KoersThemaContext";
import { bouwKop, kopUitVerslag } from "@/lib/krantKop";
import { volgendeRit } from "@/lib/krantC";
import { tourviewUrl } from "@/lib/tourview";

/**
 * Krant C: de Koerskrant op een telefoon (docs/design/krant-ploeg-c). Dit is
 * de container: dezelfde bronnen als de webkrant (de karavaan-feed, de Hors-
 * samenvatting, het etappeverslag, de voorbeschouwing), zodat beide dezelfde
 * cijfers laten zien. De opmaak staat in KrantCWeergave.
 */
export default function KrantC({
  gameId,
  gameStatus,
  onOpenHors,
  onOpenSubpoule,
  onOpenUitslagen,
  onOpenDaguitslag,
  className,
}: {
  gameId?: string;
  gameStatus?: string;
  onOpenHors?: (tab: HorsTabKey) => void;
  onOpenSubpoule?: (subpouleId: string) => void;
  onOpenUitslagen?: () => void;
  onOpenDaguitslag?: (stageNumber: number) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const thema = useKoersThema();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;
  const { data: alleGames } = useAllGames();
  const gameMeta = gameId ? alleGames?.find((g) => g.id === gameId) : curGame;

  const subpoulesQuery = useSubpoules(game?.id);
  const subpoules = subpoulesQuery.subpoules;
  const [selectedSubpouleId, setSelectedSubpouleId] = useGekozenSubpoule(subpoules);

  const feed = useKaravaanFeed({ gameId: game?.id, subpouleId: selectedSubpouleId ?? undefined, userId: user?.id });
  const laatste = feed.data?.etappes?.[0] ?? null;

  const horsSummary = useHorsCategorieSummary(gameId ? { id: gameId, status: gameStatus } : undefined);
  const { data: verslag } = useEtappeVerslag(laatste?.stage_id);
  const { data: stages = [] } = useStages(game?.id);
  const morgen = useMemo(() => volgendeRit(stages), [stages]);
  const { data: voorbeschouwing } = useEtappeVoorbeschouwing(morgen?.id);

  // Bezoek markeren zoals de webkrant doet, zodat "nieuw sinds je laatste
  // bezoek" op beide klopt.
  useEffect(() => {
    if (!user?.id) return;
    const id = setTimeout(() => void markKaravaanVisited(), 1500);
    return () => clearTimeout(id);
  }, [user?.id]);

  // De kop: uit de generator als die de winnaar noemt, anders het sjabloon;
  // zonder winnaar de eerste zin van het verslag.
  const kop = useMemo(() => {
    if (!laatste) return null;
    const gebouwd = bouwKop({
      gegenereerd: laatste.krant_kop,
      winnaar: laatste.ritwinnaar,
      etappeNaam: laatste.stage_name,
      etappeNummer: laatste.stage_number,
      poulenamen: [
        ...laatste.subpouleStandings.flatMap((r) => [r.team_name, r.display_name]),
        ...laatste.overallStandings.flatMap((r) => [r.team_name, r.display_name]),
      ],
    });
    if (gebouwd) return gebouwd;
    const tekst = verslag?.tekst?.trim();
    return tekst ? kopUitVerslag(tekst) ?? `${thema.etappe} ${laatste.stage_number}` : null;
  }, [laatste, verslag?.tekst, thema.etappe]);

  return (
    <KrantCWeergave
      className={className}
      laatste={laatste}
      kop={kop}
      verslag={verslag ?? null}
      subpoules={subpoules.map((sp) => ({ id: sp.id, name: sp.name }))}
      selectedSubpouleId={selectedSubpouleId}
      onSelectSubpoule={setSelectedSubpouleId}
      geenSubpoule={subpoules.length === 0 && !subpoulesQuery.isLoading}
      scores={horsSummary}
      heeftHorsCijfers={
        horsSummary.monkeyBeatPct !== null || horsSummary.emiratesPct !== null || horsSummary.directorScore !== null
      }
      morgen={morgen}
      voorbeschouwing={voorbeschouwing ?? null}
      profielUrl={morgen ? tourviewUrl(gameMeta?.game_type, gameMeta?.year, morgen.stage_number) : null}
      commentaarLaden={Boolean(laatste && !laatste.michel_tekst && !laatste.jose_tekst && laatste.subpouleStandings.length >= 2)}
      onOpenHors={onOpenHors}
      onOpenSubpoule={onOpenSubpoule}
      onOpenUitslagen={onOpenUitslagen}
      onOpenDaguitslag={onOpenDaguitslag}
    />
  );
}
