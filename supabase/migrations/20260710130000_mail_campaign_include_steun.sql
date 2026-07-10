-- Per mailing: "Steun Koerspoule" (Ko-fi)-knop aan/uit.
--
-- De echte bulk-mail wordt niet door send-announcement gebouwd maar later door
-- process-mail-queue, per ontvanger, uit de opgeslagen mail_campaigns-rij. Om de
-- toggle op de VERZONDEN mail te laten doorwerken (en identiek te houden aan de
-- preview/testmail) moet de keuze op de campagne bewaard worden. Idempotent.

alter table public.mail_campaigns
  add column if not exists include_steun boolean not null default false;
