## Doel

1. DNF-namen volledig leesbaar maken in de category-panels op de teamsheet.
2. Esthetische verfijning van de category-panels (vintage cycling-stijl behouden, leesbaarheid + hiërarchie verbeteren).

Geen wijzigingen aan data, RPCs of business-logica — alleen `src/components/teamsheet/*`.

---

## Deel 1 — DNF-leesbaarheid (`RiderTile.tsx`, row variant)

**Probleem:** rechts van de naam staan nu zowel het #-chip als de DNF-badge. Bij smalle tegels (Sprint, Klim) drukt dat de naam-kolom samen → "Christi an...", "Kaden Groves" wordt half overlapt.

**Fix:**
- Bij DNF: **DNF-badge vervangt het #-chip** (i.p.v. ernaast). Het startnummer is voor uitgevallen renners niet meer relevant voor scoring → één element rechts, naam krijgt volle ruimte.
- Naam-kleur terug naar volle ink-sepia met `opacity: 0.75` (i.p.v. grijs `#9CA3AF`) — strikethrough in rood blijft de primaire DNF-marker.
- `WebkitLineClamp` van 2 → 1 voor row variant, met `title` tooltip voor edge-case lange namen (Christian Scaroni e.d.).
- Hero variant (Top klassement): DNF-badge blijft onder de naam — daar is verticale ruimte.

---

## Deel 2 — Esthetische verfijning category-panels

**A. Sub-tier scheiding (actief ↔ uitgevallen)**

In `CategoryPanel.tsx`: rendervolgorde wordt `actief eerst, DNF onderaan`, met een subtiele vintage divider ertussen wanneer beide groepen bestaan:

```
[actieve renners]
─── ✦ Uitgevallen (2) ✦ ───
[DNF renners]
```

Divider gebruikt bestaande `.vintage-ornament` styling (uit memory: vintage design system) — geen nieuwe tokens.

**B. Category-header verfijning**

- Icoon-badge: van 32 → 36px, met subtiele box-shadow in de jersey-tint (`tone.tint`).
- Onder de header een dun gradient-onderlijntje in jersey-kleur (`linear-gradient(90deg, jersey, transparent)`) — sluit aan op de bestaande retro-border-stijl.
- Telling-chip: zelfde plek, maar font-weight 800 + iets meer letter-spacing voor leesbaarheid van enkele cijfers.

**C. Rij-hover & focus**

- Subtiele `background: tone.tint` op hover (i.p.v. neutraal grijs) → koppelt visueel aan de categorie-kleur.
- Lichte `transform: translateX(2px)` op hover voor tactiele feedback (200ms ease).

**D. Cyclist-figuur**

- Geen wijziging aan `Cyclist.tsx` zelf — bestaande SVG-varianten per categorie blijven.
- Wel: in row variant size 56×42 → 52×40 (compacter, geeft meer ruimte aan naam zonder dat figuur kleiner oogt).

---

## Technische scope

**Bestanden:**
- `src/components/teamsheet/RiderTile.tsx` — DNF-badge vervangt chip, naam-kleur, line-clamp, hover.
- `src/components/teamsheet/CategoryPanel.tsx` — sortering actief/DNF, divider tussen groepen, header-verfijning.

**Niet aangeraakt:**
- `tokens.ts`, `icons.tsx`, `Cyclist.tsx`, `TeamSheet.tsx` — geen tokens/iconen/data-wijzigingen nodig.
- Geen nieuwe dependencies, geen Tailwind config-wijzigingen.

**Verificatie:**
- Visueel via preview op `/karavaan` (huidige route) → DNF-tegels checken op Sprint (Kaden Groves, Corbin Strong tooltip) en Klim (Christian Scaroni).
- Hero variant blijft onveranderd.

---

## Niet in deze ronde

- Geen volledige design-directions ronde (skill/redesign) — jij vroeg gericht om "leesbaarheid + esthetiek meedenken", niet om 3 varianten te kiezen. Als je na deze fix alsnog een radicalere herschikking wil, doen we dat als aparte ronde.
- Geen wijziging aan grid/kolom-aantal van de panels.
