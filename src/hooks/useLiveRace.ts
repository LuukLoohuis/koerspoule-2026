import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  buildGroups,
  type LiveGroup,
  type LivePremie,
  type LiveRaceState,
  type LiveRider,
} from "@/lib/liveMarathon";

/**
 * Live koersstand voor één ronde.
 *
 * Leest uitsluitend uit onze eigen tabellen; de edge function livemarathon-sync
 * praat met de bron. Zo houdt de site één verbinding naar de KNSB in plaats van
 * één per bezoeker.
 */

export type LiveTrack = {
  trackId: string;
  label: string | null;
  categorie: string | null;
  state: LiveRaceState | null;
  riders: LiveRider[];
  groups: LiveGroup[];
  premies: LivePremie[];
  /** rider_id van de gekoppelde koerspoule-renner, per beennummer. */
  riderIdByBeennummer: Map<string, string>;
  syncedAt: string | null;
};

export type LiveRace = {
  stageId: string;
  stageNumber: number;
  stageName: string | null;
  ijsType: string | null;
  tracks: LiveTrack[];
  /** Oudste sync over alle banen — bepaalt of de weergave nog vers is. */
  syncedAt: string | null;
};

/** Ouder dan dit en we tonen de stand als onderbroken in plaats van als live. */
export const STALE_AFTER_MS = 2 * 60 * 1000;

export function isStale(syncedAt: string | null | undefined): boolean {
  if (!syncedAt) return true;
  const t = new Date(syncedAt).getTime();
  return !Number.isFinite(t) || Date.now() - t > STALE_AFTER_MS;
}

/**
 * Zoekt zelf op wélke ronde live is: de hoogst genummerde ronde van deze game
 * met een gekoppelde baan. Zonder koppeling is er niets te tonen en blijft het
 * live-tabje verborgen.
 */
export function useLiveRace(gameId: string | undefined, enabled = true) {
  return useQuery<LiveRace | null>({
    queryKey: ["live-race", gameId],
    enabled: Boolean(gameId) && enabled && Boolean(supabase),
    // De sync draait zelf periodiek; ververs in dezelfde orde van grootte.
    refetchInterval: 20_000,
    // Een tabblad op de achtergrond hoeft niet mee te pollen.
    refetchIntervalInBackground: false,
    queryFn: async () => {
      if (!supabase || !gameId) return null;

      const { data: linkRows, error: linkErr } = await supabase
        .from("stage_live_tracks")
        .select("track_id, label, categorie, sort_order, stage_id, stages!inner(id, stage_number, name, ijs_type, game_id)")
        .eq("stages.game_id", gameId)
        .order("sort_order");
      if (linkErr) throw linkErr;

      type Row = typeof linkRows extends (infer R)[] | null ? R : never;
      const rows = (linkRows ?? []) as unknown as (Row & {
        stage_id: string;
        stages: { id: string; stage_number: number; name: string | null; ijs_type: string | null };
      })[];
      if (rows.length === 0) return null;

      // Hoogste rondenummer wint: dat is de wedstrijd die nu gereden wordt.
      const nieuwste = rows.reduce((a, b) =>
        b.stages.stage_number > a.stages.stage_number ? b : a,
      );
      const stage = nieuwste.stages;
      const links = rows.filter((r) => r.stage_id === nieuwste.stage_id);

      const trackIds = links.map((l) => l.track_id);
      const [stateRes, standRes, premieRes] = await Promise.all([
        supabase.from("live_race_state").select("*").in("track_id", trackIds),
        supabase
          .from("live_rider_standings")
          .select("*")
          .in("track_id", trackIds)
          .order("aantal_ronden", { ascending: false })
          .order("tijd_sort", { ascending: true }),
        supabase.from("live_premies").select("*").in("track_id", trackIds).order("volgnr"),
      ]);
      if (stateRes.error) throw stateRes.error;
      if (standRes.error) throw standRes.error;
      if (premieRes.error) throw premieRes.error;

      const tracks: LiveTrack[] = links.map((link) => {
        const raw = (stateRes.data ?? []).find((s) => s.track_id === link.track_id) ?? null;
        const standRows = (standRes.data ?? []).filter((r) => r.track_id === link.track_id);

        const riders: LiveRider[] = standRows.map((r) => ({
          beennummer: r.beennummer,
          shownummer: r.shownummer,
          relatienummer: r.relatienummer,
          naam: r.naam,
          sponsor: r.sponsor,
          aantalRonden: r.aantal_ronden,
          aantalRondenKop: r.aantal_ronden_kop,
          meter: r.meter,
          tijdSort: r.tijd_sort,
          tijd: r.tijd,
          lap: r.lap,
          sectie: r.sectie,
          fastest: r.fastest,
          groep: r.groep,
          punten: r.punten,
          finished: r.finished,
        }));

        const riderIdByBeennummer = new Map<string, string>();
        for (const r of standRows) {
          if (r.rider_id) riderIdByBeennummer.set(r.beennummer, r.rider_id);
        }

        return {
          trackId: link.track_id,
          label: link.label,
          categorie: link.categorie,
          state: raw
            ? {
                totaalRonden: raw.totaal_ronden,
                rondeLengte: raw.ronde_lengte,
                rondenTeGaan: raw.ronden_te_gaan,
                aantalRijders: raw.aantal_rijders,
                aantalActief: raw.aantal_actief,
                maxRonden: raw.max_ronden,
                pelotonRonden: raw.peloton_ronden,
                raceTime: raw.race_time,
                lapTime: raw.lap_time,
                gemRondeTijd: raw.gem_ronde_tijd,
                gemRondeSnelheid: raw.gem_ronde_snelheid,
                snelsteRondeTijd: raw.snelste_ronde_tijd,
                snelsteRondeNaam: raw.snelste_ronde_naam,
                snelsteRondeBeennummer: raw.snelste_ronde_beennummer,
                snelsteRondeNr: raw.snelste_ronde_nr,
                snelsteRondeSnelheid: raw.snelste_ronde_snelheid,
                bronTijd: raw.bron_tijd,
              }
            : null,
          riders,
          groups: buildGroups(riders),
          premies: (premieRes.data ?? [])
            .filter((p) => p.track_id === link.track_id)
            .map((p) => ({
              volgnr: p.volgnr,
              ronde: p.ronde,
              aantalRonden: p.aantal_ronden,
              vastgesteld: p.vastgesteld,
              posities: (p.posities ?? []) as LivePremie["posities"],
            })),
          riderIdByBeennummer,
          syncedAt: raw?.synced_at ?? null,
        };
      });

      const stamps = tracks.map((t) => t.syncedAt).filter((s): s is string => Boolean(s));
      const oudste = stamps.length
        ? stamps.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
        : null;

      return {
        stageId: stage.id,
        stageNumber: stage.stage_number,
        stageName: stage.name,
        ijsType: stage.ijs_type,
        tracks,
        syncedAt: oudste,
      };
    },
  });
}
