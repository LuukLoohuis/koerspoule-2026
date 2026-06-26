# Load-test — bewijs het 10k-knelpunt vóór je upgradet

Doel: aantonen dat de bottleneck bij ~10k deelnemers de **instance-capaciteit +
connecties** is, geraakt door de **thundering herd** die na een etappe-fiat
tegelijk de ranking opvraagt — vóórdat je geld uitgeeft aan een hogere tier.

## Wat het test
- **`get_game_leaderboard`-RPC** (de zwaarste hot read; leest uit `leaderboard_global_mv`) — `anon` mag 'm callen, dus geen login nodig.
- **(optioneel) `/uitslagen`** — de publieke pagina, modelleert echte bezoekers.

## Installeren
```bash
brew install k6        # of: https://k6.io/docs/get-started/installation/
```

## Draaien
```bash
SUPABASE_URL=https://uqjrzozttkbjrdvzeroc.supabase.co \
SUPABASE_ANON_KEY=<jouw anon key> \
GAME_ID=ae50ba76-dd26-443c-bbb5-21c808966934 \
k6 run load-test/leaderboard.js
```
Pagina meenemen: voeg `SITE_URL=https://koerspoule.nl` toe.

> De anon key staat in Supabase → Project Settings → API (publiek, veilig te gebruiken).

## ⚠️ Belangrijk
- Dit raakt je **echte productie-DB**. Draai op een **rustig moment**, of beter:
  tegen een **staging-Supabase-project** met dezelfde tier.
- Kijk **live mee** in het Supabase-dashboard tijdens de run:
  - **Database → Reports**: CPU, RAM, **active connections**.
  - Loopt connections tegen je pooler-limiet? Dan heb je het knelpunt beet.

## Opschalen naar "10k"
Het script piekt nu op **800 req/s** (veilig startpunt). Voor een realistische
10k-fiat-piek: zet in `leaderboard.js` de `stages.target` hoger (bv. 2000–5000)
en verhoog `maxVUs`. Draai dit **niet** vanaf één laptop tegen productie — gebruik
**k6 Cloud** of meerdere load-generators, anders meet je je eigen uplink i.p.v. de DB.

Vuistregel: 10k deelnemers die binnen ~30s na de fiat kijken ≈ **300–600 req/s**
op de leaderboard-RPC (afhankelijk van herhaalbezoek/caching). De piek van 800
dekt dat ruim; schaal op tot je de knik ziet.

## Hoe je het knelpunt herkent (de thresholds)
Het script faalt bewust als:
- `rpc_leaderboard_ms p(95) >= 800ms` — ranking wordt traag onder druk.
- `rpc_leaderboard_failed >= 1%` of `http_req_failed >= 2%` — requests vallen om
  (typisch: connectie-limiet / pooler vol → de #1-bottleneck).

Zie je p95 oplopen en fouten verschijnen rond een bepaald req/s-niveau, dan is
dát je huidige plafond. Herhaal **na** de tier-upgrade + pooler en vergelijk.

## Interpretatie → acties (volgorde uit de schaalbaarheidsanalyse)
1. **Connecties/tier muur** → upgrade compute-tier + alles via de pooler (transaction mode).
2. **Realtime WAL** → apart te zien in `pg_stat_statements`; niet in deze test.
3. **Streek/standings** → aparte test mogelijk tegen die RPC zodra die server-side staat.

Zie [`docs/schaalbaarheid-analyse-10k.md`](../docs/schaalbaarheid-analyse-10k.md) voor het volledige rapport.
