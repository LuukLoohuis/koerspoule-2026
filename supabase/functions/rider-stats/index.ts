// @ts-nocheck
// Edge function: rider-stats
// Fetches a rider's season results from firstcycling.com and caches them per season.
// POST body: { fc_id: number }           → return results for last 3 seasons
// POST body: { fc_id, year: number }     → single season only
// POST body: { name: string }            → search riders by name

import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "Mozilla/5.0 (compatible; KoerspouleBot/1.0)";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function currentYear(): number {
  return new Date().getFullYear();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let fc_id: number | null = null;
  let name: string | null = null;
  let singleYear: number | null = null;

  try {
    const body = await req.json();
    fc_id = body.fc_id ? Number(body.fc_id) : null;
    name = typeof body.name === "string" ? body.name.trim() : null;
    singleYear = body.year ? Number(body.year) : null;
  } catch {
    return respond({ error: "invalid JSON body" }, 400);
  }

  if (!fc_id && !name) return respond({ error: "fc_id or name required" }, 400);

  // ── Name search ─────────────────────────────────────────────────────────────
  if (name) return respond(await searchByName(name));

  // ── Stats: multi-season fetch ────────────────────────────────────────────────
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const year = currentYear();
  const seasons = singleYear ? [singleYear] : [year, year - 1, year - 2];

  // Load cache for all requested seasons in one query
  const { data: cached = [] } = await sb
    .from("rider_results_cache")
    .select("*")
    .eq("firstcycling_id", fc_id)
    .in("season", seasons);

  const cacheByYear = new Map(cached.map((c) => [c.season, c]));

  // Fetch seasons that are missing or stale
  const toFetch = seasons.filter((s) => {
    const entry = cacheByYear.get(s);
    if (!entry) return true;
    return Date.now() - new Date(entry.cached_at).getTime() >= CACHE_TTL_MS;
  });

  await Promise.all(
    toFetch.map(async (s) => {
      const fresh = await fetchRiderStats(fc_id!, s);
      if (!fresh) return;
      await sb.from("rider_results_cache").upsert({
        firstcycling_id: fc_id,
        season: s,
        rider_name: fresh.rider_name,
        rider_team: fresh.rider_team,
        rider_nationality: fresh.rider_nationality,
        results: fresh.results,
        cached_at: new Date().toISOString(),
      });
      cacheByYear.set(s, { ...fresh, season: s, cached_at: new Date().toISOString() });
    })
  );

  // Merge all seasons — newest first, tag each result with its season
  const allResults: Array<Record<string, unknown>> = [];
  for (const s of seasons) {
    const entry = cacheByYear.get(s);
    if (!entry) continue;
    for (const r of (entry.results ?? [])) {
      allResults.push({ ...r, season: s });
    }
  }

  // Sort by date descending (newest first)
  allResults.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  // Rider meta from most recent season entry
  const meta = cacheByYear.get(year) ?? cacheByYear.get(year - 1) ?? cacheByYear.get(year - 2);

  return respond({
    firstcycling_id: fc_id,
    rider_name: meta?.rider_name ?? "",
    rider_team: meta?.rider_team ?? "",
    rider_nationality: meta?.rider_nationality ?? "",
    results: allResults,
  });
});

function respond(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", ...extra },
  });
}

// ── FirstCycling fetcher & parser ────────────────────────────────────────────

async function fetchRiderStats(fcId: number, season: number) {
  try {
    const res = await fetch(
      `https://firstcycling.com/rider.php?r=${fcId}&y=${season}`,
      { headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    return parseRiderPage(await res.text(), fcId, season);
  } catch (err) {
    console.error(`FirstCycling fetch error (${season}):`, err);
    return null;
  }
}

function parseRiderPage(html: string, fcId: number, season: number) {
  const titleMatch = html.match(/<title>([^<]+?)\s*[-–]\s*FirstCycling/i);
  const riderName = titleMatch?.[1]?.trim() ?? "";

  const natMatch = html.match(/\/(?:images\/)?flags\/([A-Z]{2,3})\.(?:png|svg)/i);
  const riderNationality = natMatch?.[1]?.toUpperCase() ?? "";

  const teamMatch = html.match(/team\.php[^"]*"[^>]*>([^<]+)<\/a>/);
  const riderTeam = teamMatch?.[1]?.trim() ?? "";

  const results: Array<{
    date: string;
    race: string;
    race_url: string;
    category: string;
    result: string;
    stage: string | null;
  }> = [];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    if (/<th[\s>]/i.test(row)) continue;

    const cells = extractCells(row);
    if (cells.length < 5) continue;

    const dateText = stripTags(cells[0]).trim();
    if (!/^\d{2}\.\d{2}$/.test(dateText)) continue;

    let raceName = "";
    let raceUrl = "";
    let raceCellIdx = -1;
    for (let i = 1; i < cells.length; i++) {
      const m = cells[i].match(/href="(race\.php[^"]+)"[^>]*>([\s\S]+?)<\/a>/);
      if (m) {
        raceUrl = `https://firstcycling.com/${m[1]}`;
        raceName = stripTags(m[2]).trim();
        raceCellIdx = i;
        break;
      }
    }
    if (!raceName) continue;

    const category =
      raceCellIdx + 1 < cells.length ? stripTags(cells[raceCellIdx + 1]).trim() : "";

    let result = "";
    for (let i = cells.length - 1; i >= 0; i--) {
      const t = stripTags(cells[i]).trim();
      if (t && t !== "·" && t !== "-" && t.length > 0) { result = t; break; }
    }
    if (!result) continue;

    const stageRaw = cells.length > 1 ? stripTags(cells[1]).trim() : "";
    const stage = /^\d+$/.test(stageRaw) ? stageRaw : null;

    const day = dateText.slice(0, 2);
    const month = dateText.slice(3, 5);

    results.push({
      date: `${season}-${month}-${day}`,
      race: decode(raceName),
      race_url: raceUrl,
      category,
      result,
      stage,
    });
  }

  return { firstcycling_id: fcId, rider_name: riderName, rider_team: riderTeam, rider_nationality: riderNationality, results };
}

// ── Name search ──────────────────────────────────────────────────────────────

async function searchByName(query: string) {
  try {
    const res = await fetch(
      `https://firstcycling.com/rider.php?s=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const riders: Array<{ fc_id: number; name: string; nationality: string; team: string }> = [];

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(html)) !== null) {
      const row = m[1];
      if (/<th[\s>]/i.test(row)) continue;
      const linkMatch = row.match(/rider\.php\?r=(\d+)[^"]*"[^>]*>([\s\S]+?)<\/a>/);
      if (!linkMatch) continue;
      const fc_id = parseInt(linkMatch[1]);
      const name = stripTags(linkMatch[2]).trim();
      if (!fc_id || !name) continue;
      const cells = extractCells(row);
      riders.push({
        fc_id,
        name: decode(name),
        nationality: cells.length > 1 ? stripTags(cells[1]).trim() : "",
        team: cells.length > 2 ? stripTags(cells[2]).trim() : "",
      });
    }
    return riders.slice(0, 8);
  } catch (err) {
    console.error("FC search error:", err);
    return [];
  }
}

// ── HTML utilities ────────────────────────────────────────────────────────────

function extractCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml)) !== null) cells.push(m[1]);
  return cells;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
