// Handtekeningcontrole en onderdrukkingsbeslissing voor de Resend-webhook.
//
// Apart van de edge function gehouden omdat dit de enige poort is die dat
// open endpoint bewaakt: hier staat geen npm:-import in, zodat de testsuite in
// src/ deze code echt kan uitvoeren in plaats van hem op zijn woord te geloven.

/** Vergelijking zonder tijdlek: altijd alle bytes langs. */
export function veiligGelijk(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

const naarB64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const vanB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/**
 * Controleert een Svix-handtekening, het schema dat Resend gebruikt.
 *
 * Ondertekend wordt "<id>.<timestamp>.<body>" over de RUWE body. Vandaar dat de
 * aanroeper req.text() moet doorgeven en niet een opnieuw geserialiseerd
 * object: `JSON.stringify` haalt spaties weg en dan klopt de HMAC niet meer.
 *
 * De header mag meerdere handtekeningen bevatten (sleutelrotatie); één treffer
 * is genoeg.
 */
export async function handtekeningKlopt(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  ruweBody: string,
  nu: number = Date.now(),
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Replay tegenhouden: meldingen ouder dan vijf minuten tellen niet meer.
  const leeftijd = Math.abs(nu / 1000 - Number(timestamp));
  if (!Number.isFinite(leeftijd) || leeftijd > 300) return false;

  let sleutel: CryptoKey;
  try {
    sleutel = await crypto.subtle.importKey(
      "raw",
      vanB64(secret.replace(/^whsec_/, "")),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    return false;
  }

  const verwacht = vanB64(naarB64(
    await crypto.subtle.sign("HMAC", sleutel, new TextEncoder().encode(`${id}.${timestamp}.${ruweBody}`)),
  ));

  for (const deel of signature.split(" ")) {
    const [versie, waarde] = deel.split(",");
    if (versie !== "v1" || !waarde) continue;
    try {
      if (veiligGelijk(verwacht, vanB64(waarde))) return true;
    } catch { /* onleesbare handtekening → volgende proberen */ }
  }
  return false;
}

/**
 * Bepaalt of een Resend-melding tot onderdrukking leidt.
 *
 * Bewust streng: suppressed_emails is append-only (geen DELETE- of
 * UPDATE-policy), dus een onterechte blokkade is niet meer terug te draaien
 * vanuit de app. Een tijdelijke bounce -- volle mailbox, server even plat --
 * laten we daarom staan; dat adres werkt volgende week gewoon weer.
 */
export function bepaalOnderdrukking(type: string, bounceType?: string | null): "bounce" | "complaint" | null {
  if (type === "email.complained") return "complaint";
  if (type === "email.bounced" && (bounceType ?? "").toLowerCase() === "permanent") return "bounce";
  return null;
}

/** Haalt de geldige ontvangers uit een melding, genormaliseerd. */
export function ontvangersUit(to: string[] | string | undefined): string[] {
  const lijst = Array.isArray(to) ? to : [to];
  return [...new Set(
    lijst
      .filter((e): e is string => typeof e === "string" && e.includes("@"))
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )];
}
