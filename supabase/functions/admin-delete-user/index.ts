import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // user-context client to verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const target = String(body?.user_id ?? "");
    if (!target) {
      return new Response(JSON.stringify({ error: "user_id ontbreekt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (target === userData.user.id) {
      return new Response(JSON.stringify({ error: "Je kunt jezelf niet verwijderen" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // verify caller is admin via has_role
    const { data: isAdminRow, error: roleErr } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (roleErr || !isAdminRow) {
      return new Response(JSON.stringify({ error: "Geen admin rechten" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) cleanup public-schema data via RPC (uses SECURITY DEFINER, but we already verified admin)
    //    we call as service role so is_admin() returns false - so we do cleanup directly here.
    const tables_entry_children = ["entry_picks","entry_jokers","entry_predictions","entry_prediction_points","stage_points","total_points"];
    const { data: entries } = await admin.from("entries").select("id").eq("user_id", target);
    const entryIds = (entries ?? []).map((e: any) => e.id);
    if (entryIds.length > 0) {
      for (const t of tables_entry_children) {
        await admin.from(t).delete().in("entry_id", entryIds);
      }
      await admin.from("entries").delete().eq("user_id", target);
    }
    await admin.from("chat_messages").delete().eq("user_id", target);
    await admin.from("subpoule_members").delete().eq("user_id", target);

    const { data: ownedSubpoules } = await admin.from("subpoules").select("id").eq("owner_user_id", target);
    const subIds = (ownedSubpoules ?? []).map((s: any) => s.id);
    if (subIds.length > 0) {
      await admin.from("subpoule_members").delete().in("subpoule_id", subIds);
      await admin.from("chat_messages").delete().in("subpoule_id", subIds);
      await admin.from("subpoules").delete().in("id", subIds);
    }

    await admin.from("user_roles").delete().eq("user_id", target);
    await admin.from("profiles").delete().eq("id", target);

    // 2) delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(target);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Onbekende fout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
