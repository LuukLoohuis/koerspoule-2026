# Visuele upgrade — "Stel je ploeg samen"

De huidige pagina werkt prima, maar mist de retro/vintage Giro-uitstraling die de rest van de app heeft. Ik ga de pagina mooier maken zonder bestaande functionaliteit te wijzigen.

## Wat er verandert

### 1. Hero header
- Vervang plain titel door een vintage hero met `vintage-ornament` flourish, een roze→navy gradient achtergrond en kleine "🇮🇹 Giro d'Italia 2026" tagline.
- Subtiele Playfair italic ondertitel.

### 2. Sticky progress bar
- Onder de header een **sticky** balk met:
  - Voortgangsbalk (`completedPicks/totalRequired`)
  - Jokers-teller (0/2) met klein 🃏 icoon
  - Status-badge (Concept / Ingediend / Vergrendeld) met kleurcodering
- Blijft zichtbaar tijdens scrollen → directe feedback.

### 3. Categoriekaarten
- Upgrade van platte `retro-border` kaarten naar `ornate-frame` look:
  - Categorie-icoon per type (🏔️ klimmer, ⚡ sprinter, 🎯 puncheur, 🏁 tijdrijder, ⭐ kopman) — auto-detectie op `short_name`.
  - Header met gradient strip en grote nummering (Cat. 1, Cat. 2…).
  - Voltooide kaart krijgt subtiele groene gloed + ✓ ribbon.
  - Renner-rijen: ronde avatar met startnummer, hover-lift effect, geselecteerd = roze gloed met linker accent-bar in plaats van enkel border.

### 4. Jokers-sectie
- Eigen "🃏 Wildcards" kaart met donkere navy achtergrond + goud-accent (vintage-gold token), om visueel onderscheid te maken van categorieën.
- Twee jokerslots als grote speelkaart-tegels naast de zoekvelden, met "leeg/gekozen" preview.

### 5. Klassementsvoorspellingen
- Podium visueel: drie verticale "trofee"-kolommen (1e hoger dan 2e/3e), met 🥇🥈🥉 boven elke RiderSearchSelect.
- Truien als gekleurde badges (roze=punten, blauw=berg→eigenlijk bolletjes, wit=jongeren) — gebruik bestaande jersey-tokens.

### 6. Action footer
- Sticky bottom bar (mobiel) / inline (desktop) met "✅ Definitief indienen" knop groot en duidelijk, plus secundaire "Wijzigen" knop wanneer ingediend.
- Bij niet-ingediend: zachte amber pulse op de knop om aandacht te trekken.

### 7. Startlijst-tab
- Team-cards krijgen kleine team-kleur-strip links, renners in een nettere 2-koloms grid met monospace startnummer-pill.

## Technisch

Bestanden:
- `src/pages/TeamBuilder.tsx` — alle layout/markup updates (geen logica-wijziging)
- `src/index.css` — eventueel 1-2 nieuwe utility classes (`.category-card`, `.podium-step`) als `vintage-ornament` / `ornate-frame` niet volstaan

Geen wijzigingen aan:
- `useEntry`, `useCategories`, `useStartlist` hooks
- DB / RLS
- Submit/joker/predictions logica

## Niet inbegrepen
- Drag-and-drop renner-selectie (grotere refactor)
- Renner-foto's (geen data beschikbaar)

Wil je dat ik dit zo uitvoer, of liever een specifiek onderdeel eruit pakken?