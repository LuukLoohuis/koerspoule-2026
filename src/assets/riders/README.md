# Rider illustrations (optioneel)

Drop hier transparante PNG/SVG/WEBP-assets om de SVG-fallback te overschrijven.
Eén asset per categorie/kleur:

- `alien.png`     — paars (ALIEN of GC-leider)
- `gc.png`        — framboos (GC)
- `sprint.png`    — blauw (SPRINT)
- `klim.png`      — groen (KLIM)
- `tijdrit.png`   — bruin (TIJDRIT)
- `aanval.png`    — oranje (AANVAL/PUNCH)
- `punch.png`     — oranje
- `klassiek.png`  — warm bruin (KLASSIEK)
- `talent.png`    — off-white (TALENT)
- `oud.png`       — warm bruin (OUD)
- `joker.png`     — paars (JOKER)

Resolver-volgorde per categorie staat in `src/components/teamsheet/Cyclist.tsx`
(`CATEGORY_ASSET_KEYS`). Match is op file-naam (lowercase, zonder pad).

Voorkeur: zijaanzicht, transparante achtergrond, ~400×300px, screen-printed
look. Vintage cycling magazine vibe.

Geen asset gevonden → de rijke recolorable SVG (`Cyclist`) wordt automatisch
ingezet met de juiste truikleur.
