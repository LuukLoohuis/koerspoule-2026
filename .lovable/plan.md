## Admin uitbreidingen + mailkosten Giro-notificatie

### 1. Deelnemers verwijderen (UsersTab)

Voeg een "Verwijderen" knop toe per gebruiker in `src/components/admin/UsersTab.tsx` met bevestigings-dialoog (AlertDialog). Verwijdert het account én alle gekoppelde data.

**Backend:**
- Nieuwe RPC `admin_delete_user(p_user_id uuid)` met `SECURITY DEFINER`:
  - Check `is_admin()`
  - Voorkom dat admin zichzelf verwijdert
  - Verwijder cascadegewijs: `entry_picks`, `entry_jokers`, `entry_predictions`, `entry_prediction_points`, `stage_points`, `total_points`, `entries`, `chat_messages`, `subpoule_members`, `subpoules` (eigen), `user_roles`, `profiles`, en tenslotte `auth.users` (via `auth.admin` API in een Edge Function — RPC kan auth.users niet rechtstreeks deleten)
- Omdat `auth.users` een service-role-actie vereist, maken we een Edge Function `admin-delete-user` die met de service role key de auth-user verwijdert na de RPC-cleanup.

### 2. Inzending bekijken & wijzigen (EntriesTab)

In `src/components/admin/EntriesTab.tsx` per rij een "Bekijken/Wijzigen" knop die een Dialog opent met:
- **Categorie-picks** (per categorie: huidige renner + dropdown om te wijzigen via `toggle_entry_pick` RPC — admin mag al wijzigen volgens bestaande RPC's check)
- **Jokers** (2 velden, opslaan via `save_entry_jokers`)
- **GC voorspellingen** (3 podium + 3 truien, opslaan via `save_entry_predictions`)
- **Status** wijzigen (draft ↔ submitted) via directe update op `entries`
- **Verwijder inzending** knop (alleen entry, niet de user) via `DELETE FROM entries`

Bestaande RPC's bevatten al `is_admin()` overrides, dus admin kan ook na deadline/locked status wijzigen. Geen nieuwe RPC's nodig voor het wijzigen — alleen voor entry-delete één RPC `admin_delete_entry(p_entry_id)` voor cascade cleanup.

### 3. Mailkosten Giro-notificatie

Lovable Emails draait op een usage-based model via je Cloud-balance, niet via credits. Concrete kosten:

- Verzenden gaat via Lovable's e-mailinfrastructuur (al opgezet op `notify.koerspoule.nl`).
- Standaard krijg je **$1 gratis AI-balance + $25 gratis Cloud-balance per maand**.
- Ruwe richtprijs voor transactionele e-mail providers via Cloud: doorgaans **~$0,40 – $1,00 per 1.000 verzonden mails**. Voor jullie volume (paar honderd accounts × 1 mail = enkele honderden e-mails per race) blijft dit ruim binnen de **gratis $25 Cloud-balance** — feitelijk **€0**.
- Plan-mode-credits (1 per bericht aan mij) staan los van mailkosten. Het bouwen van de admin-trigger + opt-in flow kost build-credits afhankelijk van de scope, maar het versturen zélf kost in jullie schaal niets.

> Exacte per-mail-prijs is niet vast gepubliceerd; check **Settings → Cloud & AI balance** voor het werkelijke verbruik na de eerste verzending.

### Technische details

**Files:**
- `src/components/admin/UsersTab.tsx` — Verwijder-knop + AlertDialog
- `src/components/admin/EntriesTab.tsx` — Bekijken/Wijzigen Dialog + verwijder-knop
- Nieuwe `src/components/admin/EntryEditorDialog.tsx` — herbruikbaar dialoog
- Nieuwe edge function `supabase/functions/admin-delete-user/index.ts` (service role om auth.users te deleten)
- DB-migratie: `admin_delete_user_data(p_user_id)` (cleanup public schema) + `admin_delete_entry(p_entry_id)`

**Flow user-delete:**
1. Frontend → invoke `admin-delete-user` edge function met `user_id`
2. Edge function checkt admin, roept `admin_delete_user_data` RPC aan, daarna `supabase.auth.admin.deleteUser()`

### Vraag

Wil je dat ik dit zo bouw? Eventueel: moet de admin ook entries van **andere games** kunnen wijzigen, of alleen de actieve game (huidige weergave)?
