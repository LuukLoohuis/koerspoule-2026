// Cloudflare Worker: enige plek die de mailprovider kent.
//
// Alle afzenders in de app (send-mail, process-mail-queue, send-announcement)
// posten hetzelfde {to, subject, html} met een X-Worker-Secret. Door de
// provider hier te isoleren kon Resend vervangen worden door Amazon SES zonder
// dat er iets aan de Supabase-kant wijzigde.
//
// Antwoordvorm blijft gelijk aan die van de vorige versie: 2xx bij succes,
// 429 bij throttling (de wachtrij herkent dat en probeert opnieuw).

import { sigV4Headers, amzDatum } from "./sigv4";
import { valideer, sesBody, sesHost, SES_PATH, type SesConfig } from "./ses";

type Env = {
  WORKER_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION?: string;
  MAIL_FROM?: string;
  MAIL_REPLY_TO?: string;
  SES_CONFIGURATION_SET?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Vergelijking zonder tijdlek, zodat het secret niet byte voor byte te raden is. */
function veiligGelijk(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    if (!env.WORKER_SECRET || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      console.error("Worker mist secrets");
      return json({ error: "Not configured" }, 500);
    }
    const aangeboden = req.headers.get("X-Worker-Secret") ?? "";
    if (!veiligGelijk(aangeboden, env.WORKER_SECRET)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const gelezen = await req.json().catch(() => null);
    const check = valideer(gelezen);
    if (!check.ok) return json({ error: check.fout }, 400);

    const region = env.AWS_REGION ?? "eu-north-1";
    const cfg: SesConfig = {
      region,
      from: env.MAIL_FROM ?? "Koerspoule <noreply@koerspoule.nl>",
      replyTo: env.MAIL_REPLY_TO,
      configurationSet: env.SES_CONFIGURATION_SET,
    };

    const host = sesHost(region);
    const body = sesBody(check.verzoek, cfg);
    const headers = await sigV4Headers({
      method: "POST",
      path: SES_PATH,
      headers: { host, "content-type": "application/json" },
      body,
      region,
      service: "ses",
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      amzDate: amzDatum(),
    });

    const res = await fetch(`https://${host}${SES_PATH}`, {
      method: "POST",
      headers: { ...headers, host, "content-type": "application/json" },
      body,
    });

    const tekst = await res.text();
    if (res.ok) {
      let id: string | null = null;
      try { id = (JSON.parse(tekst) as { MessageId?: string }).MessageId ?? null; } catch { /* leeg */ }
      return json({ ok: true, id });
    }

    // SES throttlet met 429 of met een Throttling-foutcode in het antwoord.
    // Beide vertalen we naar 429, want daar wacht de wachtrij al op.
    const throttled = res.status === 429 || /Throttling|TooManyRequests|Throttled/i.test(tekst);
    console.error(`SES ${res.status}: ${tekst.slice(0, 500)}`);
    return json({ error: tekst.slice(0, 500) }, throttled ? 429 : res.status);
  },
};
