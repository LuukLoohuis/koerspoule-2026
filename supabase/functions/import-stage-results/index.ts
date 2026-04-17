// Edge Function: import-stage-results
// POST { stage_id: string, results: [{ rider_id: string, position: number }] }
// Requires: caller must be admin (enforced by RPC + RLS).
//
// Deploy:  supabase functions deploy import-stage-results --no-verify-jwt
// Call:    supabase.functions.invoke("import-stage-results", { body: {...} })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ResultRow {
  rider_id: string;
  position: number;
}

interface Payload {
  stage_id: string;
  results: ResultRow[];
  auto_calculate?: boolean; // default true
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = (await req.json()) as Payload;
    if (!body?.stage_id || !Array.isArray(body.results)) {
      return new Response(
        JSON.stringify({ error: "stage_id and results[] are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const r of body.results) {
      if (!r.rider_id || typeof r.position !== "number") {
        return new Response(
          JSON.stringify({ error: "Each result needs rider_id + position" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { error: importErr } = await supabase.rpc("import_stage_results", {
      p_stage_id: body.stage_id,
      p_results: body.results,
    });
    if (importErr) throw importErr;

    if (body.auto_calculate !== false) {
      const { error: calcErr } = await supabase.rpc("calculate_stage_points", {
        p_stage_id: body.stage_id,
      });
      if (calcErr) throw calcErr;

      const { data: stage } = await supabase
        .from("stages")
        .select("game_id")
        .eq("id", body.stage_id)
        .single();

      if (stage?.game_id) {
        const { error: rankErr } = await supabase.rpc("update_total_ranking", {
          p_game_id: stage.game_id,
        });
        if (rankErr) throw rankErr;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
