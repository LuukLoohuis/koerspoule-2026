-- Officiële startlijst: markeer renners die in de voorlopige lijst stonden maar
-- NIET in de officiële (uitvallers) zonder ze te verwijderen (teamkeuzes
-- verwijzen naar rider-ID). is_vervallen ≠ is_dnf (DNF = uitval tijdens de koers).
-- Rugnummer = bestaande kolom start_number (al aanwezig). Idempotent.
alter table public.riders
  add column if not exists is_vervallen boolean not null default false;
