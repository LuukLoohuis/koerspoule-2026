// k6 load-test — bewijst het 10k-knelpunt: connecties/compute-tier onder de
// "thundering herd" die na een etappe-fiat tegelijk de ranking opvraagt.
//
// Draaien:
//   SUPABASE_URL=https://uqjrzozttkbjrdvzeroc.supabase.co \
//   SUPABASE_ANON_KEY=<anon key> \
//   GAME_ID=ae50ba76-dd26-443c-bbb5-21c808966934 \
//   k6 run load-test/leaderboard.js
//
// Optioneel ook de publieke pagina meenemen: SITE_URL=https://koerspoule.nl
//
// LET OP: dit raakt je ECHTE productie-DB. Draai het bij voorkeur op een rustig
// moment (of tegen een staging-project), en kijk live mee in het Supabase-
// dashboard → Database → Roles/Connections + Reports (CPU, connections).

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const SUPABASE_URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
const GAME_ID = __ENV.GAME_ID;
const SITE_URL = __ENV.SITE_URL || "";

if (!SUPABASE_URL || !ANON || !GAME_ID) {
  throw new Error("Zet SUPABASE_URL, SUPABASE_ANON_KEY en GAME_ID als env-vars.");
}

const rpcTrend = new Trend("rpc_leaderboard_ms", true);
const rpcFail = new Rate("rpc_leaderboard_failed");
const pageTrend = new Trend("page_uitslagen_ms", true);

export const options = {
  scenarios: {
    // "Thundering herd": iedereen opent na de fiat tegelijk de ranking.
    // Arrival-rate = onafhankelijke requests/seconde, niet gekoppeld aan VU-gedrag.
    fiat_piek: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { target: 50, duration: "20s" },   // opbouw
        { target: 800, duration: "20s" },  // de piek (schaal op richting 10k op staging)
        { target: 800, duration: "40s" },  // vasthouden
        { target: 0, duration: "10s" },    // afbouw
      ],
    },
  },
  thresholds: {
    rpc_leaderboard_ms: ["p(95)<800"],     // ranking mag onder piek <800ms p95 blijven
    rpc_leaderboard_failed: ["rate<0.01"], // <1% fouten
    http_req_failed: ["rate<0.02"],
  },
};

const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_game_leaderboard`;
const rpcHeaders = {
  "Content-Type": "application/json",
  apikey: ANON,
  Authorization: `Bearer ${ANON}`,
};

export default function () {
  // 1. De zwaarste hot read: het klassement (leest uit de MV).
  const res = http.post(rpcUrl, JSON.stringify({ p_game_id: GAME_ID }), { headers: rpcHeaders });
  rpcTrend.add(res.timings.duration);
  rpcFail.add(res.status !== 200);
  check(res, {
    "leaderboard 200": (r) => r.status === 200,
    "leaderboard heeft body": (r) => r.body && r.body.length > 2,
  });

  // 2. (optioneel) de publieke uitslagenpagina — modelleert echte bezoekers.
  if (SITE_URL) {
    const page = http.get(`${SITE_URL}/uitslagen`);
    pageTrend.add(page.timings.duration);
    check(page, { "uitslagen 200": (r) => r.status === 200 });
  }

  sleep(1);
}
