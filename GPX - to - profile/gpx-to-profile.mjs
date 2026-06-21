#!/usr/bin/env node
// gpx-to-profile.mjs
// ---------------------------------------------------------------------------
// Zet een etappe-GPX om naar profile_data-JSON voor Koerspoule.
//
// - Leest track-/routepunten (lat/lon, en hoogte als die in de GPX staat).
// - Berekent de afgelegde afstand (km) via de haversine-formule.
// - Resamplet naar N gelijkmatig over de afstand verdeelde punten.
// - Hoogte: gebruikt de GPX-hoogte als die er is; anders haalt 'ie hoogte op
//   via de gratis Open-Meteo elevation-API (geen API-key nodig).
// - Schrijft { totalKm, minEle, maxEle, points:[{km,hoogte}], cols:[] }.
//
// Dit is FEITELIJKE hoogtedata (afstand/hoogte). Je tekent er in de app je
// EIGEN profiel uit — je kopieert geen bestaand (ASO/letour.fr) profielbeeld.
//
// Vereist: Node 18+ (ingebouwde fetch). Geen npm-install nodig.
//
// Gebruik:
//   node gpx-to-profile.mjs etappe.gpx
//   node gpx-to-profile.mjs etappe.gpx --points 260 --out etappe-3.json
//   node gpx-to-profile.mjs etappe.gpx --force-api   (negeer GPX-hoogte, vraag API)
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";

// ── argumenten ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("--")) {
  console.error("Gebruik: node gpx-to-profile.mjs <bestand.gpx> [--points N] [--out file.json] [--force-api]");
  process.exit(1);
}
const gpxPath = args[0];
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const N = Math.max(40, Math.min(600, parseInt(getFlag("--points", "250"), 10) || 250));
const outPath = getFlag("--out", gpxPath.replace(/\.gpx$/i, "") + ".profile.json");
const forceApi = args.includes("--force-api");

// ── GPX parsen (trkpt + rtept) ─────────────────────────────────────────────
const xml = readFileSync(gpxPath, "utf8");
const ptRe = /<(?:trkpt|rtept)\b[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>/gi;
const selfRe = /<(?:trkpt|rtept)\b[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*\/>/gi;
const eleRe = /<ele>\s*([-\d.]+)\s*<\/ele>/i;

const pts = [];
let m;
while ((m = ptRe.exec(xml)) !== null) {
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  const e = eleRe.exec(m[3]);
  pts.push({ lat, lon, ele: e ? parseFloat(e[1]) : null });
}
while ((m = selfRe.exec(xml)) !== null) {
  pts.push({ lat: parseFloat(m[1]), lon: parseFloat(m[2]), ele: null });
}

if (pts.length < 2) {
  console.error(`Geen track-/routepunten gevonden in ${gpxPath}. Bevat de GPX <trkpt> of <rtept>?`);
  process.exit(1);
}

// ── cumulatieve afstand (haversine) ────────────────────────────────────────
const R = 6371; // km
const toRad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const dist = [0];
for (let i = 1; i < pts.length; i++) dist[i] = dist[i - 1] + haversine(pts[i - 1], pts[i]);
const totalKm = dist[dist.length - 1];
if (totalKm <= 0) {
  console.error("Afstand is 0 — controleer de GPX-coördinaten.");
  process.exit(1);
}

// ── resamplen: N punten gelijkmatig over de afstand ────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
const haveGpxEle = !forceApi && pts.filter((p) => p.ele != null && Number.isFinite(p.ele)).length >= pts.length * 0.9;

const samples = [];
let seg = 0;
for (let k = 0; k < N; k++) {
  const target = (k / (N - 1)) * totalKm;
  while (seg < pts.length - 2 && dist[seg + 1] < target) seg++;
  const d0 = dist[seg];
  const d1 = dist[seg + 1];
  const t = d1 > d0 ? (target - d0) / (d1 - d0) : 0;
  const a = pts[seg];
  const b = pts[seg + 1];
  const lat = lerp(a.lat, b.lat, t);
  const lon = lerp(a.lon, b.lon, t);
  let ele = null;
  if (haveGpxEle && a.ele != null && b.ele != null) ele = lerp(a.ele, b.ele, t);
  samples.push({ km: target, lat, lon, ele });
}

// ── hoogte via Open-Meteo als de GPX er geen had ───────────────────────────
async function fillElevationFromApi(rows) {
  const BATCH = 100; // Open-Meteo: max 100 coords per call
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const lat = slice.map((r) => r.lat.toFixed(6)).join(",");
    const lon = slice.map((r) => r.lon.toFixed(6)).join(",");
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const elev = data.elevation;
    if (!Array.isArray(elev) || elev.length !== slice.length) {
      throw new Error("Onverwacht antwoord van Open-Meteo (lengte klopt niet).");
    }
    slice.forEach((r, j) => { r.ele = elev[j]; });
    process.stderr.write(`  hoogte opgehaald: ${Math.min(i + BATCH, rows.length)}/${rows.length}\r`);
  }
  process.stderr.write("\n");
}

// ── lichte smoothing tegen GPS-ruis (5-punts voortschrijdend gemiddelde) ───
function smooth(vals, win = 2) {
  return vals.map((_, i) => {
    let s = 0, n = 0;
    for (let j = -win; j <= win; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < vals.length && vals[idx] != null) { s += vals[idx]; n++; }
    }
    return n ? s / n : vals[i];
  });
}

(async () => {
  if (samples.some((s) => s.ele == null)) {
    if (haveGpxEle) {
      console.error("GPX-hoogte ontbreekt gedeeltelijk — rest via Open-Meteo ophalen…");
    } else {
      console.error(`Geen (volledige) hoogte in GPX — ${samples.length} punten via Open-Meteo ophalen…`);
    }
    await fillElevationFromApi(samples.filter((s) => s.ele == null));
  } else {
    console.error("Hoogte uit de GPX gebruikt (geen API-call nodig).");
  }

  const eleSmoothed = smooth(samples.map((s) => s.ele));
  const points = samples.map((s, i) => ({
    km: Math.round(s.km * 10) / 10,
    hoogte: Math.round(eleSmoothed[i]),
  }));
  const hoogtes = points.map((p) => p.hoogte);
  const profile = {
    totalKm: Math.round(totalKm * 10) / 10,
    minEle: Math.min(...hoogtes),
    maxEle: Math.max(...hoogtes),
    points,
    cols: [], // optioneel handmatig invullen: { km, naam, categorie } (1..4 / "HC")
  };

  writeFileSync(outPath, JSON.stringify(profile, null, 2));
  console.error(
    `\nKlaar: ${outPath}\n` +
    `  afstand: ${profile.totalKm} km · punten: ${points.length} · ` +
    `hoogte: ${profile.minEle}–${profile.maxEle} m\n` +
    `Plak de inhoud van dit bestand als profile_data bij de etappe in de admin.`
  );
})().catch((err) => {
  console.error("\nFout:", err.message);
  process.exit(1);
});
