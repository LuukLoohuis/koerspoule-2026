-- Ploeg-trui (kit-afbeelding) per team. De admin uploadt per team een trui in
-- de Startlijst-tab; de afbeelding wordt in storage gezet en de publieke URL
-- hier bewaard. Toont in "Stel je team samen → Startlijst" naast elke ploeg.
-- Bewust een losse kolom op teams, zodat een nieuwe startlijst-import (die teams
-- op naam hergebruikt) de trui niet wist.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS jersey_url text;
