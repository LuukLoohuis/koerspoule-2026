-- Rijke sponsor-dagprijs-banner (L'Équipe): extra bewerkbare teksten op de
-- prijsrij die als banner getoond wordt (is_dagprijs_vandaag=true). Idempotent.
alter table public.prizes
  add column if not exists banner_kicker text,         -- bv. "Dagprijs van vandaag"
  add column if not exists banner_sponsor_label text,  -- bv. "Trotse sponsor van Koerspoule"
  add column if not exists banner_waarde text;         -- bv. "€10" (gouden ronde badge)
