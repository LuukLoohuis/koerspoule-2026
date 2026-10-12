/**
 * Testbank-scherm 16: de Volgwagen › Live op een ÉCHTE feed.
 *
 * Leest http://localhost:3300/ (zie scratchpad/feed.mjs: pollt
 * livemarathon.schaatsen.nl via DDP en serveert de laatste stand). Zelfde
 * normalisatie en groepsindeling als de edge function + useLiveRace, zodat we
 * zien wat de site zou tonen zonder iets aan productie te koppelen.
 */
import { useEffect, useMemo, useState } from "react";
import LiveTab from "@/components/meermarathon/LiveTab";
import {
  buildGroups,
  groepsNaam,
  normalizePremie,
  normalizeRace,
  normalizeRider,
  type LiveRider,
  type RawPremieDoc,
  type RawRaceDoc,
  type RawStandDoc,
} from "@/lib/liveMarathon";
import type { LiveRace } from "@/hooks/useLiveRace";
import { Frame, GEDEELD } from "@/dev/mm/Scherm4Demo";

const FEED = "http://localhost:3300/";

type Feed = {
  trackId: string;
  syncedAt: string;
  race: RawRaceDoc | null;
  stand: RawStandDoc[];
  premies: RawPremieDoc[];
};

/** Vier rijders uit het veld als "mijn rijders", zodat de eigen regels werken. */
const MIJN_BEENNUMMERS = ["046", "D46", "W30", "091"];

function naarRace(feed: Feed): { race: LiveRace; riders: LiveRider[] } {
  const riders = feed.stand.map(normalizeRider).filter((r): r is LiveRider => r !== null);
  const race: LiveRace = {
    stageId: "dev-haarlem",
    stageNumber: 0,
    stageName: `Tijdwedstrijd ${feed.trackId}`,
    ijsType: "kunstijs",
    syncedAt: feed.syncedAt,
    tracks: [
      {
        trackId: feed.trackId,
        label: "Mannen",
        categorie: "mannen",
        state: feed.race ? normalizeRace(feed.race) : null,
        riders,
        groups: buildGroups(riders),
        premies: feed.premies.map(normalizePremie).filter((p) => p !== null) as never[],
        riderIdByBeennummer: new Map(riders.map((r) => [r.beennummer, `live-${r.beennummer}`])),
        syncedAt: feed.syncedAt,
      },
    ],
  };
  return { race, riders };
}

function useFeed(): Feed | null {
  const [feed, setFeed] = useState<Feed | null>(null);
  useEffect(() => {
    let dood = false;
    const haal = () =>
      fetch(FEED)
        .then((r) => r.json())
        .then((f: Feed) => { if (!dood && f && f.stand) setFeed(f); })
        .catch(() => undefined);
    haal();
    const id = window.setInterval(haal, 10_000);
    return () => { dood = true; window.clearInterval(id); };
  }, []);
  return feed;
}

export default function Scherm16Demo() {
  const feed = useFeed();
  const data = useMemo(() => (feed ? naarRace(feed) : null), [feed]);
  if (!data) {
    return <p className="font-mono text-sm text-muted-foreground">Geen feed op {FEED} — draai scratchpad/feed.mjs.</p>;
  }
  const { race, riders } = data;
  const track = race.tracks[0];
  const mijn = riders
    .filter((r) => MIJN_BEENNUMMERS.includes(r.beennummer))
    .map((r) => ({ id: `live-${r.beennummer}`, naam: r.naam }));
  const props = { ...GEDEELD, mineRiderIds: new Set(mijn.map((m) => m.id)), mijnRijders: mijn, categorie: "mannen", wedstrijdType: null, ploegNaam: "Testploeg" };

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-start gap-8">
        <Frame label={`mobiel 390 · ${feed!.trackId} · bron ${track.state?.bronTijd ?? "?"}`} breedte="mobiel">
          <LiveTab race={race} {...props} />
        </Frame>
        <Frame label="desktop 1280" breedte="desktop">
          <LiveTab race={race} {...props} />
        </Frame>
      </div>
      <details className="font-mono text-xs">
        <summary>Groepsindeling (buildGroups) — {track.groups.length} groepen, {riders.length} rijders</summary>
        <ol className="mt-2 space-y-1">
          {track.groups.map((g, i) => (
            <li key={i}>
              <strong>{groepsNaam(track.groups, i)}</strong> · tier {g.tier} · {g.leden.length} rijders · gat {g.gapToPrev ?? "—"} s ·{" "}
              {g.leden.map((l) => `${l.rider.beennummer} ${l.rider.naam}`).join(", ")}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
