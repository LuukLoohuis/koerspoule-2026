// Vangt bounce- en klachtmeldingen van Resend op en zet die adressen op de
// onderdrukkingslijst. Zonder dit blijven dode adressen in elke volgende
// mailing zitten, en juist het bouncepercentage bepaalt of Gmail en Outlook je
// nog in de inbox laten landen.
//
// Dit endpoint staat open (verify_jwt = false), want Resend stuurt geen
// Supabase-token mee. De Svix-handtekening is daarmee de énige poort: zonder
// geldige handtekening kan iedereen die de URL kent willekeurige adressen laten
// blokkeren. Ontbreekt het secret, dan weigeren we alles -- dicht bij twijfel.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handtekeningKlopt, bepaalOnderdrukking, ontvangersUit } from "../_shared/webhook.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, svix-id, svix-timestamp, svix-signature",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type ResendEvent = {
  type?: string;
  data?: {
    to?: string[] | string;
    email_id?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET ontbreekt — melding geweigerd");
    return json({ error: "Not configured" }, 500);
  }

  // Body als tekst lezen: de handtekening geldt over de ruwe bytes, dus eerst
  // controleren en pas daarna parsen.
  const ruweBody = await req.text();
  const geldig = await handtekeningKlopt(secret, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  }, ruweBody);
  if (!geldig) return json({ error: "Invalid signature" }, 401);

  let event: ResendEvent;
  try {
    event = JSON.parse(ruweBody) as ResendEvent;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const type = event.type ?? "";
  const reason = bepaalOnderdrukking(type, event.data?.bounce?.type);
  if (!reason) return json({ ok: true, skipped: type, bounce_type: event.data?.bounce?.type ?? null });

  const ontvangers = ontvangersUit(event.data?.to);
  if (ontvangers.length === 0) return json({ ok: true, skipped: "geen ontvanger in melding" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.from("suppressed_emails").upsert(
    ontvangers.map((email) => ({
      email,
      reason,
      metadata: {
        event: type,
        email_id: event.data?.email_id ?? null,
        subject: event.data?.subject ?? null,
        bounce_type: event.data?.bounce?.type ?? null,
        bounce_subtype: event.data?.bounce?.subType ?? null,
        bounce_message: event.data?.bounce?.message ?? null,
        ontvangen_op: new Date().toISOString(),
      },
    })) as never,
    { onConflict: "email", ignoreDuplicates: true },
  );

  if (error) {
    console.error("onderdrukken mislukt", error.message);
    // 500 → Resend biedt de melding later opnieuw aan. Beter dan stil verliezen.
    return json({ error: error.message }, 500);
  }

  console.log(`onderdrukt (${reason}): ${ontvangers.join(", ")}`);
  return json({ ok: true, suppressed: ontvangers.length, reason });
});
