# Notitie bij dit pakket

Designreferentie voor **Krant C** (landingsscherm na inloggen) en **Ploeg C** (Mijn ploeg, was Volgwagen),
mobiel 375 × 812 in het Giro-thema. Ontworpen op 26 september 2026 in het design-canvas van Claude, met het
designsysteem „Koerspoule" als basis. De README hiernaast is het document om op te bouwen.

## Wat er in zit
- `Krant-C.dc.html` — de Krant met tabs Vandaag · Morgen · Perszaal en de Informatie-overlay
- `Ploeg-C.dc.html` — de ranglijst van je eigen renners met sortering Punten / Vandaag
- `Kop.dc.html`, `Onderbalk.dc.html` — de gedeelde kop en onderbalk, die beide schermen inladen
- `wielershirt.png` — de blanco wielertrui (transparante PNG, 1076 × 1212) die de Hors-truien en de
  terugval per renner gebruikt

## support.js zit hier bewust niet bij
Net als bij de eerdere pakketten: de canvas-runtime haalt scripts van een CDN en voert componentcode uit.
Daarom openen de `.dc.html`-bestanden hier niet zelfstandig. Het aantikbare origineel staat in het canvas
„Koerspoule · Krant & Ploeg" in Luuks Claude-account.

## Verhouding tot de andere pakketten
- `docs/design/mobiele-navigatie/` beschrijft de hele mobiele app met tien schermen. Dit pakket vervangt
  daarvan **alleen de Krant en Mijn ploeg**, en hernoemt het onderbalk-item Volgwagen naar Ploeg.
  Bij tegenstrijdigheden over die twee schermen wint dit pakket; voor de rest blijft mobiele-navigatie leidend.
- `docs/design/koerskrant-redesign/` gaat over de Koerskrant op web. De mobiele Krant in dit pakket is een
  eigen opzet met tabs en een vaste stand-balk, geen versmalde web-voorpagina.

## Afgevallen varianten
Er zijn per scherm drie varianten gemaakt (A, B, C). A en B staan niet in de repo; C is gekozen omdat
de tabs per tijd (Vandaag, Morgen, Perszaal) de voorpagina kort houden zonder informatie te verstoppen,
en omdat de ranglijst op de Ploeg de vraag beantwoordt die spelers het vaakst hebben: wie scoort, en wie
deed vandaag iets.

## Aanvullingen na de bouw (27 september 2026)
Niet in de `.dc.html`-bestanden, wel in de app:
- **Ploeg C, punten per rit.** Een rij in de ranglijst is een knop; tik klapt onder de renner een vak open met een
  balkje per rit en de ritten waarin hij scoorde (soort rit, naam, plaats in de uitslag, joker, punten). Eén renner
  tegelijk open. Het vak volgt de rit-kiezer: teruggespoeld toont het alleen de ritten tot en met die rit, zodat de
  som het totaal in de rij is. Het pijltje hangt onder het totaal en kost de naam geen breedte.
- **Ploegkaart in het Tour-thema.** De trui is de gele trui zoals hij in het echt is
  (`src/assets/wielertrui-maillot-jaune.webp`). De andere thema's houden de blanco trui in `primary`.
- **Ploegkaart zonder cijfer.** Het aantal renners op de borst (README, Ploeg C punt 2) is geschrapt: zonder
  uitleg was niet duidelijk wat het getal betekende. Het aantal staat nog onder de ranglijst.

## Open punten
- De onderschriften van de drie Hors-truien zijn voorbeeldtekst; zet er de echte uitleg uit `verdictConfig.ts`
  en de Emirates-memo onder.
- De citaten in de Perszaal zijn placeholders, geen echte uitspraken.
- Of de Krant vóór de start van de rit op Morgen moet openen, is niet besloten.
