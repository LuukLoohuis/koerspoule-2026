# Handoff: Live Meermarathon — live tracker & virtuele uitslag

## Overview
A live-follow view for the "Meermarathon" fantasy game inside an existing schaats-poule app (tab `Volgwagen › Live`). It shows the riders of one marathon race on a schematic 400 m ice rink, clustered into the race's real tactical groups (uitlopers +1/+2/+3 laps, kopgroep, peloton, achterblijvers), highlights the user's own 5 riders, and computes a **virtual result** with the game's points scale so the user sees live what their team is scoring.

Source of truth for live data (not yet connected): `https://livemarathon.schaatsen.nl/baan/Haaksbergen`. The prototype runs on mock data with a built-in simulation loop.

Races: every Saturday evening from late October — dames first (80 laps), then heren (125 laps), 400 m track. Lap counts are admin-configurable.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior, not production code to copy. The task is to **recreate this design in the target codebase's existing environment** (React/Vue/Svelte/native, whatever the poule app uses) with its established patterns, components, and data layer. If no environment exists yet, pick the most appropriate framework and implement it there.

`Live Meermarathon.dc.html` is a single-file component: markup in the `<x-dc>` template, all logic in the `Component` class at the bottom of the file (simulation, group model, positioning math, scoring). `support.js` is only the local runtime that renders it — do not port it.

## Fidelity
**High fidelity.** Final colors, typography, spacing, sizes and interaction behavior are decided; recreate pixel-close using the codebase's own primitives. Two things are deliberately provisional:
- all rider/team data is mock,
- the simulation loop (`setInterval`, 120 ms) stands in for the real feed and should be replaced, not ported.

## Screens / Views

### 1. Live tracker (single view, no sub-navigation)
**Purpose:** during the race, see where your riders are on the rink, which tactical group they're in, and how many points they're virtually scoring.

**Page layout**
- Page background `#f4f2ee`; content container `max-width: 1400px`, centered, padding `20px 20px 56px`.
- Vertical stack: header → KPI strip → two-column main row.
- Main row: `display:flex; flex-wrap:wrap; gap:18px; align-items:flex-start`
  - left column `flex: 1 1 620px; min-width: 340px` (rink card)
  - right column `flex: 1 1 330px; min-width: 300px` (Mijn rijders + Virtuele uitslag)
  - Below ~980 px the columns wrap to a single stack — no media queries used; flex-basis does the work. Verified on phone and desktop.
- Footer note, monospace 10px uppercase `#a3a99f`: “Demodata · groepen afgeleid uit rondestand en tijdverschil · koppeling livemarathon volgt”. Replace/remove once the feed is live.

**Header**
- Row: `display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:18px`.
- LIVE badge: `#d81f26` bg, white text, `padding:4px 9px`, `radius:4px`, monospace 11px, `letter-spacing:.16em`; inside a 6px white dot animated with keyframe `livepulse` (1.4 s ease-in-out infinite, opacity 1→.35, scale 1→.8).
- Next to badge, same monospace/11px/`.18em`/`#6b7c92`: “Haaksbergen · natuurijsbaan 400 m”.
- `h1`: “Meermarathon — Heren” (or “— Dames”), 34px/700, `letter-spacing:-.02em`, `line-height:1.05`, `margin:10px 0 0`.
- Sub-line 14px `#6b7c92`: “Zaterdagavond · 20:30 heren · 44 rijders aan de start”.
- Right side, right-aligned: label “MIJN PLOEG” (monospace 11px `.18em` uppercase `#6b7c92`) + team name 19px/600.

**KPI strip** — 4 cards, `display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:2px; background:#dcd8d0; border:1px solid #dcd8d0; border-radius:10px; overflow:hidden` (the 2px gap on a tan background reads as hairline dividers). Each card `padding:16px 18px`, white text, navy gradient (left→right): `linear-gradient(140deg,#0f2f5c,#17457f)`, `(#123a6d,#1a4f8f)`, `(#17457f,#1f5aa3)`, `(#1b4f8d,#2465b3)`.
Per card: label monospace 10px `.2em` uppercase `#9dbde3`; value 30px/700 `-.02em` + unit 12px `#9dbde3`, `margin-top:8px`, baseline-aligned, gap 6px.
1. **Virtuele punten** — team total · `pt`
2. **Mijn rijders in koers** — active count · “van 5”
3. **Ronde** — current lap · “/ 125”
4. **Te gaan** — laps remaining · “rondes · 30.0 km”

**Rink card** — white, `border:1px solid #e4e0d8`, `radius:14px`, `padding:18px 18px 22px`.
- Card head row (`space-between`, wrap, gap 10px, `margin-bottom:14px`): left label “OP DE BAAN” (monospace 11px `.2em` uppercase `#6b7c92`); right legend “= mijn rijder” with a 9px `#d81f26` dot, `box-shadow:0 0 0 3px rgba(216,31,38,.18)`.
- **Rink** container: `position:relative; width:100%; aspect-ratio:2/1; border-radius:14px; overflow:hidden; background:linear-gradient(155deg,#eef6fd,#dcebfa 55%,#cfe3f8)`. All inner geometry is percentage-based so it scales.
  - Outer stadium (track band outer edge): `left:1.25%; top:2.5%; width:97.5%; height:95%; border-radius:999px; background:linear-gradient(150deg,#cfe3f8,#b9d6f4); box-shadow: inset 0 0 0 3px rgba(255,255,255,.95), 0 8px 24px rgba(15,47,92,.1)`.
  - Inner stadium (infield, punches the band out): `left:11.25%; top:22.5%; width:77.5%; height:55%; border-radius:999px; background:linear-gradient(150deg,#eef6fd,#dfeefb); box-shadow: inset 0 0 0 3px rgba(255,255,255,.95)`.
  - Dashed infield line: `left:17%; top:33%; width:66%; height:34%; border:1px dashed rgba(255,255,255,.85); border-radius:999px`.
  - Center wordmark: “HAAKSBERGEN” monospace 22px/500 `letter-spacing:.42em` `#9dbde3`, under it “400 M · HEREN” monospace 12px `.34em`; block at `top:41%`, centered, `pointer-events:none`.
  - Start/finish stripe: `left:24.6%; top:80%; width:2px; height:12%; background:#0f2f5c; transform:rotate(14deg); border-radius:2px`; label “START / FINISH” monospace 11px `.24em` `#5b83b3` at `left:5%; bottom:4%`.
  - **Rider dots** (see Rink geometry below): absolutely positioned wrapper, `transform:translate(-50%,-50%)`, containing a circular chip.
    - Other riders: 26×26px, `border-radius:50%`, group color bg, white monospace 11px/600 bib number, `box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(9,24,45,.5), 0 2px 6px rgba(9,24,45,.28)` (white halo + dark ring = the high-contrast treatment).
    - Own riders: 30×30px, bg `#d81f26`, 12px text, `box-shadow: 0 0 0 2.5px #fff, 0 0 0 5px rgba(216,31,38,.95), 0 3px 8px rgba(9,24,45,.35)`, plus keyframe `minering` (1.8 s ease-in-out infinite, pulsing the outer red ring between `.9` and `.25` alpha at 4px→7px).
    - Own riders carry a name label: `#d81f26` pill, white 10px/600, `padding:2px 6px`, `radius:4px`, `box-shadow:0 2px 6px rgba(15,47,92,.25)`, `translateX(-50%)` at `left:50%`, and **alternating above (`top:-23px`) / below (`bottom:-23px`)** by own-rider index — this is collision avoidance, keep it.
    - z-index: own riders 60, uitlopers 45, others `20 - min(19, position)` so leaders sit on top.
    - Every dot has a native `title`: “Naam — Kopgroep — P4 — 26 pt”.
- **Group cards** under the rink: `display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:16px`. One card per non-empty group: `padding:12px 13px`, `radius:10px`, `border:1px solid #e8e4dc` (→ `rgba(216,31,38,.35)` when the card contains own riders), bg white (peloton card `#f6f8fb`).
  Contents: 10px round color swatch + group label (monospace 10px `.14em` uppercase `#42556e`); count 20px/700 + “rijders” 11px `#6b7c92`; gap line monospace 11px `#6b7c92` e.g. “+3 ronden op peloton”; if own riders present, a 11px/600 `#d81f26` line “2 eigen rijders”.

**Right column — “Mijn rijders”** card: white, `1px solid #e4e0d8`, `radius:14px`, `overflow:hidden`.
- Head `padding:15px 16px`, `border-bottom:1px solid #efece6`: “MIJN RIJDERS” (monospace 11px `.2em` uppercase `#6b7c92`) and right “53 pt totaal” (monospace 11px `#6b7c92`).
- Row per rider (5), `display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f3f1ec`:
  - bib chip 34×34, `radius:8px`, group color (own riders `#d81f26`), white monospace 12px/600;
  - name 14px/600, single line with ellipsis; under it a meta row (gap 7px): group tag (monospace 10px `.1em` uppercase `#42556e` on `#f0f3f7`, `padding:2px 6px`, `radius:4px`) + gap text;
  - right: position “P4” 13px/600 `#0f2f5c`, under it points monospace 13px/600 `#0f2f5c` (`#9aa9ba` when 0 pt).

**Right column — “Virtuele uitslag”** card, same shell.
- Head: “VIRTUELE UITSLAG” + right “TOP 20 · PUNTEN” (monospace 10px `.1em` `#9aa9ba`).
- 20 rows, `display:flex; align-items:center; gap:10px; padding:9px 16px; border-bottom:1px solid #f3f1ec`; own riders get bg `rgba(216,31,38,.06)` and name weight 700 (others 500).
  - rank: 24px wide, right-aligned, monospace 12px `#6b7c92`;
  - bib chip 28×28 `radius:8px` group color, monospace 11px/600 white;
  - name 13px, ellipsis; under it gap text monospace 10px `.08em` `#8d9cae`;
  - points: monospace 13px/600, 44px wide, right-aligned, `#0f2f5c` (own riders `#d81f26`).
- Footer note 11px `#8d9cae`, `line-height:1.5`, `padding:12px 16px`: “Punten volgens de standaardschaal 50-40-32-26-22-20…1 voor plek 1 t/m 20. Stand loopt live mee met de rondestand op de baan.”

## Rink geometry (port this math exactly)
Positions are computed in a normalized 800×400 box and emitted as percentages.
- Centerline: two straights of `S = 400` and two semicircles of `R = 150`; straight ends at `x = 200` and `x = 600`; bottom straight `y = 350`, top `y = 50`. Perimeter `P = 2S + 2πR ≈ 1742`.
- `pos(frac, off)` where `frac` = fraction of the current lap (0–1) and `off` = lane offset in px (outward positive):
  - `d = frac * P`
  - `d < S` → bottom straight, `x = 200 + d`, `y = 350 + off`
  - `d < S + πR` → right arc, `t = (d - S)/R`, `x = 600 + (R+off)·sin t`, `y = 200 + (R+off)·cos t`
  - `d < 2S + πR` → top straight, `x = 600 - (d - S - πR)`, `y = 50 - off`
  - else → left arc, `t = (d - 2S - πR)/R`, `x = 200 - (R+off)·sin t`, `y = 200 - (R+off)·cos t`
  - output `left = x/800·100 %`, `top = y/400·100 %`
- Riders therefore travel counter-clockwise starting at the bottom-left straight, which is where the start/finish stripe sits.
- Lanes: within a group, member `k` gets lane offset `[-26, 0, 24][k % 3]` (uitlopers +3 additionally `-8`, i.e. tighter to the inside) — this fans a pack out across the track band instead of stacking dots.

## Data model & group logic
Each rider: `{ bib, naam, groep, dist, lane, isMine }` where **`dist` = total race distance in laps as a float** (e.g. `96.42` = 42 % into lap 97). Everything else derives from `dist`:
- ranking: sort by `dist` desc → `positie`; `punten = POINTS[positie-1]` for the first 20, else 0.
- `POINTS = [50,40,32,26,22,20,18,16,14,12,10,9,8,7,6,5,4,3,2,1]`.
- current lap: `ronde = min(totaalRondes, floor(maxDist) + 1)`; `teGaan = totaalRondes - ronde`; km = `teGaan × 0.4`.
- position on the rink: `frac = dist mod 1`.
- gap vs peloton (`g = rider.dist - pelotonDist`), formatted:
  - `g ≥ 0.97` → `+{max(1, floor(g))} ronde/ronden`
  - `g ≤ -0.97` → `-{max(1, floor(-g))} ronde/ronden`
  - otherwise → seconds: `±(|g| × 32).toFixed(1) + "s"` (32 s = assumed lap time; make it a constant/config).
  Use **floor**, not round, for whole laps so group cards and rider rows never disagree.
- **Groups are derived from lap standing / time gap** (the agreed rule): ≥1 lap ahead of the peloton → uitloper (+1/+2/+3 by whole laps ahead); the largest cohesive cluster → peloton; riders a few seconds ahead of it → kopgroep; riders dropped behind it → achterblijvers. In the prototype the six groups are declared up front (below) and the gaps are consequences of it; in production classify from the feed's lap/time data — or use the feed's own grouping if it provides one.

Prototype group table (`GROEPDEF`) — mock starting distances, paces, and colors:

| key | label | color | n | start dist | pace |
|---|---|---|---|---|---|
| u3 | Uitlopers +3 | `#6d2f00` | 1 | 99.55 | 1.011 |
| u2 | Uitlopers +2 | `#a24d00` | 2 | 98.42 | 1.007 |
| u1 | Uitlopers +1 | `#d07d00` | 3 | 97.28 | 1.004 |
| kop | Kopgroep | `#0b2547` | 7 | 96.12 | 1.0025 |
| pel | Peloton | `#2f6ba8` | 21 | 96.00 | 1.000 |
| ach | Achterblijvers | `#59708a` | 10 | 95.66 | 0.9865 |

Own rider = bib in `[3, 9, 14, 27, 39]` (one per group band, on purpose, so the design shows every state). Colors are picked for contrast on the pale-blue ice; keep them distinguishable if you re-theme.
Within a group, member `k` is placed `k × 0.0055` laps behind the group's `dist` (peloton adds `(k % 3) × 0.0012`) so packs read as a line, not a blob.

## Interactions & Behavior
- **No navigation** — one live screen. Everything updates in place.
- **Simulation (prototype only):** `setInterval` at 120 ms; per tick each group advances `0.00375 × simSnelheid × pace` laps (0.00375 lap/tick ≈ real time at a 32 s lap; `simSnelheid` default 3 speeds it up for demo). Small sine-based jitter makes achterblijvers lose and the lead uitloper gain ground. **Replace with the real feed** (poll or websocket): feed `dist` per rider, keep the rest of the pipeline.
- Dot movement is a plain re-render each tick; no CSS transitions on `left`/`top` (a transition fights the tick rate and drifts). If the real feed updates slowly (e.g. once per lap crossing), interpolate `dist` locally between updates rather than animating position.
- Hover: native tooltips on rider dots and (in the prototype) chart-free rows. No hover-only information — everything critical is on screen.
- Own-rider emphasis: red fill + pulsing ring + persistent name label; rows tinted in the result list.
- Connection loss: the existing app already shows a “VERBINDING ONDERBROKEN” banner (see `reference-bestaande-volgwagen.png`); reuse that pattern above this view when the feed drops, and keep showing the last known standing.

## State Management
- `dists: { [groupKey]: number }` — laps completed per group (prototype). In production: `riders: { bib, naam, dist, ... }[]` straight from the feed.
- `tick: number` — simulation clock only.
- Derived per render (no extra state): sorted standing, positions, points, team total, group membership, gaps, lap counter, dot coordinates.
- Config (props/tweaks in the prototype, admin settings in production): `wedstrijd` (`Heren` | `Dames`, auto-selects the running race), `ploegnaam`, `rondesHeren` (default 125), `rondesDames` (default 80), `simSnelheid` (drop in production).
- Team size is 5 riders.
- Data fetching: single source per race from `livemarathon.schaatsen.nl` (baan Haaksbergen). Needs rider list (bib, name), laps completed, and a timestamp per rider or per lap crossing. Everything else is computed client-side.

## Design Tokens
Colors
- page bg `#f4f2ee`; card bg `#ffffff`; card border `#e4e0d8`; divider `#efece6` / `#f3f1ec`; grid hairline `#dcd8d0`; muted card bg `#f6f8fb`; tag bg `#f0f3f7`
- navy scale `#0b2547`, `#0f2f5c`, `#123a6d`, `#17457f`, `#1a4f8f`, `#1b4f8d`, `#1f5aa3`, `#2465b3`, `#2f6ba8`
- text `#12233d`; secondary `#42556e`; muted `#6b7c92`; faint `#8d9cae` / `#9aa9ba`; footnote `#a3a99f`; navy-card label `#9dbde3`
- accent red `#d81f26` (LIVE, own riders), tints `rgba(216,31,38,.06 / .18 / .35 / .95)`
- ice `#eef6fd`, `#dfeefb`, `#dcebfa`, `#cfe3f8`, `#b9d6f4`; rink text `#5b83b3`
- group colors: see table above
- rider ring `rgba(9,24,45,.5)`, rider shadow `rgba(9,24,45,.28)`
- positive delta `#1c7a45` (kept for future use)

Typography — `IBM Plex Sans` (400/500/600/700) for text, `IBM Plex Mono` (400/500/600) for labels, numbers, and anything letterspaced. Sizes used: 34/30/22/20/19/14/13/12/11/10 px. Uppercase mono labels: 10–11px with `letter-spacing .1em–.24em`; rink wordmark `.34em`–`.42em`. Headings `letter-spacing:-.02em`.

Spacing — 2, 4, 6, 7, 8, 10, 12, 13, 14, 16, 18, 20, 22, 56 px. Card padding 12–18px; page padding 20px.

Radius — 4 (pills/tags), 8 (bib chips), 10 (KPI strip, group cards), 14 (cards, rink), 999 (stadium shapes), 50 % (rider dots).

Shadows — `0 8px 24px rgba(15,47,92,.1)` (rink), `0 2px 6px rgba(9,24,45,.28)` (dot), `0 3px 8px rgba(9,24,45,.35)` (own dot), `0 2px 6px rgba(15,47,92,.25)` (name label); inset `0 0 0 3px rgba(255,255,255,.95)` for rink edges.

Animations — `livepulse` 1.4 s ease-in-out infinite (LIVE dot); `minering` 1.8 s ease-in-out infinite (own-rider ring).

## Assets
No images or icon files. The rink is pure CSS (two stadium shapes + a dashed line); rider markers are styled divs. `reference-bestaande-volgwagen.png` is a screenshot of the current `Volgwagen › Live` tab, included only to show the surrounding app's visual language (tan page, navy KPI cards, red accent, letterspaced mono labels) — match it. Fonts come from Google Fonts (IBM Plex Sans + Mono); swap for the codebase's existing font pipeline if it has one.

## Files
- `Live Meermarathon.dc.html` — the design: template (markup + inline styles) and, at the bottom, the `Component` class with simulation, group model, `pos()` geometry, gap formatting, and scoring.
- `support.js` — local preview runtime for that file. Reference only; do not port.
- `reference-bestaande-volgwagen.png` — screenshot of the existing app for visual context.

## Open items for the developer
1. Wire the real livemarathon feed (Haaksbergen) and drop the simulation loop.
2. Confirm the classification thresholds for kopgroep vs peloton vs achterblijvers against real race data.
3. Lap time (32 s) is hardcoded for the seconds-gap display — derive it from actual lap splits.
4. Admin needs inputs for lap counts and start times per evening (defaults 80 dames / 125 heren).
5. Auto-switch between the dames and heren race based on the running event.
