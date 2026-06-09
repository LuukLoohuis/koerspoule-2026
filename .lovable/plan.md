## Probleem

De kaart "Jij vs de aap" toont `+−1 pt boven gemiddelde aap`, terwijl jij (1659 pt) juist 1 punt **onder** het gemiddelde (1660 pt) zit. De waarde, eenheid, icoon en kleur worden nu gekozen op basis van `monte.worseThanApe` (= `beatPct < 50`, dus of je minder dan de helft van de apen verslaat). Dat is niet hetzelfde als "boven of onder het gemiddelde": bij een rechts-scheve verdeling kun je >50% van de apen verslaan en toch onder het rekenkundig gemiddelde zitten — precies wat hier gebeurt.

## Oplossing

In `src/components/HorsCategorieTab.tsx` (rond regels 1128-1145) de kaart laten kiezen op basis van het werkelijke verschil `userActual - mean` in plaats van `worseThanApe`:

- Bereken `diff = Math.round(monte.userActual - monte.mean)` één keer.
- `value`: `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} pt` (geen dubbele tekens meer).
- `unit`: `diff >= 0 ? "boven gemiddelde aap" : "onder gemiddelde aap"`.
- `label`, `icon`, `accentColor` en de `description` blijven gekoppeld aan `monte.worseThanApe` (die gaat over percentiel — een ander, valide concept voor de "toon").
  - Alternatief, als je consistentie wilt: ook deze koppelen aan `diff < 0`. Standaard houd ik ze op `worseThanApe` zodat de copy "Verlies van de aap" pas verschijnt als je echt door de meerderheid van de apen verslagen wordt; bij een klein negatief verschil (zoals nu) blijft het de groene "Jij vs de aap"-kaart met "−1 pt onder gemiddelde aap".

## Edge cases

- `diff === 0` → toont `+0 pt boven gemiddelde aap` (acceptabel; komt zelden voor door afronding).

Laat het me weten als je liever óók label/kleur/icoon laat omslaan zodra `diff < 0` (dus puur op het gemiddelde i.p.v. op het percentiel).