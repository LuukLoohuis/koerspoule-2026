
## Wat verandert er

Twee gerichte UI-aanpassingen in de "Dartpijl"-tab van Hors Catégorie. Geen logica- of databerekening-wijzigingen — alles blijft op `monte.beatPct`, `monte.mean`, `monte.userActual` gebaseerd.

### 1. Verdict-tekst herschrijven (geen "Gelijkspel met de dobbelsteen" meer)

`src/components/horscat/verdictConfig.ts` — labels & hints in cycling-termen, met een knipoog naar wat "de aap met de dartpijl" eigenlijk inhoudt (een willekeurige ploeg samengesteld door 5.000 simulaties; jouw skill afmeten tegen pure pech/geluk).

Voorgestelde nieuwe bands (final copy in build-fase fine-tunen):

- **≥85** — "Kopman van het peloton — de aap rijdt op kop te laat."  
  hint: "Skill-signaal: jij stuurt, de dartpijl volgt in de gruppetto."
- **≥60** — "Je rijdt mee in de kopgroep, vóór de apen."  
  hint: "Boven het toeval — geen meeval, gewoon koerskennis."
- **≥40** — "Je zit in het peloton, schouder aan schouder met de aap."  
  hint: "Skill ≈ geluk deze ronde. De dartpijl bonjourt vriendelijk."
- **<40** — "De aap met de dartpijl rijdt jou uit het wiel."  
  hint: "Een willekeurige ploeg scoort beter — tijd voor een tactische heroverweging."

De disclaimer-tekst onderaan `PercentileVerdict` blijft staan (uitleg over 5.000 simulaties). De `“Awel, de Tour, dat is een loterij, hé…”` quote ook.

### 2. Bovenste rij wordt een echt "stats-dashboard"

Op dit moment toont de bovenste rij twee tegels: `PercentileVerdict` (groot percentage + verdict) en `Monkey IQ` (apen-verslagen). De stat-kaarten "Gemiddelde aap" en "Jij vs de aap" hangen verderop, los onder de distributiegrafiek.

Nieuwe opzet in `src/components/HorsCategorieTab.tsx` (regels ~931-985 + de stats-row ~1118-1148):

```text
┌─────────────────────────────────────────────────────────────┐
│  PercentileVerdict (volle breedte, headline + verdict)      │
├──────────────────┬──────────────────┬───────────────────────┤
│ Gemiddelde aap   │ Jij vs gem. aap  │ Apen verslagen        │
│  1660 pt         │  −1 pt           │  2.550 / 5.000        │
│  🎯              │  😬 / 🏆          │  🧠 51,0%             │
└──────────────────┴──────────────────┴───────────────────────┘
```

- `PercentileVerdict` schaalt naar volle breedte (geen 2-koloms grid meer er omheen).
- Daaronder één 3-koloms KPI-rij (`grid-cols-1 sm:grid-cols-3 gap-4`) met `DarkStatCard`-tegels, in deze volgorde:
  1. **Gemiddelde aap** — `Math.round(monte.mean)` pt · 🎯
  2. **Jij vs gem. aap** — `±diff` pt, kleur groen/rood op basis van `diff = userActual − mean` (logica die we vorige iteratie al hebben gefixt blijft).
  3. **Apen verslagen** — `round(beatPct/100 * 5000)` van 5.000 · subregel `beatPct.toFixed(1)%` · 🧠.
- De aparte "Monkey IQ"-tegel + de losse `Gemiddelde aap / Jij vs de aap`-rij onder de grafiek verdwijnen (geconsolideerd in deze rij).
- De `nickname`-kaart ("prestatieklasse") die nu binnen Monkey IQ zat → eronder als kleine compacte regel of komt te vervallen. Voorstel: in build-fase compact onder de KPI-rij als één regel-badge ("Prestatieklasse: 🏆 Kopman") om niets onnodig te verliezen.

Distributiegrafiek + commentary-balk eronder blijven ongewijzigd.

## Te wijzigen bestanden

- `src/components/horscat/verdictConfig.ts` — `VERDICT_BANDS` labels/hints/emoji.
- `src/components/HorsCategorieTab.tsx` — herstructureren bovenste rij (regels ~931-985) en verwijderen losse stat-row (~1118-1148).

## Niet aangeraakt

- Monte Carlo-berekening, kleurtokens, distributiegrafiek, andere sub-tabs, backend.
