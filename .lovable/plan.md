# Premium histogram — Aap met de dartpijl

Het huidige histogram is te krap en heeft te veel ruis (KPI-header, mascotte over de chart, smalle staven, balloon op kleine breedte). De reference toont een rustige, brede, editorial verdeling. Ik herbouw `src/components/horscat/AapscoreDistributie.tsx` zodat het er als een echte statistische grafiek uitziet.

## Wat verandert

**Layout & ademruimte**
- Card wordt full-width binnen zijn container, met ruime padding (40px desktop, 20px mobiel).
- Mascotte (aap) verhuist naar boven-rechts buiten het plot-gebied, kleiner (60–72px), als subtiel merk-element — niet meer over de chart.
- KPI-header (3 tegels) wordt verwijderd uit dit component. Die info zit al in `PercentileVerdict`/elders; hier alleen titel + deck + chart, conform reference.

**Titel-blok (matcht reference)**
- Eyebrow: `VERDELING SIMULATIES` (mono, uppercase, tracking 0.18em).
- Deck: "Verdeling van 5.000 gesimuleerde apenteams, zelfde puntentelling als jouw ploeg."
- Geen pr-padding meer nodig zonder mascotte-overlap.

**Histogram (de kern)**
- Hoogte: 320px desktop / 240px mobiel (was 220/180) → echte chart-proporties.
- Staven: breder, met `gap-[2px]` i.p.v. `gap-px`, zachte top-corners (`rounded-t-[2px]`).
- Kleur staven: warme greige (`hsl(var(--ink-sepia) / 0.22)`), user-bin in vol goud (`--vintage-gold`) — exact zoals reference.
- Y-as: 4 gridlines (dashed, lichter), labels links buiten het plot-gebied met vaste 40px gutter (niet meer overlappend met bar 0).
- X-as: solid baseline, ticks elke 200pt (1200, 1400, … 2400), labels in serif/sans 12px.
- X-as titel: "Score (punten)" gecentreerd onder de ticks.
- Y-as titel: "Aantal apenteams" linksboven, klein mono.

**Jouw-team annotatie**
- Stem in goud, dunner (1.5px), met kleine cirkel op bar-top.
- Balloon: witte card met subtiele goud-rand, bredere padding (12px 16px), tekst hierarchy:
  - "Jouw team" — 13px semibold, ink
  - "1659 pt" — 28px bold, goud (was 20px)
  - "beter dan 51% van de apen" — 12px italic serif
- Balloon zit altijd net boven de user-bar (niet vastgeplakt aan top van plot), met pijltje/stem naar beneden.
- Slimme align: als user-bin in linker/rechter 15% zit, klap balloon naar binnen toe.

**Gemiddelde-marker**
- Optioneel houden, maar dunner en lichter zodat hij niet concurreert met de gouden user-stem. Label onder de baseline verwijderen (te druk in de reference-stijl).

## Mobile

- Card-padding 16–20px.
- Chart-hoogte 240px, ticks elke 400pt (1200, 1600, 2000, 2400).
- Balloon iets compacter (max-width 150px) maar zelfde hierarchie.

## Wat niet verandert

- Data-contract (`dist`, `userActual`, `mean`, `beatPct`, `monkeyCount`) blijft identiek — geen call-site updates nodig.
- Animaties (rAF count-up, scaleY-in van staven) blijven, maar count-up gaat weg samen met de KPI-header.
- Verdict-banner (`PercentileVerdict`) en explainer blijven los staan boven/onder dit component.

## Bestanden

- `src/components/horscat/AapscoreDistributie.tsx` — volledige rewrite van de render, props ongewijzigd.

Geen migraties, geen nieuwe deps, geen wijzigingen aan call-sites.
