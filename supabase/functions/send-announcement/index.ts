// Stuurt een aangepast bericht naar alle deelnemers van een koers (of alle koersen).
// Admin-only. Filtert uitgeschreven adressen. Voegt persoonlijke uitschrijflink toe.
// Grote mailings gaan via de mail-wachtrij: deze functie zet ontvangers klaar in
// mail_queue en start process-mail-queue (zelf-herhalend) — zo is 10.000+ mails
// geen probleem met de edge-tijdslimiet en is alles hervatbaar.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildHtml, MAIL_WORKER, BASE_URL } from "../_shared/email.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
async function getOrCreateToken(admin: ReturnType<typeof createClient>, email: string): Promise<string> {
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .maybeSingle();
  if (existing?.token) return existing.token;

  const token = crypto.randomUUID().replace(/-/g, "");
  await admin.from("email_unsubscribe_tokens").insert({ token, email });
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const { subject, body, gameId, testEmail, dryRun, titleColor, titleSize } = await req.json() as {
      subject?: string;
      body?: string;
      gameId?: string;
      testEmail?: string;
      dryRun?: boolean;
      titleColor?: string;
      titleSize?: number;
    };

    const tColor = titleColor ?? "#c8102e";
    const tSize = titleSize ?? 24;

    // Test mail: stuur alleen naar testEmail, geen token/opt-out check
    if (testEmail) {
      const token = await getOrCreateToken(admin, testEmail);
      const unsubUrl = `${BASE_URL}/uitschrijven?token=${token}`;
      await fetch(MAIL_WORKER, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Worker-Secret": Deno.env.get("MAIL_WORKER_SECRET") ?? "" },
        body: JSON.stringify({
          to: testEmail,
          subject: `[TEST] ${subject ?? "Testmail Koerspoule"}`,
          html: buildHtml(body ?? "<p>Testmail</p>", unsubUrl, tColor, tSize),
        }),
      });
      return new Response(JSON.stringify({ sent: 1, total: 1 }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Alle gebruikers + emails ophalen (gepagineerd, zodat >1000 accounts werkt).
    const emailMap = new Map<string, string>();
    for (let page = 1; ; page += 1) {
      const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (usersErr) throw usersErr;
      for (const u of users ?? []) {
        if (u.email) emailMap.set(u.id, u.email);
      }
      if (!users || users.length < 1000) break;
    }

    let allEmails: string[];
    if (gameId) {
      // Specifieke koers → deelnemers met een inzending in die koers.
      const { data: entries, error: entriesErr } = await admin
        .from("entries").select("user_id").not("user_id", "is", null).eq("game_id", gameId);
      if (entriesErr) throw entriesErr;
      const userIds = [...new Set((entries ?? []).map((e: { user_id: string }) => e.user_id).filter(Boolean))];
      allEmails = userIds.map((id) => emailMap.get(id)).filter(Boolean) as string[];
    } else {
      // "Alle deelnemers" → ALLE geregistreerde accounts met een e-mailadres.
      allEmails = [...emailMap.values()];
    }

    // Haal uitgeschreven adressen op
    const { data: suppressed } = await admin.from("suppressed_emails").select("email");
    const suppressedSet = new Set((suppressed ?? []).map((s: { email: string }) => s.email.toLowerCase()));

    const recipients = allEmails.filter((e) => !suppressedSet.has(e.toLowerCase()));
    const suppressedCount = allEmails.length - recipients.length;

    if (dryRun) {
      return new Response(
        JSON.stringify({ recipients_count: recipients.length, suppressed_count: suppressedCount }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Uitschrijftokens VOORAF in bulk ophalen/aanmaken — scheelt een DB-roundtrip
    // per mail (was de grootste vertraging bij honderden ontvangers).
    const tokenByEmail = new Map<string, string>();
    for (let i = 0; i < recipients.length; i += 200) {
      const chunk = recipients.slice(i, i + 200);
      const { data: rows } = await admin.from("email_unsubscribe_tokens").select("email, token").in("email", chunk);
      for (const r of (rows ?? []) as Array<{ email: string; token: string }>) tokenByEmail.set(r.email, r.token);
    }
    const toCreate: Array<{ token: string; email: string }> = [];
    for (const email of recipients) {
      if (!tokenByEmail.has(email)) {
        const token = crypto.randomUUID().replace(/-/g, "");
        tokenByEmail.set(email, token);
        toCreate.push({ token, email });
      }
    }
    for (let i = 0; i < toCreate.length; i += 500) {
      await admin.from("email_unsubscribe_tokens").insert(toCreate.slice(i, i + 500));
    }

    // WACHTRIJ: campagne + ontvangers klaarzetten en de verwerker starten.
    // De verwerker (process-mail-queue) verstuurt in chunks en herhaalt zichzelf
    // tot alles verzonden is — geen edge-time-out, hervatbaar, nooit dubbel.
    const { data: campaign, error: campErr } = await admin
      .from("mail_campaigns")
      .insert({
        subject: subject ?? "Bericht van Koerspoule",
        body: body ?? "",
        title_color: tColor,
        title_size: tSize,
        total: recipients.length,
        created_by: user.id,
      } as never)
      .select("id")
      .single();
    if (campErr) throw campErr;
    const campaignId = (campaign as { id: string }).id;

    const queueRows = recipients.map((email) => ({
      campaign_id: campaignId,
      email,
      unsub_token: tokenByEmail.get(email)!,
    }));
    for (let i = 0; i < queueRows.length; i += 500) {
      const { error: qErr } = await admin.from("mail_queue").insert(queueRows.slice(i, i + 500) as never);
      if (qErr) throw qErr;
    }

    // Verwerker starten (fire-and-forget; keten houdt zichzelf in leven).
    fetch(`${supabaseUrl}/functions/v1/process-mail-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: "{}",
    }).catch(() => undefined);

    return new Response(
      JSON.stringify({ enqueued: recipients.length, campaign_id: campaignId, suppressed: suppressedCount }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
