-- Streekklassement: per-subpoule instelbaar minimum aantal deelnemers per plaats
-- voordat een woonplaats in het hoofd-streekklassement meedoet. Idempotent.
alter table public.subpoules
  add column if not exists streek_min_deelnemers integer not null default 50;
