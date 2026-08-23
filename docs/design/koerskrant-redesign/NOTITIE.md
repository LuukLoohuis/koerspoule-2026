# Notitie bij dit pakket

Dit is een **designreferentie**, geen productiecode. De README hiernaast zegt het
expliciet: niet de HTML shippen, maar de schermen nabouwen in React + Tailwind
met de bestaande tokens.

Twee dingen om te weten voor je het prototype opent:

- `koerskrant-redesign.dc.html` verwijst naar `./support.js`, de runtime van de
  design-canvas. Dat bestand zit niet in het pakket, dus lokaal openen levert een
  lege pagina op. Bekijk het via de canvas waar het vandaan komt.
- Het bestand staat in `docs/` en niet in `public/`, zodat het niet meegebouwd
  wordt en niet publiek bereikbaar is.

De handoff verwijst naar bestanden die inmiddels al een deel van dit ontwerp
bevatten: `Verslag.tsx` heeft de initiaal, de plaatsregel en de bronregel al in
de `isLead`-variant. Wat er nog niet is: het driekolomsgrid, de kolomlijnen, de
fotoplekken, de segmented control en de iOS-tabbalk.
