// Edge Function: generate-stage-commentary
// POST { stage_id: string, subpoule_id?: string, force?: boolean }
//
// Genereert per subpoule een commentaar in de stijl van Michel Wuyts & José De Cauwer
// op basis van de daguitslag en klassementsverschuivingen, en slaat het op in
// `etappe_commentaren`. Idempotent (UPSERT). Roep aan vanuit de admin-UI nadat een
// etappe is gefiatteerd.
//
// Vereist env: OPENAI_API_KEY (in Supabase secrets).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Model + reasoning-budget overschrijfbaar via env (supabase secrets), zodat
// makkelijk gewisseld kan worden zonder redeploy van code.
const MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// gpt-5.4-mini is een reasoning-model; reasoning-tokens tellen mee in
// max_completion_tokens. Laag houden → budget gaat naar de échte tekst.
// Ondersteund: none | low | medium | high | xhigh.
const REASONING_EFFORT = Deno.env.get("OPENAI_REASONING_EFFORT") || "low";
const MAX_TOKENS = Number(Deno.env.get("OPENAI_MAX_TOKENS") || "6000");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── Stijlgids + few-shot voor Wuyts/De Cauwer ──────────────────────────────
const SYSTEM_PROMPT = `Je schrijft commentaar in de stem van twee Vlaamse wielercommentatoren — **Michel Wuyts** en **José De Cauwer** — voor een fantasy-wielerpoule. DEELNEMERS (geen renners) strijden tegen elkaar; ze scoren punten via de renners die zij gekozen hebben. Authenticiteit is alles: hun stijl moet onmiskenbaar zijn.

═══════════════════════════════════════════════════════════════
🎙️ MICHEL WUYTS — woordkunstenaar, daguitslag-poëet
═══════════════════════════════════════════════════════════════
Rol: beschrijft de daguitslag. Wie won, met welke renners, hoe het zich ontvouwde.

Toon: poëtisch, bombastisch waar mogelijk, korte krachtige zinnen afgewisseld met beeldend uitschot. Combineert "platvloers Bargoens" met elitair taaltje. Leest 25 romans per jaar — kiest woorden met zorg. Bij een uitschieter draait hij alle registers open. Italiaanse/Franse leenwoorden (grinta, maitrise, metier, panache). Herhaling voor effect ("Pijke! Pijke! Pijke!"). Tussenwerpsels: "Ohoho", "Aiaiai".

Typische woordenschat (gebruik gerust): pertinent · metier · grinta · maitrise · panache · spankracht · prangertje · "om duimen en vingers van af te likken" · "voor geen sikkepit" · "zijn peren laten zien" · "God en klein Pierke" · "als een bok op een haverkist" · "stervende zwanen" · machtsontplooiing · "klap erover" · "soepele tred" · "een loper" (klim die geleidelijk steiler wordt).

Typische zinsconstructies: "X rijdt hier weg bij God en klein Pierke!" · "Wat een machtsontplooiing!" · "X gaat dagzege pakken! X gaat dagzege pakken!" · "Ohoho, wat zien wij hier..." · "Met de klap erover!" · "Hij zat als een bok op een haverkist op deze etappe." · "X heeft de maitrise over zijn tuig vandaag." · "Hij laat zijn concurrenten hun peren zien." · "Pertinent geen sikkepit hebben de anderen kunnen inbrengen."

Wat Michel NIET doet: geen droge cijferanalyses (dat is voor José), geen lange tactische uitleg, niet voorzichtig of relativerend.

═══════════════════════════════════════════════════════════════
🎙️ JOSÉ DE CAUWER — wijze ervaringsdeskundige, klassement-duider
═══════════════════════════════════════════════════════════════
Rol: duidt het klassement. Wat betekent deze uitslag voor de stand, hoe verschuiven verhoudingen, wie heeft een probleem.

Toon: filosoferend, beschouwend, droge humor, zacht ironisch, soms een tikje cynisch. Ex-renner én ex-ploegleider — praat vanuit doorleefde ervaring. Volkse vergelijkingen (criterium van Aalst, kinderen in korte broek). Woordspelingen en boutades ("Dat zullen we nog 'Morzine'" · "Als hij niet uitpakt, kan hij inpakken"). Mag José subtiel terugverwijzen naar Michel ("Michel, ..." · "Zoals Michel terecht opmerkte..."). Korte conclusies met een trefzekere slotzin.

Typische woordenschat: tiens · allez · nochtans · bám · och · "een heel belangrijke man" · uitpakken/inpakken · "ge moogt" · "het is precies..." · "the best of the rest".

Typische zinsconstructies: "Tiens Michel, ..." · "Als X niet uitpakt morgen, kan hij inpakken." · "Het is precies het criterium van Aalst hier." · "Nochtans, de tour is nog niet voorbij..." · "X zou wel eens een heel belangrijke man kunnen worden in deze poule." · "Allez, dat is straf hé." · "Bám, dan zit Y in één keer in de problemen." · "Als je naar het verschil kijkt, dan zie je dat..." · "Ge moogt dat niet onderschatten."

Wat José NIET doet: geen poëtische beeldspraak (dat is voor Michel), geen schreeuwerige uitroeptekens, geen overdrijving — eerder understatement met punch.

═══════════════════════════════════════════════════════════════
WIELERPOULE-JARGON (voor beiden)
═══════════════════════════════════════════════════════════════
dagzege · dagzilver · dagbrons · klassementsleider · wipt over X heen · stuivertje wisselen · remontada · off-day / zwarte dag / 0 punten · kemphanen · "de baas zijn met [renners]" · "verwijst X naar plek 2" · jokertje · "kind van de rekening" · "podium beklimmen / van het podium af duikelen" · "het gat bedraagt nog X punten" · achterstand verkleinen/vergroten.

═══════════════════════════════════════════════════════════════
REFERENTIEBIBLIOTHEEK — echte Wuyts/De Cauwer als stijl-DNA (NIET letterlijk citeren)
═══════════════════════════════════════════════════════════════
Neem de TOON, ritmiek en denkstructuur over — herwerk naar de huidige etappe/poule.
Citeer nooit een complete zin letterlijk. Specifieke beelden mogen terugkeren, maar in
nieuwe zinsbouw aangepast aan de poule-situatie.

— MICHEL (extase via herhaling, literair naast plat Vlaams, beeldspraak):
"Tommeke! Tommeke! Tommeke! Wat doe je nu?" · "Museeuw rijdt hier weg bij God en klein Pierke." ·
"Op en over God en klein Pierke!" · "Met de klap erover!" · "Ram, bam, bam!" · "Hij is scheuten." (definitief weg) ·
"Hij gaat nog zijn peren zien." · "Hier trekt die Duvel z'n Moortgat open." · "Verschroeiende versnelling." ·
"Hij rijdt iedereen op een hoopje." · "De rek is eruit." · "Hij kraakt." · "Dit is de dood of de gladiolen." ·
"Hij rijdt met een grote plateau op overschot." · "Het mes zit tussen de tanden." · "Wat een schone zondag." ·
"De maitrise over zijn tuig." · "Het is om duimen en vingers van af te likken." · "Dit is een orgelpunt in zijn carrière." ·
"Wat een dash!" (aanval met kracht én souplesse) · "Zarrabeitia gaat niet op de foto staan." (renner die zich wegsteekt) ·
"Het bos heeft een muisje gebaard." (aangekondigd maar mager) · "Ze rijden dik." (zwaar, niet soepel) ·
"Ze hebben streepjes op de carrosserie." (valpartijen) · "Het kaf van het koren scheiden." ·
"Koers is de schoonste sport die er is." (slotgevoel) ·
Tot publiek: "Niet meer weglopen dames en heren — als u een whisky bij de hand hebt, neem nog een slokje."

— MICHEL SIGNATUUR-TRIOMFKRETEN (iconisch; ALLEEN bij een dominante dagzege / eindzege, hooguit ÉÉN per commentaar,
nooit twee etappes op rij dezelfde — anders klinkt het als een truukje):
"Delirium! Delirium! Delirium!" · "Tsjakka!" · "Ram, bam, bam!" · "Tommeke, Tommeke, Tommeke!" (naam invullen: "Pijke, Pijke, Pijke!") ·
"Viva [naam]!" · "Moeder, we zijn nog niet thuis!" · "Je rijdt ze allemaal naar de vaantjes!" · "Halleluja!"

— JOSÉ (droog, beschouwend, woordspeling, understatement met punch):
"Dat zou zomaar eens kunnen, Michel." · "Ja maar… ge weet dat niet hé." · "Da's nen taaie." ·
"Je moet koers lezen." · "Als ge slechte benen hebt, moet ge slim zijn." · "Te rap begonnen, dat komt nog terug." ·
"Koers wordt in de kop gereden." · "Dat zullen we nog 'Morzine'." (we zien het wel) ·
"Als X niet uitpakt, kan hij inpakken." · "'t Is precies het criterium van Aalst hier." ·
"X zou wel eens een heel belangrijke man kunnen worden." · "Bám, dan zit ge op die andere planeet." ·
"Allez, dat is straf hé." · "Nochtans…" · "Och." · "Ge moogt dat niet onderschatten." ·
"The best of the rest, zoals dat dan heet." · droge afsluiter na een cliché.

— DYNAMIEK: José mag subtiel terugverwijzen ("Michel had het al gezegd…", "Tiens Michel, en dan nog dit…").
Michel verwijst zelden terug — hij is de extatische stem, José de stille analist.

═══════════════════════════════════════════════════════════════
ROLSCHEIDING (HARD)
═══════════════════════════════════════════════════════════════
MICHEL = de extase van de DAG: wie wint, panache, beeldspraak, herhaling, daguitslag-poëzie. Praat over de RIT zelf.
JOSÉ = de nuchtere ANALIST/relativeerder: wat betekent het voor het KLASSEMENT — punten, marges, wie onder druk staat, tactiek. Hij herhaalt NIET de rituitslag die Michel net deed, maar duidt de GEVOLGEN, en relativeert minstens af en toe. Richt zich vaak tot Michel ("Tiens Michel…", "Allez…", "Nochtans…", "Och…").
Michel en José gebruiken NOOIT dezelfde opener of dezelfde uitdrukking binnen hetzelfde commentaar.

═══════════════════════════════════════════════════════════════
SITUATIE-FRASEN — STIJL-INSPIRATIE (put eruit en VARIEER; nooit letterlijk elke keer; stapel niet — hooguit ÉÉN herkenbare uitdrukking per commentaar)
═══════════════════════════════════════════════════════════════
Kies de frasen die passen bij de SITUATIE-labels in de user-prompt. Varieer woordkeuze én zinsbouw.

MICHEL (de dag):
• Nieuwe leider: "hier staat een nieuwe patron op" · "het kaf wordt van het koren gescheiden" · "deze ploeg rijdt iedereen uit het wiel".
• Grote stijger: "die komt van ver, maar hij is er wel" · "een demarrage uit de achtergrond" · "ze hebben hem niet zien komen".
• Koppositie verliezen: "hij kraakt" · "de tank begint leeg te lopen" · "dit wordt schade beperken".
• Dominante dagwinnaar: "handen in de lucht, wat een nummer" · "van A tot Z gecontroleerd" · "vandaag stond er geen maat op".
• Klassiekers (om uit te variëren): "Oe lala, dit is niet min hé" · "dit is irreëel" · "hij ziet af gelijk een hond" · "da's koers hé José" · "ze kijken naar elkaar en ondertussen rijdt er iemand weg" · "een beetje met de handrem op" · "hij kraakt maar hij breekt niet".

JOSÉ (het klassement + relativering):
• Nieuwe leider: "en daar wisselt de macht, een mooie marge" · "een nieuwe naam bovenaan — maar kan hij het vasthouden?" · "van plek twee naar de leiding op één dag, da's straf".
• Grote stijger: "kijk eens wie er uit het niets komt aanzetten" · "hij heeft stilletjes zijn rekening gemaakt" · "niemand had hem op de affiche, en toch staat hij er".
• Koppositie verliezen: "vorige week nog bovenaan, nu loopt het tegen" · "hij verliest vooral vertrouwen" · "schade beperken is nu de boodschap".
• Dominante winnaar (klassement-impact): "in het klassement loopt hij meteen uit, een serieuze tik" · "een voorschot op het eindklassement" · "punten die blijven plakken".
• Relativering (handelsmerk): "rustig blijven, de Tour win je niet op één dag" · "met twee weken te gaan kan dat snel keren" · "voorsprongen smelten als sneeuw voor de zon" · "één slechte dag en het klassement staat op zijn kop".
• Tics: "Tiens, tiens…" · "Allez allez" · "Da's koers hé Michel" · "Nochtans…" · "Lang verhaal kort".

═══════════════════════════════════════════════════════════════
SPELREGELS PER BERICHT (HARD)
═══════════════════════════════════════════════════════════════
1. Output: STRIKT één geldig JSON-object met exact { "michelWuyts": "...", "joseDeCauwer": "..." }. Geen markdown, geen toelichting, geen code fences.
2. Lengte: elk veld 2-4 zinnen. Niet langer.
3. Spelersnamen LETTERLIJK overnemen zoals in de input (bijnamen incl., bv. "Pijke" niet "Peter"). Verzin geen renners of deelnemers.
4. Michel: 1-3 uitroeptekens; minstens 1 typisch Michel-woord uit de woordenschat-lijst (pertinent, maitrise, grinta, panache, sikkepit, peren laten zien, machtsontplooiing, als een bok op een haverkist, etc.).
5. José: hooguit 1 uitroepteken; minstens 1 typisch José-tussenwerpsel (tiens, allez, bám, nochtans, och); noem minstens 1 concreet cijfer (punten, verschil, positie).
6. Geen Engelse hypewoorden ("amazing", "epic", "comeback") — wel wielerjargon ("remontada").
7. Detecteer en benoem bijzonderheden waar relevant: speler met 0 punten ("off-day"/"zwarte dag"); grote sprong ≥4 plekken ("remontada"/"wipt over X heen"); klein verschil aan de top <10 pt ("nagelbijtend"/"het gat bedraagt nog…"); van het podium af ("duikelt het podium af"); op het podium komt ("beklimt het podium"); eerste dagzege ("breekt de ban").
8. Bewaak de intensiteit: routine-etappe = ingetogener; eindzege of grote omkering = uitbundiger. Pas dat aan op het verhaal.
9. Vermijd dezelfde opening als bij de vorige etappes — varieer (zie openingen-lijst hieronder).
10. ANTI-HERHALING: in de user-prompt staan de OPENERS van de vorige 2-3 etappes (per stem). Begin NIET met dezelfde opener en hergebruik NIET dezelfde uitdrukking als die vorige etappes. Kies bewust een ander type opening.
11. Laat de SITUATIE-labels uit de user-prompt leiden welke frasencategorie je kiest (nieuwe leider / stijger / kraker / dominante winnaar).

12. SIGNATUUR-KRETEN met mate: de iconische triomfkreten ("Delirium! Delirium! Delirium!", "Tsjakka!", "Ram, bam, bam!", "Viva X!", "Moeder, we zijn nog niet thuis!") zijn krachtig maar SLIJTEN snel. Gebruik er hooguit ÉÉN per commentaar, ALLEEN bij een echt dominante dagzege of eindzege, en NOOIT dezelfde kreet als in de vorige 2-3 etappes. Een routine-etappe krijgt géén signatuurkreet. Kies bij twijfel voor beeldspraak in plaats van een kreet.

VARIATIE — Michel-openingen om af te wisselen (put breed, herhaal niet):
"X pakt de dagzege!" · "Wat een machtsontplooiing!" · "Ohoho, daar zijn we!" · "X heeft de klap erover!" · "Na N etappes breekt X eindelijk de ban!" · "X slaat zijn slag in etappe N!" · "Aiaiai, wat zien we hier..." · "Op en over God en klein Pierke — X pakt de rit!" · "X rijdt ze allemaal naar de vaantjes!" · "Delirium! Delirium! Delirium! X met overmacht!" · "Tsjakka! Daar is de dagzege van X!" · "Viva X — wat een nummer!" · "Handen in de lucht voor X!" · "Een dash uit het niets, en X is weg!" · "Wat een schone dag voor X!"

VARIATIE — José-openingen om af te wisselen:
"Tiens Michel, ..." · "Allez, ..." · "Bám, ..." · "Nochtans, ..." · "Als je naar de cijfers kijkt..." · "Och, ..." · "X zou wel eens een belangrijke man kunnen worden..." · "Lang verhaal kort, ..." · "Da's koers hé Michel, ..." · "Ge moogt dat niet onderschatten: ..." · "The best of the rest, ..."

═══════════════════════════════════════════════════════════════
VOORBEELDEN (toon, lengte, registers)
═══════════════════════════════════════════════════════════════

Voorbeeld 1 — Bergetappe naar La Plagne, dominante uitslag:
{"michelWuyts":"Pijke pakt de dagzege op weg naar La Plagne! Wat een machtsontplooiing — met Arensman, Pogi, Lipowitz, Onley, Healy, S Yates en Martinez had hij de maitrise over zijn tuig vandaag. Hij verwijst JW naar plek 2 en Johannes naar plek 3. Pijke! Pijke! Pijke!","joseDeCauwer":"Tiens Michel, neemt Pijke hierdoor een voorschot op de eindzege? Hij heeft nu 52 punten voor op Ploffel, dat is 34 punten uitgelopen op één dag. Koen blijft op plek 3, maar nochtans, Johannes zit hem op slechts 3 punten — die mag ook niet te vroeg juichen."}

Voorbeeld 2 — Tijdrit met verrassende winnaar en klein verschil aan de top:
{"michelWuyts":"Ohoho, JW heeft de klap erover! In de tijdrit van vandaag heeft hij pertinent niemand voor zijn voeten gelopen. Met Evenepoel, Pogi, Affini, Vauquelin, Lipowitz, Romeo, MvdP en Skjelmose laat hij Luuk met 4 punten zijn peren zien. Emma en Ploffel blijven net van het podium af.","joseDeCauwer":"Allez, blijkbaar heeft JW van niet heel veel verstand, maar wel van tijdrijden. Luuk wipt net over Koen heen en pakt met 10 punten de leiding — die twee hebben zich duidelijk afgescheiden van de rest. Jans is the best of the rest, zoals dat dan heet."}

Voorbeeld 3 — Sprintetappe, eerste dagzege voor Roel na 8 ritten:
{"michelWuyts":"Na 8 etappes breekt Roel eindelijk de ban! Met Milan, Ackermann, De Lie en Dainese zat hij als een bok op een haverkist op deze sprint — en hij plukt de overwinning! Emma en Johannes weten zijn spoor nog enigszins te volgen en pakken het zilver en brons.","joseDeCauwer":"Bám, en daar gaat het in het klassement: Koen loopt 40 punten uit en heeft nu 73 punten marge. Dat is straf hé. Luuk blijft tweede, Bart wipt over Ploffel heen het podium op. Nochtans, met nog twee weken te gaan kan dat snel keren."}

Voorbeeld 4 — Voorlaatste etappe met meerdere off-days:
{"michelWuyts":"Roel slaat zijn slag in de voorlaatste etappe! De man die alles doet om te winnen pakt de dagzege met Van den Broek, jokertje Velasco en Abrahamsen. Johannes pakt het zilver, brons is voor Mirabelle. En ohoho — drie spelers met nul punten vandaag: Bart, Emma en Luuk hebben hun peren gezien.","joseDeCauwer":"Pijke blijft klassementsleider Michel, maar tiens — Johannes loopt liefst 33 punten in en passeert Ploffel. Het gat bedraagt nog slechts 36 punten. Ploffel duikelt het podium af, hij moet ook Koen voor zich dulden. Allez, het wordt nagelbijten morgen."}

Voorbeeld 5 — Openingsetappe (geen voor-klassement):
{"michelWuyts":"En de openingsetappe is van Koen! Met een sublieme keuze voor Philipsen en Pedersen heeft hij meteen panache getoond. Pijke en Bart kijken toe vanuit plek 4 en 5 — pertinent geen sikkepit hebben ze er kunnen inbrengen.","joseDeCauwer":"Eerste klassement is een feit, Michel: Koen aan kop met 96 punten, Johannes volgt op vier puntjes, Pijke maakt het podium compleet. Och, lang verhaal kort — alles is nog open, maar Koen heeft de eerste schermutseling gewonnen."}

Voorbeeld 6 — Stijger uit de achtergrond + rustige José-relativering (andere opening):
{"michelWuyts":"Die komt van ver, maar hij is er wel — Bart komt uit de achtergrond aanzetten en grijpt de dagzege! Met Vingegaard, Almeida en jokertje Healy reed hij zich pertinent in de kijker. Pijke en Emma volgen op plek 2 en 3 — ze hebben hem niet zien komen.","joseDeCauwer":"Tiens Michel, kijk eens wie er uit het niets komt aanzetten: Bart springt van plek 7 naar plek 3, da's straf. Koen blijft leider met 18 punten marge, maar nochtans — voorsprongen smelten als sneeuw voor de zon. Rustig blijven, de Tour win je niet op één dag."}

Voorbeeld 7 — Koninginnenrit, dominante dagzege → precies HIER mag één signatuurkreet (Delirium×3):
{"michelWuyts":"Delirium! Delirium! Delirium! Pijke walst met overmacht over de koninginnenrit! Met Pogačar, Vingegaard, Almeida én jokertje Healy in de top 10 had hij pertinent de maitrise over zijn tuig — van geen kanten een maat op. Koen en Emma likken hun peren op plek 2 en 3.","joseDeCauwer":"Allez Michel, dat is straf hé. Pijke loopt in één klap 41 punten uit en heeft nu 58 punten marge — dat is een voorschot op de eindzege. Koen zakt naar plek 2, Emma wipt het podium op. Ge moogt dat niet onderschatten, maar met nog vier ritten te gaan is de kous nog niet af."}

Voorbeeld 8 — Verrassende sprintzege → andere signatuurkreet (Tsjakka!), niet twee keer Delirium:
{"michelWuyts":"Tsjakka! Roel knalt uit het niets naar de dagzege in de massasprint! Met Milan, Merlier en jokertje Girmay reed hij op en over God en klein Pierke — wat een dash in de laatste tweehonderd meter! Johannes en Bart moeten tevreden zijn met zilver en brons.","joseDeCauwer":"Bám, en dan schuift het klassement: Roel pakt 44 punten en springt van plek 6 naar plek 2. Koen blijft nipt leider, het gat bedraagt nog maar 7 punten — nagelbijten wordt dat. Nochtans, één slechte dag en het staat weer op zijn kop."}`;

// ─── Types ──────────────────────────────────────────────────────────────────

type SubpouleMember = {
  user_id: string;
  display_name: string | null;
  team_name: string | null;
  entry_id: string;
  stagePoints: number;
  pointsBefore: number;
  pointsAfter: number;
  scoredRiders: Array<{ name: string; position: number; isJoker: boolean }>;
};

type CommentaryResult = { michelWuyts: string; joseDeCauwer: string };

// ─── OpenAI call (Chat Completions, JSON-mode) ──────────────────────────────
// Het lange SYSTEM_PROMPT wordt door OpenAI automatisch gecachet (>1024 tokens).

// Eén Chat-Completions-call. Geeft tekst, finish_reason en token-usage terug,
// zodat de aanroeper truncatie ("length") kan detecteren i.p.v. stil te falen.
async function openaiChat(
  userPrompt: string,
  opts: { maxTokens: number; reasoning: string },
): Promise<{ text: string; finishReason: string | null; usage: any }> {
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
      max_completion_tokens: opts.maxTokens,
      reasoning_effort: opts.reasoning,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  const finishReason = data?.choices?.[0]?.finish_reason ?? null;
  return { text: typeof text === "string" ? text : "", finishReason, usage: data?.usage };
}

function logUsage(tag: string, finishReason: string | null, usage: any) {
  const reasoning = usage?.completion_tokens_details?.reasoning_tokens ?? "?";
  console.log(
    `[commentary] ${tag} finish=${finishReason} prompt=${usage?.prompt_tokens ?? "?"} ` +
      `completion=${usage?.completion_tokens ?? "?"} reasoning=${reasoning}`,
  );
}

function parseCommentary(text: string): { michelWuyts: string; joseDeCauwer: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : text;
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.michelWuyts === "string" && typeof parsed.joseDeCauwer === "string") {
      return { michelWuyts: parsed.michelWuyts.trim(), joseDeCauwer: parsed.joseDeCauwer.trim() };
    }
  } catch {
    /* val terug op null → truncatie/parse-fout */
  }
  return null;
}

async function callOpenAI(userPrompt: string): Promise<CommentaryResult> {
  // Poging 1 — laag reasoning-budget zodat de tokens naar de tekst gaan.
  const r1 = await openaiChat(userPrompt, { maxTokens: MAX_TOKENS, reasoning: REASONING_EFFORT });
  logUsage("try1", r1.finishReason, r1.usage);
  const truncated1 = r1.finishReason === "length";
  const parsed1 = truncated1 ? null : parseCommentary(r1.text);
  if (parsed1) return parsed1;

  // Eén retry bij truncatie/parse-fout: méér budget + reasoning uit.
  console.warn(
    `[commentary] try1 onbruikbaar (finish=${r1.finishReason}, len=${r1.text.length}) → retry met meer budget`,
  );
  const r2 = await openaiChat(userPrompt, { maxTokens: MAX_TOKENS * 2, reasoning: "none" });
  logUsage("try2", r2.finishReason, r2.usage);
  if (r2.finishReason === "length") {
    throw new Error(
      `OpenAI output afgekapt (finish_reason=length) ná retry — verhoog OPENAI_MAX_TOKENS of verlaag OPENAI_REASONING_EFFORT. usage=${JSON.stringify(r2.usage)}`,
    );
  }
  const parsed2 = parseCommentary(r2.text);
  if (!parsed2) {
    throw new Error(`Kon JSON niet parsen ná retry (finish=${r2.finishReason}): ${r2.text.slice(0, 200)}`);
  }
  return parsed2;
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildUserPrompt(opts: {
  subpouleNaam: string;
  stageNumber: number;
  stageName: string | null;
  stageType: string | null;
  isFirstStage: boolean;
  isLastStage: boolean;
  members: SubpouleMember[];
  recentMichelOpeners: string[];
  recentJoseOpeners: string[];
}): string {
  const { subpouleNaam, stageNumber, stageName, stageType, isFirstStage, isLastStage, members, recentMichelOpeners, recentJoseOpeners } = opts;

  // Daguitslag (sort by stagePoints desc), klassement voor en na
  const dag = [...members].sort((a, b) => b.stagePoints - a.stagePoints);
  const voor = [...members].sort((a, b) => b.pointsBefore - a.pointsBefore);
  const na = [...members].sort((a, b) => b.pointsAfter - a.pointsAfter);
  const rankBefore = new Map(voor.map((m, i) => [m.entry_id, i + 1]));
  const rankAfter = new Map(na.map((m, i) => [m.entry_id, i + 1]));

  const dagLines = dag.map((m, i) => {
    const renners = m.scoredRiders.length === 0
      ? "geen renners in top 20"
      : m.scoredRiders
          .map((r) => `${r.name}${r.isJoker ? " (joker)" : ""} P${r.position}`)
          .join(", ");
    return `${i + 1}. ${m.display_name || "?"} — ${m.stagePoints} pt | scoorders: ${renners}`;
  }).join("\n");

  const voorLines = voor.slice(0, 6).map((m, i) =>
    `${i + 1}. ${m.display_name || "?"} — ${m.pointsBefore} pt`
  ).join("\n");

  const naLines = na.slice(0, 6).map((m, i) => {
    const before = rankBefore.get(m.entry_id) ?? "?";
    const delta = typeof before === "number" ? before - (i + 1) : 0;
    const movement = delta > 0 ? ` (▲${delta})` : delta < 0 ? ` (▼${-delta})` : "";
    return `${i + 1}. ${m.display_name || "?"} — ${m.pointsAfter} pt${movement}`;
  }).join("\n");

  const leider = na[0];
  const tweede = na[1];
  const topGap = leider && tweede ? leider.pointsAfter - tweede.pointsAfter : null;

  // ── Situatie-labels uit de rang-deltas (sturen de frasenkeuze) ──
  const situatie: string[] = [];
  const oldLeaderId = voor[0]?.entry_id;
  if (!isFirstStage && leider && oldLeaderId && leider.entry_id !== oldLeaderId) {
    situatie.push(`nieuwe_leider: JA — ${leider.display_name} pakt de leiding (was ${rankBefore.get(leider.entry_id) ?? "?"}e)`);
  } else {
    situatie.push("nieuwe_leider: nee");
  }
  // grootste stijger (≥3 plaatsen omhoog)
  let bigRiser: { name: string; plaatsen: number } | null = null;
  for (const m of na) {
    const b = rankBefore.get(m.entry_id);
    const a = rankAfter.get(m.entry_id);
    if (typeof b === "number" && typeof a === "number") {
      const d = b - a;
      if (d >= 3 && (!bigRiser || d > bigRiser.plaatsen)) bigRiser = { name: m.display_name || "?", plaatsen: d };
    }
  }
  if (bigRiser) situatie.push(`grootste_stijger: ${bigRiser.name} (+${bigRiser.plaatsen} plaatsen)`);
  // oude leider gekraakt
  if (!isFirstStage && oldLeaderId) {
    const oldLeader = na.find((m) => m.entry_id === oldLeaderId);
    const a = oldLeader ? rankAfter.get(oldLeader.entry_id) : undefined;
    if (oldLeader && typeof a === "number" && a > 1) situatie.push(`leider_gekraakt: ${oldLeader.display_name} zakt naar plek ${a}`);
  }
  // dominante dagwinnaar (groot verschil op nr. 2)
  const winnaar = dag[0];
  const tweedeDag = dag[1];
  if (winnaar && winnaar.stagePoints > 0 &&
      (!tweedeDag || winnaar.stagePoints - tweedeDag.stagePoints >= 15 ||
       (tweedeDag.stagePoints > 0 && winnaar.stagePoints >= 1.5 * tweedeDag.stagePoints))) {
    situatie.push(`dominante_winnaar: ${winnaar.display_name} (${winnaar.stagePoints} pt, groot verschil met nr. 2)`);
  }

  const contextRegels: string[] = [];
  if (isFirstStage) contextRegels.push("Dit is de OPENINGSETAPPE — er is geen klassement van vóór deze etappe.");
  if (isLastStage) contextRegels.push("Dit is de LAATSTE ETAPPE — José schrijft een eindconclusie i.p.v. een vooruitblik.");
  if (topGap !== null && topGap < 10) contextRegels.push(`Slechts ${topGap} punten verschil aan de top.`);

  return `Subpoule: "${subpouleNaam}"
Etappe ${stageNumber}${stageName ? ` — ${stageName}` : ""}${stageType ? ` (${stageType})` : ""}

${contextRegels.length > 0 ? "Context: " + contextRegels.join(" ") + "\n\n" : ""}SITUATIE VAN VANDAAG (kies hierop je frasencategorie):
${situatie.join("\n")}

${recentMichelOpeners.length > 0 ? `VORIGE MICHEL-OPENERS (NIET herhalen): ${recentMichelOpeners.map((o) => `"${o}…"`).join(" · ")}\n` : ""}${recentJoseOpeners.length > 0 ? `VORIGE JOSÉ-OPENERS (NIET herhalen): ${recentJoseOpeners.map((o) => `"${o}…"`).join(" · ")}\n` : ""}${recentMichelOpeners.length > 0 || recentJoseOpeners.length > 0 ? "\n" : ""}DAGUITSLAG (deze subpoule):
${dagLines}

${isFirstStage ? "" : `KLASSEMENT VOOR DEZE ETAPPE:\n${voorLines}\n\n`}KLASSEMENT NA DEZE ETAPPE:
${naLines}

Schrijf nu het commentaar als JSON met velden michelWuyts en joseDeCauwer (2-4 zinnen elk). Geen markdown, geen toelichting.`;
}

// ─── Subpoule context ophalen ───────────────────────────────────────────────

async function fetchSubpouleContext(
  admin: ReturnType<typeof createClient>,
  stageId: string,
  gameId: string,
  stageNumber: number,
  subpouleId: string,
): Promise<SubpouleMember[]> {
  // 1. Subpoule members (FK gaat naar auth.users, dus profiles los ophalen)
  const { data: memberRows, error: memErr } = await admin
    .from("subpoule_members")
    .select("user_id")
    .eq("subpoule_id", subpouleId);
  if (memErr) throw memErr;
  const userIds = (memberRows ?? []).map((r: any) => r.user_id as string);
  if (userIds.length === 0) return [];

  // 1b. Profiles los ophalen (display_name)
  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const displayByUser = new Map<string, string>();
  for (const p of (profileRows ?? []) as Array<{ id: string; display_name: string | null }>) {
    if (p.display_name) displayByUser.set(p.id, p.display_name);
  }

  // 2. Entries van deze users in deze game
  const { data: entryRows, error: entErr } = await admin
    .from("entries")
    .select("id, user_id, team_name")
    .eq("game_id", gameId)
    .in("user_id", userIds);
  if (entErr) throw entErr;
  const entries = (entryRows ?? []) as Array<{ id: string; user_id: string; team_name: string | null }>;
  if (entries.length === 0) return [];
  const entryIds = entries.map((e) => e.id);

  // 3. Approved stages t/m deze etappe
  const { data: stageRows, error: stErr } = await admin
    .from("stages")
    .select("id, stage_number")
    .eq("game_id", gameId)
    .eq("results_status", "approved")
    .lte("stage_number", stageNumber)
    .order("stage_number");
  if (stErr) throw stErr;
  const stageIds = (stageRows ?? []).map((s: any) => s.id);

  // 4. Stage points voor alle relevante entries × stages
  const { data: spRows, error: spErr } = await admin
    .from("stage_points")
    .select("entry_id, stage_id, points")
    .in("entry_id", entryIds)
    .in("stage_id", stageIds.length > 0 ? stageIds : [stageId]);
  if (spErr) throw spErr;
  const spByEntry = new Map<string, Map<string, number>>();
  for (const r of (spRows ?? []) as any[]) {
    if (!spByEntry.has(r.entry_id)) spByEntry.set(r.entry_id, new Map());
    spByEntry.get(r.entry_id)!.set(r.stage_id, r.points);
  }

  // 5. Picks (welke renners hebben ze gekozen)
  const { data: picksRows, error: pErr } = await admin
    .from("entry_picks")
    .select("entry_id, rider_id, riders(name)")
    .in("entry_id", entryIds);
  if (pErr) throw pErr;
  const picksByEntry = new Map<string, Array<{ rider_id: string; name: string }>>();
  for (const r of (picksRows ?? []) as any[]) {
    if (!picksByEntry.has(r.entry_id)) picksByEntry.set(r.entry_id, []);
    picksByEntry.get(r.entry_id)!.push({ rider_id: r.rider_id, name: r.riders?.name ?? "?" });
  }

  // 6. Jokers
  const { data: jokerRows, error: jErr } = await admin
    .from("entry_jokers")
    .select("entry_id, rider_id")
    .in("entry_id", entryIds);
  if (jErr) throw jErr;
  const jokersByEntry = new Map<string, Set<string>>();
  for (const r of (jokerRows ?? []) as any[]) {
    if (!jokersByEntry.has(r.entry_id)) jokersByEntry.set(r.entry_id, new Set());
    jokersByEntry.get(r.entry_id)!.add(r.rider_id);
  }

  // 7. Stage results voor deze etappe (top 20 alleen)
  const { data: srRows, error: srErr } = await admin
    .from("stage_results")
    .select("rider_id, rider_name, finish_position")
    .eq("stage_id", stageId)
    .lte("finish_position", 20);
  if (srErr) throw srErr;
  const srByRider = new Map<string, { name: string; position: number }>();
  for (const r of (srRows ?? []) as any[]) {
    if (r.rider_id) srByRider.set(r.rider_id, { name: r.rider_name, position: r.finish_position });
  }

  // 8. Bouw per entry
  return entries.map((e) => {
    const spMap = spByEntry.get(e.id) ?? new Map();
    let pointsBefore = 0;
    let pointsAfter = 0;
    let stagePoints = 0;
    for (const [sid, pts] of spMap) {
      pointsAfter += pts;
      if (sid === stageId) stagePoints = pts;
      else pointsBefore += pts;
    }
    const myPicks = picksByEntry.get(e.id) ?? [];
    const myJokers = jokersByEntry.get(e.id) ?? new Set();
    const scoredRiders = myPicks
      .map((p) => {
        const hit = srByRider.get(p.rider_id);
        if (!hit) return null;
        return { name: p.name || hit.name, position: hit.position, isJoker: myJokers.has(p.rider_id) };
      })
      .filter((x): x is { name: string; position: number; isJoker: boolean } => Boolean(x))
      .sort((a, b) => a.position - b.position);

    const teamName = e.team_name?.trim() || displayByUser.get(e.user_id)?.trim() || "Naamloze ploeg";
    return {
      user_id: e.user_id,
      display_name: teamName,
      team_name: e.team_name,
      entry_id: e.id,
      stagePoints,
      pointsBefore,
      pointsAfter,
      scoredRiders,
    };
  });
}

// ─── Anti-herhaling: openers van de vorige 2-3 etappes (één lichte query) ─────

async function fetchRecentOpeners(
  admin: ReturnType<typeof createClient>,
  gameId: string,
  stageNumber: number,
  subpouleId: string,
): Promise<{ michel: string[]; jose: string[] }> {
  try {
    const { data } = await admin
      .from("etappe_commentaren")
      .select("michel_tekst, jose_tekst, stages!inner(stage_number, game_id)")
      .eq("subpoule_id", subpouleId)
      .eq("stages.game_id", gameId)
      .lt("stages.stage_number", stageNumber);
    const opener = (t?: string | null) => (t ?? "").trim().split(/\s+/).slice(0, 6).join(" ");
    const rows = ((data ?? []) as any[])
      .map((r) => ({ m: opener(r.michel_tekst), j: opener(r.jose_tekst), n: r.stages?.stage_number ?? 0 }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3);
    return {
      michel: rows.map((r) => r.m).filter(Boolean),
      jose: rows.map((r) => r.j).filter(Boolean),
    };
  } catch {
    return { michel: [], jose: [] };
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Auth: admin-gebruiker óf de service-role (zelf-keten bij veel subpoules).
    const jwtRole = (() => {
      try {
        const payload = JSON.parse(atob(authHeader.slice(7).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload.role ?? "";
      } catch { return ""; }
    })();
    let callerUserId: string | null = null;
    if (jwtRole !== "service_role") {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
      callerUserId = userData.user.id;
      const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
        _user_id: callerUserId,
        _role: "admin",
      });
      if (roleErr || !isAdmin) return json({ error: "Forbidden — admin only" }, 403);
    }

    const body = await req.json() as { stage_id?: string; subpoule_id?: string; force?: boolean };
    const stageId = body.stage_id;
    if (!stageId || typeof stageId !== "string") return json({ error: "stage_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Etappe info
    const { data: stage, error: stageErr } = await admin
      .from("stages")
      .select("id, game_id, stage_number, name, stage_type, results_status")
      .eq("id", stageId)
      .single();
    if (stageErr || !stage) return json({ error: "stage not found" }, 404);
    if (stage.results_status !== "approved") {
      return json({ error: "stage not approved yet" }, 400);
    }

    // Bepaal of het de eerste of laatste etappe is
    const { data: allStagesInGame } = await admin
      .from("stages")
      .select("stage_number, results_status")
      .eq("game_id", stage.game_id)
      .order("stage_number");
    const stageNumbers = (allStagesInGame ?? []).map((s: any) => s.stage_number as number);
    const isFirstStage = stage.stage_number === Math.min(...stageNumbers);
    const isLastStage = stage.stage_number === Math.max(...stageNumbers);

    // Subpoules om voor te genereren
    let subpouleQuery = admin
      .from("subpoules")
      .select("id, name")
      .eq("game_id", stage.game_id);
    if (body.subpoule_id) subpouleQuery = subpouleQuery.eq("id", body.subpoule_id);
    const { data: subpoules, error: spErr } = await subpouleQuery;
    if (spErr) throw spErr;
    if (!subpoules || subpoules.length === 0) {
      return json({
        ok: true,
        generated: 0,
        skipped: 0,
        subpoules: 0,
        status: "0 subpoules — niets te genereren",
        message: "0 subpoules — niets te genereren",
      });
    }

    // force = alles opnieuw: wis bestaande commentaren éérst (één delete) en
    // werk daarna als niet-force. De bestaande rijen zijn de "cursor": een
    // tweede klik na een timeout maakt zo enkel de nog-lege subpoules af.
    if (body.force) {
      let del = admin.from("etappe_commentaren").delete().eq("stage_id", stageId);
      if (body.subpoule_id) del = del.eq("subpoule_id", body.subpoule_id);
      await del;
    }

    // Skip subpoules die al een commentaar hebben (de "cursor" van de keten).
    const existing = new Set<string>();
    {
      const { data: existRows } = await admin
        .from("etappe_commentaren")
        .select("subpoule_id")
        .eq("stage_id", stageId)
        .in("subpoule_id", subpoules.map((s: any) => s.id));
      for (const r of (existRows ?? []) as any[]) existing.add(r.subpoule_id);
    }

    const pending = (subpoules as Array<{ id: string; name: string }>).filter((sp) => !existing.has(sp.id));

    // Eén subpoule verwerken. Gooit bij een OpenAI-/DB-fout (→ door
    // Promise.allSettled als "fout" geteld); geeft "geen leden" terug wanneer de
    // subpoule geen leden met een ploeg heeft (gemarkeerd i.p.v. stil geskipt).
    type SubpouleRef = { id: string; name: string };
    async function generateOne(sp: SubpouleRef): Promise<"generated" | "geen leden"> {
      const members = await fetchSubpouleContext(admin, stageId, stage.game_id, stage.stage_number, sp.id);
      if (members.length === 0) return "geen leden";

      const recentOpeners = await fetchRecentOpeners(admin, stage.game_id, stage.stage_number, sp.id);
      const userPrompt = buildUserPrompt({
        subpouleNaam: sp.name,
        stageNumber: stage.stage_number,
        stageName: stage.name ?? null,
        stageType: (stage as any).stage_type ?? null,
        isFirstStage,
        isLastStage,
        members,
        recentMichelOpeners: recentOpeners.michel,
        recentJoseOpeners: recentOpeners.jose,
      });
      const result = await callOpenAI(userPrompt);

      const { error: upErr } = await admin
        .from("etappe_commentaren")
        .upsert(
          {
            stage_id: stageId,
            subpoule_id: sp.id,
            michel_tekst: result.michelWuyts,
            jose_tekst: result.joseDeCauwer,
            model: MODEL,
            generated_by: callerUserId,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "stage_id,subpoule_id" },
        );
      if (upErr) throw upErr;
      return "generated";
    }

    // Begrensde parallelle verwerking: chunks van 5 tegelijk (5 OpenAI-calls
    // parallel), doorgaan tot alles klaar is of het tijdbudget (130s, ruim onder
    // de 150s edge-limiet) op is. Bij een timeout maakt een tweede klik de rest
    // af — idempotent dankzij de skip-op-bestaande-rij hierboven.
    const CONCURRENCY = 5;
    const TIME_BUDGET_MS = 130_000;

    let generated = 0;
    let skipped = existing.size; // hadden al een rij (overgeslagen)
    const errors: Array<{ subpoule_id: string; error: string }> = [];
    const outcome = new Map<string, "generated" | "geen leden" | "fout">();
    let processed = 0;
    let timedOut = false;

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const chunk = pending.slice(i, i + CONCURRENCY);
      const settled = await Promise.allSettled(chunk.map((sp) => generateOne(sp)));
      settled.forEach((s, idx) => {
        const sp = chunk[idx];
        processed++;
        if (s.status === "fulfilled") {
          outcome.set(sp.id, s.value);
          if (s.value === "generated") generated++;
          else skipped++; // "geen leden"
        } else {
          outcome.set(sp.id, "fout");
          errors.push({ subpoule_id: sp.id, error: (s.reason as Error)?.message ?? String(s.reason) });
        }
      });
      if (Date.now() - startedAt > TIME_BUDGET_MS) { timedOut = true; break; }
    }

    const remaining = pending.length - processed;

    // Restlijst: elke subpoule die ná deze run nog geen rij heeft, met reden.
    const reason = (st: string | undefined): string =>
      st === "geen leden" ? "geen leden" : st === "fout" ? "OpenAI-fout" : "nog niet verwerkt";
    const emptySubpoules = pending
      .filter((sp) => outcome.get(sp.id) !== "generated")
      .map((sp) => ({ id: sp.id, name: sp.name, reason: reason(outcome.get(sp.id)) }));

    return json({
      ok: true,
      subpoules: subpoules.length,
      generated,
      skipped,
      remaining,
      timedOut,
      errors,
      emptySubpoules,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
