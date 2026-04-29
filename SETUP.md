# Koerspoule Backend Setup Guide

Deze guide loopt je stap-voor-stap door het opzetten van de **complete backend** in Supabase. Doe dit één keer; daarna werkt alles via de admin-pagina.

---

## ✅ Wat je nodig hebt
- Toegang tot je Supabase project (`fngzdthhpokdgdxtbqnp.supabase.co`) als owner
- Eén admin-account (email + wachtwoord) — heb je al ✓
- ±10 minuten

---

## 📋 STAP 1 — Voer de SQL migrations uit (in volgorde)

Open Supabase Dashboard → **SQL Editor** → **New query** voor elk bestand.

### 1.1 Basisschema (alleen als nog niet gedaan)
**File**: `supabase/schema.sql`
- ✅ Jij hebt dit al uitgevoerd

### 1.2 Admin v3 uitbreidingen (alleen als nog niet gedaan)
**File**: `supabase/migrations/20260201_admin_v3.sql`
- ✅ Jij hebt dit al uitgevoerd

### 1.3 Backend v4 (NIEUW — verplicht)
**File**: `supabase/migrations/20260202_backend_v4.sql`
- 📍 Open op GitHub: https://github.com/LuukLoohuis/koerspoule-2026/blob/main/supabase/migrations/20260202_backend_v4.sql
- Klik **Raw** → kopieer alles → plak in Supabase SQL Editor → **Run**
- ✅ Verwacht: "Success. No rows returned"

> 💡 **Wat doet deze migration?**
> - Score-engine RPCs (`calculate_stage_points_v4`, `update_total_points_v4`, `full_recalculation_v4`)
> - Pick-validatie trigger (forceer `max_picks` per categorie op DB-niveau)
> - Deadline-locking trigger (na status=`locked` kunnen spelers niet meer wijzigen)
> - Subpoules helper RPCs (`create_subpoule`, `join_subpoule`, `leave_subpoule`)
> - Leaderboard views (`leaderboard_global`, `leaderboard_subpoule`)
> - RLS policies voor entries/entry_picks/entry_jokers/subpoules
> - `notification_log` tabel + `log_notification` RPC
> - `admin_entries_overview` view (gebruikt door de Inzendingen-tab)

---

## 📋 STAP 2 — Verifieer dat de backend werkt

In Supabase SQL Editor, voer dit uit (vervang `<game-uuid>` met je TdF 2026 game-id):

```sql
-- Vind je game id
select id, name, year from public.games order by year desc limit 5;

-- Bekijk algemeen klassement (leeg als nog geen entries gescoord)
select * from public.leaderboard_global where game_id = '<game-uuid>' order by rank limit 20;

-- Bekijk admin entries overzicht (zou Luuk's entry moeten tonen)
select * from public.admin_entries_overview where game_id = '<game-uuid>';
```

Als beide queries werken zonder error → backend OK.

---

## 📋 STAP 3 — Test de score-engine

In de admin (`/admin`):
1. Kies actieve game (TdF 2026)
2. Tab **Berekening** → klik **"Laad standaard puntentabellen"** (eenmalig per game)
3. Tab **Uitslagen** → kies een etappe → vul top-20 in voor klassement "Etappe" → **Opslaan**
4. Tab **Berekening** → kies dezelfde etappe → klik **"Herbereken"**
5. Tab **Inzendingen** → de `total_points` kolom van de entry zou nu gevuld moeten zijn

---

## 📋 STAP 4 — (optioneel) Subpoules werken

Spelers kunnen subpoules zelf aanmaken via deze RPCs (vanuit de frontend, eventueel in TeamBuilder of nieuwe SubpoulesPage):

```js
// Aanmaken (door speler)
const { data: id } = await supabase.rpc('create_subpoule', {
  p_name: 'Mijn vrienden',
  p_game_id: '<game-uuid>',
  p_code: null  // null = automatische code, of een eigen code
});

// Joinen via code
await supabase.rpc('join_subpoule', { p_code: 'AB12CD' });

// Verlaten
await supabase.rpc('leave_subpoule', { p_subpoule_id: '<id>' });

// Klassement van subpoule
const { data } = await supabase
  .from('leaderboard_subpoule')
  .select('*')
  .eq('subpoule_id', '<id>')
  .order('rank');
```

> 🛈 De UI hiervoor staat nog op de backlog — de RPCs zijn klaar, alleen de pagina ontbreekt.

---

## 📋 STAP 5 — (optioneel) Auto-import van uitslagen

Voor automatisch ophalen van uitslagen (bv. van ProCyclingStats) heb je een **Supabase Edge Function** nodig. Dit is de aanpak:

### Edge Function maken (vanuit je terminal)
```bash
# Eenmalig: install Supabase CLI
brew install supabase/tap/supabase   # of: npm i -g supabase

# In de repo root:
supabase login
supabase link --project-ref fngzdthhpokdgdxtbqnp
supabase functions new pcs-fetch
```

Open `supabase/functions/pcs-fetch/index.ts`:

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { stage_url, stage_id } = await req.json();

  // PCS scrape (basaal voorbeeld — moet aangepast aan PCS HTML-structuur)
  const html = await fetch(stage_url).then((r) => r.text());
  const top20 = parseTop20FromHtml(html);  // implementeer parsing

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Schrijf naar stage_results.finish_position
  for (const r of top20) {
    await supa.from("stage_results").upsert({
      stage_id,
      rider_id: r.rider_id,
      finish_position: r.position,
    }, { onConflict: "stage_id,rider_id" });
  }

  // Trigger berekening
  await supa.rpc("calculate_stage_points_v4", { p_stage_id: stage_id });
  return new Response(JSON.stringify({ ok: true, count: top20.length }));
});

function parseTop20FromHtml(html: string) {
  // TODO: implementeer scraping voor PCS pagina structuur
  return [];
}
```

Deploy:
```bash
supabase functions deploy pcs-fetch
```

Vanuit de frontend aanroepen:
```js
await supabase.functions.invoke('pcs-fetch', {
  body: { stage_url: 'https://...', stage_id: '<uuid>' }
});
```

> 🛈 Dit is de **infrastructuur**. De daadwerkelijke HTML-parsing moet je voor PCS implementeren — kost een paar uur. Voor nu kun je gewoon handmatig de top-20 invoeren via Uitslagen-tab.

---

## 📋 STAP 6 — (optioneel) E-mail notificaties

De `notification_log` tabel + `log_notification` RPC zijn klaar. Voor échte e-mails koppel je:

### Optie A: Resend (aanbevolen — gratis 3000/maand)
1. Maak account: https://resend.com → kopieer API key
2. Voeg toe als Supabase secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   ```
3. Maak Edge Function `send-mail`:
   ```ts
   const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
   await fetch("https://api.resend.com/emails", {
     method: "POST",
     headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
     body: JSON.stringify({
       from: "Koerspoule <noreply@koerspoule.nl>",
       to: [user_email],
       subject: "Deadline nadert!",
       html: "<p>Nog 24 uur om je team in te dienen!</p>",
     }),
   });
   await supa.rpc("log_notification", { p_user_id, p_game_id, p_kind: "deadline_24h" });
   ```
4. Trigger via cron (Supabase scheduled functions of pg_cron) bv. dagelijks om 09:00 UTC

### Optie B: Supabase eigen e-mail (beperkt)
Alleen voor wachtwoord-reset / signup-confirm. Niet voor custom triggers.

---

## ⚙️ Hoe gebruik je nu de game-flow als admin?

```
1. Maak game aan (Games tab) → Tour de France 2026
2. Set status → "open"
3. Maak categorieën (Categorieën tab) — bv. Klassement (max=3), Sprinters (max=2)
4. Importeer startlijst (Startlijst tab) — PDF of handmatig
5. Maak 21 etappes (Etappes tab) — bulk-knop
6. Laad puntentabellen (Berekening tab)
7. → Spelers kunnen nu inzenden via /team-samenstellen ←
8. Wanneer race begint → set status naar "locked" (deadline gesloten)
9. Per dag: vul uitslag in (Uitslagen tab top-20 voor elk klassement)
10. Klik "Herbereken" → klassement wordt automatisch bijgewerkt
11. Volg via Inzendingen-tab + Dashboard wie aan de leiding staat
12. Na laatste etappe → status "finished"
```

---

## 🎯 Wat kun je nu (na deze setup)?

- ✅ Volledige score-berekening werkt automatisch
- ✅ Spelers krijgen errors als ze meer dan `max_picks` per categorie kiezen
- ✅ Na deadline (status=locked) kunnen spelers niet meer wijzigen
- ✅ Subpoules backend ready (UI-pagina = volgende sprint)
- ✅ Leaderboard via `leaderboard_global` / `leaderboard_subpoule` views
- ✅ Audit-trail voor notificaties via `notification_log`
- ✅ Inzendingen-overzicht in admin

## 📦 Wat staat nog open op de backlog?

- ⏳ TeamBuilder pagina aanpassen om `max_picks` per categorie te respecteren in UI (frontend)
- ⏳ Subpoules-pagina voor spelers (UI op `create_subpoule` / `join_subpoule` / leaderboard)
- ⏳ PCS auto-import (Edge Function — skeleton bovenstaand)
- ⏳ E-mail deadline notifications (cron + Resend, instructies bovenstaand)

Vraag of dit moet, dan bouw ik het in een volgende sessie.
