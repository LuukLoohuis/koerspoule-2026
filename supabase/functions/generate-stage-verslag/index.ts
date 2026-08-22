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

const EIGEN_DATA_PROMPT = `Je bent eindredacteur van De Koerskrant, de krant binnen het wielerspel Koerspoule.

Je krijgt FEITEN over een zojuist afgeronde etappe: wie de rit won, wie de truien draagt, en hoe het in de poule liep. Schrijf daar een kort verslag van.

HARDE REGELS
1. LENGTE: minimaal 5 en maximaal 10 zinnen.
2. VERZIN NIETS. Gebruik uitsluitend de feiten hieronder. Je weet NIET hoe de koers verliep -- geen aanvallen, geen valpartijen, geen kopgroepen, geen weer, geen tactiek. Schrijf alleen op wat er staat.
3. VOLGORDE: begin met de koers (ritwinnaar, daarna de truien). Sluit af met de poule: wie de dagzege pakte en wie aan de leiding gaat.
4. GEEN SUBPOULES: noem geen subpoulenamen. De poulecijfers gaan over het hele spel.
5. DEELNEMERSNAMEN VET: zet elke naam van een DEELNEMER tussen dubbele sterretjes, zo: **Marieke de Groot**. Doe dit ELKE keer dat de naam voorkomt. Namen van RENNERS krijgen GEEN sterretjes -- alleen deelnemers uit de poule. Gebruik de naam exact zoals die in de feiten staat.
6. TOON: dit is de sportpagina, geen persbericht. Schrijf met vaart. Gebruik krachtige werkwoorden, korte zinnen naast lange, en durf een cijfer te laten knallen ("118 punten", "2308 anderen achter zich"). Eén uitroepteken in het hele stuk mag, meer niet. Geen aanspreking van de lezer, geen "wij" of "je".
7. Het poulegedeelte is het feestje: daar mag de toon het hoogst. De koers is het decor, de deelnemer is de held.
8. Is een feit niet gegeven, laat het weg. Schrijf nooit "onbekend" of "geen data".
9. VERZIN OOK IN DE TOON NIETS: enthousiasme mag, feiten verzinnen niet. Geen "na een lange vlucht", geen "in een spannende sprint" -- dat weet je niet.

Antwoord UITSLUITEND met JSON:
{"verslag":"<5 tot 10 zinnen, alinea's gescheiden door \\n\\n, deelnemersnamen tussen **>","kop":"<krantenkop van maximaal zeven woorden, bevat de achternaam van de ritwinnaar, geen punt aan het eind>"}`;

async function openaiChat(userPrompt: string, systemPrompt = SYSTEM_PROMPT): Promise<{ text: string; finishReason: string | null }> {
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
        { role: "system", content: systemPrompt },
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

type Feiten = {
  stageNummer: number;
  stageNaam: string | null;
  stageType: string | null;
  afstandKm: number | null;
  ritwinnaar: string | null;
  ritwinnaarPloeg: string | null;
  truien: Array<{ trui: string; renner: string }>;
  dagwinnaar: { naam: string; punten: number } | null;
  leider: { naam: string; punten: number; voorsprong: number | null } | null;
  aantalDeelnemers: number;
  isEersteEtappe: boolean;
};

const TRUI_LABEL: Record<string, string> = {
  gc_position: "de leiderstrui",
  points_position: "de puntentrui",
  mountain_position: "de bergtrui",
  youth_position: "de jongerentrui",
};

/**
 * Haalt alles op wat een verslag nodig heeft uit onze EIGEN database.
 *
 * De stand na deze etappe wordt opgeteld uit stage_points tot en met dit
 * ritnummer -- entries.total_points is het eindtotaal van de hele koers en
 * klopt dus niet als je terugkijkt op een etappe van halverwege.
 *
 * Admins tellen niet mee in de poulecijfers: die doen wel mee in subpoules maar
 * niet in het algemeen klassement, en dit verslag gaat over dat klassement.
 */
async function haalFeiten(admin: any, stageId: string): Promise<Feiten> {
  const { data: stage, error: stErr } = await admin
    .from("stages")
    .select("id, game_id, stage_number, name, stage_type, distance_km")
    .eq("id", stageId)
    .maybeSingle();
  if (stErr || !stage) throw new Error("Etappe niet gevonden");

  // Ritwinnaar en truidragers uit de uitslag van deze etappe.
  const { data: uitslag } = await admin
    .from("stage_results")
    .select("finish_position, gc_position, points_position, mountain_position, youth_position, riders(name, teams(name))")
    .eq("stage_id", stageId)
    .or("finish_position.eq.1,gc_position.eq.1,points_position.eq.1,mountain_position.eq.1,youth_position.eq.1");

  let ritwinnaar: string | null = null;
  let ritwinnaarPloeg: string | null = null;
  const truien: Array<{ trui: string; renner: string }> = [];
  for (const r of (uitslag ?? []) as any[]) {
    const naam = r.riders?.name?.trim();
    if (!naam) continue;
    if (r.finish_position === 1) {
      ritwinnaar = naam;
      ritwinnaarPloeg = r.riders?.teams?.name?.trim() ?? null;
    }
    for (const kolom of Object.keys(TRUI_LABEL)) {
      if (r[kolom] === 1) truien.push({ trui: TRUI_LABEL[kolom], renner: naam });
    }
  }

  // Alle etappes tot en met deze, voor de cumulatieve stand.
  const { data: stages } = await admin
    .from("stages")
    .select("id, stage_number")
    .eq("game_id", stage.game_id)
    .lte("stage_number", stage.stage_number);
  const stageIds = ((stages ?? []) as any[]).map((r) => r.id);

  const { data: punten } = await admin
    .from("stage_points")
    .select("entry_id, stage_id, points")
    .in("stage_id", stageIds.length > 0 ? stageIds : [stageId]);

  // Admins eruit: zij spelen niet mee in het algemeen klassement.
  const { data: entries } = await admin
    .from("entries")
    .select("id, user_id, profiles(display_name)")
    .eq("game_id", stage.game_id)
    .eq("status", "submitted");
  const { data: adminRollen } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  const adminIds = new Set(((adminRollen ?? []) as any[]).map((r) => r.user_id));

  const naamPerEntry = new Map<string, string>();
  for (const e of (entries ?? []) as any[]) {
    if (adminIds.has(e.user_id)) continue;
    naamPerEntry.set(e.id, e.profiles?.display_name?.trim() || "Onbekend");
  }

  const dagPunten = new Map<string, number>();
  const totaalPunten = new Map<string, number>();
  for (const r of (punten ?? []) as any[]) {
    if (!naamPerEntry.has(r.entry_id)) continue;
    totaalPunten.set(r.entry_id, (totaalPunten.get(r.entry_id) ?? 0) + (r.points ?? 0));
    if (r.stage_id === stageId) dagPunten.set(r.entry_id, r.points ?? 0);
  }

  const beste = (m: Map<string, number>) => {
    let id: string | null = null;
    let hoogste = -Infinity;
    for (const [k, v] of m) if (v > hoogste) { hoogste = v; id = k; }
    return id ? { naam: naamPerEntry.get(id)!, punten: hoogste } : null;
  };

  const dagwinnaar = beste(dagPunten);
  const leiderRuw = beste(totaalPunten);
  let leider: Feiten["leider"] = null;
  if (leiderRuw) {
    const rest = [...totaalPunten.values()].sort((a, b) => b - a);
    const tweede = rest.length > 1 ? rest[1] : null;
    leider = { ...leiderRuw, voorsprong: tweede === null ? null : leiderRuw.punten - tweede };
  }

  return {
    stageNummer: stage.stage_number,
    stageNaam: stage.name ?? null,
    stageType: stage.stage_type ?? null,
    afstandKm: stage.distance_km ?? null,
    ritwinnaar,
    ritwinnaarPloeg,
    truien,
    dagwinnaar,
    leider,
    aantalDeelnemers: naamPerEntry.size,
    isEersteEtappe: stage.stage_number === 1,
  };
}

/** Zet de feiten om in regels die het model letterlijk kan gebruiken. */
export function feitenPrompt(f: Feiten): string {
  const regels: string[] = [];
  regels.push(`Etappe ${f.stageNummer}${f.stageNaam ? `: ${f.stageNaam}` : ""}`);
  if (f.afstandKm) regels.push(`Afstand: ${f.afstandKm} km`);
  if (f.stageType) regels.push(`Type rit: ${f.stageType}`);
  if (f.ritwinnaar) {
    regels.push(`Ritwinnaar: ${f.ritwinnaar}${f.ritwinnaarPloeg ? ` (${f.ritwinnaarPloeg})` : ""}`);
  }
  for (const t of f.truien) regels.push(`Draagt ${t.trui}: ${t.renner}`);
  regels.push(`Aantal deelnemers in de poule: ${f.aantalDeelnemers}`);
  if (f.dagwinnaar) {
    regels.push(`Beste deelnemer van de dag: ${f.dagwinnaar.naam} met ${f.dagwinnaar.punten} punten`);
  }
  if (f.leider) {
    const marge = f.leider.voorsprong === null
      ? ""
      : f.leider.voorsprong === 0
        ? " (gedeeld aan de leiding)"
        : ` met ${f.leider.voorsprong} punten voorsprong`;
    regels.push(`Aan de leiding in het algemeen klassement: ${f.leider.naam} met ${f.leider.punten} punten${marge}`);
  }
  if (f.isEersteEtappe) {
    regels.push("Dit is de openingsetappe: er was nog geen klassement voor vandaag.");
  }
  return `FEITEN:\n${regels.join("\n")}`;
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
      | { bron_tekst?: string; stage_id?: string; stage_nummer?: number; stage_naam?: string; winnaar?: string; bewaar?: boolean }
      | null;
    const bronTekst = body?.bron_tekst?.trim();

    // Twee routes naar hetzelfde verslag: uit een aangeleverd artikel, of uit
    // onze eigen uitslag. De tweede vraagt geen bron en geen toestemming, en
    // kan dus vanzelf draaien zodra een etappe gefiatteerd is.
    let prompt: string;
    let systeem: string;
    if (bronTekst) {
      if (bronTekst.length > 40_000) return json({ error: "bron_tekst te lang" }, 400);
      const context = [
        body?.stage_nummer != null ? `Etappe: ${body.stage_nummer}` : null,
        body?.stage_naam ? `Traject: ${body.stage_naam}` : null,
        body?.winnaar ? `Winnaar volgens onze uitslag: ${body.winnaar}` : null,
      ].filter(Boolean).join("\n");
      prompt = `${context ? context + "\n\n" : ""}BRONARTIKEL (alleen als feitenbron -- neem geen formuleringen over):\n\n${bronTekst}`;
      systeem = SYSTEM_PROMPT;
    } else if (body?.stage_id) {
      const dienst = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const feiten = await haalFeiten(dienst, body.stage_id);
      if (!feiten.ritwinnaar) {
        return json({ error: "Nog geen ritwinnaar in de uitslag van deze etappe" }, 409);
      }
      prompt = feitenPrompt(feiten);
      systeem = EIGEN_DATA_PROMPT;
    } else {
      return json({ error: "bron_tekst of stage_id is verplicht" }, 400);
    }

    let resultaat = parse((await openaiChat(prompt, systeem)).text);
    // Eén herkansing: een te lang of afgekapt antwoord is bijna altijd
    // eenmalig, en een mislukte generatie kost de admin anders handwerk.
    if (!resultaat || telZinnen(resultaat.verslag) > 12) {
      const tweede = parse((await openaiChat(`${prompt}\n\nLET OP: houd het strikt tussen 5 en 10 zinnen.`, systeem)).text);
      if (tweede) resultaat = tweede;
    }
    if (!resultaat) return json({ error: "Kon geen verslag genereren" }, 502);

    const zinnen = telZinnen(resultaat.verslag);
    console.log(`[verslag] etappe=${body?.stage_nummer ?? body?.stage_id ?? "?"} zinnen=${zinnen} model=${MODEL}`);

    // Alleen bewaren als daar expliciet om gevraagd wordt: bij handmatig
    // herschrijven leest de redacteur eerst na voordat het de krant in gaat.
    if (body?.bewaar && body?.stage_id) {
      const dienst = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error: bewaarFout } = await dienst
        .from("etappe_verslagen")
        .upsert({ stage_id: body.stage_id, tekst: resultaat.verslag }, { onConflict: "stage_id" });
      if (bewaarFout) console.error("verslag bewaren mislukt", bewaarFout.message);
    }

    return json({ ok: true, ...resultaat, zinnen, model: MODEL });
  } catch (err) {
    console.error("generate-stage-verslag", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
