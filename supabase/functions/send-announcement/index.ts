// Send Giro 2026 announcement email to all notify_subscribers
// Admin-only. Enqueues to transactional_emails queue (notify.koerspoule.nl).
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_DOMAIN = 'notify.koerspoule.nl'
const FROM = `Koerspoule <hallo@${SENDER_DOMAIN}>`

function buildHtml(unsubscribeUrl: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#ffffff;font-family:Georgia,serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;margin:0 0 8px;color:#c8102e;">La Corsa Rosa is begonnen 🌹</h1>
    <p style="font-size:14px;color:#666;margin:0 0 24px;font-style:italic;">Giro d'Italia 2026 — Koerspoule</p>
    <p style="font-size:16px;line-height:1.6;">Beste koersliefhebber,</p>
    <p style="font-size:16px;line-height:1.6;">De inschrijving voor de <strong>Giro 2026 Koerspoule</strong> is geopend! Stel je ploeg samen, kies je jokers en daag je vrienden uit in een eigen subpoule.</p>
    <p style="font-size:16px;line-height:1.6;">Deadline: <strong>4–8 mei</strong>. Niet wachten — de gruppetto vertrekt zonder jou.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="https://koerspoule.nl" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;">Schrijf je in →</a>
    </p>
    <p style="font-size:14px;color:#666;line-height:1.5;">Veel koersplezier,<br/>Het Koerspoule team</p>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;"/>
    <p style="font-size:11px;color:#999;text-align:center;">Je ontvangt deze mail omdat je je hebt aangemeld voor updates op koerspoule.nl. <a href="${unsubscribeUrl}" style="color:#999;">Uitschrijven</a></p>
  </div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!roles) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json().catch(() => ({}))
    const subject = (body.subject as string) || "🌹 De Giro 2026 Koerspoule is open — schrijf je in!"
    const dryRun = body.dryRun === true
    const testEmail = body.testEmail as string | undefined

    let recipients: string[] = []
    if (testEmail) {
      recipients = [testEmail]
    } else {
      const { data: subs, error } = await admin
        .from('notify_subscribers')
        .select('email')
        .is('unsubscribed_at', null)
      if (error) throw error
      recipients = (subs ?? []).map((s) => s.email)
    }

    if (dryRun) {
      return new Response(JSON.stringify({ recipients_count: recipients.length, sample: recipients.slice(0, 5) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let enqueued = 0
    const errors: string[] = []
    for (const to of recipients) {
      const messageId = `giro2026-announce-${crypto.randomUUID()}`
      const unsubscribeUrl = `https://koerspoule.nl/unsubscribe?email=${encodeURIComponent(to)}`
      const payload = {
        message_id: messageId,
        idempotency_key: messageId,
        purpose: 'transactional',
        label: 'giro2026-announcement',
        to,
        from: FROM,
        sender_domain: SENDER_DOMAIN,
        subject,
        html: buildHtml(unsubscribeUrl),
        queued_at: new Date().toISOString(),
      }
      const { error } = await admin.rpc('enqueue_email', { queue_name: 'transactional_emails', payload })
      if (error) errors.push(`${to}: ${error.message}`)
      else enqueued++
    }

    return new Response(JSON.stringify({ enqueued, total: recipients.length, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
