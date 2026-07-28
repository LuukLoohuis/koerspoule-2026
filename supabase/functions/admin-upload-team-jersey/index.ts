import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Niet ingelogd" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Sessie ongeldig" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "Alleen admins mogen truien uploaden" }, 403);

    const form = await req.formData();
    const file = form.get("file");
    const teamId = String(form.get("teamId") ?? "");
    const gameId = String(form.get("gameId") ?? "");
    if (!(file instanceof File) || !teamId || !gameId) {
      return json({ error: "Bestand, team of game ontbreekt" }, 400);
    }
    if (!file.type.startsWith("image/")) return json({ error: "Kies een afbeeldingsbestand" }, 400);
    if (file.size > 5 * 1024 * 1024) return json({ error: "De afbeelding mag maximaal 5 MB zijn" }, 400);

    const { data: team, error: teamError } = await admin
      .from("teams")
      .select("id, game_id")
      .eq("id", teamId)
      .eq("game_id", gameId)
      .maybeSingle();
    if (teamError) throw teamError;
    if (!team) return json({ error: "Team hoort niet bij deze game" }, 404);

    const extensionByMime: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
    };
    const extension = extensionByMime[file.type] ?? "png";
    const path = `${gameId}/${teamId}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("team-jerseys")
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
    if (uploadError) throw uploadError;

    const { data: publicFile } = admin.storage.from("team-jerseys").getPublicUrl(path);
    const jerseyUrl = `${publicFile.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await admin
      .from("teams")
      .update({ jersey_url: jerseyUrl })
      .eq("id", teamId);
    if (updateError) throw updateError;

    return json({ jersey_url: jerseyUrl });
  } catch (error) {
    console.error("admin-upload-team-jersey:", error);
    return json({ error: error instanceof Error ? error.message : "Upload mislukt" }, 500);
  }
});
