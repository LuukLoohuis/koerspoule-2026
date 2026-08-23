# Handoff: De Koerskrant — web broadsheet + iOS-mobiel (opties 2a / 2b)

## Overzicht
Herontwerp van de Koerskrant-voorpagina in koerspoule-2026: de pagina moet als
gedrukte krant ogen (kolomlijnen, dubbele regels, initiaal, halftone-fotoplekken),
met daaronder de bestaande "premium Apple"-tegels en standbalk als klikbare kaarten.
Twee schermen: **web/desktop** (2a) en **mobiel/iOS** (2b).

## Over de designbestanden
`Koerskrant Redesign.dc.html` in dit pakket is een **design-referentie in HTML** —
een prototype dat look & gedrag laat zien, geen productiecode om te kopiëren.
Doel: deze schermen opnieuw opbouwen in de bestaande omgeving van de repo
(React + Vite + Tailwind + shadcn/ui, i18n via react-i18next), met de bestaande
tokens en patronen. Niet de HTML shippen.

Relevante turn in het bestand: sectie `#t2` → optie `#2a` (web) en `#2b` (mobiel).
Turn `#t1` is de eerdere ronde (1a/1b/1c) en dient alleen als vergelijking.

## Fidelity
**High-fidelity.** Kleuren, typografie, spacing en interacties zijn definitief bedoeld.
Bouw pixelnauwkeurig na met bestaande Tailwind-tokens; waar hieronder hex staat,
gebruik het corresponderende CSS-variabel/token uit `src/index.css` /
`tailwind.config.ts` in plaats van een losse hex.

## Doelbestanden in de repo
| Onderdeel | Bestand |
| --- | --- |
| Voorpagina-compositie (masthead, hoofdartikel, tegels, standbalk) | `src/components/karavaan/Voorpagina.tsx` |
| Hoofdartikel / verslag (initiaal, plaatsregel, bronregel) | `src/components/karavaan/Verslag.tsx` |
| Data + rubrieken/sectie-navigatie | `src/components/karavaan/KaravaanFeed.tsx`, `src/hooks/useKaravaanFeed.ts` |
| Sheet voor voorbeschouwing (mobiel) | `src/components/karavaan/Voorbeschouwing.tsx` + shadcn `Drawer`/`Sheet` |
| Tabbalk | `src/components/BottomNav.tsx` / `MobielTabBalk.tsx` |

## Scherm 1 — Web voorpagina (2a)

**Doel:** in één blik de dag lezen, daarna doorklikken naar rubrieken en je eigen stand.

**Layout** (container max ±1040px, paginapadding 24px 34px 18px, achtergrond `--card`/crème):
1. **Kioskregel** — flex space-between, Oswald 10.5px, letter-spacing .2em, uppercase,
   `text-muted-foreground`; links koers, midden datum, rechts etappe in accentkleur.
   `border-bottom: 1px solid` (border-token), padding-bottom 7px.
2. **Masthead** — grid `1fr auto 1fr`, gap 18px: hairline / titel / hairline.
   Titel: Playfair Display 900, 70px, line-height .9, letter-spacing -.035em, gecentreerd.
   Leus eronder: Source Serif 4 italic 13.5px, muted.
3. **Dubbele regel** — `border-top: 2.5px solid ink; border-bottom: 1px solid ink; height: 4px`.
   Dit gebaar herhaalt zich boven de tegelsectie en is dé krant-signatuur.
4. **Driekolomsgrid** `1.55fr 1fr .78fr`, geen gap; kolom 2 en 3 krijgen
   `border-left: 1px solid` + padding — dat zijn de kolomlijnen.
   - **Kolom 1 (hoofdartikel):** kicker-badge (Oswald 9.5px, uppercase, witte tekst op accent,
     padding 3px 7px, **geen** border-radius) → kop Playfair 900 47px/1.02, -.032em →
     chapeau Source Serif italic 16px → dubbele regel 3px → body in **twee subkolommen**
     (`grid 1fr 1fr`, gap 20px), Source Serif 15px/1.58, `text-align: justify; hyphens: auto`.
     De plaatsregel ("MONACO —") staat als **eigen block-regel** boven de tekst; de initiaal
     (`float: left`, Playfair 900 56px, line-height .8, padding 4px 7px 0 0) valt daarna op de
     échte eerste letter. (In de repo doet `Verslag.tsx` dit al via `::first-letter` in de
     `isLead`-variant — houd die logica, maar zet de plaatsregel erboven, niet ervoor.)
     Daaronder: "Lees het hele verslag" als Oswald-caps link met onderlijn (geen chevron-knop),
     uitklap → tweekolomstekst met `column-rule: 1px solid`.
     Bronregel: Oswald 9.5px caps, boven een hairline.
   - **Kolom 2:** halftone-fotoplek 150px met caption-balk (`rgba(20,18,16,.72)`, Oswald 9px caps)
     + cursief onderschrift; daaronder "Uit de perszaal": quotes gescheiden door hairlines,
     **geen kaartjes** (dat was de oude look).
   - **Kolom 3:** "Klassement na etapa 1" met stippellijnen (`border-bottom: 1px dotted`),
     tabular-nums; onderaan een klein weerbericht-blokje (`border-top: 2px solid ink`).
5. **Dubbele regel** → labelregel "Verder in de krant" (Oswald 10px caps, muted).
6. **Premium tegels** — `grid-template-columns: repeat(4, 1fr)`, gap 12px.
   Elke tegel: `background #fffdf7`, `border-radius 18px`, padding 13px 14px,
   `box-shadow: 0 0 0 1px rgba(20,18,16,.09), 0 1px 2px rgba(0,0,0,.05), 0 10px 22px -14px rgba(0,0,0,.4)`,
   rij: emoji in 34px cirkel (`#f1ead9`) + titel (DM Sans 700 13.5px, -.01em) + sub (DM Sans 11px muted).
   Hover: `translateY(-2px)` + diepere schaduw; active: `scale(.985)`;
   transition `.22s cubic-bezier(.2,.8,.2,1)`. Motion-reduce: geen transform.
7. **Standbalk** — één afgeronde balk (radius 20px, zelfde ring+schaduw), links de
   subpoule-kiezer (30px zwarte cirkel met initialen + naam + "jouw subpoule"),
   daarna cellen met `border-left: 1px solid rgba(20,18,16,.1)`:
   waarde DM Sans 700 19px tabular-nums, label 10px muted; rechts "+3 meer" in accent.
8. **Folio** — hairline + Oswald 9.5px caps: krantnaam / paginanummer / koers.

## Scherm 2 — Mobiel iOS (2b)
390×844, achtergrond `#f7f3e9`, scrollcontainer met `overscroll-behavior: contain`,
onderpadding 112px (vrijloop onder de tabbalk).

1. **Live-activity pill** — donkere pill (`#141210`, radius 22px, padding 10px 14px),
   pulserende accentstip (1.6s ease-in-out infinite, opacity 1→.25), tekst
   "Uitslag etapa 1 gefiatteerd · 17:42", rechts "+114" in accent.
2. **Krimpende kop** — bij `scrollTop > 46` verschijnt een sticky balk:
   `background rgba(247,243,233,.8)` + `backdrop-filter: saturate(180%) blur(22px)`,
   hairline onder, krantnaam Playfair 17px links, live-stip + "Etapa 1" rechts;
   in-animatie 280ms `cubic-bezier(.2,.8,.2,1)` van `translateY(-6px)`.
3. **Masthead** Playfair 900 38px + leus + dubbele regel (zelfde gebaar als web).
4. **Segmented control** — iOS-stijl: track `rgba(20,18,16,.06)`, radius 10px, padding 2px;
   actieve pill `#fbf8f0` + `box-shadow 0 1px 3px rgba(0,0,0,.14), 0 0 0 .5px rgba(0,0,0,.04)`,
   DM Sans 700 12.5px; inactief muted. Tabs: Voorpagina / Daguitslag / Perszaal.
5. **Hero** — halftone 200px, full-bleed (`margin: 0 -20px`), overlay
   `linear-gradient(to top, rgba(20,18,16,.9), transparent)`, kicker-badge + kop
   Playfair 900 32px in crème.
6. **Meta-regel** — "3 min lezen" · hairline · bron (Oswald 9px caps).
7. **Body** met blok-plaatsregel + initiaal 50px, uitklap "Lees het hele verslag".
8. **Pull-quote kaart** — radius 20px, Playfair italic 700 19px/1.28 + bronregel caps.
9. **Tegelgrid 2×2** — radius 20px, emoji 36px cirkel boven titel/sub;
   press: `scale(.965)` met platte schaduw (indruk van indrukken).
10. **Standbalk-kaart** — koprij (subpoule + chevron ›) + drie cellen met hairlines.
11. **Tabbalk** — `rgba(247,243,233,.78)` + `backdrop-filter: saturate(180%) blur(24px)`,
    hairline boven, 5 items (Krant/Ploeg/Stand/Subpoule/Meer) Oswald 9px caps;
    actief item krijgt accentkleur en een indicator die van 6px naar 16px breed groeit
    (transition .25s `cubic-bezier(.2,.8,.2,1)`); home indicator 126×5px.
12. **Sheet** — overlay `rgba(20,18,16,.35)` + blur(2px); paneel radius 26px boven,
    grabber 38×5px, in-animatie 420ms `cubic-bezier(.19,1,.22,1)` van `translateY(100%)`,
    max-height 76%, primaire knop `#141210` radius 16px met `scale(.97)` op press.
    Gebruik de bestaande shadcn `Drawer` en geef die deze maten mee.

## Interacties & gedrag
- Tegel of index-rij → opent de voorbeschouwing-sheet (mobiel) / navigeert naar de
  sectie (web, bestaande `naarSectie("krant-…")`-logica in `KaravaanFeed.tsx`).
- "Lees het hele verslag" → uitklap met fade-up 300ms; label wordt "Inklappen".
- Sticky kop puur op scrollpositie (drempel 46px), geen layout-shift.
- Alle presses ≥44px hitgebied; alle transforms achter `prefers-reduced-motion`.
- Ongelezen-stip op rubrieken blijft zoals nu (`kp_krant_gezien_v1` in localStorage).

## State
`tab: "krant" | "uitslag" | "perszaal"`, `leadOpen: boolean`, `sheetOpen: boolean`,
`scrolled: boolean` (uit scrollhandler). Data ongewijzigd uit `useKaravaanFeed`,
`useEtappeVerslag`, `useSubpoules`.

## Design tokens
- Papier/achtergrond `#fbf8f0` (web) / `#f7f3e9` (mobiel) — `--background`/`--card`
- Kaart-wit `#fffdf7`; tegelcirkel `#f1ead9` (`--paper`)
- Inkt `#141210` (`--ink`), body `#231f1a`, secundair `#4a443c`, muted `#7a7064`/`#8a8175`,
  hairline `#d3cabb` / `#ded5c6`, stippellijn `#cfc6b6`
- Accent (koersthema, tweakbaar): Vuelta `#C81E2D`, Tour `#F5C518`, Giro `#D6688F`
  → bestaande `--primary` / `--bolletjes-bright` / `--maillot-jaune`
- Type: Playfair Display 700/900 (koppen), Source Serif 4 400/600 + italic (lopende tekst),
  DM Sans 400/500/700 (UI), Oswald 400/500 (caps-labels, letter-spacing .14–.22em)
- Radii: 18px tegel (web), 20px tegel/kaart (mobiel), 22px pill, 26px sheet
- Schaduw (tegel): `0 0 0 1px rgba(20,18,16,.09), 0 1px 2px rgba(0,0,0,.05), 0 10px 22px -14px rgba(0,0,0,.4)`
- Easing: `cubic-bezier(.2,.8,.2,1)` (UI), `cubic-bezier(.19,1,.22,1)` (sheet)

## Assets
Fotovlakken zijn **halftone-placeholders** (CSS: twee `radial-gradient`-rasters van 6px,
`#8d8474` op `#cdc4b2`). Vervang door echte etappefoto's; behoud de caption-balk.
Emoji in de tegels komen uit de bestaande `Rubriek.emoji` in `Voorpagina.tsx`.

## Bestanden in dit pakket
- `Koerskrant Redesign.dc.html` — het prototype (secties `#t2` = 2a/2b; `#t1` = eerdere ronde)
