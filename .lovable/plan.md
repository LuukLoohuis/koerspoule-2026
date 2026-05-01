## Doel

In de Admin → **Categorieën** tab een werkend systeem zodat je per categorie renners kunt toevoegen op basis van de geïmporteerde startlijst (zoeken op naam of startnummer, multi-select), bekijken welke renners eraan toegevoegd zijn, en weer verwijderen.

## Huidige situatie

- `CategoriesTab.tsx` kan alleen categorieën aanmaken/verwijderen/aantal picks aanpassen.
- Tabel `category_riders` (category_id + rider_id) bestaat al met admin RLS.
- Tabel `riders` bevat alle geïmporteerde startlijst-renners (name, start_number, team_id, game_id).
- Er is geen UI om renners aan een categorie te koppelen.

## Wat ik ga bouwen

### 1. Categorieën-lijst uitbreiden met "uitklap" sectie
Onder elke categorie-rij komt een uitklapbare sectie ("Renners beheren") met:
- **Lijst van toegevoegde renners** in deze categorie (startnummer + naam + team + verwijder-knopje).
- **Zoek-/toevoeg-veld**: combobox die zoekt in de startlijst van de actieve game op naam of startnummer. Resultaten tonen `#nummer — Naam (Team)`. Klikken voegt direct toe.
- Renners die al in deze categorie zitten worden uit de zoekresultaten gefilterd.
- Optioneel: knop "Voeg meerdere toe" → multi-select dialog met checkboxen + zoekfilter, voor sneller bulk-toevoegen.

### 2. Database queries (geen schema-wijziging nodig)
- Renners ophalen voor de game: `riders` join `teams` waar `game_id = activeGameId`, gesorteerd op start_number.
- Toegevoegde renners per categorie ophalen: `category_riders` join `riders` join `teams` waar `category_id = ...`.
- Toevoegen: `insert into category_riders (category_id, rider_id)`.
- Verwijderen: `delete from category_riders where category_id=... and rider_id=...`.
- Unieke index `(category_id, rider_id)` toevoegen via migratie zodat duplicaten onmogelijk zijn (kleine schema-aanvulling).

### 3. UX details
- Counter "X renners" per categorie zichtbaar in de hoofdtabel.
- Toast feedback bij toevoegen/verwijderen.
- Geen page-reload nodig: lokale state-update na elke actie.
- Werkt ook als startlijst leeg is → duidelijke melding "Importeer eerst de startlijst".

## Bestanden

- **edit** `src/components/admin/CategoriesTab.tsx` — uitklap-sectie + zoek/toevoeg-UI + lijst van gekoppelde renners.
- **new migration** — `create unique index if not exists category_riders_unique on public.category_riders(category_id, rider_id);`

## Resultaat

Voorbeeld zoals jij beschreef:
```
#1  GC Aliens                      [2 renners ▾]
    • #1  Tadej Pogačar  (UAE)     [×]
    • #11 Jonas Vingegaard (Visma) [×]
    [zoek renner...                            ]

#2  God of 'n ex-Alien?            [2 renners ▾]
    • Remco Evenepoel ...
```
