# Schaalbaarheidsanalyse Koerspoule-DB → 10k gebruikers

**Read-only analyse. Geen wijzigingen gedaan.** Fixes staan als SQL onderaan, apart te reviewen/draaien.
Datum-snapshot: live DB `uqjrzozttkbjrdvzeroc`.

## TL;DR
De **leesarchitectuur is goed**: ranking en totalen lezen uit precomputed bronnen
(`leaderboard_global_mv`, `entries.total_points`), niet uit live-aggregaties. Het zware rekenwerk
zit op het **admin-fiat-moment** (één burst), niet op iedere paginaload. Dat schaalt netjes.

De échte risico's voor 10k zitten **niet in queries** maar in:
1. **Realtime/WAL** — nu al de grootste DB-belasting (568k calls, ~52 min cumulatief).
2. **Compute-tier + `max_connections=60`** — huidige instance is klein.
3. **`my_stage_ranks`** — herberekent een window-rank per call (groeit mee naar ~210k rijen).
4. **Streek/standings** haalt *alle* entries naar de client.

---

## Huidige omvang (en projectie naar 10k, 1 game)

| Tabel | Nu | Schaalt met | ~10k users | Index-status |
|---|---|---|---|---|
| `entries` | 34 | 1 / user / game | ~10k | ✅ goed (`game_user_uidx`, `game_status`, `user`) |
| `total_points` | 31 | 1 / user / game | ~10k | ✅ pk `entry_id` |
| `subpoule_members` | 34 | 1–2 / user | ~10–20k | ✅ `user_idx` + unique |
| `stage_points` | 2 | stages × users | **~210k** (21×10k) | ⚠️ mist `(stage_id, points DESC)` |
| `entry_picks` | 12 | ~8 / user | ~80k | ✅ `entry_idx` |
| `entry_predictions(+points)` | 6/7 | enkele / user | tienduizenden | ✅ `entry_idx` |
| `stage_results` | 1258 | **NIET** met users (renners×etappes) | ~4k (vast) | ✅ ruim geïndexeerd |
| `chat_messages` | klein | met activiteit | variabel | ✅ `(subpoule_id, created_at DESC)` |

Conclusie: alleen `stage_points` wordt echt groot en is user-geschaald op een hot read-pad.
De rest blijft klein of is goed geïndexeerd.

---

## Hot paths — bevindingen

### 1. Ranking (algemeen klassement) — ✅ LAAG risico
`get_game_leaderboard(game_id)` leest puur uit `leaderboard_global_mv`
(`rank() over (partition by game_id order by total_points desc)`), gefilterd op `game_id`, sort op
`rank`. MV is ~10k rijen bij 10k users (56 kB nu). Refresh gebeurt **CONCURRENTLY** (geen leesblokkade)
en alleen bij fiat. Indexen op de MV: `(game_id, rank)` + unique `(entry_id)`.
**Geen actie nodig.**

### 2. Daguitslag / eigen etappe-rang — ⚠️ MIDDEL risico
`my_stage_ranks(game_id, user_id)` berekent **bij elke aanroep**:
```
RANK() OVER (PARTITION BY stage_id ORDER BY points DESC)
  over stage_points JOIN stages JOIN entries(status=submitted)
```
EXPLAIN (nu, triviale data) toont al de vorm: **Seq Scan op `stage_points` → Sort (stage_id, points DESC) → WindowAgg**.
Bij ~210k `stage_points`-rijen wordt dat per call een sort over de hele tabel. Op een piek
(etappe gefiatteerd → iedereen opent tegelijk de daguitslag) draaien er duizenden van deze calls.
- Mist een index `(stage_id, points DESC)`.
- Beter nog: de rang verandert **alleen bij fiat** → cachebaar i.p.v. per-call herberekenen.

**Aanbeveling:** index toevoegen (snelle winst) én op termijn de stage-rang materialiseren
(zoals het globale klassement). Zie SQL #1 en #4.

### 3. Streekklassement + standings — ⚠️ MIDDEL risico (client-kant)
`StreekKlassement` / `SubpouleStandings` (frontend) gebruiken `useEntries(gameId)` → dat haalt
**alle entries van de game** naar de client en aggregeert daar. Bij 10k betekent dat 10k rijen per
clientsessie over de lijn, plus per-rij RLS-evaluatie. De woonplaats-aggregatie zelf is licht, maar
het transport en de RLS-kosten schalen lineair met deelnemers × pageviews.
**Aanbeveling:** server-side aggregatie-RPC (SECURITY DEFINER) die alleen het streek-resultaat
teruggeeft, en de algemene standings via de MV. Zie SQL #5.

### 4. Fiatteren van etappes — ✅ LAAG risico (maar één zware burst)
`approve_stage_results(stage)` → `calculate_stage_scores` + `calculate_prediction_points(game)` +
`update_total_ranking(game)` (MV refresh CONCURRENTLY). `full_recalculation_v4` doet
`delete stage_points (hele game)` + per-etappe herberekenen + `update_total_points_v4`.
Dit is **admin-getriggerd, niet per-user** → één burst van ~10k writes + MV-refresh bij 10k entries.
Acceptabel (seconden). Aandachtspunt: `full_recalculation_v4` verwijdert en herbouwt álle
`stage_points` in één transactie; bij 210k rijen wordt dat een grote transactie met locks op
`stage_points`. Niet kritiek (alleen admin), maar bij groei eventueel per-etappe committen.

### 5. Realtime / subscriptions — 🔴 HOOG risico
`pg_stat_statements` top-query (verreweg #1 op totale tijd):
```
SELECT wal->>... (realtime WAL-decode)   calls=568.234   total=3.115.056 ms   mean=5,48 ms
```
Realtime is **nu al** de grootste DB-belasting, bij een handvol gebruikers. In de publicatie
`supabase_realtime` zitten: `chat_messages`, `chat_message_reactions`, `chat_polls`,
`chat_poll_votes`, `etappe_commentaren`. Met 10k gelijktijdige clients:
- WAL-decode + fanout schaalt met (changes × subscribers).
- `etappe_commentaren` is niet subpoule-gescoped → een nieuwe reactie kan naar álle clients fanned-out
  worden = 10k pushes per insert.

**Aanbeveling (hoogste prioriteit):**
- Beperk realtime tot wat écht live moet; overweeg `etappe_commentaren` van realtime te halen en te
  pollen/refetchen, of strak per-game/per-subpoule te filteren.
- Zorg dat RLS op realtime-tabellen smal filtert (anders evalueert realtime per subscriber).
- Houd de Realtime-load in de Supabase-dashboard-metrics in de gaten bij load-test.

> Los hiervan: `games` staat **niet** in `supabase_realtime`, maar `useCurrentGame` abonneert wél op
> `postgres_changes` van `games`. Die subscription krijgt dus niks; de status-auto-refresh leunt
> stilzwijgend op de focus/interval-refetch. Functioneel klein, geen schaalprobleem — wel opruimen.

### 6. Instance-capaciteit — 🔴 HOOG risico
`max_connections = 60`, `shared_buffers ≈ 224 MB`, `effective_cache_size ≈ 384 MB`, `work_mem ≈ 2 MB`.
Dit is een **kleine compute-tier** (~1 GB RAM-klasse). Voor 10k gebruikers met piekverkeer:
- 60 directe connecties is veel te weinig → **verplicht via de Supabase-pooler (Supavisor/PgBouncer,
  transaction mode)**. PostgREST zit al achter de pooler (`pgbouncer.get_auth` zichtbaar), maar
  controleer dat álle app-paden de **pooled** connection string gebruiken, niet de directe poort 5432.
- Tijdens pieken (post-fiat) zal `work_mem`/cache krap zijn voor de window-sorts.

**Aanbeveling:** upgrade compute-tier vóór 10k (meer RAM → grotere `shared_buffers`/cache, hoger
`max_connections`), en bevestig pooler-gebruik. Dit is een dashboard-/config-actie, geen SQL.

---

## Geprioriteerde lijst

### Vóór 10k (must)
1. **Realtime afslanken** (#5) — grootste load-bron; `etappe_commentaren` herzien, RLS smal, load-testen.
2. **Compute-tier upgrade + pooler bevestigen** (#6) — `max_connections=60` is een harde muur.
3. **Index `stage_points (stage_id, points DESC)`** (SQL #1) — goedkope winst op de daguitslag-piek.
4. **Streek/standings server-side aggregeren** (SQL #5) — stop met 10k entries naar elke client sturen.

### Kan later (should)
5. **Stage-rang materialiseren** (SQL #4) — `my_stage_ranks` cachen i.p.v. per-call window.
6. **`full_recalculation_v4` per-etappe committen** bij grote `stage_points`.
7. **Dode `games`-realtime-subscription opruimen** in `useCurrentGame`.

### Nice-to-have
8. Periodiek `pg_stat_statements` reviewen na load-test; `ANALYZE` na de grote fiat-burst.

---

## Fixes als SQL (NIET gedraaid — apart reviewen)

```sql
-- #1  Index voor de daguitslag-rang (stage_points window: partition stage_id, order points desc)
create index if not exists stage_points_stage_points_idx
  on public.stage_points (stage_id, points desc);

-- #2  (optioneel) ondersteun streek/standings-joins op user_id → entries
--     entries(user_id) bestaat al (entries_user_idx); subpoule_members(user_id) bestaat al.
--     Geen extra index nodig; hier alleen ter bevestiging.

-- #3  ANALYZE de hot tables na een grote recalculation (planner-statistieken vers)
analyze public.stage_points;
analyze public.entries;
analyze public.total_points;
```

```sql
-- #4  (later) Materialiseer de stage-rang zodat my_stage_ranks niet per call een window draait.
--     Refresh CONCURRENTLY in approve_stage_results, net als leaderboard_global_mv.
create materialized view if not exists public.stage_rank_mv as
  select sp.stage_id,
         sp.entry_id,
         rank() over (partition by sp.stage_id order by sp.points desc) as rank
  from public.stage_points sp
  join public.stages  s on s.id = sp.stage_id
  join public.entries e on e.id = sp.entry_id and e.status = 'submitted'
  where sp.points > 0;
create unique index if not exists stage_rank_mv_uidx on public.stage_rank_mv (stage_id, entry_id);
create index        if not exists stage_rank_mv_stage_idx on public.stage_rank_mv (stage_id);
-- daarna my_stage_ranks() laten lezen uit deze MV i.p.v. de live window-query,
-- en `refresh materialized view concurrently public.stage_rank_mv;` toevoegen aan de fiat-functie.
```

```sql
-- #5  (later) Server-side streekklassement i.p.v. alle entries naar de client.
--     Geeft alleen de aggregatie terug; RLS-veilig via SECURITY DEFINER + eigen check.
create or replace function public.subpoule_streek(p_subpoule_id uuid)
returns table(woonplaats text, aantal int, totaal int, gemiddelde numeric)
language sql stable security definer set search_path to 'public' as $$
  select m.woonplaats,
         count(*)::int                        as aantal,
         coalesce(sum(e.total_points),0)::int as totaal,
         round(avg(coalesce(e.total_points,0)),1) as gemiddelde
  from public.subpoule_members m
  join public.subpoules s on s.id = m.subpoule_id
  join public.entries e   on e.user_id = m.user_id and e.game_id = s.game_id and e.status = 'submitted'
  where m.subpoule_id = p_subpoule_id
    and nullif(trim(m.woonplaats), '') is not null
    and public.is_subpoule_member(p_subpoule_id, auth.uid())  -- alleen leden zien dit
  group by m.woonplaats;
$$;
-- grant execute on function public.subpoule_streek(uuid) to authenticated;
```

> **Realtime (#5 in bevindingen)** en **compute/pooler (#6)** zijn geen SQL-fixes maar
> dashboard-/config-acties. Die eerst, want ze dragen het meeste bij bij 10k.
