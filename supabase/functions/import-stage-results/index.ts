// @ts-nocheck
// Edge function: import-stage-results
// Imports the official ASO stage result + cumulative classifications and returns
// parsed positions per rider (matched on start_number, with a safe name fallback).
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RaceType = "tdf" | "femmes" | "vuelta";
type Classification = "stage" | "gc" | "points" | "mountain" | "youth";

// ASO ranking codes. The final "e" means the classification for this stage;
// the final "g" is the cumulative classification after this stage.
// The main table is the stage result (ite). All jersey standings must therefore
// use their cumulative "...g" endpoint, not the stage "...e" endpoint.
const TYPE_MAP: Record<Classification, string> = {
  stage: "ite",
  gc: "itg",
  points: "ipg",
  mountain: "img",
  youth: "ijg",
};

const BASE_URL: Record<RaceType, string> = {
  tdf: "https://www.letour.fr",
  femmes: "https://www.letourfemmes.fr",
  vuelta: "https://www.lavuelta.es",
};

const UA = "Mozilla/5.0 (compatible; KoerspouleBot/1.0)";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_FETCH_ATTEMPTS = 3;

function normalizeName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/[^a-z]/g, "");
}

function nameKeys(s: string): string[] {
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
    const imageNameM = row.match(/rankingTables__row__profile--picture[\s\S]*?alt="([^"]+)"/);
    const linkNameM = row.match(/rankingTables__row__profile--name[^>]*>([\s\S]*?)<\/a>/);
    const name = imageNameM?.[1] || stripTags(linkNameM?.[1] || "");
    if (!posM) continue;
    out.push({
      position: parseInt(posM[1], 10),
      bib: bibM ? parseInt(bibM[1], 10) : null,
      name: decodeHtml(name).trim(),
    });
  }
  return out;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function extractAjaxUrls(html: string): Record<string, string> {
  const out: Record<string, string> = {};

  // Stage-classification links are ordinary data attributes.
  const re = /data-tabs-ajax="([^"]+)"\s+data-type="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out[m[2]] = decodeHtml(m[1]);
  }

  // Cumulative classifications (itg/ipg/img/ijg) live in an HTML-encoded
  // JSON object on the "General ranking" tab.
  const stackRe = /data-ajax-stack\s*=\s*(?:"([^"]+)"|'([^']+)'|(\{[^>]+\}))/g;
  while ((m = stackRe.exec(html)) !== null) {
    const raw = decodeHtml(m[1] || m[2] || m[3] || "");
    try {
      const stack = JSON.parse(raw) as Record<string, unknown>;
      for (const [code, path] of Object.entries(stack)) {
        if (typeof path === "string") out[code] = path;
      }
    } catch (error) {
      console.warn("Kon ASO data-ajax-stack niet lezen:", error);
    }
  }
  return out;
}

async function fetchHtml(url: string): Promise<{ html: string; status: number; attempts: number }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "X-Requested-With": "XMLHttpRequest",
        },
        signal: controller.signal,
      });
      const html = await resp.text();
      if (resp.ok) return { html, status: resp.status, attempts: attempt };

      lastError = new Error(`HTTP ${resp.status} voor ${url}`);
      if (resp.status !== 429 && resp.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** (attempt - 1)));
    }
  }

  throw lastError ?? new Error(`Ophalen mislukt voor ${url}`);
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

    if (!["tdf", "femmes", "vuelta"].includes(raceType)) {
      return new Response(JSON.stringify({ error: `Race type '${raceType}' niet ondersteund (Tour, Tour Femmes en Vuelta worden automatisch ondersteund)` }), {
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
    const mainResponse = await fetchHtml(stageUrl);
    const mainHtml = mainResponse.html;
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
    const diagnostics: Record<Classification, {
      status: number;
      rows: number;
      attempts: number;
      endpoint_found: boolean;
    }> = {
      stage: { status: mainResponse.status, rows: stageRows.length, attempts: mainResponse.attempts, endpoint_found: true },
      gc: { status: 0, rows: 0, attempts: 0, endpoint_found: false },
      points: { status: 0, rows: 0, attempts: 0, endpoint_found: false },
      mountain: { status: 0, rows: 0, attempts: 0, endpoint_found: false },
      youth: { status: 0, rows: 0, attempts: 0, endpoint_found: false },
    };
    const warnings: string[] = [];

    for (const c of classifications) {
      if (c === "stage") continue;
      const code = TYPE_MAP[c];
      const ajaxPath = ajaxUrls[code];
      if (!ajaxPath) {
        warnings.push(`${c}: cumulatief ASO-endpoint (${code}) ontbreekt op de etappepagina.`);
        continue;
      }
      diagnostics[c].endpoint_found = true;
      try {
        const response = await fetchHtml(new URL(ajaxPath, baseUrl).toString());
        results[c] = parseRows(response.html);
        diagnostics[c] = {
          status: response.status,
          rows: results[c].length,
          attempts: response.attempts,
          endpoint_found: true,
        };
        if (results[c].length === 0) {
          warnings.push(`${c}: ASO antwoordde wel, maar bevatte geen herkenbare rijen.`);
        }
      } catch (e) {
        console.error(`Failed to fetch ${c}:`, e);
        warnings.push(`${c}: ${(e as Error).message}`);
      }
    }

    // 3. Match riders by start_number for this game
    const { data: ridersData, error: ridersErr } = await supabase
      .from("riders")
      .select("id, start_number, name")
      .eq("game_id", gameId);
    if (ridersErr) throw ridersErr;

    const bibToRider = new Map<number, { id: string; name: string; start_number: number | null }>();
    const byName = new Map<string, { id: string; name: string; start_number: number | null }>();
    for (const r of ridersData ?? []) {
      if (r.start_number != null) bibToRider.set(Number(r.start_number), { id: r.id, name: r.name, start_number: r.start_number });
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
      for (const row of results[c]) {
        if (row.position > 20) continue; // top 20 only (matches admin UI)
        let r = row.bib != null ? bibToRider.get(row.bib) : undefined;

        // Bib-vs-naam conflictcheck: vertrouw een bib-match alleen als de
        // bronnaam bij die renner past. Zo niet, dan staat het start_number in
        // onze DB waarschijnlijk fout (verschoven teamblok) → negeer de bib en
        // match op naam, zodat de uitslag bij de juiste renner belandt.
        if (r && row.name) {
          const srcKeys = new Set(nameKeys(row.name));
          const namesAgree = nameKeys(r.name).some((k) => srcKeys.has(k));
          if (!namesAgree) {
            console.warn(
              `Bib/naam-conflict: bron #${row.bib} "${row.name}" ` +
              `≠ DB-renner "${r.name}" (#${r.start_number}). Val terug op naam-match.`
            );
            r = undefined;
          }
        }

        if (!r && row.name) {
          for (const k of nameKeys(row.name)) {
            const cand = byName.get(k);
            if (cand) { r = cand; break; }
          }
        }
        if (!r) {
          unmatched[c].push(row);
          continue;
        }
        matched[c].push({
          position: row.position,
          rider_id: r.id,
          rider_name: r.name,
          start_number: r.start_number ?? row.bib ?? null,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      source_url: stageUrl,
      matched,
      unmatched,
      diagnostics,
      warnings,
      counts: Object.fromEntries(classifications.map((c) => [c, {
        matched: matched[c].length,
        unmatched: unmatched[c].length,
        total: results[c].length,
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
