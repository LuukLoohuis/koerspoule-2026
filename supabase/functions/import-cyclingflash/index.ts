// @ts-nocheck
// Edge function: import-cyclingflash
// Scrapes cyclingflash.com (OIC/GC/PNT/KOM/YOU) for a given race+stage and matches riders by name.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RaceType = "giro" | "tdf" | "vuelta";
type Classification = "stage" | "gc" | "points" | "mountain" | "youth";

const SLUG_MAP: Record<RaceType, (year: number) => string> = {
  giro: (y) => `giro-ditalia-${y}`,
  tdf: (y) => `tour-de-france-${y}`,
  vuelta: (y) => `vuelta-a-espana-${y}`,
};

const TYPE_MAP: Record<Classification, string> = {
  stage: "OIC",
  gc: "GC",
  points: "PNT",
  mountain: "KOM",
  youth: "YOU",
};

const UA = "Mozilla/5.0 (compatible; KoerspouleBot/1.0)";

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function parseRows(html: string): Array<{ position: number; name: string; country: string | null; team: string | null }> {
  // Each <tr> contains: rank cell, name link with <span>name</span>, optional team link with <span>team</span>
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const out: Array<{ position: number; name: string; country: string | null; team: string | null }> = [];
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html)) !== null) {
    const tr = m[1];
    const rankM = tr.match(/<td[^>]*text-center[^>]*>(\d+)<\/td>/);
    if (!rankM) continue;
    const nameM = tr.match(/profile\/[^"]+"[^>]*>\s*<span[^>]*>(?:<img[^>]*alt="([A-Z]+) flag[^>]*>)?[\s\S]*?<\/span>\s*<span>([^<]+)<\/span>/);
    if (!nameM) continue;
    const teamM = tr.match(/\/team\/[^"]+"[^>]*>[\s\S]*?<span>([^<]+)<\/span>\s*<\/a>\s*<\/td>/);
    out.push({
      position: parseInt(rankM[1], 10),
      name: nameM[2].trim(),
      country: nameM[1] ?? null,
      team: teamM ? teamM[1].trim() : null,
    });
  }
  return out;
}

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!resp.ok) throw new Error(`Fetch failed ${resp.status} for ${url}`);
  return await resp.text();
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

    const slug = SLUG_MAP[raceType](year);
    const baseStageUrl = `https://cyclingflash.com/race/${slug}/result/stage-${stageNumber}`;
    const sourceUrl = `${baseStageUrl}/OIC`;

    const classifications: Classification[] = ["stage", "gc", "points", "mountain", "youth"];
    const results: Record<Classification, Array<{ position: number; name: string; country: string | null; team: string | null }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };

    for (const c of classifications) {
      try {
        const url = `${baseStageUrl}/${TYPE_MAP[c]}`;
        const html = await fetchHtml(url);
        results[c] = parseRows(html);
      } catch (e) {
        console.error(`Failed to fetch ${c}:`, (e as Error).message);
      }
    }

    if (results.stage.length === 0) {
      return new Response(JSON.stringify({ error: `Geen uitslag gevonden op ${sourceUrl} — etappe nog niet verreden?` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match riders by normalized name
    const { data: ridersData, error: ridersErr } = await supabase
      .from("riders")
      .select("id, start_number, name")
      .eq("game_id", gameId);
    if (ridersErr) throw ridersErr;

    const nameToRider = new Map<string, { id: string; name: string; start_number: number | null }>();
    for (const r of ridersData ?? []) {
      nameToRider.set(normalizeName(r.name), { id: r.id, name: r.name, start_number: r.start_number });
    }

    const matched: Record<Classification, Array<{ position: number; rider_id: string; rider_name: string; start_number: number | null }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };
    const unmatched: Record<Classification, Array<{ position: number; name: string; team: string | null }>> = {
      stage: [], gc: [], points: [], mountain: [], youth: [],
    };

    for (const c of classifications) {
      for (const row of results[c]) {
        if (row.position > 20) continue;
        const r = nameToRider.get(normalizeName(row.name));
        if (!r) {
          unmatched[c].push({ position: row.position, name: row.name, team: row.team });
          continue;
        }
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
      counts: Object.fromEntries(classifications.map((c) => [c, { matched: matched[c].length, unmatched: unmatched[c].length }])),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Cyclingflash import error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
