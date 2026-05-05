# Goedkeuringsworkflow uitslagen

Een uitslag wordt eerst als **concept** opgeslagen, daarna door de admin **gefiatteerd** voordat deelnemers hem zien. Statussen worden duidelijk getoond, en wie/wanneer er goedgekeurd is wordt gelogd.

## Workflow in één blik

```
[Admin vult uitslag in / importeert]
            │
            ▼
   stages.results_status = 'draft'      (alleen admin ziet)
            │  klik "Klaar voor controle"
            ▼
   stages.results_status = 'pending'    (admin-only banner: "wacht op fiat")
            │  klik "Fiatteren"
            ▼
   stages.results_status = 'approved'   (zichtbaar voor alle deelnemers)
   approved_by, approved_at gezet
   stage_points + totaalstand herberekend
```

## Statuslabels (overal hetzelfde)
- **Concept** (grijs) — wordt nog ingevuld
- **In afwachting van goedkeuring** (oranje) — admin moet fiatteren
- **Goedgekeurd** (groen, met datum + naam admin) — live voor deelnemers

## Wat wijzigt er — kort overzicht

### 1. Database (migratie)
- Op `public.stages`:
  - `results_status text not null default 'draft'` — `draft | pending | approved`
  - `approved_by uuid` (verwijst naar `auth.users.id`, geen FK)
  - `approved_at timestamptz`
  - `submitted_for_approval_at timestamptz`
- Nieuwe tabel `public.results_approval_log` — audit-trail (stage_id, action, actor, at, note).
- RLS aanpassen op **`stage_results`** en **`stage_points`**: niet-admins zien alleen rijen waar de bijbehorende stage `results_status = 'approved'` heeft. Admins zien alles. Hierdoor blijft een concept-uitslag voor deelnemers onzichtbaar zonder dat we de frontend overal hoeven te filteren.
- RPC's:
  - `submit_stage_for_approval(p_stage_id)` — admin-only, zet status op `pending`, log entry.
  - `approve_stage_results(p_stage_id)` — admin-only, zet `approved`, vult `approved_by/at`, draait `calculate_stage_scores` + `calculate_prediction_points` + `update_total_ranking`, log entry.
  - `revoke_stage_approval(p_stage_id)` — terug naar `pending` (voor correcties), log entry.
- `total_points` mag pas (her)berekend worden over goedgekeurde etappes — `calculate_stage_scores`/`update_total_ranking` filteren op `results_status = 'approved'`.

### 2. Admin — Uitslagen-tab (`src/components/admin/ResultsTab.tsx`)
- Bovenaan per geselecteerde etappe een statusbadge + actieknoppen die meebewegen met de status:
  - **Concept**: knop "Klaar voor controle" (zet → pending).
  - **In afwachting**: knop "Fiatteren ✅" (met confirm-dialog) en "Terug naar concept".
  - **Goedgekeurd**: toont "Goedgekeurd door {naam} op {datum}" en knop "Goedkeuring intrekken" voor correcties.
- Opslaan/import blijft mogelijk in `draft` en `pending`; in `approved` waarschuwen ("Trek eerst goedkeuring in om te wijzigen").
- Na succesvol fiatteren: toast + automatische herberekening (RPC doet dat al server-side).

### 3. Admin — nieuw overzicht "Te fiatteren"
- Nieuwe tab in `AdminV3.tsx` (`Te fiatteren`, icoon `BadgeCheck`) of compacte sectie boven `DashboardTab`:
  - Lijst alle etappes van de actieve game met `results_status = 'pending'`, met deeplink naar de Uitslagen-tab voor die etappe.
  - Telt zichtbaar in een kleine badge op het tab-icoon (bv. `Te fiatteren (2)`).
- Klikbaar naar Uitslagen-tab met die etappe vooraf geselecteerd.

### 4. Notificatie naar admins
- Edge function `notify-results-pending` (verstuurt mail naar alle admin-users via Resend, hergebruikt bestaande `process-email-queue` infra).
- Triggert vanuit `submit_stage_for_approval` RPC via `enqueue_email`.
- Onderwerp: "Uitslag etappe X wacht op fiat".

### 5. Frontend deelnemerszijde
- Door de RLS-aanpassing zien deelnemers automatisch geen punten/uitslag van niet-goedgekeurde etappes.
- In `Results.tsx` / `MyResultsPanel.tsx` / `SubpouleStandings.tsx`: voor etappes met `results_status != 'approved'` tonen we een nette placeholder ("In afwachting van fiat — uitslag volgt zodra de jury akkoord is.") in plaats van lege rijen.
- Stages-lijst toont al een statusbadge per etappe (alleen 'approved' krijgt punten-link).

## Aandachtspunten
- Bestaande etappes met al gevulde uitslagen worden in de migratie initieel op `approved` gezet (anders verdwijnen ze plots voor spelers). `approved_at = now()`, `approved_by = NULL` met note "auto-migrated".
- `full_recalculation` blijft werken maar slaat niet-goedgekeurde etappes over.
- Audit-log is alleen leesbaar voor admins (`is_admin()` RLS).

## Te wijzigen / toe te voegen bestanden
- `supabase/migrations/<nieuw>.sql` — kolommen, log-tabel, RLS, RPC's, calc-aanpassingen.
- `src/components/admin/ResultsTab.tsx` — statusbadge + workflow-knoppen.
- `src/components/admin/PendingApprovalsTab.tsx` (nieuw) + tab in `src/pages/AdminV3.tsx`.
- `src/components/admin/CalculationTab.tsx` — kleine info dat herberekening alleen approved meeneemt.
- `src/pages/Results.tsx`, `src/components/MyResultsPanel.tsx`, `src/components/SubpouleStandings.tsx` — placeholder voor pending/concept etappes.
- `supabase/functions/notify-results-pending/index.ts` (nieuw) + `supabase/config.toml`.
