// Ontleding van SES-meldingen die via Amazon SNS binnenkomen.
//
// Los van de edge function gehouden om dezelfde reden als _shared/webhook.ts:
// hier staat geen npm:-import in, zodat de testsuite in src/ deze code echt
// kan uitvoeren. Dit is de enige plek die bepaalt of een adres definitief van
// de lijst gaat, en suppressed_emails is append-only -- een onterechte
// blokkade krijg je vanuit de app niet meer terug.

export type SnsEnvelope = {
  Type?: string;
  TopicArn?: string;
  Message?: string;
  SubscribeURL?: string;
  SigningCertURL?: string;
};

export type SesEvent = {
  eventType?: string;
  notificationType?: string;
  mail?: { messageId?: string; destination?: string[]; commonHeaders?: { subject?: string } };
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: Array<{ emailAddress?: string; diagnosticCode?: string }>;
  };
  complaint?: {
    complaintFeedbackType?: string;
    complainedRecipients?: Array<{ emailAddress?: string }>;
  };
};

/**
 * SNS wijst naar het certificaat waarmee een melding ondertekend is. Die URL
 * komt uit het bericht zelf, dus zonder controle kan iemand ons naar zijn
 * eigen certificaat sturen en elke melding laten kloppen.
 */
export function certUrlVertrouwd(url: string | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== "https:") return false;
  return /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(u.hostname);
}

/** Alleen meldingen van ons eigen topic tellen mee. */
export function topicVertrouwd(arn: string | undefined, verwacht: string | undefined): boolean {
  if (!verwacht) return false;
  return typeof arn === "string" && arn === verwacht;
}

/**
 * Bepaalt of een SES-melding tot onderdrukking leidt.
 *
 * Bewust streng, net als bij Resend: een Transient bounce -- volle mailbox,
 * server even plat -- laten we staan. Undetermined ook: dan wéten we het niet,
 * en bij twijfel blokkeren we niet.
 */
export function bepaalOnderdrukking(ev: SesEvent): "bounce" | "complaint" | null {
  const type = (ev.eventType ?? ev.notificationType ?? "").toLowerCase();
  if (type === "complaint") return "complaint";
  if (type === "bounce" && (ev.bounce?.bounceType ?? "").toLowerCase() === "permanent") return "bounce";
  return null;
}

/** Haalt de geraakte adressen uit de melding, genormaliseerd en ontdubbeld. */
export function ontvangersUit(ev: SesEvent): string[] {
  const ruw = [
    ...(ev.bounce?.bouncedRecipients ?? []).map((r) => r.emailAddress),
    ...(ev.complaint?.complainedRecipients ?? []).map((r) => r.emailAddress),
  ];
  // Valt terug op mail.destination: bij sommige klachten noemt de provider de
  // klager niet, om te voorkomen dat je 'm gericht kunt benaderen.
  const lijst = ruw.some(Boolean) ? ruw : (ev.mail?.destination ?? []);
  return [...new Set(
    lijst
      .filter((e): e is string => typeof e === "string" && e.includes("@"))
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )];
}
