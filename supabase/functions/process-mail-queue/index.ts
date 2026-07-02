// Verwerkt de mail-wachtrij (mail_queue) in chunks. Zelf-herhalend: na elke
// chunk roept de functie zichzelf opnieuw aan tot de wachtrij leeg is — zo
// blijft elke aanroep ruim binnen de edge-tijdslimiet en maakt het niet uit of
// de admin z'n browser sluit. Per rij wordt sent/failed afgevinkt → hervatbaar,
// nooit dubbel. Aanroepbaar door de service-role (zelf-keten) of een admin
// (start/hervat-knop in Notify).
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildHtml, MAIL_WORKER, BASE_URL } from "../_shared/email.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Chunk ruim onder de edge-tijdslimiet: 300 mails à ~8-9/s ≈ 40s per run.
const CHUNK = 300;
const BATCH_SIZE = 10;   // gelijktijdige mails (Resend Pro ≈ 10 req/s)
const PAUSE_MS = 800;    // ≈ 8-9 mails/sec
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type QueueRow = { id: string; campaign_id: string; email: string; unsub_token: string; attempts: number };

function jwtRole(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role ?? "";
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: service-role (zelf-keten) of ingelogde admin (start/hervat vanuit UI).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }
    const token = authHeader.slice(7);
    const admin = createClient(supabaseUrl, serviceKey);
    if (jwtRole(token) !== "service_role") {
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    }

    // Vastgelopen rijen (verwerker halverwege gestorven) na 10 min terug naar
    // pending, zodat "Hervat" ze opnieuw oppakt. Max 5 pogingen → failed.
    await admin
      .from("mail_queue")
      .update({ status: "pending" } as never)
      .eq("status", "processing")
      .lt("claimed_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // Claim een chunk (SKIP LOCKED → geen dubbele verzending bij parallelle runs).
    const { data: claimed, error: claimErr } = await admin.rpc("claim_mail_batch", { p_limit: CHUNK });
    if (claimErr) throw claimErr;
    const rows = (claimed ?? []) as QueueRow[];

    if (rows.length === 0) {
      // Niets pending meer → campagnes zonder open rijen afronden.
      const { data: openCampaigns } = await admin.from("mail_campaigns").select("id").eq("status", "sending");
      for (const c of (openCampaigns ?? []) as Array<{ id: string }>) {
        const { count } = await admin
          .from("mail_queue")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id)
          .in("status", ["pending", "processing"]);
        if ((count ?? 0) === 0) {
          await admin.from("mail_campaigns").update({ status: "done", finished_at: new Date().toISOString() } as never).eq("id", c.id);
        }
      }
      return new Response(JSON.stringify({ processed: 0, done: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Campagne-inhoud ophalen (subject/body per campagne, meestal één).
    const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
    const { data: campaigns } = await admin
      .from("mail_campaigns")
      .select("id, subject, body, title_color, title_size")
      .in("id", campaignIds);
    const campaignById = new Map(
      ((campaigns ?? []) as Array<{ id: string; subject: string; body: string; title_color: string | null; title_size: number | null }>).map((c) => [c.id, c]),
    );

    let sent = 0;
    let failed = 0;

    const sendOne = async (row: QueueRow) => {
      const c = campaignById.get(row.campaign_id);
      if (!c) {
        failed++;
        await admin.from("mail_queue").update({ status: "failed", error: "Campagne niet gevonden" } as never).eq("id", row.id);
        return;
      }
      const unsubUrl = `${BASE_URL}/uitschrijven?token=${row.unsub_token}`;
      const payload = JSON.stringify({
        to: row.email,
        subject: c.subject,
        html: buildHtml(c.body, unsubUrl, c.title_color ?? "#c8102e", c.title_size ?? 24),
      });
      let lastErr = "";
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const res = await fetch(MAIL_WORKER, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Worker-Secret": Deno.env.get("MAIL_WORKER_SECRET") ?? "" },
            body: payload,
          });
          if (res.ok) {
            sent++;
            await admin.from("mail_queue").update({ status: "sent", sent_at: new Date().toISOString(), error: null } as never).eq("id", row.id);
            return;
          }
          lastErr = `HTTP ${res.status}`;
          if (res.status === 429 && attempt < 3) { await sleep(1500 * (attempt + 1)); continue; }
          break;
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
          if (attempt < 3) { await sleep(1000 * (attempt + 1)); continue; }
        }
      }
      // Mislukt: bij <5 pogingen terug naar pending (volgende run probeert
      // opnieuw), anders definitief failed met foutmelding.
      failed++;
      if (row.attempts < 5) {
        await admin.from("mail_queue").update({ status: "pending", error: lastErr } as never).eq("id", row.id);
      } else {
        await admin.from("mail_queue").update({ status: "failed", error: lastErr } as never).eq("id", row.id);
      }
    };

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const slice = rows.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(slice.map(sendOne));
      if (i + BATCH_SIZE < rows.length) await sleep(PAUSE_MS);
    }

    // Nog werk over? → zelf opnieuw aanroepen (fire-and-forget keten).
    const { count: remaining } = await admin
      .from("mail_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if ((remaining ?? 0) > 0) {
      fetch(`${supabaseUrl}/functions/v1/process-mail-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: "{}",
      }).catch(() => undefined);
    } else {
      // Alles verwerkt → campagnes afronden.
      const { data: openCampaigns } = await admin.from("mail_campaigns").select("id").eq("status", "sending");
      for (const c of (openCampaigns ?? []) as Array<{ id: string }>) {
        const { count } = await admin
          .from("mail_queue")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", c.id)
          .in("status", ["pending", "processing"]);
        if ((count ?? 0) === 0) {
          await admin.from("mail_campaigns").update({ status: "done", finished_at: new Date().toISOString() } as never).eq("id", c.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ processed: rows.length, sent, failed, remaining: remaining ?? 0 }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
