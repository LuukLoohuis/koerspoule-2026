// Bouwt het SES v2-verzoek. Los van de Worker zodat de vorm van het bericht
// getest kan worden zonder AWS aan te roepen.

export type MailVerzoek = {
  to: string;
  subject: string;
  html: string;
  /** Optioneel: komt als List-Unsubscribe-header mee. */
  listUnsubscribe?: string;
};

export type SesConfig = {
  region: string;
  from: string;
  replyTo?: string;
  configurationSet?: string;
};

export const sesHost = (region: string) => `email.${region}.amazonaws.com`;
export const SES_PATH = "/v2/email/outbound-emails";

/** Grenzen die we zelf bewaken; SES weigert anders pas ná de netwerkronde. */
export function valideer(body: unknown): { ok: true; verzoek: MailVerzoek } | { ok: false; fout: string } {
  const b = body as Partial<MailVerzoek> | null;
  if (!b || typeof b !== "object") return { ok: false, fout: "body must be an object" };
  if (typeof b.to !== "string" || !b.to.includes("@") || b.to.length > 320) {
    return { ok: false, fout: "to must be a valid address" };
  }
  if (typeof b.subject !== "string" || !b.subject || b.subject.length > 300) {
    return { ok: false, fout: "subject must be 1-300 chars" };
  }
  if (typeof b.html !== "string" || !b.html || b.html.length > 200_000) {
    return { ok: false, fout: "html must be 1-200000 chars" };
  }
  if (b.listUnsubscribe !== undefined && typeof b.listUnsubscribe !== "string") {
    return { ok: false, fout: "listUnsubscribe must be a string" };
  }
  // Kop- en headerinjectie: een nieuwe regel in het onderwerp kan bij SMTP een
  // extra header worden. SES v2 codeert netjes, maar we laten het niet aankomen.
  if (/[\r\n]/.test(b.subject) || /[\r\n]/.test(b.to)) {
    return { ok: false, fout: "newlines not allowed in to/subject" };
  }
  return { ok: true, verzoek: b as MailVerzoek };
}

export function sesBody(v: MailVerzoek, cfg: SesConfig): string {
  const headers: Array<{ Name: string; Value: string }> = [];
  if (v.listUnsubscribe) {
    // Alleen de URL-vorm, zonder List-Unsubscribe-Post: onze uitschrijfpagina
    // is een gewone pagina en geen POST-endpoint, dus one-click zou stukgaan.
    headers.push({ Name: "List-Unsubscribe", Value: `<${v.listUnsubscribe}>` });
  }
  return JSON.stringify({
    FromEmailAddress: cfg.from,
    Destination: { ToAddresses: [v.to] },
    ...(cfg.replyTo ? { ReplyToAddresses: [cfg.replyTo] } : {}),
    ...(cfg.configurationSet ? { ConfigurationSetName: cfg.configurationSet } : {}),
    Content: {
      Simple: {
        Subject: { Data: v.subject, Charset: "UTF-8" },
        Body: { Html: { Data: v.html, Charset: "UTF-8" } },
        ...(headers.length ? { Headers: headers } : {}),
      },
    },
  });
}
