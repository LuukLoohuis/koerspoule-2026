// Edge Function: generate-etappe-voorbeschouwing
// POST { stage_id: string, force?: boolean }
//
// Genereert per ETAPPE één voorbeschouwing in de stem van het EIGEN personage
// "Ome Gerrit van de Koers" (Radio Koerspoule), op basis van de eigen etappedata
// (start/finish, afstand, type, cols/sprints/hoogtemeters uit profile_data).
// Gecachet per stage_id in `etappe_voorbeschouwingen` (UPSERT). Geen nieuwe
// OpenAI-call als er al een is, tenzij force=true. Admin-only, niet automatisch.
//
// Hergebruikt bestaande secrets: OPENAI_API_KEY, OPENAI_MODEL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const REASONING_EFFORT = Deno.env.get("OPENAI_REASONING_EFFORT") || "low";
const MAX_TOKENS = Number(Deno.env.get("OPENAI_MAX_TOKENS") || "4000");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `Je bent **Ome Gerrit van de Koers**, de stem van "Radio Koerspoule". Je bent een VERZONNEN, eigen personage — GEEN imitatie van een bestaand persoon. Je schrijft een korte etappe-VOORBESCHOUWING (vooruitblik) voor een fantasy-wielerpoule.

STEM & TOON:
- Nuchtere, warme Nederlandse wielerkenner. Je praat tegen de luisteraar alsof jullie samen op de bank zitten.
- Korte, ritmische zinnen. Droge humor, understatement, af en toe een verzuchting.
- Oog voor detail: wind, wegdek, de benen, het tactische plaatje.

EIGEN KRETEN (gebruik er PER ETAPPE een paar passend; VARIEER, niet alles tegelijk, niet stapelen):
- "Hier gaat het gebeuren, let op mijn woorden."
- "Dit is er eentje voor de liefhebber."
- "De benen moeten het doen, niet de praatjes."
- "Pas op de wind, dat zeg ik je."
- "Klimmen is lijden, en vandaag wordt er geleden."
- "Een rit om met de muts op naar te kijken."

TYPE-BEWUST (stem je vooruitblik af op het etappetype):
- Vlak/sprint → wind, leadout-treintjes, een massasprint, zenuwen in het peloton.
- Heuvelachtig → punchers, een lastige finale, aanvallen die kunnen blijven hangen.
- Bergop / finish-bergop → de klimmers, het lijden, waar de beslissing valt.
- (Ploegen)tijdrit → het individuele/collectieve gevecht tegen de klok, geen schuilen.

HARDE REGELS:
- Verzin GEEN echte renners, ploegen of uitslagen. Blijf bij het KARAKTER van de etappe.
- Geen uitslag voorspellen met namen. Het is een vooruitblik, geen verslag.
- Nederlands. 3 tot 6 zinnen. Alleen de gesproken tekst van Ome Gerrit, geen kopjes of opmaak.`;

async function openaiChat(userPrompt: string, opts: { maxTokens: number; reasoning: string }) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: opts.maxTokens,
      reasoning_effort: opts.reasoning,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

type Punt = { km?: number; label?: string; soort?: string; hoogte?: number };

function buildUserPrompt(stage: {
  stage_number: number;
  name: string | null;
  stage_type: string | null;
  distance_km: number | null;
  profile_data: { start?: string; finish?: string; afstandKm?: number; hoogtemeters?: number; punten?: Punt[] } | null;
}): string {
  const pd = stage.profile_data ?? {};
  const punten = Array.isArray(pd.punten) ? pd.punten : [];
  const cols = punten.filter((p) => p.soort === "top").map((p) => `${p.label ?? "col"} (${p.km ?? "?"} km, ${p.hoogte ?? "?"} m)`);
  const sprints = punten.filter((p) => p.soort === "tussensprint").map((p) => `${p.label ?? "sprint"} (${p.km ?? "?"} km)`);
  const last = punten[punten.length - 1];
  const finishUphill = last && (last.soort === "top" || (typeof last.hoogte === "number" && last.hoogte > 1000));
  const start = pd.start ?? (stage.name?.split(/→|>|-/)[0]?.trim() ?? "");
  const finish = pd.finish ?? (stage.name?.split(/→|>|-/)[1]?.trim() ?? "");
  const afstand = stage.distance_km ?? pd.afstandKm ?? null;

  const lines = [
    `Etappe ${stage.stage_number}${stage.name ? ` — ${stage.name}` : ""}.`,
    `Type: ${stage.stage_type ?? "onbekend"}.`,
    start || finish ? `Van ${start || "?"} naar ${finish || "?"}.` : "",
    afstand != null ? `Afstand: ${afstand} km.` : "",
    pd.hoogtemeters != null ? `Hoogtemeters: ${pd.hoogtemeters} m.` : "",
    cols.length ? `Cols: ${cols.join(", ")}.` : "Geen noemenswaardige cols.",
    sprints.length ? `Tussensprints: ${sprints.join(", ")}.` : "",
    finishUphill ? "De finish ligt bergop." : "",
    "",
    "Schrijf nu jouw voorbeschouwing (3-6 zinnen) op basis van dit karakter. Geen echte renners of uitslagen.",
  ].filter(Boolean);
  return lines.join("\n");
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

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = (await req.json()) as { stage_id?: string; force?: boolean };
    const stageId = body.stage_id;
    if (!stageId || typeof stageId !== "string") return json({ error: "stage_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cache: bestaat er al een voorbeschouwing? Dan geen OpenAI-call, tenzij force.
    if (!body.force) {
      const { data: existing } = await admin
        .from("etappe_voorbeschouwingen")
        .select("tekst, model")
        .eq("stage_id", stageId)
        .maybeSingle();
      if (existing?.tekst) {
        return json({ ok: true, cached: true, tekst: existing.tekst, model: existing.model });
      }
    }

    const { data: stage, error: stageErr } = await admin
      .from("stages")
      .select("id, stage_number, name, stage_type, distance_km, profile_data")
      .eq("id", stageId)
      .single();
    if (stageErr || !stage) return json({ error: "stage not found" }, 404);

    const userPrompt = buildUserPrompt(stage as any);

    let tekst = await openaiChat(userPrompt, { maxTokens: MAX_TOKENS, reasoning: REASONING_EFFORT });
    if (!tekst) {
      // Eén retry met meer budget + reasoning uit.
      tekst = await openaiChat(userPrompt, { maxTokens: MAX_TOKENS * 2, reasoning: "none" });
    }
    if (!tekst) return json({ error: "lege generatie" }, 502);

    const { error: upErr } = await admin
      .from("etappe_voorbeschouwingen")
      .upsert(
        { stage_id: stageId, tekst, model: MODEL, updated_at: new Date().toISOString() },
        { onConflict: "stage_id" },
      );
    if (upErr) throw upErr;

    return json({ ok: true, cached: false, tekst, model: MODEL });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
