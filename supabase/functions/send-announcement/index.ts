// Stuurt een aangepast bericht naar alle deelnemers van een koers (of alle koersen).
// Admin-only. Filtert uitgeschreven adressen. Voegt persoonlijke uitschrijflink toe.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAIL_WORKER = "https://koerspoule-mail.luuk-loohuis.workers.dev";
const BASE_URL = "https://koerspoule.nl";
const HEADER_IMG = "https://uqjrzozttkbjrdvzeroc.supabase.co/storage/v1/object/public/mailbanner/koerspoule_header_afbeelding.png";
const FOOTER_IMG = "https://uqjrzozttkbjrdvzeroc.supabase.co/storage/v1/object/public/mailbanner/koerspoule_footer_strip.png";

function buildHtml(
  body: string,
  unsubscribeUrl: string,
  _titleColor = "#1a1a1a",
  _titleSize = 11
): string {
  return `<!doctype html>
<html lang="nl" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/><title>Koerspoule Communiqué</title></head>
<body style="margin:0;padding:0;background-color:#e9e3d6;">
  <center style="width:100%;background-color:#e9e3d6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background-color:#e9e3d6;margin:0;padding:0;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;margin:0 auto;background-color:#F4F1EA;">
          <!-- Header-afbeelding -->
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:#F4F1EA;">
            <img src="${HEADER_IMG}" alt="Koerspoule header" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;" />
          </td></tr>

          <!-- Content: bericht, CTA, signature, social, uitschrijven — één doorlopende crème-kolom -->
          <tr><td style="padding:18px 42px 20px 42px;background-color:#F4F1EA;font-family:Georgia,'Times New Roman',serif;color:#2f2a24;">
              <div style="margin:0 0 10px 0;font-size:28px;line-height:34px;font-weight:bold;color:#211d19;">
                Beste deelnemer,
              </div>
              <div style="margin:0 0 18px 0;font-size:18px;line-height:30px;color:#3d362e;">
                ${body}
              </div>
              <div style="text-align:center;margin:20px 0 22px 0;">
                <a href="${BASE_URL}" target="_blank" style="display:inline-block;padding:13px 26px;background-color:#d4a62b;color:#1d1916;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;border-radius:6px;">
                  Ga naar Koerspoule
                </a>
              </div>
              <div style="margin:0;font-size:18px;line-height:30px;color:#3d362e;">
                Veel koersplezier,<br>
                <strong>Het Koerspoule team</strong>
              </div>
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #d8c89d;text-align:center;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2b;margin-bottom:10px;">
                  Volg Koerspoule
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:bold;">
                  <a href="https://instagram.com/koerspoule" target="_blank" style="color:#2b241d;text-decoration:none;">
                    Instagram → @koerspoule
                  </a>
                </div>
                <div style="margin-top:10px;font-size:15px;line-height:24px;color:#655847;">
                  Blijf op de hoogte van updates, standen en koerssfeer.
                </div>
                <div style="margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#9a8f7c;">
                  <a href="${BASE_URL}" style="color:#9a8f7c;text-decoration:none;">koerspoule.nl</a>
                  &nbsp;·&nbsp;
                  <a href="${unsubscribeUrl}" style="color:#9a8f7c;text-decoration:underline;">uitschrijven</a>
                </div>
              </div>
          </td></tr>

          <!-- Footer-afbeelding -->
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:#F4F1EA;">
            <img src="${FOOTER_IMG}" alt="Koerspoule footer" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;" />
          </td></tr>
        </table>
      </td></tr>
    </table>
  </center>
</body></html>`;
}

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

    // Haal deelnemers op (uniek per user_id)
    let entriesQuery = admin.from("entries").select("user_id").not("user_id", "is", null);
    if (gameId) entriesQuery = entriesQuery.eq("game_id", gameId);
    const { data: entries, error: entriesErr } = await entriesQuery;
    if (entriesErr) throw entriesErr;

    const userIds = [...new Set((entries ?? []).map((e: { user_id: string }) => e.user_id).filter(Boolean))];

    // Haal emails op via auth.users
    const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw usersErr;

    const emailMap = new Map<string, string>();
    for (const u of users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    const allEmails = userIds.map((id) => emailMap.get(id)).filter(Boolean) as string[];

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

    // Verstuur
    let sent = 0;
    const errors: string[] = [];

    await Promise.allSettled(
      recipients.map(async (email) => {
        try {
          const token = await getOrCreateToken(admin, email);
          const unsubUrl = `${BASE_URL}/uitschrijven?token=${token}`;
          const res = await fetch(MAIL_WORKER, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Worker-Secret": Deno.env.get("MAIL_WORKER_SECRET") ?? "" },
            body: JSON.stringify({
              to: email,
              subject: subject ?? "Bericht van Koerspoule",
              html: buildHtml(body ?? "", unsubUrl, tColor, tSize),
            }),
          });
          if (res.ok) sent++;
          else errors.push(`${email}: HTTP ${res.status}`);
        } catch (e) {
          errors.push(`${email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      })
    );

    return new Response(
      JSON.stringify({ sent, total: recipients.length, suppressed: suppressedCount, errors: errors.slice(0, 10) }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
