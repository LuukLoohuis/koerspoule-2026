## Doel

Adminproces rond uitslagen → berekening → fiattering logischer maken, met betere zichtbaarheid, een verwijder-optie per etappe, en transparante puntenopbouw per deelnemer in het fiatteer-scherm.

## 1. Tab-volgorde & hernoeming (`src/pages/AdminV3.tsx`)

Huidige volgorde: Uitslagen → Fiatteren → Berekening (Calc).
Nieuwe volgorde: **Uitslagen → Berekening → Fiatteren**.

- Hernoem `tab-calc` label van "Herberekenen" → "**Berekening**" (icon blijft `Calculator`).
- Verplaats `<TabsTrigger value="calc">` vóór `<TabsTrigger value="approvals">`, en idem voor `<TabsContent>`.

## 2. Berekening-tab uitbreiden (`src/components/admin/CalculationTab.tsx`)

Nu: enkel een knop "Volledige herberekening". Wordt:

**Per-etappe overzicht** met kolommen:
- Etappe (nummer + naam)
- **Uitslag**: `—` / `Geüpload (n renners)` (uit `stage_results` count)
- **Status**: `draft` / `pending` / `approved` (uit `stages.results_status`)
- **Berekening**: `Niet berekend` / `Berekend (n entries, totaal X pt)` (uit `stage_points` count + sum)
- **Laatste berekening**: timestamp van max(`stage_points.created_at`) per stage
- **Acties**:
  - `Bereken etappe` (call `calculate_stage_scores` RPC) — disabled als geen `stage_results`
  - `Wis uitslag` (rood, opent confirm; zie §3)

Plus bovenaan: behoud "Volledige herberekening" knop.
Foutmelding/lege state: als geen `stage_results` → tooltip "Upload eerst een uitslag".

Nieuwe hook/query: één `useQuery` die per stage joint: results_count, points_count, points_sum, last_calc_at.

## 3. Uitslag wissen per etappe

**Nieuwe RPC** `delete_stage_results(p_stage_id uuid)`:
- Admin-only check.
- `DELETE FROM stage_results WHERE stage_id = p_stage_id`
- `DELETE FROM stage_points WHERE stage_id = p_stage_id`
- Zet `stages.results_status = 'draft'`, clear `submitted_for_approval_at`, `approved_by`, `approved_at`.
- Re-run `update_total_ranking(game_id)` zodat totalen kloppen.
- Log entry in `results_approval_log` met action `'results_deleted'`.

In `CalculationTab`: confirm-dialog "Weet je zeker dat je de uitslag van etappe {n} wilt wissen? Punten worden herberekend. Andere etappes blijven ongewijzigd."

## 4. Inzicht in puntenopbouw bij fiatteren (`src/components/admin/ApprovalsTab.tsx` + `StageApprovalCard.tsx`)

Per stage in pending/approved status: expandable detail per deelnemer.

**Nieuwe RPC** `admin_stage_points_breakdown(p_stage_id uuid)` returns table:
```
entry_id, team_name, display_name, total_stage_points,
breakdown jsonb -- [{rider_id, rider_name, finish_pos, base_pts, is_joker, multiplier, total}]
```
SECURITY DEFINER, admin-only. Logica spiegelt `calculate_stage_scores`:
- Voor elke entry_pick + jokers (zoals nu): join op stage_results.finish_position + points_schema (classification='stage') om base_pts te bepalen, multiplier 2 als joker, anders 1.

In UI: per stage-kaart een collapsible "Toon puntenberekening (n deelnemers)" → tabel of accordion per deelnemer met expandable detail (lazy-loaded: query alleen draaien als card opent). Kolommen: renner | finish | basis | joker ×2 | totaal. Footer: som = stage-totaal.

## 5. UX framing

Berekening-tab krijgt korte header-uitleg:
> "Stap 2 — Punten worden hier per etappe berekend. Controleer in 'Fiatteren' en publiceer dan naar deelnemers."

Fiatteren-tab krijgt:
> "Stap 3 — Controleer de berekende punten en publiceer."

## Technisch advies

- **Performance**: alle queries zijn al indexed op `stage_id`/`entry_id`. Breakdown-RPC draait alleen bij openen van detail (lazy). Geen merkbare impact.
- **Geen AI/credits** nodig — puur DB.
- **Geen pre-cache** nodig: `stage_points` is al de cache; breakdown is een read-only join die <100ms duurt voor ~150 entries × 12 renners.
- **Schaalbaarheid**: alle logica blijft server-side in SECURITY DEFINER RPC's, single source of truth gelijk aan `calculate_stage_scores`. Frontend toont enkel.
- **Debugging-bonus**: breakdown maakt verschillen tussen "verwacht" en "berekend" direct zichtbaar.

## Bestanden

- `src/pages/AdminV3.tsx` — tab-volgorde + label
- `src/components/admin/CalculationTab.tsx` — volledige rewrite (per-stage tabel + acties)
- `src/components/admin/ApprovalsTab.tsx` / `StageApprovalCard.tsx` — collapsible breakdown sectie
- **Migratie**: 2 nieuwe RPC's (`delete_stage_results`, `admin_stage_points_breakdown`)

Geen schema-wijzigingen aan tabellen.
