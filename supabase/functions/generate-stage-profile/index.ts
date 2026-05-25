// Edge Function: generate-stage-profile
// POST { stage_id: string, image_url: string, force?: boolean }
//
// Leest met een vision-model de kernpunten uit een etappe-profielafbeelding
// (bv. van touretappe.nl) en slaat ze op in stages.profile_data. De frontend
// tekent daar een strakke SVG van. Idempotent: bestaat profile_data al, dan
// wordt die teruggegeven (tenzij force).
//
// Vereist env: OPENAI_API_KEY (in Supabase secrets).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Vision-capabel model voor het uitlezen van de grafiek.
const MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `Je bent een nauwkeurige data-extractor voor wieler-etappeprofielen. Je krijgt één afbeelding van een hoogteprofiel (afstand op de x-as in km, hoogte op de y-as in meters) met gelabelde toppen, plaatsen, sprint/bonus-punten en klim-percentages.

Lees de afbeelding en geef STRIKT één JSON-object terug, exact dit schema, niets anders (geen markdown):
{
  "afstandKm": <number>,                 // totale afstand in km
  "hoogtemeters": <number|null>,         // totale hoogtemeters (elevation gain) indien zichtbaar, anders null
  "start": "<naam startplaats>",
  "finish": "<naam aankomstplaats>",
  "punten": [                            // gesorteerd op km oplopend; begin bij km 0 (start), eindig op de finish
    { "km": <number>, "hoogte": <number>, "label": "<plaats/top of leeg>", "soort": "start|klim|top|sprint|tussensprint|finish|punt" }
  ]
}

Regels:
- Neem ALLE gelabelde toppen/plaatsen mee die je kunt lezen, met hun km en hoogte (meters) zo nauwkeurig mogelijk.
- Het eerste punt is de start (km 0), het laatste is de finish (km = afstandKm).
- Verzin geen punten die er niet staan; lees alleen wat zichtbaar is. Bij twijfel over een getal, geef je beste schatting.
- "soort": gebruik "klim"/"top" voor cols, "sprint"/"tussensprint" voor sprintbollen, "finish" voor de aankomst, "start" voor het begin, anders "punt".
- Minimaal 2 punten (start + finish). Geef uitsluitend het JSON-object terug.`;

type Punt = { km: number; hoogte: number; label?: string; soort?: string };
type ProfileData = {
  afstandKm: number;
  hoogtemeters: number | null;
  start: string;
  finish: string;
  punten: Punt[];
};

async function extractProfile(imageUrl: string): Promise<ProfileData> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY niet ingesteld in env");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Lees dit etappeprofiel uit en geef het JSON-object." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Geen tekst in OpenAI-antwoord");

  const match = text.match(/\{[\s\S]*\}/);
  let parsed: any;
  try {
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    throw new Error(`Kon JSON niet parsen: ${text.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed?.punten) || parsed.punten.length < 2) {
    throw new Error("Profiel-extractie zonder geldige punten");
  }
  // Normaliseer + sorteer
  const punten: Punt[] = parsed.punten
    .map((p: any) => ({
      km: Number(p.km),
      hoogte: Number(p.hoogte),
      label: typeof p.label === "string" ? p.label : undefined,
      soort: typeof p.soort === "string" ? p.soort : undefined,
    }))
    .filter((p: Punt) => Number.isFinite(p.km) && Number.isFinite(p.hoogte))
    .sort((a: Punt, b: Punt) => a.km - b.km);
  if (punten.length < 2) throw new Error("Te weinig bruikbare punten na normalisatie");

  return {
    afstandKm: Number(parsed.afstandKm) || punten[punten.length - 1].km,
    hoogtemeters: Number.isFinite(Number(parsed.hoogtemeters)) ? Number(parsed.hoogtemeters) : null,
    start: typeof parsed.start === "string" ? parsed.start : "",
    finish: typeof parsed.finish === "string" ? parsed.finish : "",
    punten,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json() as { stage_id?: string; image_url?: string; force?: boolean };
    if (!body.stage_id) return json({ error: "stage_id required" }, 400);
    if (!body.image_url) return json({ error: "image_url required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!body.force) {
      const { data: existing } = await admin
        .from("stages")
        .select("profile_data")
        .eq("id", body.stage_id)
        .maybeSingle();
      if (existing?.profile_data) return json({ ok: true, profile_data: existing.profile_data, cached: true });
    }

    const profile = await extractProfile(body.image_url);

    const { error: upErr } = await admin
      .from("stages")
      .update({ profile_data: profile } as never)
      .eq("id", body.stage_id);
    if (upErr) throw upErr;

    return json({ ok: true, profile_data: profile });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
