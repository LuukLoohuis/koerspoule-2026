// @ts-nocheck
// Edge function: import-stage-results
// Scrapes letour.fr / lavuelta.es for stage + classifications and returns parsed positions per rider (matched on start_number)
import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

type RaceType = "tdf" | "vuelta";
type Classification = "stage" | "gc" | "points" | "mountain" | "youth";

// ASO ranking codes used by both letour.fr and lavuelta.es
// ite = stage (individual time etappe), itg = general (gc),
// ipe = points (per stage) → for cumulative use ipg, but ASO main page already shows cumulative under ipe label
// ime = mountain, ije = youth
// On the stage-N page, the *main* table (no ajax needed) is the stage result.
// Other classifications must be fetched via the data-tabs-ajax URLs (with security hashes).
const TYPE_MAP: Record<Classification, string> = {
  stage: "ite",
  gc: "itg",
  points: "ipe",
  mountain: "ime",
  youth: "ije",
};

const BASE_URL: Record<RaceType, string> = {
  tdf: "https://www.letour.fr",
  vuelta: "https://www.lavuelta.es",
};

const UA = "Mozilla/5.0 (compatible; KoerspouleBot/1.0)";

function parseRows(html: string): Array<{ position: number; bib: number | null; name: string }> {
  // Find first rankingTable
  const tableMatch = html.match(/<table class="rankingTable[\s\S]*?<\/table>/);
  if (!tableMatch) return [];
  const table = tableMatch[0];
  const rowRegex = /<tr class="rankingTables__row[\s\S]*?<\/tr>/g;
  const out: Array<{ position: number; bib: number | null; name: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(table)) !== null) {
    const row = m[0];
    const posM = row.match(/rankingTables__row__position[^>]*><span>(\d+)<\/span>/);
    const bibM = row.match(/data-bib="#?(\d+)"/);
    const nameM = row.match(/alt="([^"]+)"/);
    if (!posM) continue;
    out.push({
      position: parseInt(posM[1], 10),
      bib: bibM ? parseInt(bibM[1], 10) : null,
      name: nameM ? nameM[1] : "",
    });
  }
  return out;
}

function extractAjaxUrls(html: string): Record<string, string> {
  // data-tabs-ajax="/en/ajax/ranking/1/ipe/HASH/subtab" data-type="ipe"
  const out: Record<string, string> = {};
  const re = /data-tabs-ajax="([^"]+)"\s+data-type="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out[m[2]] = m[1];
  }
  return out;
}

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!resp.ok) throw new Error(`Fetch failed ${resp.status} for ${url}`);
  return await resp.text();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: must be admin
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
    // Verify admin via has_role
    const { data: isAdminData } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const raceType = body.race_type as RaceType;
    const stageNumber = Number(body.stage_number);
    const gameId = body.game_id as string;

    if (!["tdf", "vuelta"].includes(raceType)) {
      return new Response(JSON.stringify({ error: `Race type '${raceType}' niet ondersteund (alleen tdf/vuelta automatisch — Giro is alleen handmatig)` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 21) {
      return new Response(JSON.stringify({ error: "Ongeldig stage_number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!gameId) {
      return new Response(JSON.stringify({ error: "game_id ontbreekt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = BASE_URL[raceType];
    const stageUrl = `${baseUrl}/en/rankings/stage-${stageNumber}`;

    // 1. Fetch main stage page
    const mainHtml = await fetchHtml(stageUrl);
    const stageRows = parseRows(mainHtml);
    if (stageRows.length === 0) {
      return new Response(JSON.stringify({ error: `Geen uitslag gevonden op ${stageUrl} — etappe nog niet verreden?` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ajaxUrls = extractAjaxUrls(mainHtml);

    // 2. For other classifications, fetch via ajax endpoints
    const classifications: Classification[] = ["stage", "gc", "points", "mountain", "youth"];
    const results: Record<Classification, Array<{ position: number; bib: number | null; name: string }>> = {
      stage: stageRows,
      gc: [], points: [], mountain: [], youth: [],
    };

    for (const c of classifications) {
      if (c === "stage") continue;
      const code = TYPE_MAP[c];
      const ajaxPath = ajaxUrls[code];
      if (!ajaxPath) {
        // Not available (e.g. youth not present early in some races) — leave empty
        continue;
      }
      try {
        const html = await fetchHtml(`${baseUrl}${ajaxPath}`);
        results[c] = parseRows(html);
      } catch (e) {
        console.error(`Failed to fetch ${c}:`, e);
      }
    }

    // 3. Match riders by start_number for this game
    const { data: ridersData, error: ridersErr } = await supabase
      .from("riders")
      .select("id, start_number, name")
      .eq("game_id", gameId);
    if (ridersErr) throw ridersErr;

    const bibToRider = new Map<number, { id: string; name: string }>();
    for (const r of ridersData ?? []) {
      if (r.start_number != null) bibToRider.set(Number(r.start_number), { id: r.id, name: r.name });
    }

    const matched: Record<Classification, Array<{ position: number; rider_id: string; rider_name: string; start_number: number }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };
    const unmatched: Record<Classification, Array<{ position: number; bib: number | null; name: string }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };

    for (const c of classifications) {
      for (const row of results[c]) {
        if (row.position > 20) continue; // top 20 only (matches admin UI)
        if (row.bib == null) {
          unmatched[c].push(row);
          continue;
        }
        const r = bibToRider.get(row.bib);
        if (!r) {
          unmatched[c].push(row);
          continue;
        }
        matched[c].push({
          position: row.position,
          rider_id: r.id,
          rider_name: r.name,
          start_number: row.bib,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      source_url: stageUrl,
      matched,
      unmatched,
      counts: Object.fromEntries(classifications.map((c) => [c, { matched: matched[c].length, unmatched: unmatched[c].length }])),
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
