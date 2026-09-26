import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStartlist } from "@/hooks/useStartlist";
import { useEntries, useStages, useStagePointsForEntries } from "@/hooks/useResults";
import { riderStagePointsQuery, type RiderStagePointsRow } from "@/hooks/useRiderStagePoints";
import type { EtappePunten } from "@/lib/ploegRanglijst";

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

export type PloegRit = { id: string; nummer: number; naam: string | null };

/**
 * Alles wat Ploeg C nodig heeft, uit dezelfde bronnen als de rest van de app:
 * de renners uit de inschrijving, de truien uit de startlijst (`teams.jersey_url`),
 * de punten per renner uit de rider_stage_points-RPC (zelfde cache-sleutel als
 * de dossier-dropdown, dus geen dubbele call), en de ploegpunten uit
 * stage_points. Het scherm kiest zelf de rit; hier komt alleen de data.
 */
export function usePloegRanglijst(gameId?: string) {
  const { entry, picksByCategory, jokerIds, teamName, saveTeamName, isLoading: entryLaden } = useEntry(gameId);
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

  const rennersQ = useQuery({
    queryKey: ["ploeg-renners", [...rennerIds].sort()],
    enabled: Boolean(supabase && rennerIds.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!supabase || rennerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, team, team_id, is_dnf")
        .in("id", rennerIds);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; team: string | null; team_id: string | null; is_dnf: boolean | null }>;
    },
  });

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
        .map((s) => ({ id: s.id, nummer: s.stage_number, naam: s.name })),
    [stages],
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
        etappes: rijen.map((p) => ({ stage_number: p.stage_number, total_points: p.total_points ?? 0 })),
      }];
    });
  }, [rennersQ.data, startlist, categories, picksByCategory, jokerIds, rennerIds, puntenQs]);

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
