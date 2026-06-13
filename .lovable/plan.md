## Plan

De nieuw geüploade fietsende aap (Designer_9.png, transparante achtergrond) komt rechts naast het Monkey IQ / Jij-vs-aap blok (`PercentileVerdict`) in het "Aap met Dartpijl"-tab.

### Wijzigingen

1. **Asset uploaden** via `lovable-assets create` vanuit `/mnt/user-uploads/Designer_9.png` → `src/assets/horscat/aap-fietser.png.asset.json`. Originele binary wordt niet in repo gezet.

2. **`src/components/HorsCategorieTab.tsx`** (rond regel 844):
   - Wrap `<PercentileVerdict ... />` in een flex-container:
     - Mobiel: alleen de verdict-kaart (image verborgen, anders te krap).
     - `md+`: `flex items-center gap-6` met de verdict-kaart links (`flex-1`) en rechts de fietsende aap (`hidden md:block`, `w-[200px] lg:w-[240px]`, `h-auto`, `select-none pointer-events-none`, lichte `drop-shadow`).
   - Import van het asset-pointer JSON bovenaan.
   - Optioneel: subtiele `animate-monkey-idle` (bestaande utility) of geen animatie om rustig te houden.

3. **Geen wijzigingen** aan `PercentileVerdict.tsx` zelf, aan de histogram (waar de andere aap al staat), of aan de KPI-tegels. De compositie van het bestaande blok blijft 1:1 hetzelfde.

### Resultaat
Op desktop staat de fietsende aap met dartpijl in de pose-richting (naar links kijkend) als visuele "tegenspeler" naast het Monkey IQ-vergelijkingsblok. Op mobiel blijft alles ongewijzigd zodat de hero niet wordt opgedrukt.
