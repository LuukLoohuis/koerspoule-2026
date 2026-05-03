## Doel

De huidige "Verloop per etappe"-grafiek in `src/components/SubpouleStandings.tsx` toont cumulatieve **punten**. We bouwen hem om naar een echte **klassement-progressie**: één lijn per deelnemer, etappes op de X-as, **positie** op de Y-as (1 bovenaan, omgekeerd), met bolle markers per etappe en een rijke tooltip.

## Wijzigingen in `SubpouleStandings.tsx`

### 1. Data: cumulatief → rang per etappe
Naast de bestaande cumulatieve som per gebruiker berekenen we per etappe de **ranking binnen de subpoule**:
- Loop door etappes (gesorteerd op `stage_number`).
- Houd per `user_id` cumulatieve punten bij.
- Sorteer leden op cumulatief punten (desc) en geef ze rang 1..N (gelijke punten = gelijke rang).
- Sla per stage-row op: `rank_<user_id>`, `pts_<user_id>`, `delta_<user_id>` (punten in die etappe).

### 2. Y-as = positie (omgekeerd)
- `<YAxis reversed domain={[1, memberRows.length]} allowDecimals={false} ticks={[1,2,3,...,N]} />`
- Label: "Positie". Tick "1" krijgt subtiele goud-accent via `tickFormatter`.

### 3. X-as = etappes met markers
- Tick per etappe `E1..EN`, `interval={0}` op desktop, `interval="preserveStartEnd"` + kleinere font op mobile (via `useIsMobile`).
- Voeg per etappe een `<ReferenceLine x="E{n}" />` met dunne stippellijn voor visuele stage-markers.
- Markeer **laatste/huidige etappe** met een dikkere `ReferenceLine` in primary kleur + label "Nu".

### 4. Bold, contrasterende palette
Vervang `LINE_COLORS` door een 12-kleuren bold palette (Tableau-achtig), bv.:
```
#E6194B, #3CB44B, #4363D8, #F58231, #911EB4, #42D4F4,
#F032E6, #BFEF45, #FABED4, #469990, #9A6324, #800000
```
Gebruikt voor zowel legenda-bullets, member-list-bullets als chart-lijnen (consistente mapping per `user_id` index).

### 5. Lijnen + dots
- `<Line type="monotone" strokeWidth={isHighlighted ? 3.5 : 2} dot={{ r: 3 }} activeDot={{ r: 6 }} />`
- Niet-gehighlighte lijnen blijven volledig zichtbaar (opacity 0.85 ipv huidige 0.28) zodat alle deelnemers zichtbaar blijven; gehighlighte lijn krijgt extra dikte + dropshadow filter.
- Verwijder gradient `Area` (was puntgebaseerd, niet zinvol bij rank).

### 6. Rijke tooltip
Custom `content`-renderer voor `<Tooltip>`:
- Header: "Etappe N" (volledig: "Etappe 5 — {stage.name}" als beschikbaar, anders alleen nummer).
- Per zichtbare deelnemer een rij gesorteerd op rang:
  - kleur-bullet • naam • `#rang` • `{cum} pt` • `(+{delta})` in die etappe
- Highlight de actieve user-rij vet.

### 7. Highlight huidige etappe
- Bepaal laatste etappe met `stage_points` (max stage_number waarvoor er punten zijn). Markeer met dikkere primary `ReferenceLine` + tekstlabel "Laatste".

### 8. Mobile-friendly
Met `useIsMobile()`:
- Hoogte: `h-72` mobile, `h-96` desktop.
- X-as font 9px mobile / 11px desktop, `interval="preserveStartEnd"`.
- Alleen tick-labels voor elke 2e etappe op mobile als N > 10.
- Toggle-pillen blijven scrollbaar (`overflow-x-auto` toevoegen).
- Tooltip wrapper max-width `260px`, kleinere font op mobile.

### 9. Kleine UX-verbeteringen
- Onder de grafiek een korte legenda-uitleg: "1 = leider, hoger getal = lagere positie."
- Kleurbullets in de standings-tabel (boven) blijven gesynchroniseerd met de chartkleuren.
- "Toon alles / Verberg alles"-knop blijft.

## Bestanden
- `src/components/SubpouleStandings.tsx` — alle bovenstaande wijzigingen (palette, data-transform, chart-config, tooltip, mobile).

## Niet gewijzigd
- Standings-tabel logica, `TeamComparison`, hooks, DB. Alleen visualisatie.
