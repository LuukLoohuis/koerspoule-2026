# La Salle de Course — Design Specification

Referentie voor alle "La Salle de Course"-dashboardcomponenten (Volgwagen →
Mijn Ploeg, `src/components/MyTeamPanel.tsx`). Tokens staan gescoped in
`src/styles/salle-de-course.css` onder `.salle-de-course`.

> Elke visuele wijziging aan het dashboard volgt deze spec. Lees dit bestand
> vóór je iets aanpast.

## Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| INK | #0F0F10 | Primary text, outlines |
| PANEL | #1A1A1B | Dark instrument panels, radio section |
| PAPER | #F5EDD8 | Light card background, metric cards |
| AMBER | #D49A1A | Primary accent, flip clock digits, active states |
| OLIVE | #5C6B3B | Secondary accent, positive deltas |
| RED | #B94A48 | Negative deltas, alerts |
| MUTED | #6B665C | Labels, sublabels, secondary text |

## Typography

- **Heading 1**: Oswald font, font-black, uppercase, tracking-tight (team name, large values)
- **Heading 2**: font-display, font-semibold, small caps (section headers like TABLEAU DE BORD)
- **Label**: font-mono, text-[9px]–[11px], uppercase, tracking-[0.18em] (SOUS-PELOTON etc.)
- **Body**: font-serif, regular weight, sentence case (subtitles, descriptions)
- **Data/Numbers**: font-mono, tabular-nums, font-bold (all numeric readings)

## Component patterns

### Metric Card (light — SOUS-PELOTON style)
- Background: `--sdc-paper` (#F5EDD8)
- Border: 1px solid rgba(15,15,16,0.15)
- Optional left accent border: 3px solid `--sdc-amber` of `--sdc-olive`
- Label: font-mono uppercase text-[9px] tracking-[0.18em] `--sdc-muted`
- Value: Oswald font-black text-3xl `--sdc-ink`
- Delta: ▲ in `--sdc-olive`, ▼ in `--sdc-red`, font-bold text-sm

### Metric Card 2 (with icon — MONKEY IQ style)
- Zelfde als Metric Card, met icon top-left
- Icon: stroke style, `--sdc-amber`, 20px
- Value color: `--sdc-amber` voor Hors Cat.-metrics

### Score Flip (flip clock)
- Container: `--sdc-panel` background
- Digit tile: `--sdc-panel` bg, `--sdc-amber` text, Oswald font-black
- Border tussen tiles: 1px solid rgba(255,255,255,0.1)
- Center split line: 1px solid rgba(0,0,0,0.4)
- Glow: text-shadow 0 0 12px rgba(212,154,26,0.5)

### LIVE badge
- Background: `--sdc-panel`
- Tekst "LIVE" in `--sdc-red`, font-mono font-bold text-[10px] uppercase
- Dot: 6px cirkel, `--sdc-red`, CSS pulse (`.sdc-live-dot`)

### Radio Tuner bar
- FM/AM-labels: font-mono text-[8px] `--sdc-muted`
- Frequentienummers: font-mono text-[8px] `--sdc-muted` tabular-nums
- Active marker: 2px verticale lijn `--sdc-amber`
- Background: `--sdc-panel`

### Progress Line (altitude profile)
- SVG polyline/path, stroke `--sdc-amber`, stroke-width 1.5, geen fill
- Background: `--sdc-panel`
- Finish-vlag icoon rechts
- NB: alleen renderen met échte data — geen verzonnen hoogteprofielen.

### Radio Knob
- CSS-only: ronde div (`.sdc-knob`), radial-gradient voor 3D
- Donkere basis (#1A1A1B), highlight rgba(255,255,255,0.15) top-left arc
- Marker-lijn: 2px `--sdc-amber`, roteert via CSS var `--sdc-knob-rot`
- Label eronder: `.sdc-knob-label` (mono 7px, MUTED)

### Recessed inset (instrument-paneel) — `.sdc-inset`
- Donker instrument dat IN het console ligt i.p.v. zweeft. GEEN drop-shadow.
- Background `--sdc-panel`; border 1px rgba(255,255,255,0.08);
  box-shadow `inset 0 2px 7px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)`
- Wordt gebruikt voor LIVE+grille, tuner+knobs+fietser-schets, comm-unit (knobs).
- Alle instrumenten zijn CSS/SVG (TunerBar/Knob/ScopeSketch) — geen hardware-PNG's meer.

### Hoek-schroefjes — `.sdc-screw`
- 8px (7px) cirkel, radial-gradient. Gedeeld door paper-console (`.sdc-screw--paper`,
  lichte variant) én donkere insets, voor één samenhangend toestel.
- Absoluut in de vier hoeken (6px offset).

### Mobiele cockpit-band
- < lg: zijkolom vervalt; bovenaan één full-width `.sdc-inset` met LIVE-dot +
  live klok + mini-TunerBar. Zware hardware (knobs/scope/mic) is desktop-only.

## Texture classes (in salle-de-course.css)

- `.sdc-paper-texture`: bg #F5EDD8 + subtiele noise (dot-grid pseudo)
- `.sdc-panel-texture`: bg #1A1A1B + zeer subtiele kras-overlay (::after)
- `.sdc-grille`: dot-grid via `radial-gradient(circle, #333 1px, transparent 1px)`, size 6px 6px

## Layout grid

- Console-interieur (binnen `.sdc-frame`): één doorlopend BEIGE papieroppervlak
  (`.sdc-paper-texture`), géén donkere vulling. De radio-instrumenten, de
  mobiele cockpit-band én de étappe-onderbalk liggen als DONKERE recessed insets
  (`--sdc-panel` + inset-shadow) op dat beige oppervlak. De linker dashboardkaart
  smelt samen met het interieur (hairline `rgba(26,22,18,0.18)` + subtiele
  inset-highlight, geen harde slagschaduw).
- Desktop (lg+): main content links + radioconsole (3 `.sdc-inset`-panelen) rechts (240px)
- < lg: verticaal gestapeld → mobiele cockpit-band (boven) → papieren dashboard
  (header + tableau 2-koloms + détails) → étape-profielband (onder)
- Origineel desktop: main content 75% breed links + radiopaneel 25% rechts
- Main content rijen: header / tableau de bord (2×3) / détails (4-kolom) / bottom bar
- Interne borders: 1px solid rgba(15,15,16,0.12) op paper, rgba(255,255,255,0.08) op panels
- Hoek-schroefjes: 8px cirkels, `--sdc-muted`, absolute in kaarthoeken

## Icons

Stijl: stroke-only, geen fill, strokeWidth 1.5, kleur erft van parent.
Gebruikt (lucide-react): `Target` (Monkey IQ), `Crown` (Emirates),
`ClipboardList` (Wielerdir.), `Flag` (beste etappe), `Shirt` (topscorer).
Delta-pijlen: custom inline SVG-driehoeken in `--sdc-olive` / `--sdc-red`.

## Regels

1. Decoratieve chrome (radio, knoppen, mic, scope): `aria-hidden`,
   `pointer-events-none`, weggelaten/subtiel op mobiel.
2. Geen verzonnen data (telemetrie, hoogteprofielen) — alleen velden die
   aantoonbaar in de repo bestaan.
3. Thema-accent waar relevant via bestaande tokens (`--primary`,
   `--vintage-gold`); de sdc-kleuren zijn het vaste cockpit-palet.
4. `prefers-reduced-motion`: alle animaties uit.
