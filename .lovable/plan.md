Ik heb de oorzaak gevonden: de histogramdata bevat 25 bins, maar de niet-gemarkeerde staven gebruiken momenteel `hsl(var(--ink-sepia) / ...)` terwijl `--ink-sepia` in dit project een hex-variabele is. Daardoor is die kleur ongeldig in CSS en worden alleen de gouden user-bar en markers zichtbaar.

Plan:
1. Pas in `AapscoreDistributie.tsx` de staafkleuren aan naar geldige projecttokens:
   - normale bars: `color-mix(in srgb, var(--ink-sepia) 65%, transparent)` of direct `var(--ink-sepia)` met opacity
   - bovenrand: idem, maar sterker
   - gouden user-bar blijft zoals hij is
2. Laat de bestaande 25 bins, hoogteberekening, assen, gridlines en grote aap ongemoeid.
3. Controleer daarna visueel dat alle histogramstaven weer verschijnen, niet alleen de gouden bar.