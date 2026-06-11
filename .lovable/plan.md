## Doel
`cron.log_run` uitzetten zodat pg_cron geen rijen meer schrijft naar `cron.job_run_details` (drukt commit-/rollback-volume), terwijl de geplande jobs zelf blijven draaien.

## Probleem
- `ALTER SYSTEM SET cron.log_run = 'off'` mag niet in een transactie draaien — werkt dus niet via de SQL-editor en ook niet via het migration-tool (dat wikkelt alles in een transactie).
- Op Lovable Cloud is er geen directe shell-toegang tot Postgres om de statement buiten een transactie uit te voeren.

## Aanpak
Twee sporen, in deze volgorde:

### Spoor 1 — per-job uitschakelen via `cron.schedule` (werkt zonder ALTER SYSTEM)
pg_cron ondersteunt per-job logging via de kolom `cron.job.nodename`/settings is niet beschikbaar, maar we kunnen wél:

1. Inventariseren welke jobs bestaan en hoe vaak ze draaien:
   ```sql
   SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;
   SELECT count(*), date_trunc('hour', start_time) AS h
   FROM cron.job_run_details
   WHERE start_time > now() - interval '24 hours'
   GROUP BY h ORDER BY h DESC;
   ```
2. Voor elke job de command wrappen zodat pg_cron niets noemenswaardigs commit (de log-rij blijft, maar we kunnen oude rijen direct opruimen — zie spoor 3).

Dit alleen lost het volume niet structureel op; daarom spoor 2.

### Spoor 2 — `cron.log_run` echt uitzetten
Opties, in volgorde van voorkeur:

A. **Probeer via migration-tool met losse statement.** Het migration-tool voert SQL uit; bij sommige superuser-only GUCs accepteert Supabase een aparte call. Concreet:
   ```sql
   ALTER SYSTEM SET cron.log_run = 'off';
   SELECT pg_reload_conf();
   ```
   Als dit faalt met "cannot run inside a transaction block" → door naar B.

B. **Support-ticket / Lovable Cloud verzoek.** Op managed Supabase is `ALTER SYSTEM` voorbehouden aan superuser en moet buiten een tx draaien. Op Lovable Cloud heb je geen directe DB-superuser shell; deze parameter zetten vereist actie van het platform. We documenteren dit en vragen jou om het ticket-pad te bevestigen voordat we contact opnemen, of we kiezen voor spoor 3 als interim.

### Spoor 3 — interim: opruim-job zodat de tabel niet groeit
Onafhankelijk van spoor 2 toevoegen, want dit helpt direct tegen disk- en vacuum-druk:

```sql
SELECT cron.schedule(
  'purge-job-run-details',
  '*/15 * * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 hour'$$
);
```

(Interval naar wens; 1 uur is ruim genoeg om nog te debuggen.)

## Bevestiging na uitvoer
- `SHOW cron.log_run;` → `off`
- `SELECT count(*) FROM cron.job_run_details;` → blijft stabiel
- `SELECT count(*) FROM cron.job WHERE active;` → ongewijzigd (jobs draaien door)
- DB health opnieuw checken: rolled-back transactions zou moeten afvlakken.

## Vraag aan jou
1. Mag ik spoor 2A proberen via het migration-tool (kans op falen, maar onschuldig)?
2. Akkoord met spoor 3 (auto-purge elke 15 min, retentie 1 uur) als interim/aanvulling?
