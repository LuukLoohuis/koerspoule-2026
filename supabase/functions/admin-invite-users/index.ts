import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Niet ingelogd" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Niet ingelogd" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdminRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!isAdminRow) return json({ error: "Geen admin rechten" }, 403);

    const body = await req.json().catch(() => ({}));
    const emailsRaw: unknown = body?.emails;
    if (!Array.isArray(emailsRaw)) return json({ error: "emails ontbreekt" }, 400);

    const redirectTo: string | undefined = typeof body?.redirect_to === "string" ? body.redirect_to : undefined;

    const emails = Array.from(new Set(
      emailsRaw
        .map((e) => String(e ?? "").trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    ));

    const results: { email: string; status: "invited" | "exists" | "error"; message?: string }[] = [];
    let invited = 0, skipped = 0, errors = 0;

    for (const email of emails) {
      try {
        const { error } = await admin.auth.admin.inviteUserByEmail(email, redirectTo ? { redirectTo } : undefined);
        if (error) {
          const msg = String(error.message ?? "").toLowerCase();
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            results.push({ email, status: "exists" });
            skipped++;
          } else {
            results.push({ email, status: "error", message: error.message });
            errors++;
          }
        } else {
          results.push({ email, status: "invited" });
          invited++;
        }
      } catch (e: any) {
        results.push({ email, status: "error", message: e?.message ?? "fout" });
        errors++;
      }
    }

    return json({ ok: true, total: emails.length, invited, skipped, errors, results });
  } catch (e: any) {
    return json({ error: e?.message ?? "Onbekende fout" }, 500);
  }
});
