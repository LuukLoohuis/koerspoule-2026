# Excel-export voor Gebruikers en Inzendingen

Voeg een **"Exporteer naar Excel"**-knop toe aan zowel het **Gebruikers**- als het **Inzendingen**-tabje in admin.

## Wijzigingen

**`src/components/admin/UsersTab.tsx`**
- Knop "Exporteer naar Excel" (Download-icoon) naast de zoekbalk.
- Exporteert de zichtbare lijst (gefilterd indien zoekterm actief, anders alle gebruikers).
- Kolommen: `Email`, `Aangemaakt op`, `Aantal teams`, `Admin (ja/nee)`.
- Bestandsnaam: `koerspoule-gebruikers-YYYY-MM-DD.xlsx`.

**`src/components/admin/EntriesTab.tsx`**
- Knop "Exporteer naar Excel" naast de zoekbalk/reload-knop.
- Exporteert de zichtbare lijst (gefilterd op zoekterm indien actief).
- Kolommen: `Email`, `Spelersnaam`, `Ploegnaam`, `Status`, `Ingediend op`, `Aangemaakt op`, `Aantal picks`, `Aantal jokers`, `Totaal punten`.
- Bestandsnaam: `koerspoule-inzendingen-YYYY-MM-DD.xlsx`.

Beide knoppen tonen een toast bij succes/fout en zijn disabled als de lijst leeg is.

## Technisch

- Nieuwe dependency: `xlsx` (SheetJS), client-side generatie — geen edge function nodig.
- Geen backend-, schema- of RLS-wijzigingen (admins lezen al uit `admin_user_overview` en `admin_entries_overview`).
- Kleine gedeelde helper `src/lib/exportXlsx.ts` met één `exportToXlsx(rows, filename, sheetName)`-functie, hergebruikt in beide tabs.

Akkoord om te bouwen?
