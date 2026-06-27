// Edge Function: admin-confirm-email
// POST { user_id: string }
// Bevestigt handmatig het e-mailadres van een gebruiker (als de bevestigingsmail
// niet aankwam). Admin-only; gebruikt de Auth Admin API (service_role).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const body = await req.json();
    const target = String(body?.user_id ?? "");
    if (!target) return json({ error: "user_id ontbreekt" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Caller moet admin zijn.
    const { data: isAdminRow, error: roleErr } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (roleErr || !isAdminRow) return json({ error: "Geen admin rechten" }, 403);

    // Auth Admin API: markeer e-mail als bevestigd.
    const { data, error } = await admin.auth.admin.updateUserById(target, { email_confirm: true });
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, email: data?.user?.email ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
