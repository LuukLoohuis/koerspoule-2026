## Doel

1. De quote op de homepagina mooi rechts plaatsen, verticaal gecentreerd, rechts uitgelijnd zodat hij niet meer rommelig in de linker kolom hangt.
2. Quote (en optionele auteur) bewerkbaar maken in Admin → Rubriek, per editie (game).

## Aanpak

### 1. Quote-positionering (src/pages/Index.tsx)

Verplaats het `<div>` met `thema.quotes[0]` uit de linker kolom (nu `absolute right-10 top-[180px]` binnen de linker kolom) naar de **rechter kolom van de hero-grid**. Daar staat nu de koers-illustratie/poster.

- Op `lg:` schermen: quote-blok rechts in de grid, `flex items-center justify-end h-full`, tekst `text-right`, max-width ~360px, italic serif, met optionele auteur eronder.
- Verticaal centreren t.o.v. de H1 via `items-center` op het grid (al actief) + `self-center` op het quote-blok.
- Op mobiel: blijft verborgen (`hidden lg:flex`) — geen layout-impact.
- Vintage-styling behouden: `margin-note tilt-l`, gouden onderstreping of een klein vintage-ornament boven de quote.

### 2. Database — quote per game

Migratie: voeg twee kolommen toe aan `public.games`:
- `homepage_quote text`
- `homepage_quote_author text`

Fallback: als kolom leeg is, gebruikt de UI nog steeds `thema.quotes[0]` uit `themas.ts`.

### 3. Admin Rubriek — quote-editor

Bovenaan `src/components/admin/RubriekTab.tsx` een nieuw kaart-blok "Homepage quote":
- Textarea voor de quote
- Input voor auteur (optioneel)
- Knop "Opslaan" → `update games set homepage_quote=…, homepage_quote_author=… where id = activeGameId`
- Live-preview snippet eronder met dezelfde styling als op de homepage
- Invalidate `useActiveGame` query na opslaan

### 4. UI bron-of-truth

`useActiveGame` hook (of equivalent) uitbreiden zodat `homepage_quote` + `homepage_quote_author` in `Index.tsx` beschikbaar zijn. In de render:
```
const quote = game.homepage_quote ?? thema.quotes[0];
const author = game.homepage_quote_author ?? thema.quoteAuteur;
```

## Niet doen

- Geen wijziging aan `themas.ts` defaults (blijven als fallback).
- Geen mobile-quote toevoegen (was er ook niet).
- Geen wijziging aan andere rubriek-items.
