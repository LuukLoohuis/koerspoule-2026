// Edge function: generate-stage-verslag
//
// Zet een bronartikel om in een KORT etappeverslag in eigen woorden: 5 tot 10
// zinnen, feitelijk, zonder de formulering van de bron over te nemen.
//
// Waarom herschrijven en niet overnemen: feiten uit een koersverslag -- wie won,
// wie viel aan, welke gaten er vielen -- zijn vrij. De formulering waarin een
// journalist ze giet is dat niet. Door alleen de feiten eruit te halen en die
// zelf op te schrijven blijft de tekst van ons, ook als de bron meekijkt.
//
// Vereist env: OPENAI_API_KEY (Supabase secrets).
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";
const MAX_TOKENS = 2000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SYSTEM_PROMPT = `Je bent eindredacteur van De Koerskrant, de krant binnen het wielerspel Koerspoule.

Je krijgt een bronartikel over een wielerets. Je taak: daaruit een KORT verslag schrijven in je EIGEN woorden.

HARDE REGELS
1. LENGTE: minimaal 5 en maximaal 10 zinnen. Niet meer. Dit is een samenvatting, geen naverteling.
2. EIGEN WOORDEN: neem GEEN enkele zin, deelzin of kenmerkende formulering uit de bron over. Haal de FEITEN eruit en schrijf die zelf op. Als je twijfelt of een formulering van de bron is, herschrijf hem.
3. GEEN CITATEN: neem geen uitspraken van renners of ploegleiders letterlijk over. Vat ze samen ("Pogacar noemde het zijn zwaarste dag") of laat ze weg.
4. FEITEN BLIJVEN FEITEN: verzin niets. Geen namen, tijden, plaatsen of gebeurtenissen die niet in de bron staan. Weet je iets niet, laat het weg.
5. TOON: nuchter en meeslepend, zoals een goede krantensamenvatting. Nederlands. Geen uitroeptekens, geen aansprekingen van de lezer, geen "wij" of "je".
6. GEEN POULE: dit gaat over de koers, niet over deelnemers, punten of subpoules.
7. Begin met de kern: wie won en hoe. Daarna pas het verloop.

Antwoord UITSLUITEND met JSON:
{"verslag":"<5 tot 10 zinnen, alinea's gescheiden door \\n\\n>","kop":"<krantenkop van maximaal zeven woorden, bevat de achternaam van de winnaar, geen punt aan het eind>"}`;

async function openaiChat(userPrompt: string): Promise<{ text: string; finishReason: string | null }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY niet ingesteld in env");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: MAX_TOKENS,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    text: typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "",
    finishReason: data?.choices?.[0]?.finish_reason ?? null,
  };
}

// Gelijk aan src/lib/verslag.ts -- een edge function kan daar niet uit
// importeren. Afkortingen en initialen mogen niet als zinseinde tellen,
// anders herkanst de generatie onnodig.
const AFKORTINGEN = ["bijv", "nr", "ca", "resp", "incl", "excl", "etc", "evt", "ong", "max", "afb"];
const AFKORTING_RE = new RegExp(`\\b(?:${AFKORTINGEN.join("|")})\\.`, "gi");

function stripAfkortingen(tekst: string): string {
  // Losse letter + punt vangt initialen ("M. van der Poel") en samenstellingen
  // als "z.t." of "o.a."; de lijst vangt de meerletterige die daarna nog
  // overblijven. Geen echte taalanalyse -- wel genoeg voor koersteksten.
  return tekst.replace(/\b[A-Za-zÀ-ÿ]\./g, "").replace(AFKORTING_RE, "");
}

function telZinnen(tekst: string): number {
  return stripAfkortingen(tekst)
    .split(/[.!?]+(?=\s+["'\u201C\u2018(]?[A-ZÀ-Ý]|\s*$)/)
    .map((z) => z.trim())
    .filter(Boolean).length;
}

function parse(text: string): { verslag: string; kop: string | null } | null {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const p = JSON.parse(match ? match[0] : text);
    if (typeof p.verslag !== "string" || !p.verslag.trim()) return null;
    return {
      verslag: p.verslag.trim(),
      kop: typeof p.kop === "string" && p.kop.trim() ? p.kop.trim() : null,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // Alleen admins: dit kost OpenAI-tokens en schrijft in de krant.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => null) as
      | { bron_tekst?: string; stage_nummer?: number; stage_naam?: string; winnaar?: string }
      | null;
    const bronTekst = body?.bron_tekst?.trim();
    if (!bronTekst) return json({ error: "bron_tekst is verplicht" }, 400);
    if (bronTekst.length > 40_000) return json({ error: "bron_tekst te lang" }, 400);

    const context = [
      body?.stage_nummer != null ? `Etappe: ${body.stage_nummer}` : null,
      body?.stage_naam ? `Traject: ${body.stage_naam}` : null,
      body?.winnaar ? `Winnaar volgens onze uitslag: ${body.winnaar}` : null,
    ].filter(Boolean).join("\n");

    const prompt = `${context ? context + "\n\n" : ""}BRONARTIKEL (alleen als feitenbron -- neem geen formuleringen over):\n\n${bronTekst}`;

    let resultaat = parse((await openaiChat(prompt)).text);
    // Eén herkansing: een te lang of afgekapt antwoord is bijna altijd
    // eenmalig, en een mislukte generatie kost de admin anders handwerk.
    if (!resultaat || telZinnen(resultaat.verslag) > 12) {
      const tweede = parse((await openaiChat(`${prompt}\n\nLET OP: houd het strikt tussen 5 en 10 zinnen.`)).text);
      if (tweede) resultaat = tweede;
    }
    if (!resultaat) return json({ error: "Kon geen verslag genereren" }, 502);

    const zinnen = telZinnen(resultaat.verslag);
    console.log(`[verslag] etappe=${body?.stage_nummer ?? "?"} zinnen=${zinnen} model=${MODEL}`);

    return json({ ok: true, ...resultaat, zinnen, model: MODEL });
  } catch (err) {
    console.error("generate-stage-verslag", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
