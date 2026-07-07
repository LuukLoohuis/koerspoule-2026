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

type FetchResult = { ok: boolean; status: number; html: string | null; bytes: number };

async function fetchHtml(url: string): Promise<FetchResult> {
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
      return { ok: false, status: resp.status, html: null, bytes: 0 };
    }
    const html = await resp.text();
    return { ok: true, status: resp.status, html, bytes: html.length };
  } catch (e) {
    console.error(`fetch error ${url}:`, (e as Error).message);
    return { ok: false, status: 0, html: null, bytes: 0 };
  }
}

type RawRow = { position: number; bib: number | null; name: string };

function parseResultsTable(html: string | null): RawRow[] {
  if (!html) return [];
  try {
    // (a) Actief tabblad: <li class="cur"> — "cur" als woord in de class, in
    //     willekeurige volgorde en met eventuele extra attributen ervoor. We
    //     halen data-id uit hetzelfde <li>, ongeacht attribuutvolgorde.
    const curM = html.match(/<li\b[^>]*\bclass="[^"]*\bcur\b[^"]*"[^>]*>/);
    let block = "";
    if (curM) {
      const didM = curM[0].match(/data-id="(\d+)"/);
      const did = didM ? didM[1] : null;
      // (b) resTab-div: variabele spaties/extra classes toegestaan. Zoek de div
      //     met het bijbehorende data-id; val anders terug op de eerste resTab.
      const resTabRe = did
        ? new RegExp(`<div\\b[^>]*\\bclass="[^"]*\\bresTab\\b[^"]*"[^>]*\\bdata-id="${did}"[^>]*>`)
        : /<div\b[^>]*\bclass="[^"]*\bresTab\b[^"]*"[^>]*>/;
      const startM = html.match(resTabRe);
      if (startM && startM.index !== undefined) {
        const start = startM.index;
        const nextRe = /<div\b[^>]*\bclass="[^"]*\bresTab\b[^"]*"[^>]*>/g;
        nextRe.lastIndex = start + startM[0].length;
        const nm = nextRe.exec(html);
        block = html.slice(start, nm ? nm.index : start + 300000);
      }
    } else {
      console.warn("parse: geen cur-tab gevonden → val terug op resultsCont");
    }
    if (!block) {
      // Fallback: hele resultsCont-gebied.
      const i = html.indexOf('id="resultsCont"');
      if (i >= 0) block = html.slice(i, i + 300000);
    }
    if (!block) { console.warn("parse: geen resTab en geen resultsCont"); return []; }

    // (c) Tabel: "results" mag ergens in de classlijst staan, niet per se vooraan.
    const tblM = block.match(/<table\b[^>]*\bclass="[^"]*\bresults\b[^"]*"[^>]*>([\s\S]*?)<\/table>/);
    if (!tblM) { console.warn("parse: geen results-tabel in blok"); return []; }
    const tbl = tblM[1];

    // (d) Kolomdetectie: eerst via data-code; ontbreekt dat, val terug op positie
    //     (kol 0 = rang, rider/-link = naam, puur-numerieke cel = bib).
    const headers = Array.from(tbl.matchAll(/data-code="([^"]+)"/g)).map((m) => m[1]);
    const bibIdx = headers.indexOf("bib");
    const nameIdx = headers.indexOf("ridername");
    const hasDataCode = nameIdx >= 0;
    if (!hasDataCode) {
      console.warn("parse: geen data-code-kolommen → positie-fallback");
    }

    const rows: RawRow[] = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let rm: RegExpExecArray | null;
    let sawName = false;
    while ((rm = trRe.exec(tbl)) !== null) {
      const tds = Array.from(rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m) => m[1]);
      if (tds.length === 0) continue;
      const rnkRaw = tds[0].replace(/<[^>]+>/g, " ").trim();
      const rnk = parseInt(rnkRaw, 10);
      if (!Number.isFinite(rnk)) continue;
      const pos = rnk;

      // Naam: bij data-code de vaste kolom; anders zoek de rider-link in de rij.
      let nameCell = hasDataCode ? (tds[nameIdx] ?? "") : "";
      if (!hasDataCode) {
        const withLink = tds.find((td) => /<a\b[^>]*href="rider\//.test(td));
        nameCell = withLink ?? "";
      }
      const aM = nameCell.match(/<a\b[^>]*href="rider\/[^"]+"[^>]*>([\s\S]*?)<\/a>/);
      let name = "";
      if (aM) {
        name = aM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      } else if (hasDataCode) {
        name = nameCell.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (!name) continue;
      sawName = true;

      // Bib: data-code-kolom indien aanwezig; anders eerste puur-numerieke cel
      // ná de rang (kol 0 is de rang zelf, die slaan we over).
      let bib: number | null = null;
      if (bibIdx >= 0 && tds[bibIdx] !== undefined) {
        const b = parseInt(tds[bibIdx].replace(/<[^>]+>/g, " ").trim(), 10);
        bib = Number.isFinite(b) ? b : null;
      } else if (!hasDataCode) {
        for (let i = 1; i < tds.length; i++) {
          const cell = tds[i].replace(/<[^>]+>/g, " ").trim();
          if (/^\d+$/.test(cell)) { bib = parseInt(cell, 10); break; }
        }
      }
      rows.push({ position: pos, bib, name });
      if (rows.length >= 30) break;
    }
    if (!sawName && rows.length === 0) console.warn("parse: geen naamkolom herkend in rijen");
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

    // Per-classification diagnostiek: status + bytes + rows. Zo is een blokkade
    // (403/429), een lege pagina (weinig bytes) en een parserbreuk (veel bytes,
    // 0 rijen) uit elkaar te houden.
    const diag: Record<Classification, { status: number; bytes: number; rows: number }> = {
      stage: { status: 0, bytes: 0, rows: 0 }, gc: { status: 0, bytes: 0, rows: 0 },
      points: { status: 0, bytes: 0, rows: 0 }, mountain: { status: 0, bytes: 0, rows: 0 },
      youth: { status: 0, bytes: 0, rows: 0 },
    };
    let blocked = 0;
    let blockedStatus = 0;

    for (const c of classifications) {
      const url = `${baseUrl}${URL_SUFFIX[c]}`;
      const res = await fetchHtml(url);
      const rows = parseResultsTable(res.html);
      raw[c] = rows;
      diag[c] = { status: res.status, bytes: res.bytes, rows: rows.length };
      if (res.status === 403 || res.status === 429) { blocked++; blockedStatus = res.status; }
      console.log(`PCS ${c} (${url}): status=${res.status} bytes=${res.bytes} rows=${rows.length}`);
    }

    // Randgeval: PCS blokkeert/rate-limit → expliciete 502 (ligt aan de bron,
    // niet aan de etappe), niet de generieke 404.
    if (blocked > 0 && raw.stage.length === 0 && raw.gc.length === 0) {
      return new Response(JSON.stringify({
        error: `ProCyclingStats blokkeerde de aanvraag (status ${blockedStatus})`,
        source_url: sourceUrl,
        diagnostics: diag,
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (raw.stage.length === 0 && raw.gc.length === 0) {
      return new Response(JSON.stringify({
        error: `Geen uitslag gevonden op ${sourceUrl} — etappe nog niet verreden of bron onbereikbaar?`,
        source_url: sourceUrl,
        // status/bytes/rows per classification → oorzaak zichtbaar (blokkade vs
        // lege pagina vs parserfout).
        diagnostics: diag,
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

        // Bib-vs-naam conflictcheck: een bib-match is alleen betrouwbaar als de
        // bronnaam ook bij die renner past. Wijken ze af, dan klopt het
        // start_number in onze DB waarschijnlijk niet (bv. een verschoven
        // teamblok). We negeren dan de bib en matchen op naam, zodat de uitslag
        // alsnog bij de juiste renner belandt i.p.v. stil bij de buurman.
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
