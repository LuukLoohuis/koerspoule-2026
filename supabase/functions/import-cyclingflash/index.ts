// @ts-nocheck
// Edge function: import-cyclingflash
// Despite the name, this scrapes ProCyclingStats (much more reliable than cyclingflash.com,
// which is Cloudflare-protected). Returns matched + unmatched riders per classification.
// Matching: bib number first (most reliable), then normalized-name fallback.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RaceType = "giro" | "tdf" | "vuelta";
type Classification = "stage" | "gc" | "points" | "mountain" | "youth";

const RACE_SLUG: Record<RaceType, string> = {
  giro: "giro-d-italia",
  tdf: "tour-de-france",
  vuelta: "vuelta-a-espana",
};

// PCS URL suffix per classification
const URL_SUFFIX: Record<Classification, string> = {
  stage: "",
  gc: "-gc",
  points: "-points",
  mountain: "-kom",
  youth: "-youth",
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/[^a-z]/g, "");
}

function nameKeys(s: string): string[] {
  // Generate matching keys: full normalized, sorted-tokens, last+first variants
  const norm = normalizeName(s);
  const tokens = (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s\-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/-/g, ""))
    .filter(Boolean);
  const sorted = [...tokens].sort().join("");
  return Array.from(new Set([norm, sorted].filter(Boolean)));
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) {
      console.error(`fetch ${url} -> ${resp.status}`);
      return null;
    }
    return await resp.text();
  } catch (e) {
    console.error(`fetch error ${url}:`, (e as Error).message);
    return null;
  }
}

type RawRow = { position: number; bib: number | null; name: string };

function parseResultsTable(html: string | null): RawRow[] {
  if (!html) return [];
  try {
    // Find the "currently selected" tab block
    const curM = html.match(/<li class="cur"\s+data-id="(\d+)"/);
    let block = "";
    if (curM) {
      const did = curM[1];
      const start = html.indexOf(`<div class="resTab " data-id="${did}">`);
      if (start >= 0) {
        const next = html.indexOf('<div class="resTab ', start + 10);
        block = html.slice(start, next > 0 ? next : start + 300000);
      }
    }
    if (!block) {
      // Fallback: take the entire resultsCont area
      const i = html.indexOf('id="resultsCont"');
      if (i >= 0) block = html.slice(i, i + 300000);
    }
    if (!block) return [];

    const tblM = block.match(/<table[^>]*class="results[^"]*"[^>]*>([\s\S]*?)<\/table>/);
    if (!tblM) return [];
    const tbl = tblM[1];

    const headers = Array.from(tbl.matchAll(/data-code="([^"]+)"/g)).map((m) => m[1]);
    const bibIdx = headers.indexOf("bib");
    const nameIdx = headers.indexOf("ridername");
    if (nameIdx < 0) return [];

    const rows: RawRow[] = [];
    const trRe = /<tr>([\s\S]*?)<\/tr>/g;
    let rm: RegExpExecArray | null;
    let pos = 0;
    while ((rm = trRe.exec(tbl)) !== null) {
      const tds = Array.from(rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m) => m[1]);
      if (tds.length === 0) continue;
      const rnkRaw = tds[0].replace(/<[^>]+>/g, " ").trim();
      const rnk = parseInt(rnkRaw, 10);
      if (!Number.isFinite(rnk)) continue;
      pos = rnk;
      let bib: number | null = null;
      if (bibIdx >= 0 && tds[bibIdx] !== undefined) {
        const b = parseInt(tds[bibIdx].replace(/<[^>]+>/g, " ").trim(), 10);
        bib = Number.isFinite(b) ? b : null;
      }
      const nameCell = tds[nameIdx] ?? "";
      const aM = nameCell.match(/<a [^>]*href="rider\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      let name = "";
      if (aM) {
        name = aM[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      } else {
        name = nameCell.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (!name) continue;
      rows.push({ position: pos, bib, name });
      if (rows.length >= 30) break;
    }
    return rows;
  } catch (e) {
    console.error("parseResultsTable error:", (e as Error).message);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const raceType = body.race_type as RaceType;
    const stageNumber = Number(body.stage_number);
    const gameId = body.game_id as string;
    const year = Number(body.year);

    if (!["giro", "tdf", "vuelta"].includes(raceType)) {
      return new Response(JSON.stringify({ error: "Onbekend race_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 21) {
      return new Response(JSON.stringify({ error: "Ongeldig stage_number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!gameId || !year) {
      return new Response(JSON.stringify({ error: "game_id en year vereist" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = RACE_SLUG[raceType];
    const baseUrl = `https://www.procyclingstats.com/race/${slug}/${year}/stage-${stageNumber}`;
    const sourceUrl = baseUrl;

    const classifications: Classification[] = ["stage", "gc", "points", "mountain", "youth"];
    const raw: Record<Classification, RawRow[]> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };

    for (const c of classifications) {
      const url = `${baseUrl}${URL_SUFFIX[c]}`;
      const html = await fetchHtml(url);
      const rows = parseResultsTable(html);
      raw[c] = rows;
      console.log(`PCS ${c} (${url}): ${rows.length} rows`);
    }

    if (raw.stage.length === 0 && raw.gc.length === 0) {
      return new Response(JSON.stringify({
        error: `Geen uitslag gevonden op ${sourceUrl} — etappe nog niet verreden of bron onbereikbaar?`,
      }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build matching indexes
    const { data: ridersData, error: ridersErr } = await supabase
      .from("riders")
      .select("id, start_number, name")
      .eq("game_id", gameId);
    if (ridersErr) throw ridersErr;

    const byBib = new Map<number, { id: string; name: string; start_number: number | null }>();
    const byName = new Map<string, { id: string; name: string; start_number: number | null }>();
    for (const r of ridersData ?? []) {
      if (r.start_number != null) byBib.set(Number(r.start_number), { id: r.id, name: r.name, start_number: r.start_number });
      for (const k of nameKeys(r.name)) {
        if (!byName.has(k)) byName.set(k, { id: r.id, name: r.name, start_number: r.start_number });
      }
    }

    const matched: Record<Classification, Array<{ position: number; rider_id: string; rider_name: string; start_number: number | null }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };
    const unmatched: Record<Classification, Array<{ position: number; bib: number | null; name: string }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };

    for (const c of classifications) {
      const seen = new Set<string>();
      for (const row of raw[c]) {
        if (row.position < 1 || row.position > 20) continue;
        let r = row.bib != null ? byBib.get(row.bib) : undefined;
        if (!r) {
          for (const k of nameKeys(row.name)) {
            const cand = byName.get(k);
            if (cand) { r = cand; break; }
          }
        }
        if (!r) {
          unmatched[c].push({ position: row.position, bib: row.bib, name: row.name });
          continue;
        }
        if (seen.has(r.id)) continue; // dedupe
        seen.add(r.id);
        matched[c].push({
          position: row.position,
          rider_id: r.id,
          rider_name: r.name,
          start_number: r.start_number,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      source_url: sourceUrl,
      matched,
      unmatched,
      counts: Object.fromEntries(classifications.map((c) => [c, {
        matched: matched[c].length,
        unmatched: unmatched[c].length,
        total: raw[c].length,
      }])),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Import error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
