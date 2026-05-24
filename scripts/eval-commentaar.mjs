#!/usr/bin/env node
/**
 * Eval-script: vergelijk modellen voor de Wuyts/De Cauwer- en Lefevere-
 * commentaargenerators. Draait de ÉCHTE system-prompts (uitgelezen uit de
 * edge functions, dus altijd in sync) tegen een aantal modellen en print de
 * outputs naast elkaar zodat je de Vlaamse stijl + correctheid kunt beoordelen.
 *
 * Gebruik:
 *   ANTHROPIC_API_KEY=... OPENAI_API_KEY=... GOOGLE_API_KEY=... \
 *     node scripts/eval-commentaar.mjs
 *
 * Modellen zonder bijbehorende key worden overgeslagen. Geef optioneel een
 * persona-filter mee: `node scripts/eval-commentaar.mjs lefevere`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── System-prompts uit de edge functions halen (blijft in sync) ──────────────
function extractSystemPrompt(relPath) {
  const src = readFileSync(join(root, relPath), "utf8");
  const m = src.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!m) throw new Error(`SYSTEM_PROMPT niet gevonden in ${relPath}`);
  return m[1].replace(/\\`/g, "`").replace(/\\\$/g, "$");
}

const COMMENTARY_PROMPT = extractSystemPrompt("supabase/functions/generate-stage-commentary/index.ts");
const LEFEVERE_PROMPT = extractSystemPrompt("supabase/functions/generate-lefevere-report/index.ts");

// ── Mock-scenario's (representatief voor wat buildUserPrompt produceert) ──────
const COMMENTARY_SCENARIOS = [
  {
    naam: "Bergrit La Plagne",
    user: `Subpoule: "POA-Giro-2026"
Etappe 12 — La Plagne (berg)

DAGUITSLAG (deze subpoule):
1. Pijke — 148 pt | scoorders: Arensman P1, Pogi P2, Lipowitz P4, Onley P6
2. Ploffel — 96 pt | scoorders: Vingegaard P3, Healy P9
3. Johannes — 88 pt | scoorders: S Yates P5, Martinez P8

KLASSEMENT VOOR DEZE ETAPPE:
1. Beuners — 910 pt
2. Pijke — 858 pt
3. Ploffel — 845 pt

KLASSEMENT NA DEZE ETAPPE:
1. Pijke — 1006 pt (▲1)
2. Beuners — 942 pt (▼1)
3. Ploffel — 941 pt

Schrijf nu het commentaar als JSON met velden michelWuyts en joseDeCauwer.`,
  },
  {
    naam: "Sprintrit, off-days",
    user: `Subpoule: "POA-Giro-2026"
Etappe 5 — Napels (sprint)

DAGUITSLAG (deze subpoule):
1. Roel — 90 pt | scoorders: Milan P1, Ackermann P3, De Lie P5
2. Emma — 52 pt | scoorders: Pedersen P4, Groves P7
3. Koen — 40 pt | scoorders: Kooij P6
8. Bart — 0 pt | scoorders: geen renners in top 20

KLASSEMENT NA DEZE ETAPPE:
1. Koen — 412 pt (─)
2. Roel — 388 pt (▲2)
3. Bart — 350 pt (▼1)

Schrijf nu het commentaar als JSON met velden michelWuyts en joseDeCauwer.`,
  },
];

const LEFEVERE_SCENARIOS = [
  {
    naam: "Middelmatig (5.1)",
    user: `EINDCIJFER: 5.1 / 10
ETAPPE: 12 — La Plagne (berg)
PLOEGNAAM: Discovery Channel

RAPPORT-COMPONENTEN:
  Pool Ranking (50%): rang 22/39 → score 4.8/10
  Monkey Vergelijking (30%): 26% apen verslagen → score 3.3/10
  Joker Prestatie (20%): 2 jokers → score 7.8/10

ETAPPE-PRESTATIE:
  Jokers: Pinarello, Garofoli (gedeeltelijk)

HORS CATÉGORIE STATS:
  Emirates (droomploeg): 54% (520 van 960 pt)
  Monkey IQ: 142 (gemiddeld)

Schrijf nu een directeursanalyse (3-4 zinnen) en ploeg-karakterisering als JSON.`,
  },
  {
    naam: "Sterk (8.2)",
    user: `EINDCIJFER: 8.2 / 10
ETAPPE: 18 — Col de la Loze (berg)
PLOEGNAAM: Discovery Channel

RAPPORT-COMPONENTEN:
  Pool Ranking (50%): rang 2/39 → score 9.4/10
  Monkey Vergelijking (30%): 81% apen verslagen → score 8.1/10
  Joker Prestatie (20%): 2 jokers → score 7.0/10

ETAPPE-PRESTATIE:
  Scoorders: Pogi, Vingegaard, Lipowitz, AYates
  Jokers: Healy, Onley (gescoord)

HORS CATÉGORIE STATS:
  Emirates (droomploeg): 84% (810 van 960 pt)
  Monkey IQ: 215 (genie)

Schrijf nu een directeursanalyse (3-4 zinnen) en ploeg-karakterisering als JSON.`,
  },
];

// ── Model-adapters ───────────────────────────────────────────────────────────
const MODELS = [
  { label: "Claude Haiku 4.5", provider: "anthropic", model: "claude-haiku-4-5-20251001", envKey: "ANTHROPIC_API_KEY" },
  { label: "Claude Sonnet 4.5", provider: "anthropic", model: "claude-sonnet-4-5", envKey: "ANTHROPIC_API_KEY" },
  { label: "GPT-4o mini", provider: "openai", model: "gpt-4o-mini", envKey: "OPENAI_API_KEY" },
  { label: "Gemini 2.0 Flash", provider: "google", model: "gemini-2.0-flash", envKey: "GOOGLE_API_KEY" },
];

async function callAnthropic(model, system, user, key) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 800, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return d?.content?.[0]?.text ?? "";
}

async function callOpenAI(model, system, user, key) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return d?.choices?.[0]?.message?.content ?? "";
}

async function callGoogle(model, system, user, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 800, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function call(m, system, user, key) {
  if (m.provider === "anthropic") return callAnthropic(m.model, system, user, key);
  if (m.provider === "openai") return callOpenAI(m.model, system, user, key);
  if (m.provider === "google") return callGoogle(m.model, system, user, key);
  throw new Error(`onbekende provider ${m.provider}`);
}

function prettyJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const obj = JSON.parse(match ? match[0] : text);
    return Object.entries(obj).map(([k, v]) => `    ${k}: ${v}`).join("\n");
  } catch {
    return `    (geen geldige JSON)\n    ${text.slice(0, 300)}`;
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────
async function runPersona(title, system, scenarios) {
  console.log(`\n${"═".repeat(72)}\n  ${title}\n${"═".repeat(72)}`);
  for (const sc of scenarios) {
    console.log(`\n┌─ Scenario: ${sc.naam} ${"─".repeat(Math.max(0, 50 - sc.naam.length))}`);
    for (const m of MODELS) {
      const key = process.env[m.envKey];
      if (!key) { console.log(`\n  ▸ ${m.label} — OVERGESLAGEN (geen ${m.envKey})`); continue; }
      process.stdout.write(`\n  ▸ ${m.label} (${m.model})\n`);
      const t0 = Date.now();
      try {
        const out = await call(m, system, sc.user, key);
        console.log(prettyJson(out));
        console.log(`    ⏱  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      } catch (e) {
        console.log(`    ⚠️  fout: ${e.message}`);
      }
    }
  }
}

const filter = process.argv[2]?.toLowerCase();
const available = MODELS.filter((m) => process.env[m.envKey]).map((m) => m.label);
console.log(`Beschikbare modellen (key gevonden): ${available.length ? available.join(", ") : "GEEN — zet ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_API_KEY"}`);

if (!filter || filter === "commentaar" || filter === "wuyts") {
  await runPersona("MICHEL WUYTS & JOSÉ DE CAUWER — etappecommentaar", COMMENTARY_PROMPT, COMMENTARY_SCENARIOS);
}
if (!filter || filter === "lefevere") {
  await runPersona("PATRICK LEFEVERE — directeursanalyse", LEFEVERE_PROMPT, LEFEVERE_SCENARIOS);
}
console.log("\nKlaar.\n");
