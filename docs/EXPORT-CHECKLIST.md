# Export-checklist — migratie naar eigen Supabase

Gebaseerd op het schema in `supabase/migrations/` + `supabase/schema.sql`.
Download per tabel een CSV via **Lovable → Cloud → Database → Tables → Download CSV**.

> **Belangrijk / eerlijk:**
> - `auth.users` is **niet** exporteerbaar via CSV (geen dashboard, geen service_role). De
>   inlog-e-mails van geregistreerde gebruikers staan dáár.
> - De tabel **`profiles` bevat GEEN e-mailkolom** (alleen `id`, `display_name`, `is_admin`,
>   `role`). Je kunt e-mail dus niet 1-op-1 aan een gebruiker koppelen via `profiles`.
> - E-mailadressen die in **publieke** tabellen staan, kun je wél als CSV downloaden — zie deel A.
>   De volledigste bron voor adressen van geregistreerde gebruikers is **`email_send_log`**
>   (elk verstuurd mailtje logt `recipient_email`). Wie nooit een mail kreeg, staat daar niet in.

---

## A. E-mailadressen veiligstellen

Download deze CSV's:

| CSV (tabel) | E-mailkolom | Overige relevante kolommen | Wat het is |
|---|---|---|---|
| `notify_subscribers` | `email` | `created_at`, `unsubscribed_at`, `source` | Homepage-aanmeldingen "hou me op de hoogte" (nieuwsbrief). Niet per se geregistreerde users. |
| `email_send_log` | `recipient_email` | `template_name`, `status`, `metadata` (jsonb), `created_at` | Logboek van élke verstuurde mail → **beste bron voor adressen van geregistreerde gebruikers**. Ontdubbelen op `recipient_email`. |
| `suppressed_emails` | `email` | `reason` (unsubscribe/bounce/complaint), `created_at` | Afmeldingen/bounces — **respecteer deze: niet opnieuw mailen.** |
| `email_unsubscribe_tokens` | `email` | `token`, `used_at` | Eenmalige uitschrijf-tokens; bevat ook adressen. |

**Koppeling aan gebruiker/naam:** er is **geen** betrouwbare `user_id`/`display_name`-kolom naast
het e-mailadres in deze tabellen (`profiles` heeft geen e-mail). Behandel de adreslijst dus als
losse lijst, niet als user-koppeling. Eventueel handmatig matchen kan via `email_send_log.metadata`
(soms een id) — niet gegarandeerd.

### Privacy / AVG
- E-mailadressen zijn persoonsgegevens. Bewaar de CSV's **versleuteld/lokaal**, niet in de repo,
  niet in een gedeelde drive.
- Gebruik ze **uitsluitend** voor de migratie-communicatie (bv. "we verhuizen, log opnieuw in").
- Houd je aan `suppressed_emails` (afgemeld/bounce) — die adressen **niet** aanschrijven.
- Verwijder de CSV's zodra de migratie klaar is.

---

## B. Game-data bewaren

Game-data = opzet + uitslagen, **zonder `user_id`** → veilig te importeren los van gebruikers.

### Te downloaden CSV's
`games`, `teams`, `riders`, `categories`, `stages`, `points_schema`, `game_riders`,
`category_riders`, `startlists`, `stage_results`, `classification_results`,
`rubriek_items`, `rubriek_options`, `rider_results_cache`.

| CSV (tabel) | Hangt aan (FK) | Relevante kolommen |
|---|---|---|
| `games` | — (root) | `id`, `name`, `start_date`, `end_date`, status/thema-velden |
| `teams` | `game_id` → games | `id`, `game_id`, `name`, `short_name`, `country_code` |
| `riders` | `team_id` → teams (nullable) | `id`, `name`, `team_id`, `country_code`, `firstcycling_id` |
| `categories` | `game_id` → games | `id`, `game_id`, `name`, `order_index` |
| `stages` | `game_id` → games | `id`, `game_id`, `stage_number`, `date`, `name`, `stage_type` |
| `points_schema` | `game_id` → games | `id`, `game_id`, `position`, `points` |
| `game_riders` | `game_id`, `rider_id`, `category_id` | `id`, `game_id`, `rider_id`, `category_id` |
| `category_riders` | `category_id`, `rider_id` | `id`, `category_id`, `rider_id` |
| `startlists` | `game_id` → games | `id`, `game_id`, + startlijst-velden |
| `stage_results` | `stage_id`, `rider_id` | `id`, `stage_id`, `rider_id`, `position` |
| `classification_results` | `stage_id`, `rider_id` | `id`, `stage_id`, `rider_id`, klassement-velden |
| `rubriek_items` | `game_id` → games; `created_by` → auth.users (nullable) | `id`, `game_id`, `type`, `content`, `question`, `options`, `is_active` |
| `rubriek_options` | `rubriek_id` → rubriek_items | `id`, `rubriek_id`, `text`, `sort_order` |
| `rider_results_cache` | — (geen FK; externe cache) | `firstcycling_id`, `season`, `rider_name`, `results` (jsonb) |

> `rubriek_items.created_by` verwijst naar `auth.users`. Migreer je de users niet, zet deze kolom
> dan op `NULL` bij import (anders FK-fout).

### FK-veilige importvolgorde
Importeer in deze volgorde (ouders vóór kinderen):

1. `games`
2. `teams`
3. `riders`            *(team_id → teams)*
4. `categories`
5. `stages`
6. `points_schema`
7. `game_riders`        *(games + riders + categories)*
8. `category_riders`    *(categories + riders)*
9. `startlists`
10. `stage_results`     *(stages + riders)*
11. `classification_results` *(stages + riders)*
12. `rubriek_items`     *(created_by → NULL als users niet mee gaan)*
13. `rubriek_options`   *(rubriek_items)*
14. `rider_results_cache` *(geen FK — mag op elk moment)*

---

## C. User-data — APARTE beslissing (NIET in deze taak)

Deze tabellen hangen aan `auth.users` (of aan user-data). Ze horen bij een aparte migratie-keuze,
samen met `auth.users` zelf. Hier alleen ter volledigheid — **niet** nodig voor deel A/B:

- **Account/rol:** `profiles`, `user_roles`
- **Inschrijvingen/picks:** `entries`, `entry_picks`, `entry_jokers`, `entry_predictions`,
  `entry_prediction_points`
- **(Oud) teams:** `user_teams`, `team_picks`
- **Subpoules:** `subpoules`, `subpoule_members`
- **Chat:** `chat_messages`, `chat_message_reactions`, `chat_polls`, `chat_poll_votes`,
  `chat_read_states`
- **Rubriek-stemmen:** `rubriek_votes`
- **AI/derived (hangt aan entries/subpoules):** `lefevere_rapporten` (→ entries),
  `etappe_commentaren` (→ stages + subpoules)
- **Logs/berekend (herafleidbaar, kan over):** `notification_log`, `results_approval_log`,
  `stage_points`, `total_points`, `entry_prediction_points`

> Berekende tabellen (`stage_points`, `total_points`, `classification_results`,
> `entry_prediction_points`) kun je na import opnieuw laten berekenen i.p.v. meenemen.
