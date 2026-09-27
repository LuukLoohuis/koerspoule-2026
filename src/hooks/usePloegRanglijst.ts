import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStartlist } from "@/hooks/useStartlist";
import { eigenRennerIds, useRidersByIds } from "@/hooks/useRidersByIds";
import { useEntries, useStages, useStagePointsForEntries } from "@/hooks/useResults";
import { riderStagePointsQuery, type RiderStagePointsRow } from "@/hooks/useRiderStagePoints";
import type { EtappePunten } from "@/lib/ploegRanglijst";
import { meermarathonStageAfkorting, meermarathonStageLabel, wedstrijdTypeVan, type WedstrijdType } from "@/lib/gameTypes";
import { wedstrijdEigenNaam } from "@/lib/krantC";

export type PloegRenner = {
  id: string;
  naam: string;
  /** Naam van de teambuilder-categorie; "Joker" voor een losse joker. */
  categorie: string;
  ploeg: string | null;
  /** Geüploade ploegtrui uit de startlijst; null → de blanco trui. */
  truiUrl: string | null;
  opgave: boolean;
  joker: boolean;
  /** Joker-multiplier zoals de RPC hem toepast; 1 zonder joker. */
  multiplier: number;
  etappes: EtappePunten[];
};

export type PloegRit = {
  id: string;
  nummer: number;
  naam: string | null;
  /** Meermarathon: "Cup 3" voluit, "GP 5" voor een smalle kolom, en de soort. */
  label?: string;
  kort?: string;
  soort?: WedstrijdType;
};

/**
 * Alles wat Ploeg C nodig heeft, uit dezelfde bronnen als de rest van de app:
 * de renners uit de inschrijving, de truien uit de startlijst (`teams.jersey_url`),
 * de punten per renner uit de rider_stage_points-RPC (zelfde cache-sleutel als
 * de dossier-dropdown, dus geen dubbele call), en de ploegpunten uit
 * stage_points. Het scherm kiest zelf de rit; hier komt alleen de data.
 */
export function usePloegRanglijst(gameId?: string, { meermarathon = false }: { meermarathon?: boolean } = {}) {
  const { entry, picksByCategory, jokerIds, predictions, teamName, saveTeamName, isLoading: entryLaden } = useEntry(gameId);
  const { data: categories = [], isLoading: categoriesLaden } = useCategories(gameId);
  const { data: startlist = [] } = useStartlist(gameId);
  const { data: stages = [] } = useStages(gameId);
  const { data: entries = [] } = useEntries(gameId);

  // Alle gekozen renners plus de jokers, in de volgorde van de teambuilder.
  const rennerIds = useMemo(() => {
    const ids: string[] = [];
    const gezien = new Set<string>();
    const voeg = (id: string) => {
      if (!gezien.has(id)) {
        gezien.add(id);
        ids.push(id);
      }
    };
    for (const cat of categories) for (const id of picksByCategory.get(cat.id) ?? []) voeg(id);
    for (const [, lijst] of picksByCategory) for (const id of lijst) voeg(id);
    for (const id of jokerIds) voeg(id);
    return ids;
  }, [categories, picksByCategory, jokerIds]);

  // Zelfde set en dus zelfde sleutel als Mijn ploeg en Pronostiek (ook de
  // voorspelde renners erbij): de buur in de carrousel vindt de renners dan
  // al in de cache en hoeft niets op te halen.
  const alleIds = useMemo(() => eigenRennerIds({ picksByCategory, jokerIds, predictions }), [picksByCategory, jokerIds, predictions]);
  const rennersQ = useRidersByIds(alleIds);

  // Eén kleine RPC per renner; dezelfde sleutel als useRiderStagePoints, zodat
  // een geopend dossier elders uit deze cache leest.
  const puntenQs = useQueries({
    queries: rennerIds.map((id) => riderStagePointsQuery(gameId, id, entry?.id ?? null)),
  });

  const ritten = useMemo<PloegRit[]>(
    () =>
      stages
        .filter((s) => !s.is_gc && s.results_status === "approved")
        .sort((a, b) => a.stage_number - b.stage_number)
        .map((s) =>
          meermarathon
            ? {
                id: s.id,
                nummer: s.stage_number,
                naam: wedstrijdEigenNaam(s),
                label: meermarathonStageLabel({ ...s, name: null }),
                kort: meermarathonStageAfkorting(s),
                soort: wedstrijdTypeVan(s),
              }
            : { id: s.id, nummer: s.stage_number, naam: s.name },
        ),
    [stages, meermarathon],
  );

  const myEntryIds = useMemo(() => (entry?.id ? [entry.id] : []), [entry?.id]);
  const { data: ploegPunten = [] } = useStagePointsForEntries(gameId, myEntryIds);
  const officieelTotaal = entry ? entries.find((e) => e.id === entry.id)?.total_points ?? null : null;

  const renners = useMemo<PloegRenner[]>(() => {
    const rijders = rennersQ.data ?? [];
    if (rijders.length === 0) return [];
    const rijderBy = new Map(rijders.map((r) => [r.id, r]));
    const teamBy = new Map(startlist.map((t) => [t.id, t]));
    const categorieVan = new Map<string, string>();
    for (const cat of categories) {
      for (const id of picksByCategory.get(cat.id) ?? []) {
        if (!categorieVan.has(id)) categorieVan.set(id, cat.name);
      }
    }
    const jokers = new Set(jokerIds);
    const puntenBy = new Map<string, RiderStagePointsRow[]>();
    rennerIds.forEach((id, i) => puntenBy.set(id, puntenQs[i]?.data ?? []));

    return rennerIds.flatMap((id) => {
      const r = rijderBy.get(id);
      if (!r) return [];
      const team = r.team_id ? teamBy.get(r.team_id) : undefined;
      const rijen = puntenBy.get(id) ?? [];
      const multiplier = rijen.find((p) => (p.multiplier ?? 1) > 1)?.multiplier ?? 1;
      return [{
        id,
        naam: r.name,
        categorie: categorieVan.get(id) ?? "Joker",
        ploeg: team?.name ?? r.team ?? null,
        truiUrl: team?.jersey_url ?? null,
        opgave: Boolean(r.is_dnf),
        joker: jokers.has(id),
        multiplier,
        etappes: rijen.map((p) => ({
          stage_number: p.stage_number,
          total_points: p.total_points ?? 0,
          // Bij de Meermarathon heet de wedstrijd zoals in ritten hierboven;
          // de RPC geeft de ruwe naam, soms nog "Etappe 3".
          stage_name: meermarathon ? null : p.stage_name,
          stage_type: p.stage_type,
          finish_position: p.finish_position,
          multiplier: p.multiplier,
        })),
      }];
    });
  }, [rennersQ.data, startlist, categories, picksByCategory, jokerIds, rennerIds, puntenQs, meermarathon]);

  const puntenLaden = puntenQs.some((q) => q.isLoading);

  return {
    entry,
    teamName,
    saveTeamName,
    renners,
    ritten,
    ploegPunten,
    officieelTotaal,
    heeftPloeg: rennerIds.length > 0,
    laden: entryLaden || categoriesLaden || (rennerIds.length > 0 && (rennersQ.isLoading || puntenLaden)),
  };
}
