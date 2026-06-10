# Histogram redesign — "Aapscore distributie"

Doel: de bestaande histogram in de Dartpijl-tab krijgt de look van de referentie-poster. Alléén de grafiek-card (regel ~1010–1140 in `src/components/HorsCategorieTab.tsx`). De KPI-rij erboven en de mascotte-illustratie blijven onaangetast (jij levert zelf een PNG aan).

## Wat ik aanlever
- Wachten op jouw geüploade aap-PNG → in `src/assets/` zetten en het bestaande `monkeyDart`-import-pad daarheen wijzen. Voor nu blijft de huidige aap staan.

## Wat ik nodig heb van jou
- Eén PNG van de aap (cycling cap + dartpijl + fiets) met **transparante achtergrond**, ongeveer 800×1000 px, vintage stijl. Upload wanneer klaar — ik swap hem dan in.

## Visuele wijzigingen aan de grafiek-card

**Card-omhulsel**
- Achtergrond: warme crème (`#f3ead3` / vintage paper-token) i.p.v. `bg-card`.
- Border: dunne `--ink-faded` hairline, rounded-2xl, lichte papier-texture overlay (bestaande utility hergebruiken).

**Header in de card**
- Eyebrow "VERDELING · 5.000 WILLEKEURIGE PLOEGEN" — Oswald uppercase, donker sepia, tracking wijd.
- Titel "Aapscore distributie" — Playfair Display, fors, sepia.
- Subkop verplaatst naar onder de grafiek als x-as caption: "Bars links van jou (goud) zijn apen die jij verslaat".

**Histogram zelf** (Recharts, geen lib-wissel)
- Bars **rechthoekig** (radius `[0,0,0,0]`), smaller (`maxBarSize 18`), 1px donker sepia border via `stroke`.
- Kleuren: goud `#c9a227` voor `bucket ≤ userActual`, warm grijs `#bdb7a8` voor de rest. Geen gradient.
- Soft bell-curve overlay (`<Area>` of `<Line type="monotone">`) op basis van een normaal-fit (mean/std uit `monte`) — heel licht grijs, geen punten, achter de bars.
- CartesianGrid: alleen horizontale lijnen, zeer licht (`rgba(58,42,26,0.08)`), `strokeDasharray="2 4"`.
- Assen: Oswald 9px, sepia-tint, geen lijn/tick.

**Annotaties op de grafiek**
- **Jouw bar**: gouden stippellijn (dashed 4 2) i.p.v. solid; klein **kroontje (♛ SVG)** boven de top van de bar + label "Jij · {userActual} pt" in Playfair italic, zonder achtergrondbalk.
- **Gemiddelde**: dunne blauwe dashed line + label "Gemiddelde · {mean} pt" in Oswald uppercase 10px, blauw `#3b6fa0`.
- **Callout "Apen die jij verslaat"**: handgeschreven-achtige tekst (Caveat of Source Serif italic) links-boven boven het gouden gebied, met dun krul-lijntje (SVG path) dat naar de bars wijst. Alleen op `sm+` tonen.

**Footer-caption**
- Onder de chart, gecentreerd, kleine italic serif: "Bars links van jou (goud) zijn apen die jij verslaat".

## Bestanden
- `src/components/HorsCategorieTab.tsx` — alleen de chart-card block (regels ~1010–1140) herschreven. Geen logica/data-veranderingen, geen wijzigingen aan `monte`-berekening of KPI-rij.
- Geen nieuwe dependencies.

## Out of scope
- KPI-dashboard rij (gem. aap / diff / apen verslagen) blijft 1-op-1.
- Headline "63%" / `PercentileVerdict` blijft.
- Aap-illustratie wordt pas geswapt zodra jij de PNG uploadt.
