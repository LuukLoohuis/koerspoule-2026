// Edge Function: recalculate-game
// POST { game_id: string }
// Wipes & rebuilds all stage_points + total_points for a game.
// Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    const { game_id } = (await req.json()) as { game_id?: string };
    if (!game_id || typeof game_id !== "string") {
      return json({ error: "game_id is required" }, 400);
    }

    // Batched pad: wis + reken per etappe los af, zodat geen enkele DB-call de
    // statement_timeout raakt bij veel deelnemers × etappes. Valt terug op de
    // monolithische full_recalculation als de nieuwe RPCs nog niet bestaan.
    const { data: stageRows, error: prepErr } = await supabase.rpc("recalc_prepare", {
      p_game_id: game_id,
    });

    if (prepErr) {
      // recalc_prepare ontbreekt (nog niet gedeployd) of faalde → fallback.
      const missing = /could not find|does not exist|schema cache|function/i.test(prepErr.message ?? "");
      if (!missing) throw prepErr;
      const { error } = await supabase.rpc("full_recalculation", { p_game_id: game_id });
      if (error) throw error;
      return json({ ok: true, mode: "monolithic" });
    }

    const stageIds = ((stageRows ?? []) as Array<{ stage_id: string }>).map((r) => r.stage_id);
    for (const sid of stageIds) {
      const { error } = await supabase.rpc("recalc_stage", {
        p_game_id: game_id,
        p_stage_id: sid,
      });
      if (error) throw error;
    }

    const { error: finErr } = await supabase.rpc("recalc_finalize", { p_game_id: game_id });
    if (finErr) throw finErr;

    return json({ ok: true, mode: "batched", stages: stageIds.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
