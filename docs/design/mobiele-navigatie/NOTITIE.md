# Notitie bij dit pakket

Designreferentie voor de **volledige mobiele navigatie**: van vier overlappende
lagen naar twee, met tien uitgewerkte schermen in een lichte en een donkere
variant. De README hiernaast is het document om op te bouwen.

## support.js zit hier bewust niet bij

Het pakket bevatte een `support.js` van 69 kB: de runtime van de design-canvas.
Die staat er niet in, om twee redenen.

De README vraagt er zelf om ("niet naar de repo kopiëren"), en dat is terecht:
het bestand haalt React, ReactDOM en Babel van unpkg.com en voert daarna via
`new Function` de componentcode uit het HTML-bestand uit. De CDN-verwijzingen
zijn netjes met SRI-hashes vastgezet, dus er is niets verdachts aan — maar code
die bij het openen scripts ophaalt en uitvoert hoort niet in een repo waar
niemand er nog naar kijkt.

Gevolg: de twee `.dc.html`-bestanden hier openen niet zelfstandig in een
browser. Wil je het prototype aantikken, gebruik dan de oorspronkelijke zip
waar `support.js` naast staat.

## Verhouding tot het andere designpakket

`docs/design/koerskrant-redesign/` gaat alleen over de Koerskrant-voorpagina
(web + mobiel). Dit pakket gaat over de hele mobiele app en beschrijft de Krant
opnieuw, als één van tien schermen. Bij tegenstrijdigheden over mobiel wint dit
pakket -- het is later gemaakt en breder van opzet.

## Wat de repo al heeft

De webvoorpagina uit het andere pakket staat er (`Voorpagina.tsx`,
`Verslag.tsx`). Van dit pakket is nog niets gebouwd. De grootste ingreep is de
navigatie zelf: `BottomNav` krijgt Subpoules in plaats van Klassement, en
`MobielTabBalk` plus `FloatingTabSwitcher` verdwijnen. Dat raakt elke pagina,
niet alleen de krant.
