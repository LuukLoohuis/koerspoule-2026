// @ts-nocheck
// Edge function: livemarathon-sync
//
// Haalt de live koersstand van livemarathon.schaatsen.nl op en schrijft die
// naar live_race_state / live_rider_standings / live_premies.
//
// Waarom server-side: de bron is een Meteor-app zonder REST-API, dus elke
// bezoeker zou een eigen WebSocket naar de KNSB moeten openen. Eén sync per
// interval houdt dat op één verbinding, en rijders koppelen + normaliseren
// gebeurt dan ook maar één keer in plaats van in elke browser.
//
// Aanroepen:
//   POST {}                        → alle banen van rondes die live staan
//   POST { "trackIds": ["…"] }     → alleen deze banen (voor testen)
//
// Autorisatie: service-role-sleutel (geplande run) of een ingelogde beheerder.
//
// De uitkomst is NOOIT de bron voor punten: die lopen via
// approve_stage_results. Deze tabellen zijn puur informatief.

import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { ddpFetch, docsOf } from "../_shared/ddp.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ── Normalisatie ───────────────────────────────────────────────────────────
// De bron mengt strings en getallen: "21" naast 17, en beennummers met
// voorloopnul ("033"). Alles wat leeg is wordt null.

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Diakrieten en leestekens weg — alleen voor de naam-fallback bij koppelen. */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return respond({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  // Geplande run gebruikt de service-sleutel; een beheerder mag 'm handmatig
  // aftrappen om een koppeling te testen.
  if (token !== serviceKey) {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return respond({ error: "Unauthorized" }, 401);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return respond({ error: "Forbidden" }, 403);
  }

  let body: { trackIds?: string[] } = {};
  try { body = await req.json(); } catch { /* leeg body is prima */ }

  // ── Welke banen? ─────────────────────────────────────────────────────────
  // Zonder expliciete lijst: alle banen die aan een ronde van een live game
  // hangen. Staat er niets live, dan doen we niets — geen verkeer richting de
  // bron als er geen wedstrijd is.
  let trackIds = (body.trackIds ?? []).map(String).filter(Boolean);
  let linkRows: { track_id: string; stage_id: string; game_id: string }[] = [];

  if (trackIds.length === 0) {
    const { data, error } = await admin
      .from("stage_live_tracks")
      .select("track_id, stage_id, stages!inner(game_id, games!inner(status, game_type))")
      .eq("stages.games.status", "live")
      .eq("stages.games.game_type", "meermarathon");
    if (error) return respond({ error: error.message }, 500);
    linkRows = (data ?? []).map((r: Record<string, unknown>) => ({
      track_id: String(r.track_id),
      stage_id: String(r.stage_id),
      game_id: String((r.stages as Record<string, unknown>)?.game_id ?? ""),
    }));
    trackIds = [...new Set(linkRows.map((r) => r.track_id))];
  }

  if (trackIds.length === 0) {
    return respond({ synced: [], reden: "geen live baan gekoppeld" });
  }

  // ── Ophalen ──────────────────────────────────────────────────────────────
  const subs = trackIds.flatMap((trackId) => [
    { name: "races.inTrack", params: [{ trackId }] },
    { name: "stand.inTrack", params: [{ trackId }] },
    { name: "premies.inTrack", params: [{ trackId }] },
  ]);

  let result;
  try {
    result = await ddpFetch(subs, { quietMs: 1500, maxMs: 20000 });
  } catch (err) {
    return respond({ error: `bron onbereikbaar: ${String(err)}` }, 502);
  }

  const races = docsOf(result, "races");
  const stand = docsOf(result, "stand");
  const premies = docsOf(result, "premies");
  const syncedAt = new Date().toISOString();
  const perTrack: Record<string, { rijders: number; premies: number; gekoppeld: number }> = {};

  // ── Rennerkoppeling ──────────────────────────────────────────────────────
  // Het KNSB-relatienummer is de enige stabiele sleutel. Beennummers wisselen
  // per wedstrijd, dus daar koppelen we bewust niet op. Bij twee gelijke namen
  // koppelen we niets: liever handwerk voor de beheerder dan de verkeerde
  // renner punten geven.
  const gameIds = [...new Set(linkRows.map((r) => r.game_id).filter(Boolean))];
  const candidates: { id: string; name: string; knsb: string | null }[] = [];
  if (gameIds.length > 0) {
    const { data: riderRows } = await admin
      .from("riders")
      .select("id, name, knsb_relatienummer, game_id")
      .in("game_id", gameIds);
    for (const r of riderRows ?? []) {
      candidates.push({ id: r.id, name: r.name, knsb: r.knsb_relatienummer ?? null });
    }
  }
  const byRelatienummer = new Map<string, string>();
  const byName = new Map<string, string[]>();
  for (const c of candidates) {
    if (c.knsb) byRelatienummer.set(c.knsb, c.id);
    const key = normalizeName(c.name);
    byName.set(key, [...(byName.get(key) ?? []), c.id]);
  }
  const matchRiderId = (relatienummer: string | null, naam: string): string | null => {
    if (relatienummer && byRelatienummer.has(relatienummer)) {
      return byRelatienummer.get(relatienummer)!;
    }
    const hits = byName.get(normalizeName(naam)) ?? [];
    return hits.length === 1 ? hits[0] : null;
  };

  // ── Wegschrijven per baan ────────────────────────────────────────────────
  for (const trackId of trackIds) {
    // races: het document heeft de baan als _id.
    const race = races.find((r) => r._id === trackId);
    if (race) {
      const { error } = await admin.from("live_race_state").upsert({
        track_id: trackId,
        totaal_ronden: num(race.TotaalAantalRonden),
        ronde_lengte: num(race.RondeLengte),
        ronden_te_gaan: num(race.RondebordRonden),
        aantal_rijders: num(race.NrRijders),
        aantal_actief: num(race.NrRijdersActief),
        max_ronden: num(race.MaxRonden),
        peloton_ronden: num(race.PelotonRonden),
        race_time: str(race.RaceTime),
        lap_time: str(race.LapTime),
        gem_ronde_tijd: str(race.GemiddeldeRondeTijd),
        gem_ronde_snelheid: str(race.GemiddeldeRondeSnelheid),
        snelste_ronde_tijd: str(race.SnelsteRondeTijd),
        snelste_ronde_naam: str(race.SnelsteRondeRijderNaam),
        snelste_ronde_beennummer: str(race.SnelsteRondeBeennummer),
        snelste_ronde_nr: num(race.SnelsteRondeNr),
        snelste_ronde_snelheid: str(race.SnelsteRondeSnelheid),
        bron_tijd: str(race.HuidigeTijd),
        synced_at: syncedAt,
      }, { onConflict: "track_id" });
      if (error) return respond({ error: `live_race_state: ${error.message}` }, 500);
    }

    // stand: sorteren op ronden vóór tijd. Op de geformatteerde tijd sorteren
    // gaat mis zodra iemand ronden achterligt — die heeft een lágere kloktijd.
    const rows = stand
      .filter((d) => str(d.trackId) === trackId)
      .map((d) => ({
        beennummer: str(d.Beennummer),
        naam: str(d.Naam),
        relatienummer: str(d.Relatienummer),
        shownummer: str(d.Shownummer),
        sponsor: str(d.Sponsor),
        aantal_ronden: num(d.AantalRonden) ?? 0,
        aantal_ronden_kop: num(d.AantalRondenKop),
        meter: num(d.Meter),
        tijd_sort: num(d.TijdSort),
        tijd: str(d.Tijd),
        lap: str(d.Lap),
        sectie: str(d.Sectie),
        fastest: str(d.Fastest),
        groep: num(d.Groep),
        punten: num(d.Punten),
        finished: d.Finished === true,
      }))
      .filter((r) => r.beennummer && r.naam)
      .sort((a, b) =>
        b.aantal_ronden - a.aantal_ronden ||
        (a.tijd_sort ?? Number.MAX_SAFE_INTEGER) - (b.tijd_sort ?? Number.MAX_SAFE_INTEGER)
      );

    let gekoppeld = 0;
    const standRows = rows.map((r, i) => {
      const riderId = matchRiderId(r.relatienummer, r.naam!);
      if (riderId) gekoppeld++;
      return { ...r, track_id: trackId, positie: i + 1, rider_id: riderId, synced_at: syncedAt };
    });

    if (standRows.length > 0) {
      const { error } = await admin
        .from("live_rider_standings")
        .upsert(standRows, { onConflict: "track_id,beennummer" });
      if (error) return respond({ error: `live_rider_standings: ${error.message}` }, 500);

      // Opgegeven rijders blijven anders als spook in de stand staan.
      const houden = standRows.map((r) => r.beennummer);
      await admin
        .from("live_rider_standings")
        .delete()
        .eq("track_id", trackId)
        .not("beennummer", "in", `(${houden.map((b) => `"${b}"`).join(",")})`);
    }

    // premies: Nr1..Nr10 / Naam1..Naam10 platslaan tot één lijst.
    const premieRows = premies
      .filter((d) => str(d.trackId) === trackId)
      .map((d) => {
        const posities: { positie: number; beennummer: string; naam: string }[] = [];
        for (let i = 1; i <= 10; i++) {
          const been = str(d[`Nr${i}`]);
          if (!been) continue;
          posities.push({ positie: i, beennummer: been, naam: str(d[`Naam${i}`]) ?? "" });
        }
        return {
          track_id: trackId,
          volgnr: num(d.Volgnr) ?? 0,
          ronde: num(d.Ronde),
          aantal_ronden: num(d.AantalRonden),
          vastgesteld: d.Vastgesteld === true,
          posities,
          synced_at: syncedAt,
        };
      });

    if (premieRows.length > 0) {
      const { error } = await admin
        .from("live_premies")
        .upsert(premieRows, { onConflict: "track_id,volgnr" });
      if (error) return respond({ error: `live_premies: ${error.message}` }, 500);
    }

    perTrack[trackId] = {
      rijders: standRows.length,
      premies: premieRows.length,
      gekoppeld,
    };
  }

  return respond({
    synced_at: syncedAt,
    banen: trackIds,
    per_baan: perTrack,
    ddp: { berichten: result.messages, ready: result.ready },
  });
});
