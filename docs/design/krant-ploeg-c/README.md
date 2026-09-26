# Handoff: Krant C en Ploeg C (mobiel, Giro-thema)

## Overzicht
Twee mobiele schermen voor Koerspoule, 375 × 812, ontworpen op het designsysteem „Koerspoule" (Giro-thema `roze`).
Ze vervangen het landingsscherm na inloggen (**Krant**) en het scherm Mijn ploeg (**Ploeg**, was „Volgwagen").
Beide zijn de gekozen variant C uit een reeks van drie; de A- en B-varianten zijn afgevallen en staan niet in dit pakket.

Uitgangspunt: **elke informatie heeft één vaste plek.** De Krant vertelt wat er in de koers gebeurde en waar je staat.
De Ploeg laat zien hoe je renners scoren. Geen enkel getal staat op beide schermen, met één bewuste uitzondering:
de dagpunten van de speler (48 pt) staan op de Krant als jouw stand en op de Ploeg als „+48 vandaag".

## Over de designbestanden
De `.dc.html`-bestanden zijn **design-referenties, gemaakt in HTML** voor een design-canvas. Het zijn geen productiecode.
De opdracht is om ze te **herbouwen in de bestaande omgeving**: React 18 + Vite + TypeScript, Tailwind, react-router,
lucide-react, shadcn/ui in `src/components/ui/`, i18n via `react-i18next`. Neem geen inline styles over; gebruik de
brand-classes uit `src/index.css` (`.retro-border`, `.editor-eyebrow`, `.vintage-heading`, `.double-rule`, `.sticker`,
`.bolletjes-rule`, `.race-rule`) en de themavariabelen. **Een themavariabele wint altijd van een hex uit dit pakket.**

De bestanden verwijzen naar `./wielershirt.png` (de blanco trui) en naar `../../../public/koerspoule-giro.svg` (het logo).
Ze openen niet zelfstandig in een browser; de runtime `support.js` is bewust weggelaten (zie NOTITIE.md).

## Fidelity
**Hi-fi** voor lay-out, hiërarchie, typografie en copy. Alle getallen en namen zijn voorbeelden.

---

## 1. Gedeeld: Kop en Onderbalk

### Kop (`Kop.dc.html`)
`.race-rule` (2px) · logo van het actieve thema links (h-42) · alleen een menuknop rechts (44×44) · `.bolletjes-rule` eronder.
**Geen andere knoppen.** Bestaand: `src/components/Layout.tsx`; op mobiel vervalt de nav-strip.

### Onderbalk (`Onderbalk.dc.html`)
Vijf vaste items: **Krant · Ploeg · Subpoule · Uitslagen · Hors Cat.** Bestaand `src/components/BottomNav.tsx`, met één wijziging:
het item **„Volgwagen" heet „Ploeg"** (icoon: shirt, lucide `Shirt`). Actief item: `primary`, 10% `primary`-pil achter het icoon,
3px `vintage-gold`-stamp bovenaan, stroke 2.5. Labels 10px/700 uppercase. Items veranderen niet per koers.

---

## 2. Krant C (`Krant-C.dc.html`) — landingsscherm na inloggen

Route `/karavaan` (huidige `MijnPeloton` met Koerskrant-tab); dit ontwerp is de mobiele Koerskrant.

### Vaste bovenkant (altijd zichtbaar, eindigt op ~200 px)
1. **Krantkop** in één regel: „La Gazzetta · Tappa 14". „La Gazzetta" Playfair 900 italic 25px, „Tappa 14" Oswald 600 19px uppercase.
   Per koers de eigen woorden (Giro *Gazzetta · Tappa*, Tour *L'Équipe · Étape*, Vuelta *Marca · Etapa*).
2. **Informatie**: rechts van de krantkop een klein grijs ⓘ-rondje (18px) met het woord INFORMATIE in JetBrains Mono 9.5px.
   Opent een overlay-kaart (`.retro-border`) „Informatie" met zeven uitlegregels (#3, ▲ 2, 48 pt, jij-sticker, podium,
   Hors, sterren) en een sluitkruis. Altijd zichtbaar, maar bescheiden.
3. **Jouw stand**: donkere balk (`foreground`) over de volle breedte, 82px, met gouden-roze gradientlijn bovenop, drie cellen:
   - **Kantoor ›** — `#3 /14` en `▲ 2` (subpoule)
   - **Algemeen ›** — `#412 /2.318` en `▲ 37`
   - **Vandaag ›** — `48 pt` (in licht roze `#f07a98`) en `#118 v.d. dag`
   Getallen JetBrains Mono 700 24px tabular. Elke cel is een knop: tik opent de volledige stand (Subpoule → `/mijn-peloton?tab=subpoules`,
   Algemeen → `/uitslagen` klassement, Vandaag → daguitslag). Stijgingen in goud `#d9b44a` op de donkere balk.

### Tabbalk: Vandaag · Morgen · Perszaal
Segment-variant van RetroTabs (`variant="segment"`): lichte track `secondary`, witte plaat onder de actieve tab, gouden onderstreep.
Drie brede tabs, 44px hoog. Standaard opent **Vandaag**.

**Overweging voor later:** tot de start van de rit zou de krant op Morgen kunnen openen, daarna op Vandaag.

#### Tab Vandaag
- **Hoofdartikel**: eyebrow „Tappa 14 · Pila" (mono), kop Playfair 900 34px met gradientlijn eronder (`primary` → `vintage-gold`),
  intro Source Serif 16px met plaatsnaam in Playfair 900 als lead („PILA — "), geknipt op twee regels, knop „Lees verder" (pil, 40px, inktrand + 1.5px offset).
- **Daguitslag**: Oswald-kop met `.double-rule`. Twee blokken onder elkaar:
  - *Rit*: top 3 met medaillerondjes (goud `medal-gold`, zilver, brons), naam, tijd/achterstand rechts.
  - *Subpoule Kantoor · vandaag*: top 3 van de subpoule met dagpunten; **jouw regel** krijgt 12% `primary` achtergrond en de `.sticker` „jij".
  - Link „Hele uitslag ›" (onderstreept in `primary`).
- **Hors Catégorie**: Oswald-kop met `.double-rule` en rechts „Hele bijlage ›". Daaronder **drie wielertruien** naast elkaar
  (afbeelding `wielershirt.png`, 96×108, gekleurd per cijfer, harde offset-schaduw 2.5px), elk een link naar `/hors-categorie`:
  | Trui | Kleur | Cijfer | Onderschrift |
  | --- | --- | --- | --- |
  | Monkey IQ | `primary` (roze) | 78% | beter dan 78% van de apen |
  | Emirates | wit | 64% | rendement vs. droomploeg |
  | Directeur | `trui-berg` (blauw) | 7,4 | rapportcijfer ploegleider |
  Het cijfer staat op de borst in Playfair 900 24px (wit op kleur, inkt op wit). Naam 12px/700 en onderschrift Source Serif italic 11px eronder.
  Inkleuren: de PNG is transparant; gebruik een `mask-image` met de trui als masker onder de afbeelding (`mix-blend-mode: multiply`),
  of exporteer drie gekleurde PNG's als masks niet gewenst zijn. Bronnen: `AapscoreDistributie`, `EmiratesBenchmark`, wielerdirecteur-rating.

#### Tab Morgen
Voorbeschouwing van de volgende rit als volwaardig artikel: eyebrow „Voorbeschouwing · Tappa 15", kop, drie feiten in een rij
(afstand, hoogtemeters, starttijd; JetBrains Mono 700 18px), één alinea, en „Favorieten van de redactie" met 1–3 gouden sterren.

#### Tab Perszaal
Eyebrow „Uit de perszaal · na Tappa 14". Twee citaten onder elkaar, gescheiden door `.vintage-ornament` ⚜:
grote roze aanhalingstekens, citaat in Playfair italic 21px, daaronder een monogram-rondje (36px, inkt met goud: MW / JDC),
naam 13px/700 en functie in mono (Commentator / Analist). Eén citaat van Michel Wuyts en één van José De Cauwer.

### Niet op dit scherm
Segmentknoppen per rubriek, rubriek-tegels, grafieken, ploeg- of rennerpunten, archief van eerdere ritten (staat onder Uitslagen).

---

## 3. Ploeg C (`Ploeg-C.dc.html`) — Mijn ploeg

Route `/mijn-peloton`. Vervangt de Volgwagen-cockpit (meters, wijzers, flip-clock) door één ranglijst.

1. **Subtabs**: Mijn ploeg · Pronostiek · Palmares (segment-RetroTabs, 40px).
2. **Ploegkaart** (`.retro-border` op `card`): links de eigen trui in `primary` met het aantal renners op de borst (56×63),
   rechts ploegnaam (Playfair 700 21px) met potloodknop (lucide `Pencil`, 36×36) om te hernoemen, totaal `1.284 pt`
   (JetBrains Mono 700 30px) en de gouden `.sticker` „+48 vandaag".
3. **Regel met twee bedieningen**: links de rit-kiezer als pil „Stand t/m rit 14 ▾" (Select), rechts een schakelaar **Punten / Vandaag**
   (32px, pil-track `secondary`). *Punten* sorteert op totaal; *Vandaag* zet de renners die in de gekozen rit scoorden bovenaan.
4. **Ranglijst** van alle renners, kolomkop in mono 9px: `# · (trui) · Renner · Rit 14 · Totaal`. Per rij (min. 54px):
   - rang (Playfair 700 13px, grijs)
   - **ploegtrui 30×34** — de `jersey_url` van de ploeg uit de startlijst (`useStartlist`, tabel teams). Geen upload → toon `wielershirt.png` blanco.
   - naam 14px/700; daaronder „Categorie · Ploeg" 11px grijs
   - dagpunten rechts (mono 13px; `+14` in groen `vintage-green`, `–` grijs bij nul)
   - totaal (Playfair 900 18px)
   - **topscorer**: rij op 10% `primary`, `.sticker` „Top" achter de naam
   - **opgave**: naam doorgestreept en grijs, trui op 45% opacity, stempel „Opgave" (Special Elite, grijze rand)
5. **Voetregel**: „10 renners · 1 opgave" en „truien uit de startlijst".

### Niet op dit scherm
Meters of wijzers, subpoule- of algemene stand, Hors-cijfers, sierklok, categoriesubtotalen.

---

## 4. Data die het scherm nodig heeft
| Scherm | Veld | Bron |
| --- | --- | --- |
| Krant | subpoule-plaats, totaal deelnemers, verschil met gisteren | subpoule-standing van de speler |
| Krant | algemene plaats, totaal, verschil | overall standing |
| Krant | dagpunten en dagrang | stage results van de speler |
| Krant | Monkey IQ, Emirates-rendement, Directeur-cijfer | horscat-berekeningen (zelfde memo's als HorsCategorieTab) |
| Krant | citaten | bestaande Koerskrant-perszaal content |
| Ploeg | renners met categorie, ploeg, dagpunten, totaal, opgave | team + stage_points |
| Ploeg | `jersey_url` per ploeg | `teams.jersey_url` via `useStartlist` |

## 5. Volgorde van bouwen
1. BottomNav: „Volgwagen" → „Ploeg" (label en icoon; route blijft).
2. Ploeg C: ranglijst-component met sortering, ploegkaart, rit-kiezer. Dit raakt de minste bestaande code.
3. Krant C: bovenkant (stand-balk + informatie), dan de drie tabs. Hors-truien als laatste, met het masker-truukje of drie PNG's.
4. Tour- en Vuelta-thema nalopen: alles loopt via `primary`/`vintage-gold`, alleen de krantwoorden (Gazzetta/Tappa) wisselen.
