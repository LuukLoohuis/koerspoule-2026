## Doel

Deelnemers laten zien tot welke etappe de uitslagen actueel zijn, en de fiatteer-flow positioneren als een controlestap nadat de berekening al heeft plaatsgevonden.

## 1. "Bijgewerkt t/m" indicator voor deelnemers

Op twee plekken een duidelijke statusbalk tonen die zegt tot wanneer de uitslag is bijgewerkt, gebaseerd op de laatst gefiatteerde etappe (`stages.results_status = 'approved'`, hoogste `stage_number`).

**Locatie A — `src/pages/Results.tsx`**
Boven de tabs (Klassement / Etappes), naast de titel "Uitslagen & Klassement":
- Vintage badge/strip met tekst:
  `Bijgewerkt t/m etappe {n} — {stage_name} ({datum gefiatteerd})`
- Als nog niets is gefiatteerd: `Nog geen uitslagen bijgewerkt.`

**Locatie B — `src/components/MyResultsPanel.tsx`** (Mijn Peloton → Uitslagen)
Bovenaan de panel, boven de sub-nav (Etappes / Deelnemers):
- Zelfde compacte indicator in retro-border stijl.

**Data**
Nieuwe lichte hook `useLastApprovedStage(gameId)` in `src/hooks/useResults.ts` die de hoogste `approved` stage teruggeeft (`id, stage_number, name, approved_at`). Direct via `supabase.from('stages').select(...).eq('results_status','approved').order('stage_number', desc).limit(1)`.

## 2. Fiattering herpositioneren als controle-stap

In `src/components/admin/ApprovalsTab.tsx` de tekstuele framing aanpassen zodat duidelijk is dat de berekening al gebeurd is en fiatteren puur een controle/publicatie-actie is voor de admin:

- Card-titel "Te fiatteren" → blijft, maar subtekst toevoegen:
  *"De punten zijn al berekend. Fiatteren maakt de uitslag zichtbaar voor deelnemers."*
- Confirm-dialog `approve()`: tekst wijzigen naar
  *"Uitslag publiceren naar deelnemers? De punten zijn al berekend."*
- Knop "Fiatteren" → behouden, maar tooltip/subtekst "controleren & publiceren".
- Een extra "Bekijk uitslag" link (route naar `Results`-pagina filtert op deze stage) is *niet* nodig nu — admin kan via de Uitslagen-tab de stage al openen. Alleen de framing-tekst aanpassen.

Geen wijzigingen aan de RPC's (`approve_stage_results`, `calculate_stage_scores`) — de huidige flow doet al precies dit (berekening per stage, totaalranking refresh bij approve). Punten worden alleen zichtbaar voor deelnemers door de RLS-policy op `stage_points`/`stage_results` (`results_status = 'approved'`), wat overeenkomt met het gewenste gedrag.

## Bestanden

- `src/hooks/useResults.ts` — nieuwe hook `useLastApprovedStage`
- `src/pages/Results.tsx` — indicator boven tabs
- `src/components/MyResultsPanel.tsx` — indicator boven sub-nav
- `src/components/admin/ApprovalsTab.tsx` — framing-tekst aanpassen

Geen DB-migratie nodig.
