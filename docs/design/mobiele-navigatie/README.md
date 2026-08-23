# Handoff: Koerspoule mobiel — navigatie & schermen

## Overview
Herontwerp van de volledige mobiele ervaring van Koerspoule (repo `LuukLoohuis/koerspoule-2026`, branch `main`).
Doel: van vier overlappende navigatielagen naar twee, met dezelfde functionaliteit en dezelfde namen.
Tien schermen zijn uitgewerkt als aantikbaar prototype in twee visuele varianten (licht "papier" en donker "nacht").

## About the Design Files
De bestanden in dit pakket zijn **design-referenties, gemaakt in HTML**. Het zijn prototypes die de bedoelde
vormgeving en het gedrag laten zien — geen productiecode om over te nemen. De opdracht is om deze ontwerpen
te **herbouwen in de bestaande omgeving van de repo**: React 18 + Vite + TypeScript, Tailwind (met de
HSL-variabelen uit `src/index.css` en `tailwind.config.ts`), react-router, lucide-react iconen, shadcn/ui in
`src/components/ui/`, i18n via `react-i18next`. Gebruik die patronen; neem geen inline styles uit de HTML over.

## Fidelity
**Hi-fi.** Kleuren, typografie, spacing, radii, interacties en copy zijn definitief bedoeld. Wijk alleen af waar de
themavariabelen van de repo een andere waarde voorschrijven — de themavariabele wint altijd van een hex uit dit document.

---

## 1. Navigatie — het hart van de wijziging

### Nu (te vervangen)
| Niveau | Component | Probleem |
| --- | --- | --- |
| 1 | `src/components/BottomNav.tsx` — 5 items | Drie items wijzen naar `/mijn-peloton?tab=…`, dus "waar ben ik" is dubbelzinnig |
| 2 | `?tab=` op `src/pages/MijnPeloton.tsx` | Sectie-niveau in de URL, niet zichtbaar als UI-laag |
| 3 | `src/components/MobielTabBalk.tsx` | 5–6 scrollende subtabjes (Hors Catégorie, SubpouleManager) — onleesbaar op een telefoon |
| 4 | `src/components/FloatingTabSwitcher.tsx` | Vierde manier om hetzelfde te doen |

### Nieuw
**Niveau 1 — tabbalk onderin.** Vijf items, icoon (22×22, stroke 1.8 / actief 2.5) + label 10px/700 uppercase-loos,
minimaal 56px hoog, streep van 2×22px boven de actieve tab in `--acc`, inactief `--mut` met opacity .72.

| Tab | Route | Landing |
| --- | --- | --- |
| Krant | `/karavaan` | Vandaag: etappe, deadline, CTA, eigen stand, verslag, daguitslag |
| Volgwagen | `/mijn-peloton` | Mijn ploeg (naam blijft "Volgwagen") |
| Uitslagen | `/uitslagen` | **Klassement** (eerste segment), Daguitslag, Mijn punten |
| Subpoules | `/mijn-peloton?tab=subpoules` | Lijst subpoules → subpoule-detail |
| Hors Cat. | `/mijn-peloton?tab=hors` | Blijft in de hoofdnav (expliciete eis) |

Klassement is géén eigen tab meer: het is het eerste segment onder Uitslagen (1 tap).
Subpoules kwam op die plek in de hoofdnav.

**Niveau 2 — segmented control** in de header, max 3 opties, alleen waar nodig:
- Uitslagen: `Klassement · Daguitslag · Mijn punten`
- Volgwagen: `Renners · Punten · Joker`
Vorm: rij met `--chip` achtergrond, padding 3px, radius 11px; actief segment `--card` + `0 1px 2px rgba(0,0,0,.16)`, radius 9px, min-height 34px, 13.5px/600.

**Niveau 3 — subsecties als lijstrijen, niet als tabjes.** De scrollende `MobielTabBalk` verdwijnt op mobiel.
- Hors Catégorie (was 5 subtabjes) wordt een kaart met 5 rijen, elk met sublabel en chevron, min-height 56px:
  Dartpijl · Pelotonkeuzes · De Wielerdirecteur · The Emirates · Benchmark
- Subpoule-detail (was 6 subtabjes): drie chips `Klassement · Verloop · Deelnemers`; Daguitslag, Heatmap,
  Streekgenoten en "Deelnemers uitnodigen" achter een **Meer**-knop in een bottom sheet.
- Klassement: filterchips `Alles · Mijn subpoules · Woonplaats · Vrienden` (chip = filter, nooit navigatie).
Chips: min-height 34px, radius 17px, 1px rand `--line`; actief = achtergrond `--ink`, tekst `--bg`.

**Niveau 4 — bottom sheet** voor acties: renner kiezen, sorteren, subpoule aanmaken/deelnemen, "Meer".
Radius 26px boven, greep 38×4px, kop 16.5px/700 + "Sluiten" in `--acc`, rijen min-height 54px,
max-hoogte 76% van het scherm, scrim `rgba(0,0,0,.42)`, animatie `translateY(102%) → 0` in 420ms `cubic-bezier(.19,1,.22,1)`.

### Flows (in taps)
- Voorspelling opslaan: Krant → CTA → slot → renner = 4 taps.
- Eigen positie hoofdklassement: 1 tap (Uitslagen) of via de stand-strip op de Krant.
- Eigen positie in subpoule: Subpoules → subpoule → (Klassement staat er al) = 2–3 taps.
- Punten van gisteren: Uitslagen → Mijn punten = 2 taps.

---

## 2. Schermen

Alle schermen: header (statusbalk + bovenkop + titel + avatar rechtsboven → Meer) met `backdrop-filter: blur(18px)`
op `--bar`, scrollend midden, tabbalk onderin. Kaarten: `--card`, 1px `--line`, radius 18–22px, schaduw `--sh`.
Getallen altijd `font-variant-numeric: tabular-nums`.

1. **Krant (Vandaag)** — hero-kaart met etappe (`Playfair Display` 23px/800), meta-regel, profielstrook (64px,
   clip-path silhouet), primaire CTA (48px, `--acc`, wit, radius 14px) + secundaire knop "Etappe";
   stand-strip (positie 30px/700 + mover, punten + delta) → klassement; "Mijn subpoules"-rij → Subpoules;
   verslagkaart met foto (150px) + serif kop; top-3 daguitslag.
2. **Etappe-detail** — datum + type-badge, titel, profiel 96px, 2×2 feitengrid (Afstand, Hoogtemeters, Start, Finish),
   kaart "Mijn voorspelling" met drie regels + "Voorspelling wijzigen".
3. **Voorspellen** — deadline-kaart met resterende tijd in `--acc`; drie slots (min-height 64px, gevuld = solid rand +
   gevulde bol `--acc`, leeg = dashed rand + `--mut`); tap opent renner-sheet; alle drie gevuld ⇒ auto-opslaan,
   toast "Voorspelling opgeslagen" (2.6s) + inline bevestiging met groene linkerrand.
4. **Klassement** (segment onder Uitslagen) — filterchips, telling + Sorteren; rijen: positie (23px), mover
   (▲ `--pos` / ▼ `--neg` / —), ploegnaam 15.5px/600 + deelnemersnaam 12px `--mut`, punten 16px/700 + verschil.
   Eigen rij: achtergrond `--card2`, positie in `--acc`, naam 700.
5. **Uitslagen · Daguitslag** — rijen met positie, rennernaam + ploeg, tijd/achterstand.
6. **Uitslagen · Mijn punten** — per voorspelling +25 / +10 / 0 in `--pos`, joker-regel in `--gold`, totaalregel.
7. **Subpoules** — kaarten met initialen-tegel 44px radius 14px, naam 16.5px/700, regel, eigen positie 19px/700 + "van N";
   onderaan "Subpoule aanmaken" met dashed rand → sheet (nieuw / deelnemen met code).
8. **Subpoule-detail** — samenvattingskaart (eigen positie 34px/700, "van 18 · punten · N achter de leider" —
   afgeleid uit dezelfde bron als de rijen), chips + Meer, klassement-/verloop-/deelnemerslijst.
9. **Volgwagen** — statistiekgrid (Punten, Positie, Jokers), rennerlijst met positienummer-tegel, naam, ploeg, punten.
10. **Hors Catégorie** — uitleg-kaart met "Renner kiezen" (sheet) + Regels; onderdelenlijst (5 rijen); "Nog in de race"-lijst
    met keuze en stip `--pos`/`--neg`.
11. **Meer** — profielkaart, lijst (Subpoules, Regels, Uitleg, Prijzen, Meldingen, Taal, Uitloggen).
12. **Statussen** — skeleton (shimmer 1.1s lineair), empty state, error (linkerrand `--neg`), succes (`--pos`), disabled knop.

## Interactions & Behavior
- Press-feedback: `transform: scale(.94)` op navknoppen, `.975–.99` op kaarten/knoppen, 160ms.
- Schermwissel: 260ms `cubic-bezier(.2,.8,.2,1)`, opacity 0→1 + translateY 8px→0.
- Toast: 2.6s, positie 98px boven de onderkant, `--ink` op `--bg`.
- Alle raakvlakken ≥ 44px hoog; tabbalk 56px + safe-area.
- `prefers-reduced-motion`: laat animaties vallen, behoud de eindstaat.

## State Management
`tab` (actieve hoofdtab) · `scherm` (krant | etappe | voorspellen | uitslagen | subpoules | subpoule | volgwagen | hors | meer | states) ·
`seg` per tab · `chip` (klassementfilter) · `subSeg` (subpoule) · `sheet` (null | renner | sorteren | aanmaken | subMeer | hors) ·
`slot` (0–2) · `picks` (3 renners) · `opgeslagen` · `toast`.
In de repo: hoofdtab en sectie horen in de URL (`/uitslagen?sectie=klassement`), sheets en toasts in lokale state.
Data komt uit de bestaande hooks: `useResults`, `useSubpoules`, `useSubpouleEntries`, `useEntry`, `useDeadline`,
`useHorsCategorieSummary`, `useKaravaanFeed`.

## Design Tokens
Licht (papier): `--bg #F4F1EA` · `--card #FFFFFF` · `--card2 #FAF8F3` · `--ink #14120F` · `--ink2 #4A443B` ·
`--mut #8B8478` · `--line rgba(20,18,15,.10)` · `--line2 rgba(20,18,15,.06)` · `--acc #B0121F` · `--gold #A8813A` ·
`--pos #1E7A4B` · `--neg #B0121F` · `--chip #EAE5DA` · `--bar rgba(255,255,255,.82)`.

Nacht: `--bg #0E0E11` · `--card #18181C` · `--card2 #1E1E23` · `--ink #F5F3ED` · `--ink2 #C7C3BA` ·
`--mut #8B8880` · `--line rgba(255,255,255,.11)` · `--acc #E23B48` · `--gold #D9AE63` · `--pos #43C489` ·
`--neg #E23B48` · `--chip #26262C` · `--bar rgba(24,24,28,.82)`.

Schaduw: `0 1px 2px rgba(20,18,15,.05), 0 8px 22px -14px rgba(20,18,15,.35)` (nacht: `0 1px 2px rgba(0,0,0,.4), 0 10px 26px -14px rgba(0,0,0,.7)`).

Typografie: UI in **DM Sans** (400/500/600/700); verhalen en etappenamen in **Playfair Display** (800), letter-spacing −.02em.
Schaal: 10.5px/700 uppercase labels (letter-spacing .14em) · 12–13px meta · 14.5px body · 15.5px lijstitem ·
16.5–17px kaarttitel · 22–26px kop · 30–34px cijfer.
Spacing: 4 · 6 · 9 · 13 · 14 · 18 (schermmarge) · 22 px. Radii: 9 · 11 · 14 · 18 · 20 · 22 · 26 px.

## Assets
Geen nieuwe assets. Foto's zijn placeholders — gebruik de bestaande beeldbronnen van de repo.
Iconen: de vijf navglyphs komen overeen met lucide `Newspaper`, `Car`, `Flag`, `Users`, `Bike` — houd lucide-react aan.

## Te wijzigen bestanden in de repo
- `src/components/BottomNav.tsx` — items en actief-logica (Klassement eruit, Subpoules erin).
- `src/pages/Results.tsx` / `src/components/ResultsView.tsx` — segmented met Klassement · Daguitslag · Mijn punten.
- `src/pages/MijnPeloton.tsx` — `?tab=` reduceren tot Volgwagen / Subpoules / Hors.
- `src/components/HorsCategorieTab.tsx` — mobiel: `MobielTabBalk` vervangen door onderdelenlijst.
- `src/components/SubpouleManager.tsx` — mobiel: 3 chips + "Meer"-sheet.
- `src/components/MobielTabBalk.tsx` — alleen nog desktop-/legacygebruik, of verwijderen.
- `src/components/FloatingTabSwitcher.tsx` — verwijderen.

## Files
- `Koerspoule Mobiel.dc.html` — canvasdocument: beide varianten naast elkaar + de navigatie-rationale.
- `KoerspouleApp.dc.html` — het prototype zelf (alle schermen, states, sheets). Prop `thema`: `licht` | `nacht`.
- `support.js` — runtime voor de HTML-prototypes; niet naar de repo kopiëren.

Open `Koerspoule Mobiel.dc.html` in een browser om beide varianten aan te tikken.
