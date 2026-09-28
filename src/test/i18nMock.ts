import nl from "@/i18n/locales/nl.json";

/**
 * Een t() voor componenttests: leest de echte Nederlandse sleutels, kent de
 * meervoudsvormen (_one/_other op count) en de context (_mm) en vult
 * {{variabelen}} in. Een ontbrekende sleutel gooit, zodat een typfout in een
 * sleutel de test breekt in plaats van stil een sleutelnaam op het scherm te
 * zetten.
 */
export function maakT() {
  const zoek = (sleutel: string): unknown =>
    sleutel.split(".").reduce<unknown>((n, d) => (n as Record<string, unknown> | undefined)?.[d], nl);
  const vorm = (sleutel: string, opties?: Record<string, unknown>): unknown => {
    let tekst = zoek(sleutel);
    if (typeof tekst !== "string" && opties && typeof opties.count === "number") {
      tekst = zoek(`${sleutel}_${opties.count === 1 ? "one" : "other"}`);
    }
    return tekst;
  };
  return (sleutel: string, opties?: Record<string, unknown>): string => {
    // Zoals i18next: met een context eerst sleutel_context, anders de gewone.
    const context = typeof opties?.context === "string" && opties.context ? opties.context : null;
    let tekst = context ? vorm(`${sleutel}_${context}`, opties) : undefined;
    if (typeof tekst !== "string") tekst = vorm(sleutel, opties);
    if (typeof tekst !== "string") throw new Error(`vertaalsleutel ontbreekt: ${sleutel}`);
    return tekst.replace(/\{\{(\w+)\}\}/g, (_, naam: string) => String(opties?.[naam] ?? ""));
  };
}
