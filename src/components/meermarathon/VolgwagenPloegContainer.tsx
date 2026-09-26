/**
 * Data voor Volgwagen › Mijn ploeg bij de Meermarathon. Haalt op en rekent
 * om; wat er te zien is, staat in VolgwagenPloeg.
 *
 * Gebruikt bewust géén useEntry: die maakt een entry aan als er nog geen is,
 * en alleen kijken mag je nergens voor inschrijven. De eigen ploeg komt uit
 * een alleen-lezen query die bij elk bezoek ververst, zodat een ploeg die je
 * net in de teambouwer bevestigde hier meteen klopt.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { useEntries } from "@/hooks/useResults";
import { useRiderEntryTotals } from "@/hooks/useRiderEntryTotals";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { entryErrorMessage } from "@/hooks/useEntry";
import PloegSkeleton from "@/components/skeletons/PloegSkeleton";
import { mmFase } from "@/lib/meermarathonSeizoen";
import {
  bouwAftelling,
  bouwPloegRijen,
  heeftUitslag,
  ploegPunten,
  subpouleRang,
  volgendeKaart,
  type PloegRijder,
} from "@/lib/meermarathonVolgwagen";
import VolgwagenPloeg, { VolgwagenPloegInrichting, VolgwagenPloegUitnodiging } from "./VolgwagenPloeg";

type EigenEntry = {
  id: string;
  status: string;
  teamName: string | null;
  picks: { category_id: string; rider_id: string }[];
  jokers: string[];
};

function useEigenEntry(gameId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["mm-volgwagen-entry", gameId, userId],
    enabled: Boolean(supabase && gameId && userId),
    // De app houdt data standaard een minuut vers; hier niet, anders zie je
    // na het bevestigen in de teambouwer nog even de oude ploeg.
    staleTime: 0,
    queryFn: async (): Promise<EigenEntry | null> => {
      if (!supabase || !gameId || !userId) return null;
      const { data, error } = await supabase
        .from("entries")
        .select("id, status, team_name, entry_picks(category_id, rider_id), entry_jokers(rider_id)")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const rij = data as unknown as {
        id: string;
        status: string;
        team_name: string | null;
        entry_picks: { category_id: string; rider_id: string }[] | null;
        entry_jokers: { rider_id: string }[] | null;
      };
      return {
        id: rij.id,
        status: rij.status,
        teamName: rij.team_name?.trim() || null,
        picks: rij.entry_picks ?? [],
        jokers: (rij.entry_jokers ?? []).map((j) => j.rider_id),
      };
    },
  });
}

function useRijders(ids: string[]) {
  const gesorteerd = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["mm-volgwagen-rijders", gesorteerd],
    enabled: Boolean(supabase && gesorteerd.length > 0),
    queryFn: async (): Promise<Map<string, PloegRijder>> => {
      if (!supabase || gesorteerd.length === 0) return new Map();
      const { data, error } = await supabase.from("riders").select("id, name, team, is_vervallen").in("id", gesorteerd);
      if (error) throw error;
      // is_vervallen staat (nog) niet in de gegenereerde types.
      const rijen = (data ?? []) as unknown as ({ id: string } & PloegRijder)[];
      return new Map(rijen.map((r) => [r.id, { name: r.name, team: r.team, is_vervallen: r.is_vervallen }]));
    },
  });
}

/** De klok voor de aftelling; de tegels tonen minuten, dus elke 15 s is ruim genoeg. */
function useNu(elkeMs = 15_000) {
  const [nu, setNu] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNu(new Date()), elkeMs);
    return () => clearInterval(id);
  }, [elkeMs]);
  return nu;
}

export default function VolgwagenPloegContainer({
  gameId,
  onOpenUitslagen,
  onOpenSubpoule,
  focusNameSignal,
}: {
  gameId: string | undefined;
  onOpenUitslagen?: () => void;
  onOpenSubpoule?: (subpouleId: string) => void;
  focusNameSignal?: number;
}) {
  const { user, role } = useAuth();
  const { data: profiel } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const nu = useNu();

  const { statussen, isLoading: seizoenLaadt, error: seizoenFout } = useMeermarathonSeizoen();
  const status = statussen.find((s) => s.game.id === gameId) ?? null;
  const { data: categorieen = [], isLoading: categorieenLaden } = useCategories(gameId);
  const entryQuery = useEigenEntry(gameId, user?.id);
  const entry = entryQuery.data ?? null;

  const rijderIds = useMemo(
    () => (entry ? [...entry.picks.map((p) => p.rider_id), ...entry.jokers] : []),
    [entry],
  );
  const rijdersQuery = useRijders(rijderIds);
  const { data: puntenPerRijder } = useRiderEntryTotals(gameId, entry?.id);

  // Subpoule: de eerste waar je in zit, net als elders in de Volgwagen.
  const { subpoules } = useSubpoules(gameId);
  const subpoule = subpoules[0] ?? null;
  const { data: leden = [] } = useSubpouleMembers(subpoule?.id);
  // Het volledige klassement is alleen nodig om binnen een subpoule te tellen.
  const { data: standen = [] } = useEntries(subpoule ? gameId : undefined);

  const naamMutatie = useMutation({
    mutationFn: async ({ entryId, naam }: { entryId: string; naam: string }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const schoon = naam.trim();
      const { error } = await supabase.from("entries").update({ team_name: schoon || null }).eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Ook de caches van useEntry (koptekst Mijn Peloton) en de koersbalk.
      queryClient.invalidateQueries({ queryKey: ["mm-volgwagen-entry", gameId] });
      queryClient.invalidateQueries({ queryKey: ["entry", gameId] });
      queryClient.invalidateQueries({ queryKey: ["mm-seizoen"] });
    },
  });

  if (!user) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Log in om je ploeg te zien.</div>;
  }
  if (
    seizoenLaadt ||
    categorieenLaden ||
    entryQuery.isLoading ||
    (rijderIds.length > 0 && rijdersQuery.isLoading)
  ) {
    return <PloegSkeleton />;
  }
  if (seizoenFout || entryQuery.error) {
    return (
      <div role="alert" className="retro-border bg-card p-6 text-muted-foreground">
        De Volgwagen kon je ploeg niet laden. Probeer het straks opnieuw.
      </div>
    );
  }
  if (!gameId || !status) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Deze Meermarathon-game is niet gevonden.</div>;
  }

  const volgende = volgendeKaart(status);
  const aftelling = bouwAftelling({ nu, deadline: status.deadline, wijzigbaar: status.wijzigbaar, wedstrijdDatum: volgende.datum });

  if (categorieen.length === 0) {
    return <VolgwagenPloegInrichting label={status.label} beheerder={role === "admin"} />;
  }

  const fase = mmFase(entry ? { id: entry.id, status: entry.status, teamName: entry.teamName, picks: entry.picks.length } : null);
  if (!entry || fase === "niet-ingeschreven") {
    return (
      <VolgwagenPloegUitnodiging
        gameId={gameId}
        label={status.label}
        categorie={status.categorie}
        vereist={status.vereist}
        deadline={status.deadline}
        wijzigbaar={status.wijzigbaar}
        volgende={volgende}
        aftelling={aftelling}
      />
    );
  }

  const uitslag = heeftUitslag(status);
  const subpouleStand = subpoule && uitslag ? subpouleRang(standen, leden.map((l) => l.user_id), entry.id) : null;

  return (
    <VolgwagenPloeg
      gameId={gameId}
      label={status.label}
      categorie={status.categorie}
      fase={fase}
      ploegnaam={entry.teamName}
      ploegleider={profiel?.display_name?.trim() || user.user_metadata?.display_name?.trim() || null}
      klassement={status.klassement ? { rank: status.klassement.rank, totaal: status.klassement.totaal } : null}
      punten={ploegPunten(status)}
      subpoule={
        subpoule
          ? { id: subpoule.id, naam: subpoule.name, rank: subpouleStand?.rank ?? null, totaal: subpouleStand?.totaal ?? subpoule.member_count }
          : null
      }
      rijen={bouwPloegRijen({
        categorieen: categorieen.map((c) => ({ id: c.id, name: c.name, max_picks: c.max_picks })),
        picks: entry.picks,
        jokers: entry.jokers,
        rijders: rijdersQuery.data ?? new Map(),
        // Nog aan het laden: liever even "—" dan overal een 0.
        punten: uitslag ? puntenPerRijder ?? null : null,
      })}
      gekozen={entry.picks.length}
      vereist={status.vereist}
      volgende={volgende}
      aftelling={aftelling}
      deadline={status.deadline}
      wijzigbaar={status.wijzigbaar}
      onKlassement={onOpenUitslagen}
      onSubpoule={onOpenSubpoule}
      onPloegnaam={async (naam) => {
        try {
          await naamMutatie.mutateAsync({ entryId: entry.id, naam });
          toast({ title: "Ploegnaam opgeslagen" });
          return true;
        } catch (e) {
          toast({ title: "Opslaan mislukt", description: entryErrorMessage(e), variant: "destructive" });
          return false;
        }
      }}
      bewerkSignaal={focusNameSignal}
    />
  );
}
