// AWS Signature Version 4 voor de SES v2 HTTPS-API.
//
// Apart gehouden van de Worker zelf zodat de testsuite dit tegen de officiële
// AWS-testvectoren kan draaien. Een fout in de ondertekening levert namelijk
// geen half werkend systeem op maar een botte 403 op élke mail, en dat wil je
// niet pas ontdekken op de avond dat er 3000 uitmoeten.

const enc = new TextEncoder();

const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(data: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(data)));
}

// TypeScript ziet Uint8Array sinds 5.7 als generiek over ArrayBufferLike, en
// crypto.subtle wil een echte ArrayBuffer. Een kopie van precies dit venster
// levert er een, ook als de array een deel van een grotere buffer is.
const rauw = (k: Uint8Array): ArrayBuffer =>
  k.buffer.slice(k.byteOffset, k.byteOffset + k.byteLength) as ArrayBuffer;

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", rauw(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

/** kSecret → kDate → kRegion → kService → kSigning. */
export async function signingKey(
  secret: string,
  datum: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  let k = await hmac(enc.encode(`AWS4${secret}`), datum);
  k = await hmac(k, region);
  k = await hmac(k, service);
  return await hmac(k, "aws4_request");
}

export type SignInput = {
  method: string;
  /** Al ge-escapet pad, bv. "/v2/email/outbound-emails". */
  path: string;
  /** Canonieke querystring (leeg als er geen query is). */
  query?: string;
  /** Headers die meegetekend worden; namen worden lowercase gesorteerd. */
  headers: Record<string, string>;
  body: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** ISO-basic tijdstempel, bv. "20260822T123600Z". */
  amzDate: string;
  /** Alleen voor tijdelijke STS-credentials. */
  sessionToken?: string;
};

/**
 * Levert de headers die je aan het verzoek moet toevoegen: Authorization plus
 * x-amz-date (en x-amz-security-token bij tijdelijke sleutels).
 *
 * De canonieke headerlijst wordt afgeleid van `headers`, dus wat je hier
 * meegeeft moet exact overeenkomen met wat je daadwerkelijk meestuurt. Eén
 * header die het verzoek wél haalt maar niet in de handtekening zit is genoeg
 * voor een 403.
 */
export async function sigV4Headers(input: SignInput): Promise<Record<string, string>> {
  const { method, path, query = "", body, region, service, accessKeyId, secretAccessKey, amzDate } = input;
  const datum = amzDate.slice(0, 8);

  const headers: Record<string, string> = { ...input.headers, "x-amz-date": amzDate };
  if (input.sessionToken) headers["x-amz-security-token"] = input.sessionToken;

  // Canonieke headers: lowercase naam, getrimde waarde, gesorteerd op naam.
  const genormaliseerd = Object.entries(headers)
    .map(([k, v]) => [k.toLowerCase(), v.trim().replace(/\s+/g, " ")] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const signedHeaders = genormaliseerd.map(([k]) => k).join(";");
  const canonicalHeaders = genormaliseerd.map(([k, v]) => `${k}:${v}\n`).join("");

  const payloadHash = await sha256Hex(body);
  const canonicalRequest = [
    method,
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${datum}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const key = await signingKey(secretAccessKey, datum, region, service);
  const signature = hex(await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", rauw(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    enc.encode(stringToSign),
  ));

  return {
    ...(input.sessionToken ? { "x-amz-security-token": input.sessionToken } : {}),
    "x-amz-date": amzDate,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/** Date → "20260822T123600Z". */
export function amzDatum(d: Date = new Date()): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
