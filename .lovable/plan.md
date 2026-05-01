## Doel

In de Teambuilder twee verbeteringen:
1. **Jokers**: alleen renners die NIET in een categorie staan zijn selecteerbaar (alle "overige" renners uit de startlijst).
2. **Eindklassement-voorspellingen** (podium 1-2-3, puntentrui, bergtrui, jongerentrui): vervang de vrije tekst-inputs door dezelfde dropdown-stijl als bij admin → categorieën, met de volledige startlijst als bron.

## Wat ik ga aanpassen

**`src/pages/TeamBuilder.tsx`**

1. Volledige startlijst ophalen via `useStartlist(game.id, "", "")` (los van het filter op de Startlijst-tab) en flatten naar één lijst van alle renners + teamnaam.
2. **Jokerpool** = `alleStartlistRenners − rennersInCategorieën`. Beide joker-dropdowns putten hieruit (vervangt huidige `allRiders` die alleen categorie-renners bevatte). Validatie "Jokers mogen niet in categorie-picks zitten" wordt overbodig op UI-niveau, maar blijft als safeguard.
3. **Eindklassement-sectie**: vervang de 6 tekst-`Input`s (podium 1/2/3, puntentrui, bergtrui, jongerentrui) door 6 `Select`-dropdowns met de volledige startlijst (`#nummer — Naam (Team)`), identiek aan het patroon van de joker-dropdowns. Podium-velden mogen onderling niet dezelfde renner kiezen (filter eruit zoals bij jokers).
4. State blijft per veld een rider-id (string). Geen backend-wijziging — deze velden worden nu nog niet gepersisteerd (UI-only, zoals nu).

## Resultaat

- Joker dropdown toont bv. ~150 renners (184 totaal − ~30 in categorieën).
- Eindklassement-dropdowns tonen alle 184 renners, doorzoekbaar via standaard select-keyboard.
- Consistente UX met admin categorieën-dropdown.

Geen schema-wijziging nodig.
