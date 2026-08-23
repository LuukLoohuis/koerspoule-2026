// Welke aanbieder en welk model de tekst schrijft.
//
// Gedeeld tussen de generatoren zodat er niet per functie een eigen kopie
// ontstaat die stilletjes uit de pas gaat lopen. DeepSeek spreekt de
// OpenAI-vorm, maar niet helemaal: het kent max_completion_tokens en
// reasoning_effort niet. Vandaar per aanbieder een eigen body in plaats van
// een gedeelde met optionele velden -- die zou de verkeerde kant op vallen
// zonder dat je het merkt.

export type Aanbieder = {
  naam: "openai" | "deepseek";
  url: string;
  model: string;
  sleutelNaam: string;
  isDeepSeek: boolean;
};

export function kiesAanbieder(override?: string | null, modelOverride?: string | null): Aanbieder {
  const naam = (override || Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();
  const isDeepSeek = naam === "deepseek";
  return {
    naam: isDeepSeek ? "deepseek" : "openai",
    isDeepSeek,
    url: isDeepSeek
      ? "https://api.deepseek.com/chat/completions"
      : "https://api.openai.com/v1/chat/completions",
    model: modelOverride?.trim() || (isDeepSeek
      ? (Deno.env.get("DEEPSEEK_MODEL") || "deepseek-v4-flash")
      : (Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini")),
    sleutelNaam: isDeepSeek ? "DEEPSEEK_API_KEY" : "OPENAI_API_KEY",
  };
}

export type ChatOpties = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  /** Alleen OpenAI; DeepSeek kent deze parameter niet. */
  reasoning?: string;
  /** Alleen DeepSeek; de GPT-5-modellen accepteren temperature niet. */
  temperatuur?: number;
  jsonModus?: boolean;
};

export async function chat(
  ai: Aanbieder,
  o: ChatOpties,
): Promise<{ text: string; finishReason: string | null; usage: unknown }> {
  const apiKey = Deno.env.get(ai.sleutelNaam);
  if (!apiKey) throw new Error(`${ai.sleutelNaam} niet ingesteld in env`);

  const jsonModus = o.jsonModus !== false;
  // DeepSeek's JSON-modus werkt alleen als het woord "json" in de prompt staat;
  // anders krijg je stilte tot de tokenlimiet. Liever hier een duidelijke fout.
  if (ai.isDeepSeek && jsonModus && !/json/i.test(o.systemPrompt + o.userPrompt)) {
    throw new Error("DeepSeek JSON-modus vereist het woord 'json' in de prompt");
  }

  const messages = [
    { role: "system", content: o.systemPrompt },
    { role: "user", content: o.userPrompt },
  ];
  const format = jsonModus ? { response_format: { type: "json_object" } } : {};

  const body: Record<string, unknown> = ai.isDeepSeek
    ? { model: ai.model, max_tokens: o.maxTokens, temperature: o.temperatuur ?? 1.0, ...format, messages }
    : {
        model: ai.model,
        max_completion_tokens: o.maxTokens,
        ...(o.reasoning ? { reasoning_effort: o.reasoning } : {}),
        ...format,
        messages,
      };

  const verstuur = (payload: unknown) =>
    fetch(ai.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  let res = await verstuur(body);

  // Niet elk model kent reasoning_effort. Wissel je van model, dan zou elke
  // aanroep stuklopen op een 400; eenmalig opnieuw zonder die parameter.
  if (!res.ok && !ai.isDeepSeek && body.reasoning_effort) {
    const fout = await res.clone().text();
    if (/reasoning_effort|unsupported|not supported|does not support|unknown parameter/i.test(fout)) {
      const { reasoning_effort: _weg, ...zonder } = body;
      console.warn(`${ai.model} weigert reasoning_effort — opnieuw zonder`);
      res = await verstuur(zonder);
    }
  }
  if (!res.ok) throw new Error(`${ai.naam} API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return {
    text: typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content : "",
    finishReason: data?.choices?.[0]?.finish_reason ?? null,
    usage: data?.usage,
  };
}
