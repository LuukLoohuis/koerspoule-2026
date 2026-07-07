// Vercel Edge Function — cachet de globale stand zodat de etappe-piek de cache
// raakt i.p.v. de database. Roept de SECURITY DEFINER-RPC get_game_leaderboard
// aan (op de voorgerekende leaderboard_global_mv) en geeft JSON terug met
// stale-while-revalidate cache-headers.
//
// Env (Vercel): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only).
// Valt terug op de VITE_*-namen als die gezet zijn.
//
// NB: alleen actief op Vercel. Op Lovable bestaat dit endpoint niet; de
// frontend-hook valt dan automatisch terug op de directe RPC.
import { captureServerEvent, captureServerException } from "./posthog";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const game = url.searchParams.get("game");
  const json = (body: unknown, status = 200, cache?: string) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        ...(cache ? { "cache-control": cache } : {}),
      },
    });

  if (!game) return json({ error: "missing game" }, 400);

  const distinctId = req.headers.get("x-posthog-distinct-id") ?? `leaderboard:${game}`;

  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const SUPABASE_URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !KEY) return json({ error: "not configured" }, 500);

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_game_leaderboard`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: KEY,
      authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ p_game_id: game }),
  });

  const body = await r.text();

  if (r.ok) {
    captureServerEvent({
      distinctId,
      event: "leaderboard_api_requested",
      properties: {
        game_id: game,
        response_status: r.status,
      },
    });
  } else {
    captureServerException(new Error(`Leaderboard API failed with status ${r.status}`), distinctId, {
      game_id: game,
      response_status: r.status,
    });
  }
  return new Response(body, {
    status: r.status,
    headers: {
      "content-type": "application/json",
      // Eerste bezoeker vult de cache; volgende ~10k binnen 30s krijgen de kopie.
      "cache-control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
