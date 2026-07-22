/**
 * src/pages/Index.tsx — drop-in vervanger
 *
 * Behoudt t.o.v. de oude Index.tsx:
 *   - useNavigate, lazy imports voor FeaturePreview + HorsCategoriePreview
 *   - smoothScrollTo / smoothScrollToTop
 *   - <CountdownBanner /> in CTA-blok
 *   - features-array voor "Hoe werkt het?"
 *   - shadcn <Button> en react-router <Link>
 *
 * Nieuw t.o.v. de oude:
 *   - Race-aware hero met groot Playfair-titelblok + KoerspouleLogo sticker
 *   - Stats-strip (etappes / km / hm / inzet)
 *   - "De Courant" sectie: top-5 klassement + sparkline + mop van de dag
 *   - Caveat margin-notes en stickers
 *
 * Dependencies (alles al aanwezig in jouw repo behalve KoerspouleLogo):
 *   - @/components/KoerspouleLogo   ← nieuw, zie merge/KoerspouleLogo.tsx
 *   - @/components/CountdownBanner
 *   - @/components/FeaturePreview
 *   - @/components/HorsCategoriePreview
 *   - @/components/ui/button (shadcn)
 *   - @/hooks/useCurrentGame
 *   - @/lib/utils (smoothScrollTo / smoothScrollToTop)
 *   - lucide-react (Trophy, Users, Bike, BookOpen)
 */

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import RubriekBlock from "@/components/RubriekBlock";
import { Bike, BookOpen, Trophy, Users, Instagram } from "lucide-react";

import { Button } from "@/components/ui/button";
import DeelnemersTeller from "@/components/DeelnemersTeller";
import CountdownBanner from "@/components/CountdownBanner";
import WervingStrook from "@/components/WervingStrook";
import KoerspouleLogo, { type RaceKey } from "@/components/KoerspouleLogo";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useAllGames } from "@/hooks/useAllGames";
import InschrijfBanner from "@/components/InschrijfBanner";
import { useThema } from "@/contexts/ThemaContext";
import Stamp from "@/components/retro/Stamp";
import type { ThemaKey } from "@/lib/themas";
import { useAuth } from "@/hooks/useAuth";
import { useGameBenchmark } from "@/hooks/useSubpouleBenchmark";
import type { EntryStanding } from "@/hooks/useResults";
import { smoothScrollTo, smoothScrollToTop } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Race-aware copy
// ─────────────────────────────────────────────────────────────────────────────

type RaceCopy = {
  longName: string;
  line1: string;
  line2: string;
  yearTag: string; // korte editie (klein, accent)
  edition: string; // volledige editie-string voor eyebrow
  jersey: string;
  startToFinish: string; // bv. "9–31 mei 2026"
};

const INSTAGRAM_URL = "https://www.instagram.com/koerspoule/";

const THEMA_TO_RACE: Record<ThemaKey, RaceKey> = {
  roze: "giro",
  geel: "tdf",
  rood: "vuelta",
};

const RACE_COPY: Record<RaceKey, RaceCopy> = {
  giro: {
    longName: "Giro d'Italia",
    line1: "Giro",
    line2: "d'Italia",
    yearTag: "'26",
    edition: "Edizione N°109 · 9–31 mei MMXXVI",
    jersey: "maglia rosa",
    startToFinish: "9–31 mei 2026",
  },
  tdf: {
    longName: "Tour de France",
    line1: "Tour de",
    line2: "France",
    yearTag: "'26",
    edition: "Édition 113 · 4–26 juillet MMXXVI",
    jersey: "maillot jaune",
    startToFinish: "4–26 juli 2026",
  },
  vuelta: {
    longName: "Vuelta a España",
    line1: "Vuelta a",
    line2: "España",
    yearTag: "'26",
    edition: "Edición 81 · 22 ago–13 sep MMXXVI",
    jersey: "maillot rojo",
    startToFinish: "22 aug–13 sep 2026",
  },
  femmes: {
    longName: "Tour de France Femmes",
    line1: "Tour de",
    line2: "France Femmes",
    yearTag: "'26",
    edition: "Édition 5 · 1–9 août MMXXVI",
    jersey: "maillot jaune",
    startToFinish: "1–9 aug 2026",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Spelregels (uit de oude Index.tsx — onveranderd)
// ─────────────────────────────────────────────────────────────────────────────

// Iconen + i18n-sleutels; t() gebeurt in de component (taal kan wisselen).
const FEATURE_DEFS = [
  { icon: Bike, titleKey: "landing.feature1Title", descKey: "landing.feature1Desc", rulesLink: false },
  { icon: Users, titleKey: "landing.feature2Title", descKey: "landing.feature2Desc", rulesLink: false },
  { icon: Trophy, titleKey: "landing.feature3Title", descKey: "landing.feature3Desc", rulesLink: false },
  { icon: BookOpen, titleKey: "landing.feature4Title", descKey: "landing.feature4Desc", rulesLink: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// "De Courant" — top 5 + sparkline + mop. Voor nu mock, hooks komen later.
// ─────────────────────────────────────────────────────────────────────────────

type TopFiveRow = {
  p: number;
  name: string;
  team: string;
  pts: number;
  jersey?: string | null;
  you?: boolean;
  spark: string;
};

// TODO: vervang door useSubpouleStandings() of useResults() zodra de game live is.
const MOCK_TOP_FIVE: TopFiveRow[] = [
  { p: 1, name: "Jan Bakker",      team: "Cipollini Memorial", pts: 832, jersey: "hsl(var(--primary))",      spark: "0,3 5,2 10,1 15,2 20,3 25,4 30,5 35,6 40,7 45,8 50,9 55,10 60,12 65,13 70,14" },
  { p: 2, name: "Eva Klootwijk",   team: "Team Bidon",          pts: 794, jersey: "hsl(var(--jersey-giallo))", spark: "0,12 5,10 10,9 15,8 20,7 25,7 30,8 35,8 40,9 45,9 50,10 55,10 60,11 65,11 70,12" },
  { p: 3, name: "Marco Terpstra",  team: "La Salsiccia",        pts: 752, jersey: "hsl(var(--jersey-verde))",  spark: "0,0 5,1 10,3 15,2 20,4 25,5 30,6 35,6 40,7 45,7 50,8 55,8 60,9 65,9 70,10" },
  { p: 4, name: "Sophie de Bruin", team: "Pogi Boys",           pts: 711, jersey: null,                         spark: "0,8 5,7 10,7 15,6 20,6 25,6 30,6 35,7 40,7 45,8 50,8 55,9 60,9 65,10 70,10" },
  { p: 5, name: "Henk Verheijen",  team: "Tiramisuper",         pts: 688, jersey: null, you: true,             spark: "0,13 5,12 10,11 15,11 20,10 25,10 30,9 35,8 40,8 45,7 50,7 55,6 60,6 65,5 70,4" },
];

// TODO: vervang door useEntry() sparkline-data
const MOCK_MY_PROGRESS = {
  from: 11,
  to: 5,
  pointsPolygon: "0,90 40,84 80,75 120,72 160,60 200,48 240,40 280,32 280,120 0,120",
  pointsLine:    "0,90 40,84 80,75 120,72 160,60 200,48 240,40 280,32",
};

// Richting-kleuren voor "Jouw koers" (dag-op-dag). Vaste hexes: leesbaar op de
// crème/paper-achtergrond, los van het actieve thema-accent.
const DIR_STYLE = {
  up: { stroke: "#3B6D11", text: "#2C500A", bg: "rgba(59,109,17,0.12)", arrow: "▲" },
  down: { stroke: "#A32D2D", text: "#791F1F", bg: "rgba(163,45,45,0.12)", arrow: "▼" },
  flat: { stroke: "hsl(var(--muted-foreground))", text: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted-foreground)/0.12)", arrow: "—" },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // De homepage volgt altijd de actuele live-first game; een in dezelfde sessie
  // bekeken historische koers mag de homepagegegevens niet overschrijven.
  const { data: currentGame } = useCurrentGame({ ignoreSelectedGame: true });
  const { data: allGames = [] } = useAllGames();
  // Games met de admin-vlag aan én daadwerkelijk open_inschrijving → banner.
  const inschrijfGames = useMemo(
    () => allGames.filter((g) => g.inschrijf_banner_visible && String(g.status) === "open_inschrijving"),
    [allGames],
  );
  const { thema, key: themaKey, ready: themaReady } = useThema();

  // De hero volgt het actieve thema (admin-keuze), met game_type als fallback.
  const race = THEMA_TO_RACE[themaKey];
  const copy = RACE_COPY[race];

  const { user } = useAuth();
  const gameId = currentGame?.id;

  // Single source of truth: game_benchmark_data RPC (SECURITY DEFINER).
  // Returns entries sorted by total_points DESC, approved stages with results,
  // and stage_points for all entries — all consistently filtered to approved results.
  // Only call when logged in (the RPC raises if auth.uid() IS NULL).
  const { data: benchmark } = useGameBenchmark(user ? gameId : undefined);

  const allEntries: EntryStanding[] = useMemo(
    () =>
      (benchmark?.entries ?? [])
        .filter((e) => e.entry_id != null)
        .map((e) => ({
          id: e.entry_id!,
          user_id: e.user_id,
          team_name: e.team_name,
          total_points: e.total_points,
          display_name: e.display_name ?? null,
        })),
    [benchmark]
  );
  // benchmark.stages: only approved stages that have stage_results (sorted by stage_number)
  const approvedStages = useMemo(() => benchmark?.stages ?? [], [benchmark]);
  const stagePoints = useMemo(() => benchmark?.stage_points ?? [], [benchmark]);
  // Last approved stage with results = last element of benchmark.stages
  const lastStage = approvedStages.length > 0 ? approvedStages[approvedStages.length - 1] : null;

  const sortedEntries = useMemo(
    () => [...allEntries].sort((a, b) => b.total_points - a.total_points),
    [allEntries]
  );
  const myEntry = useMemo(
    () => (user ? allEntries.find((e) => e.user_id === user.id) : undefined),
    [allEntries, user]
  );
  const myRank = useMemo(
    () => (myEntry ? sortedEntries.findIndex((e) => e.id === myEntry.id) + 1 : null),
    [sortedEntries, myEntry]
  );

  // ── Daguitslag: punten van de laatst gefiatteerde etappe per entry ──
  const dayPointsByEntry = useMemo(() => {
    const m = new Map<string, number>();
    if (!lastStage) return m;
    for (const sp of stagePoints) {
      if (sp.stage_id === lastStage.id) {
        m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points);
      }
    }
    return m;
  }, [stagePoints, lastStage]);

  const daySortedEntries = useMemo(
    () =>
      [...allEntries].sort(
        (a, b) => (dayPointsByEntry.get(b.id) ?? 0) - (dayPointsByEntry.get(a.id) ?? 0),
      ),
    [allEntries, dayPointsByEntry],
  );

  const myDayRank = useMemo(
    () => (myEntry ? daySortedEntries.findIndex((e) => e.id === myEntry.id) + 1 : null),
    [daySortedEntries, myEntry],
  );

  const cumulativeByEntry = useMemo(() => {
    const map = new Map<string, number[]>();
    if (!approvedStages.length || !allEntries.length) return map;
    for (const e of allEntries) map.set(e.id, []);
    const ptsByKey = new Map(stagePoints.map((sp) => [`${sp.stage_id}:${sp.entry_id}`, sp.points]));
    for (const stage of approvedStages) {
      for (const e of allEntries) {
        const arr = map.get(e.id)!;
        const prev = arr.length ? arr[arr.length - 1] : 0;
        arr.push(prev + (ptsByKey.get(`${stage.id}:${e.id}`) ?? 0));
      }
    }
    return map;
  }, [approvedStages, allEntries, stagePoints]);

  const maxCumulative = useMemo(() => {
    let max = 1;
    for (const arr of cumulativeByEntry.values()) {
      const last = arr[arr.length - 1] ?? 0;
      if (last > max) max = last;
    }
    return max;
  }, [cumulativeByEntry]);

  const myRankProgression = useMemo(() => {
    if (!myEntry || !approvedStages.length) return [];
    return approvedStages.map((_, i) => {
      const sorted = [...allEntries].sort(
        (a, b) => (cumulativeByEntry.get(b.id)?.[i] ?? 0) - (cumulativeByEntry.get(a.id)?.[i] ?? 0)
      );
      return sorted.findIndex((e) => e.id === myEntry.id) + 1;
    });
  }, [myEntry, approvedStages, allEntries, cumulativeByEntry]);

  const hasStageData = approvedStages.length > 0 && allEntries.length > 0;
  const showRealData = Boolean(user) && hasStageData;
  // Echte data zodra de ingelogde deelnemer een team heeft én er ≥1 etappe
  // gefiatteerd is. (De MOCK blijft enkel voor uitgelogde bezoekers/geen data —
  // een marketing-preview op de homepage, niet voor een echte deelnemer.)
  const showRealSparkline = Boolean(user) && myEntry !== undefined && myRankProgression.length >= 1;

  const JERSEY_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--jersey-giallo))",
    "hsl(var(--jersey-verde))",
    null,
    null,
  ];

  const realTopFive: TopFiveRow[] = useMemo(() => {
    if (!showRealData) return [];
    // Daguitslag van de laatst gefiatteerde etappe (niet het klassement).
    return daySortedEntries.slice(0, 5).map((entry, i) => {
      const cumulArr = cumulativeByEntry.get(entry.id) ?? [];
      const n = cumulArr.length;
      const spark =
        n === 0
          ? "0,14 70,14"
          : cumulArr
              .map((v, j) => {
                const x = n === 1 ? 35 : (j / (n - 1)) * 70;
                const y = 14 - (v / maxCumulative) * 12;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
      return {
        p: i + 1,
        name: entry.display_name ?? entry.team_name ?? t("landing.participantFallback"),
        team: entry.team_name ?? "",
        pts: dayPointsByEntry.get(entry.id) ?? 0,
        jersey: JERSEY_COLORS[i] ?? null,
        you: entry.user_id === user?.id,
        spark,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRealData, daySortedEntries, dayPointsByEntry, cumulativeByEntry, maxCumulative, user?.id, t]);

  const myRowOutsideTop5: TopFiveRow | null = useMemo(() => {
    if (!showRealData || !myEntry || !myDayRank || myDayRank <= 5) return null;
    const cumulArr = cumulativeByEntry.get(myEntry.id) ?? [];
    const n = cumulArr.length;
    const spark =
      n === 0
        ? "0,14 70,14"
        : cumulArr
            .map((v, j) => {
              const x = n === 1 ? 35 : (j / (n - 1)) * 70;
              const y = 14 - (v / maxCumulative) * 12;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
    return {
      p: myDayRank,
      name: myEntry.display_name ?? myEntry.team_name ?? t("landing.youFallback"),
      team: myEntry.team_name ?? "",
      pts: dayPointsByEntry.get(myEntry.id) ?? 0,
      jersey: null,
      you: true,
      spark,
    };
  }, [showRealData, myEntry, myDayRank, dayPointsByEntry, cumulativeByEntry, maxCumulative, t]);

  const myProgress = useMemo(() => {
    if (!showRealSparkline) return MOCK_MY_PROGRESS;
    const n = myRankProgression.length;
    const total = allEntries.length || 1;
    const W = 280, H = 120;
    // Eén etappe → nog geen verloop: platte lijn op de huidige rang (eerlijk,
    // niet leeg). from === to zodat de kop "Nu op plek X" toont.
    if (n === 1) {
      const rank = myRankProgression[0];
      const t = total > 1 ? (rank - 1) / (total - 1) : 0;
      const y = (20 + t * 80).toFixed(1);
      return {
        from: rank,
        to: rank,
        pointsPolygon: `0,${y} ${W},${y} ${W},${H} 0,${H}`,
        pointsLine: `0,${y} ${W},${y}`,
      };
    }
    const pts = myRankProgression.map((rank, i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
      const t = total > 1 ? (rank - 1) / (total - 1) : 0;
      const y = 20 + t * 80;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = pts.join(" ");
    const lastX = n === 1 ? W / 2 : W;
    return {
      // Kop = dag-op-dag: plek ná de vorige rit → plek ná de laatste rit. De
      // lijn zelf toont wél het volledige verloop (meer context).
      from: myRankProgression[n - 2],
      to: myRankProgression[n - 1],
      pointsPolygon: `${line} ${lastX.toFixed(1)},${H} 0,${H}`,
      pointsLine: line,
      // Laatste segment apart, zodat het richting-gekleurd bovenop de neutrale
      // goud-lijn kan (groen = gestegen, rood = gezakt).
      lastSegment: n >= 2 ? `${pts[n - 2]} ${pts[n - 1]}` : null,
    };
  }, [showRealSparkline, myRankProgression, allEntries.length]);

  const myProgressEndY = useMemo(() => {
    if (!showRealSparkline) return 32;
    const n = myRankProgression.length;
    const total = allEntries.length || 1;
    const rank = myRankProgression[n - 1];
    const t = total > 1 ? (rank - 1) / (total - 1) : 0;
    return 20 + t * 80;
  }, [showRealSparkline, myRankProgression, allEntries.length]);

  const rankChangeText = useMemo(() => {
    // Uitgelogd/geen data → marketing-preview. Echte deelnemer met 1 etappe →
    // nog geen verloop, dus geen (verzonnen) sprong tonen.
    if (!showRealSparkline) return t("landing.rankChangeMock");
    const n = myRankProgression.length;
    if (n < 2) return t("landing.afterStageOne");
    // Dag-op-dag: verschil tussen plek ná de vorige rit en ná de laatste rit.
    const change = myRankProgression[n - 2] - myRankProgression[n - 1];
    if (change > 0) return t("landing.rankUpDay", { change, rit: n });
    if (change < 0) return t("landing.rankDownDay", { change: Math.abs(change), rit: n });
    return t("landing.rankStableDay", { rit: n });
  }, [showRealSparkline, myRankProgression, t]);

  // Richting van de laatste rit (dag-op-dag): stuurt de kleur van het laatste
  // lijnsegment, het eindpunt, het kop-getal en de badge. null → geen echte
  // data of pas 1 etappe (dan blijft de neutrale margin-note staan).
  const progressDir = useMemo(() => {
    if (!showRealSparkline) return null;
    const n = myRankProgression.length;
    if (n < 2) return null;
    const change = myRankProgression[n - 2] - myRankProgression[n - 1]; // >0 = gestegen
    return {
      dir: (change > 0 ? "up" : change < 0 ? "down" : "flat") as "up" | "down" | "flat",
      count: Math.abs(change),
      rit: n,
    };
  }, [showRealSparkline, myRankProgression]);

  const totalEntries = allEntries.length || 11;
  const midRankLabel = `P${Math.round(1 + (totalEntries - 1) * 0.5)}`;
  const lastRankLabel = `P${showRealData ? totalEntries : 11}`;

  return (
    <div>
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="gradient-border-bottom relative overflow-hidden">
        {/* Subtle grid behind hero */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
            ), repeating-linear-gradient(
              90deg, transparent, transparent 40px, hsl(var(--foreground)) 40px, hsl(var(--foreground)) 41px
            )`,
          }}
        />

        <div className="container mx-auto px-5 md:py-20 relative py-[30px] pt-[20px] pb-[8px] border-0">
          {/* lg: 3 kolommen — tekst | quote (midden, in het wit) | logo.
              md: 2 kolommen (quote hidden), mobiel: gestapeld. */}
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] lg:grid-cols-[1.15fr_0.75fr_0.85fr] gap-12 md:gap-10 items-center">
            {/* Linker kolom — koers + CTAs + stats */}
            <div className="relative">
              <Stamp tone="thema" rotation={-2} className="mb-3">
                {themaReady ? thema.homepage_subtitel : t("landing.subtitleFallback")}
              </Stamp>
              <br className="hidden md:block" />
              {themaReady ? (
                <>
                  <span className="editor-eyebrow text-lg">{copy.edition}</span>
                  <h1
                    className="font-display font-black mt-4 leading-[0.88] tracking-[-0.025em] text-6xl md:text-[92px]"
                    style={{ letterSpacing: "-0.025em" }}
                  >
                    <span>{copy.line1}</span>
                    <br />
                    <span>{copy.line2}</span>{" "}
                    <span className="relative inline-block">
                      <span
                        aria-hidden
                        className="absolute left-1 -right-1 bottom-2 md:bottom-2.5 h-3 md:h-3.5 -rotate-1"
                        style={{ background: "hsl(var(--vintage-gold) / 0.6)" }}
                      />
                      <span className="relative italic font-medium text-primary ml-3.5">
                        {copy.yearTag}
                      </span>
                    </span>
                  </h1>
                </>
              ) : (
                /* Neutrale laadtoestand — geen race-specifiek thema, zelfde ruimte. */
                <div aria-hidden className="mt-4 animate-pulse motion-reduce:animate-none">
                  <div className="h-5 w-40 rounded bg-foreground/10" />
                  <div className="mt-4 space-y-3">
                    <div className="h-[52px] md:h-[80px] w-3/4 rounded bg-foreground/10" />
                    <div className="h-[52px] md:h-[80px] w-2/3 rounded bg-foreground/10" />
                  </div>
                </div>
              )}


              <p className="font-serif italic text-foreground/80 md:text-xl max-w-[480px] mt-6 leading-relaxed text-lg my-[2px] text-center">
                {t("landing.tagline")}
              </p>

              {/* Sociale teller — drijft FOMO. Pas tonen vanaf 5 ploegen,
                  anders voelt het flauw. */}
              <div className="flex flex-wrap gap-3 mt-7 items-center text-2xl">
                <Button
                  className="retro-border-primary font-bold"
                  onClick={() => navigate("/team-samenstellen")}
                >
                  {t("landing.ctaBuildTeam")}
                </Button>
                <Button
                  className="retro-border-primary font-bold"
                  onClick={() => navigate("/login?register=1")}
                >
                  {t("landing.ctaRegister")}
                </Button>
                <Button
                  variant="outline"
                  className="retro-border"
                  onClick={() => navigate("/uitslagen")}
                >
                  {t("landing.ctaResults")}
                </Button>
                <span className="margin-note tilt-l hidden md:inline-block ml-3 text-lg">
                  {t("landing.marginFree")}
                </span>
              </div>

              {/* Sociaal bewijs — subtiele teller (alleen >= drempel, via veilige RPC) */}
              <DeelnemersTeller className="mt-4" />

            </div>

            {/* Middenkolom — quote in het witte gedeelte, links naast het logo.
                Alleen op lg+ (eronder valt de cel weg via hidden). */}
            {(() => {
              // Geen quote tijdens het laden → geen thema-flits.
              const quoteText = themaReady ? (currentGame?.homepage_quote ?? thema.quotes[0]) : null;
              const quoteAuthor =
                currentGame?.homepage_quote_author ?? thema.quoteAuteur;
              if (!quoteText) return null;
              return (
                <figure className="hidden lg:flex flex-col items-center text-center max-w-[380px] mx-auto">
                  <span aria-hidden className="vintage-ornament mb-3 opacity-70" />
                  {/* Fontgrootte instelbaar via Admin → Rubriek → Homepage quote
                      (homepage_quote_size, px); leeg = 34px. */}
                  {(() => {
                    const raw = currentGame?.homepage_quote_size;
                    const px = raw ? Math.max(16, Math.min(72, raw)) : 34;
                    return (
                      <>
                        <blockquote
                          className="margin-note tilt-l italic leading-snug"
                          style={{ fontSize: px }}
                        >
                          “{quoteText}”
                        </blockquote>
                        {quoteAuthor && (
                          <figcaption
                            className="margin-note mt-3 tilt-r not-italic"
                            style={{ fontSize: Math.round(px * 0.72) }}
                          >
                            — {quoteAuthor}
                          </figcaption>
                        )}
                      </>
                    );
                  })()}
                </figure>
              );
            })()}

            {/* Rechter kolom — logo */}
            <div className="relative flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[315px] -rotate-[3deg] transition-transform duration-500 hover:rotate-0 hover:scale-105">
                <img
                  src={koerspouleLogo}
                  alt="Koerspoule logo"
                  className="w-full h-auto block drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INSCHRIJF-BANNER(S) — per game met de vlag aan (direct onder hero) ── */}
      {inschrijfGames.length > 0 && (
        <section className="container mx-auto px-5 pt-6 space-y-3">
          {inschrijfGames.map((g) => (
            <InschrijfBanner key={g.id} game={g} />
          ))}
        </section>
      )}

      {/* ─── AFTELLER-BAND (slank, direct onder de hero) ──────────────────── */}
      <section className="container mx-auto px-5 pt-6">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <div className="text-center md:text-right shrink-0">
            <span className="overline-stamp">{t("landing.countdownEyebrow")}</span>
            <h2 className="heading-oswald text-xl md:text-2xl leading-tight">{t("landing.readyToRace")}</h2>
          </div>
          <CountdownBanner className="w-full md:w-auto md:max-w-xl shrink-0" />
          <Button
            className="retro-border-primary font-bold shrink-0 w-full md:w-auto"
            onClick={() => navigate("/login?register=1")}
          >
            {t("landing.ctaRegister")}
          </Button>
        </div>
      </section>

      {/* ─── WERVINGSSTROOK (per subpoule, admin-gestuurd, wegklikbaar) ───── */}
      <section className="container mx-auto px-5 pt-6">
        <WervingStrook />
      </section>

      {/* ─── DE COURANT ───────────────────────────────────────────────────── */}
      <section className="container mx-auto px-5 pt-4">
        <div className="flex justify-between items-baseline border-t-2 border-foreground pt-2 text-lg">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.22em" }}
          >
            {t("landing.courantHeader")}
          </span>
          <span className="text-xs text-muted-foreground">{"\n"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border-b-2 border-[hsl(var(--vintage-gold))/0.3]">
          {/* Top 5 */}
          <div className="py-5 md:pr-6 md:border-r border-[hsl(var(--vintage-gold))/0.25]">
            <div className="overline-stamp mb-1">{t("landing.dayResult")}</div>
            <div className="font-display font-bold text-2xl leading-tight">
              {lastStage ? t("landing.topFiveOfStage", { stage: lastStage.stage_number }) : t("landing.topFive")}
            </div>
            <div className="mt-3">
              {(showRealData ? realTopFive : MOCK_TOP_FIVE).map((row) => (
                <TopFiveRow key={row.p} row={row} />
              ))}
              {myRowOutsideTop5 && (
                <>
                  <div className="py-1 text-center text-[10px] text-muted-foreground tracking-widest">
                    · · ·
                  </div>
                  <TopFiveRow row={myRowOutsideTop5} />
                </>
              )}
            </div>
            <Link
              to="/uitslagen"
              className="inline-block mt-3 text-xs text-primary font-semibold"
            >
              {t("landing.fullDayResult")}
            </Link>
          </div>

          {/* Sparkline */}
          <div className="py-5 md:px-6 md:border-r border-[hsl(var(--vintage-gold))/0.25] relative">
            <div className="overline-stamp mb-1">{t("landing.yourRace")}</div>
            <div className="font-display font-bold text-2xl leading-tight">
              {myProgress.from === myProgress.to ? (
                <Trans i18nKey="landing.nowAtRank" values={{ rank: myProgress.to }} components={{ 1: <span className="text-primary" /> }} />
              ) : (
                <Trans
                  i18nKey="landing.fromToRank"
                  values={{ from: myProgress.from, to: myProgress.to }}
                  components={{ 1: <span style={progressDir ? { color: DIR_STYLE[progressDir.dir].text } : undefined} className={progressDir ? undefined : "text-primary"} /> }}
                />
              )}
            </div>
            <div className="mt-3 relative h-[130px]">
              <svg viewBox="0 0 280 120" className="w-full h-full">
                <defs>
                  <linearGradient id="kp-progress-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 60, 100].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="280"
                    y2={y}
                    stroke="hsl(var(--foreground) / 0.1)"
                    strokeDasharray="2,4"
                  />
                ))}
                <polygon
                  points={myProgress.pointsPolygon}
                  fill="url(#kp-progress-grad)"
                />
                <polyline
                  points={myProgress.pointsLine}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                {/* Laatste rit richting-gekleurd bovenop de neutrale goud-lijn. */}
                {progressDir && myProgress.lastSegment && (
                  <polyline
                    points={myProgress.lastSegment}
                    fill="none"
                    stroke={DIR_STYLE[progressDir.dir].stroke}
                    strokeWidth="3.25"
                    strokeLinecap="round"
                  />
                )}
                <circle
                  cx="280"
                  cy={myProgressEndY}
                  r="4.5"
                  fill={progressDir ? DIR_STYLE[progressDir.dir].stroke : "hsl(var(--primary))"}
                />
                <text
                  x="278"
                  y="16"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  P1
                </text>
                <text
                  x="278"
                  y="56"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  {midRankLabel}
                </text>
                <text
                  x="278"
                  y="96"
                  textAnchor="end"
                  fontFamily="JetBrains Mono"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                >
                  {lastRankLabel}
                </text>
              </svg>
              {progressDir ? (
                <span
                  className="absolute right-2 -bottom-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-bold"
                  style={{ background: DIR_STYLE[progressDir.dir].bg, color: DIR_STYLE[progressDir.dir].text }}
                >
                  <span aria-hidden>{DIR_STYLE[progressDir.dir].arrow}</span>
                  {progressDir.dir === "flat"
                    ? t("landing.rankBadgeFlat", { rit: progressDir.rit })
                    : t("landing.rankBadge", { count: progressDir.count, rit: progressDir.rit })}
                </span>
              ) : (
                <span className="margin-note tilt-l absolute right-2 -bottom-2 text-lg">
                  {rankChangeText}
                </span>
              )}
            </div>
          </div>

          {/* Rubriek */}
          <RubriekBlock gameId={gameId} />
        </div>
      </section>

      {/* ─── HOE WERKT HET? ───────────────────────────────────────────────── */}
      <section
        id="stel-je-ploeg-samen"
        className="container mx-auto px-5 py-12 md:py-16 vintage-texture text-center scroll-mt-16"
      >
        <span className="overline-stamp text-sm md:text-base">{t("landing.rulesEyebrow")}</span>
        <h2 className="heading-oswald text-3xl md:text-4xl mt-3">{t("landing.howItWorks")}</h2>
        <div className="vintage-ornament max-w-[200px] mx-auto mt-3.5 mb-7">
          <span className="vintage-ornament-symbol">✦</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {FEATURE_DEFS.map((f, i) => (
            <div
              key={f.titleKey}
              className="ornate-frame retro-border bg-card p-6 animate-fade-in"
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className="flex items-baseline gap-3 mb-3">
                <span
                  className="font-display font-black text-4xl text-primary leading-none"
                  style={{ textShadow: "2px 2px 0 hsl(var(--foreground) / 0.12)" }}
                  aria-hidden
                >
                  {["I.", "II.", "III.", "IV."][i]}
                </span>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{t(f.titleKey)}</h3>
              <p className="text-sm text-muted-foreground m-0">{t(f.descKey)}</p>
              {f.rulesLink && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-xs retro-border"
                  onClick={() => navigate("/regels")}
                >
                  {t("landing.rulesButton")}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button
            className="retro-border-primary font-bold"
            onClick={() => navigate("/preview")}
          >
            {t("landing.previewButton")}
          </Button>
        </div>
      </section>

      {/* ─── CTA + COUNTDOWN ──────────────────────────────────────────────── */}
      <section className="container mx-auto px-5 py-10 text-center">
        <div className="vintage-ornament max-w-xs mx-auto mb-5">
          <span className="vintage-ornament-symbol">❧</span>
        </div>
        <h2 className="heading-oswald text-3xl md:text-4xl mb-3">{t("landing.readyToRace")}</h2>
        <p className="text-muted-foreground font-serif italic max-w-md mx-auto mb-5">
          {t("landing.ctaClosing")}
        </p>
        <Button
          className="retro-border-primary font-bold"
          onClick={() => navigate("/login?register=1")}
        >
          {t("landing.ctaRegister")}
        </Button>
      </section>

      <footer className="container mx-auto px-5 pb-10">
        <div className="border-t-2 border-foreground pt-4 flex items-center justify-between flex-wrap gap-3">
          <span className="font-serif italic text-sm text-muted-foreground">
            {t("landing.footerEdition")}
          </span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="retro-border no-hover-lift inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-semibold hover:bg-secondary/40 transition-colors"
            aria-label={t("landing.followInstagramAria")}
          >
            <Instagram className="h-4 w-4 text-primary" />
            {t("landing.followInstagram")}
            <span className="font-mono text-xs text-muted-foreground">@koerspoule</span>
          </a>
        </div>
        {/* Colofon-links naar de poule-pagina's (interne linkwaarde + doorstroom) */}
        <div className="mt-3 text-xs text-muted-foreground font-sans flex flex-wrap gap-x-2 gap-y-1">
          <Link to="/tour-de-france-poule-2026" className="underline hover:text-foreground transition-colors">Tour de France poule 2026</Link>
          <span aria-hidden>·</span>
          <Link to="/tour-de-france-femmes-poule-2026" className="underline hover:text-foreground transition-colors">Tour de France Femmes poule 2026</Link>
          <span aria-hidden>·</span>
          <Link to="/giro-italia-poule-2026" className="underline hover:text-foreground transition-colors">Giro d'Italia poule 2026</Link>
          <span aria-hidden>·</span>
          <Link to="/vuelta-espana-poule-2026" className="underline hover:text-foreground transition-colors">Vuelta a España poule 2026</Link>
        </div>
      </footer>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Stat({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <div className={`px-4 py-[16px] ${last ? "" : "border-r border-foreground/10"}`}>
      <div className="font-display font-bold text-3xl leading-none tracking-[-0.02em]">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function TopFiveRow({ row }: { row: TopFiveRow }) {
  const { t } = useTranslation();
  const lineColor =
    row.p === 1
      ? "hsl(var(--primary))"
      : row.you
        ? "hsl(var(--vintage-gold))"
        : "hsl(var(--muted-foreground))";
  return (
    <div
      className="grid items-center gap-2.5 py-2 border-b border-foreground/5"
      style={{ gridTemplateColumns: "22px 1fr 70px 50px" }}
    >
      <span
        className="font-display font-bold text-base"
        style={{ color: row.p === 1 ? "hsl(var(--primary))" : undefined }}
      >
        {row.p}
      </span>
      <span>
        <div className="text-[13px] font-semibold flex items-center gap-1.5">
          {row.jersey && (
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: row.jersey }}
              aria-hidden
            />
          )}
          {row.name}
          {row.you && (
            <span className="margin-note tilt-l text-base ml-1">{t("landing.youMarker")}</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">{row.team}</div>
      </span>
      <svg width="70" height="18" aria-hidden>
        <polyline
          points={row.spark}
          stroke={lineColor}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-mono text-xs font-bold text-right">{row.pts}</span>
    </div>
  );
}
