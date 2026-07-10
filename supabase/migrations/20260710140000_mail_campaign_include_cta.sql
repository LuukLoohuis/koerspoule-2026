-- Per mailing: "Ga naar Koerspoule"-knop aan/uit (naast include_steun).
--
-- Zelfde reden als include_steun: de bulk-mail wordt door process-mail-queue
-- gebouwd uit de opgeslagen mail_campaigns-rij, dus de keuze moet daar bewaard
-- worden. Default true = huidig gedrag (de knop stond er altijd). Idempotent.

alter table public.mail_campaigns
  add column if not exists include_cta boolean not null default true;
