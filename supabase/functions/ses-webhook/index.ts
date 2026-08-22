// Vangt bounce- en klachtmeldingen van Amazon SES op (via SNS) en zet die
// adressen op de onderdrukkingslijst. Zonder dit blijven dode adressen in elke
// volgende mailing zitten. Bij SES is dat geen schoonheidsfoutje: AWS schorst
// het account boven ongeveer 5% bounces of 0,1% klachten.
//
// Dit endpoint staat open (verify_jwt = false), want SNS stuurt geen
// Supabase-token mee. De poort bestaat daarom uit drie sloten die allemaal
// dicht moeten zijn:
//   1. een gedeeld geheim in de query (?token=), dat alleen in de
//      SNS-abonnements-URL staat;
//   2. de TopicArn moet exact ons eigen topic zijn;
//   3. SigningCertURL en SubscribeURL moeten op een echte
//      sns.<regio>.amazonaws.com staan.
//
// Wat hier NIET gebeurt is de RSA-controle van de SNS-handtekening zelf. Dat
// vraagt om X.509-parsing die niet te testen valt zonder live SNS, en een
// half-werkende controle is gevaarlijker dan een eerlijke. De drie sloten
// hierboven vragen om een geheim dat niet publiek is; wie dat heeft, kan
// hooguit adressen laten onderdrukken -- niet lezen en niet versturen.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  certUrlVertrouwd,
  topicVertrouwd,
  bepaalOnderdrukking,
  ontvangersUit,
  type SnsEnvelope,
  type SesEvent,
} from "../_shared/sns.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Vergelijking zonder tijdlek. */
function veiligGelijk(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const geheim = Deno.env.get("SES_WEBHOOK_SECRET");
  const topic = Deno.env.get("SES_TOPIC_ARN");
  if (!geheim || !topic) {
    console.error("SES_WEBHOOK_SECRET of SES_TOPIC_ARN ontbreekt — melding geweigerd");
    return json({ error: "Not configured" }, 500);
  }
  if (!veiligGelijk(new URL(req.url).searchParams.get("token") ?? "", geheim)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(await req.text()) as SnsEnvelope;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!topicVertrouwd(envelope.TopicArn, topic)) return json({ error: "Unknown topic" }, 401);
  if (!certUrlVertrouwd(envelope.SigningCertURL)) return json({ error: "Untrusted cert url" }, 401);

  // SNS bevestigt een nieuw abonnement door een URL te sturen die je moet
  // ophalen. Pas ná de topic- en certificaatcontrole, anders bevestigen we
  // ongezien wat een vreemde ons voorschotelt.
  if (envelope.Type === "SubscriptionConfirmation") {
    if (!certUrlVertrouwd(envelope.SubscribeURL)) {
      return json({ error: "Untrusted subscribe url" }, 401);
    }
    const res = await fetch(envelope.SubscribeURL!);
    console.log(`SNS-abonnement bevestigd: HTTP ${res.status}`);
    return json({ ok: true, confirmed: res.ok });
  }

  let event: SesEvent;
  try {
    event = JSON.parse(envelope.Message ?? "{}") as SesEvent;
  } catch {
    return json({ error: "Invalid SNS Message" }, 400);
  }

  const reason = bepaalOnderdrukking(event);
  const type = event.eventType ?? event.notificationType ?? "onbekend";
  if (!reason) return json({ ok: true, skipped: type, bounce_type: event.bounce?.bounceType ?? null });

  const ontvangers = ontvangersUit(event);
  if (ontvangers.length === 0) return json({ ok: true, skipped: "geen ontvanger in melding" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.from("suppressed_emails").upsert(
    ontvangers.map((email) => ({
      email,
      reason,
      metadata: {
        bron: "ses",
        event: type,
        message_id: event.mail?.messageId ?? null,
        subject: event.mail?.commonHeaders?.subject ?? null,
        bounce_type: event.bounce?.bounceType ?? null,
        bounce_subtype: event.bounce?.bounceSubType ?? null,
        bounce_message: event.bounce?.bouncedRecipients?.[0]?.diagnosticCode ?? null,
        complaint_type: event.complaint?.complaintFeedbackType ?? null,
        ontvangen_op: new Date().toISOString(),
      },
    })) as never,
    { onConflict: "email", ignoreDuplicates: true },
  );

  if (error) {
    console.error("onderdrukken mislukt", error.message);
    // 500 → SNS biedt de melding later opnieuw aan. Beter dan stil verliezen.
    return json({ error: error.message }, 500);
  }

  console.log(`onderdrukt (${reason}): ${ontvangers.join(", ")}`);
  return json({ ok: true, suppressed: ontvangers.length, reason });
});
