// Edge function: send-mail
// Proxies transactional emails from the client to the Cloudflare mail worker,
// adding the X-Worker-Secret so the worker accepts the request.
// Requires authenticated user.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAIL_WORKER = "https://koerspoule-mail.luuk-loohuis.workers.dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const secret = Deno.env.get("MAIL_WORKER_SECRET");
    if (!secret) return json({ error: "MAIL_WORKER_SECRET not configured" }, 500);

    const body = await req.json().catch(() => null) as
      | { to?: string; subject?: string; html?: string }
      | null;
    if (!body?.to || !body.subject || !body.html) {
      return json({ error: "to, subject, html required" }, 400);
    }
    if (typeof body.to !== "string" || body.to.length > 320 ||
        typeof body.subject !== "string" || body.subject.length > 300 ||
        typeof body.html !== "string" || body.html.length > 200_000) {
      return json({ error: "Invalid input" }, 400);
    }

    // Recipient must match the authenticated user — we only send transactional
    // confirmations to the logged-in user (welcome, ploeg ingediend, etc.).
    if (body.to.toLowerCase() !== (user.email ?? "").toLowerCase()) {
      return json({ error: "Recipient must match authenticated user" }, 403);
    }

    const res = await fetch(MAIL_WORKER, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return json(data, res.status);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
