import { useMemo } from "react";
import { Link } from "react-router-dom";
import TruiBadge from "@/components/retro/TruiBadge";
import type { TruiType } from "@/lib/themas";
import TeamSheetView from "@/components/teamsheet/TeamSheet";
import { detectCategory as detectCategoryT, type SheetRider as SheetRiderT } from "@/components/teamsheet/tokens";
import MijnPloegStats from "@/components/MijnPloegStats";
import FormMeter from "@/components/FormMeter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useEntries, useMyStageRanks } from "@/hooks/useResults";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import StageBars from "@/components/StageBars";
import type { ReactNode } from "react";

type StagePoint = { stage_id: string; entry_id: string; points: number };

function useMyStagePoints(entryId?: string) {
  return useQuery({
    queryKey: ["my-stage-points", entryId],
    enabled: Boolean(supabase && entryId),
    queryFn: async (): Promise<StagePoint[]> => {
      if (!supabase || !entryId) return [];
      const { data, error } = await supabase
        .from("stage_points")
        .select("stage_id, entry_id, points")
        .eq("entry_id", entryId);
      if (error) throw error;
      return (data ?? []) as StagePoint[];
    },
  });
}

function useRiders(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["riders-by-ids", sorted],
    enabled: Boolean(supabase && sorted.length > 0),
    queryFn: async () => {
      if (!supabase || sorted.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, team, country_code, start_number, is_dnf")
        .in("id", sorted);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const STAGE_TYPE_ICON: Record<string, string> = {
  vlak: "🏁",
  heuvelachtig: "⛰️",
  bergachtig: "🏔️",
  tijdrit: "⏱️",
  ploegentijdrit: "⏱️👥",
};

function getCategoryIcon(name: string): ReactNode {
  const n = name.toLowerCase();
  if (/(gc\s*alien|alien)/.test(n)) return "👽";
  if (/(baby\s*giro|baby)/.test(n)) return "👶";
  if (/\boud\b|veteraan|oldie/.test(n)) return "👴";
  if (/\bnl\b|nederland|dutch/.test(n)) return <FlagIcon country="NL" className="w-5 h-4" />;
  if (/belg|belgië|belgie|belgium/.test(n)) return <FlagIcon country="BE" className="w-5 h-4" />;
  if (/(klim|berg|grimp|mountain)/.test(n)) return "🏔️";
  if (/(sprint|spurt)/.test(n)) return "⚡";
  if (/(punch|aanval|attack|baroud)/.test(n)) return "🎯";
  if (/(tijd|chrono|time)/.test(n)) return "🏁";
  if (/(klassiek|classic|cobble|kassei)/.test(n)) return "🪨";
  if (/(kop|leider|leader|gc|algemeen)/.test(n)) return "⭐";
  return "🚴";
}

type BadgeConfig = { label: string; bg: string; color: string; border: string };
function getCategoryBadge(name: string): BadgeConfig {
  const n = (name ?? "").toLowerCase();
  if (/(gc\s*alien|alien)/.test(n))                        return { label: "ALIEN", bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" };
  if (/(kop|leider|leader|gc|algemeen|klassement)/.test(n)) return { label: "GC",    bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" };
  if (/(sprint|spurt)/.test(n))                            return { label: "SPR",   bg: "#EFF3FF", color: "#1D4A9E", border: "#2E5BA8" };
  if (/(klim|berg|grimp|mountain)/.test(n))                return { label: "KLM",   bg: "#EDF7F1", color: "#1E6B40", border: "#2E8B57" };
  if (/\bpunch\b/.test(n))                                 return { label: "PCH",   bg: "#FFF4EC", color: "#B5620F", border: "#E07B20" };
  if (/(aanval|attack|baroud)/.test(n))                    return { label: "ANV",   bg: "#FFF4EC", color: "#B5620F", border: "#E07B20" };
  if (/(tijd|chrono|time\s*trial|tt\b)/.test(n))           return { label: "TT",    bg: "#FFFBEC", color: "#9A7A10", border: "#C8A020" };
  if (/(support|knecht|helper|domestique)/.test(n))        return { label: "SUP",   bg: "#F5F5F5", color: "#5A5A5A", border: "#9A9A9A" };
  if (/joker/.test(n))                                     return { label: "JKR",   bg: "#F5EFFF", color: "#6B2FA0", border: "#7B3FA0" };
  if (/(klassiek|classic|cobble|kassei)/.test(n))          return { label: "KLS",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/\boud\b|veteraan|oldie/.test(n))                    return { label: "OUD",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/\bnl\b|nederland|dutch/.test(n))                    return { label: "NL",    bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/belg|belgi/.test(n))                                return { label: "BEL",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  if (/(baby\s*giro|baby|young|youngster)/.test(n))        return { label: "YNG",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
  return                                                     { label: "RNR",   bg: "#F8F4EE", color: "#7A5610", border: "#B59240" };
}

/** Categorie → hiërarchie van kopman naar achteren in het peloton.
 *  Lager getal = vooraan rijden. ALIEN voorop, OUD achteraan. */
function getCategoryRank(name: string): number {
  const n = (name ?? "").toLowerCase();
  if (/(gc\s*alien|alien)/.test(n)) return 0;
  if (/(kop|leider|leader|gc|algemeen|klassement)/.test(n)) return 1;
  if (/(sprint|spurt)/.test(n)) return 2;
  if (/(klim|berg|grimp|mountain)/.test(n)) return 3;
  if (/(aanval|attack|baroud)/.test(n)) return 4;
  if (/\bpunch\b/.test(n)) return 5;
  if (/(klassiek|classic|cobble|kassei)/.test(n)) return 6;
  if (/(tijd|chrono|time\s*trial|tt\b)/.test(n)) return 7;
  if (/\boud\b|veteraan|oldie/.test(n)) return 8;
  if (/\bnl\b|nederland|dutch/.test(n)) return 9;
  if (/belg|belgi/.test(n)) return 9;
  if (/(baby\s*giro|baby|young|youngster)/.test(n)) return 10;
  if (/joker/.test(n)) return 11;
  return 12;
}

/** Categorie → effen trui-kleur (silhouet, geen logo). */
function getCategoryJerseyColor(name: string): { jersey: string; shorts: string } {
  const n = (name ?? "").toLowerCase();
  if (/(gc\s*alien|alien)/.test(n))                        return { jersey: "#7A3FA0", shorts: "#2A1A2A" };
  if (/(kop|leider|leader|gc|algemeen|klassement)/.test(n)) return { jersey: "#C0395B", shorts: "#3A1A26" };
  if (/(sprint|spurt)/.test(n))                            return { jersey: "#2E5E8C", shorts: "#1A2A3A" };
  if (/(klim|berg|grimp|mountain)/.test(n))                return { jersey: "#2E6A4F", shorts: "#1A2E26" };
  if (/(aanval|attack|baroud)/.test(n))                    return { jersey: "#D2552A", shorts: "#3A1E10" };
  if (/\bpunch\b/.test(n))                                 return { jersey: "#E0792A", shorts: "#3A2010" };
  if (/(tijd|chrono|time\s*trial|tt\b)/.test(n))           return { jersey: "#1A1A1A", shorts: "#0A0A0A" };
  if (/(klassiek|classic|cobble|kassei)/.test(n))          return { jersey: "#8A6A2A", shorts: "#3A2A10" };
  if (/\boud\b|veteraan|oldie/.test(n))                    return { jersey: "#8A6A2A", shorts: "#3A2A10" };
  if (/joker/.test(n))                                     return { jersey: "#7B3FA0", shorts: "#2A1A2A" };
  return { jersey: "#5A4A38", shorts: "#2A2218" };
}

/** Klein zijaanzicht-silhouetje van een wielrenner.
 *  Effen trui-kleur volgt de categorie; oud-papier-stijl, geen logo's. */
function CyclistFigure({
  jersey,
  shorts,
  dnf = false,
  width = 56,
  height = 42,
}: {
  jersey: string;
  shorts: string;
  dnf?: boolean;
  width?: number;
  height?: number;
}) {
  const skin = "#E8C9A8";
  const ink = "#3A2A1A";
  // ViewBox 56x42: wielen onderaan, fietser gebogen erboven.
  return (
    <svg
      viewBox="0 0 56 42"
      width={width}
      height={height}
      style={{
        display: "block",
        filter: dnf ? "grayscale(1) opacity(0.45)" : undefined,
      }}
      aria-hidden
    >
      {/* Wielen */}
      <circle cx="13" cy="34" r="6.5" fill="none" stroke={ink} strokeWidth="1.5" />
      <circle cx="43" cy="34" r="6.5" fill="none" stroke={ink} strokeWidth="1.5" />
      <circle cx="13" cy="34" r="1" fill={ink} />
      <circle cx="43" cy="34" r="1" fill={ink} />
      {/* Frame */}
      <path d="M13 34 L28 22 L43 34 M28 22 L36 34 M28 22 L32 14" stroke={ink} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Stuur */}
      <path d="M45 22 L48 18 L51 18" stroke={ink} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Zadel */}
      <path d="M22 20 L26 20" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {/* Broek (kort blokje boven zadel) */}
      <path d="M22 19 L31 14 L33 16 L26 20 Z" fill={shorts} stroke={ink} strokeWidth="0.8" strokeLinejoin="round" />
      {/* Trui — gebogen torso vooroverbuigend */}
      <path d="M26 20 L31 14 L40 11 L44 16 L36 18 L32 22 Z" fill={jersey} stroke={ink} strokeWidth="0.9" strokeLinejoin="round" />
      {/* Arm */}
      <path d="M40 12 L46 16 L48 19" stroke={jersey} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="19" r="1.3" fill={skin} stroke={ink} strokeWidth="0.5" />
      {/* Been (één zichtbaar, op de trapper) */}
      <path d="M30 17 L34 28 L38 32" stroke={shorts} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M38 32 L43 34" stroke={skin} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Helm + gezicht */}
      <path d="M42 9 Q48 7 50 11 L46 13 Z" fill={jersey} stroke={ink} strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="47" cy="13" r="2" fill={skin} stroke={ink} strokeWidth="0.7" />
      {dnf && (
        <>
          <line x1="6" y1="6" x2="50" y2="38" stroke="#B23A34" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="6" x2="6" y2="38" stroke="#B23A34" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const JERSEY_META: Record<string, { label: string; emoji: string; ring: string; bg: string }> = {
  gc:     { label: "Eindklassement", emoji: "🌹", ring: "border-[hsl(var(--jersey-pink))]",   bg: "bg-[hsl(var(--jersey-pink))/0.1]"   },
  points: { label: "Puntentrui",     emoji: "🟣", ring: "border-[hsl(var(--jersey-purple))]", bg: "bg-[hsl(var(--jersey-purple))/0.1]" },
  kom:    { label: "Bergtrui",       emoji: "🔵", ring: "border-[hsl(var(--jersey-blue))]",   bg: "bg-[hsl(var(--jersey-blue))/0.1]"   },
  youth:  { label: "Jongerentrui",   emoji: "⚪", ring: "border-foreground/30",               bg: "bg-secondary/40"                    },
};

export default function MyTeamPanel({
  section = "ploeg",
  gameId: gameIdProp,
  gameStatus,
  gameName,
}: {
  section?: "ploeg" | "prono";
  gameId?: string;
  gameStatus?: string;
  gameName?: string | null;
}) {
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  // Optioneel een specifieke (bv. afgeronde) game tonen i.p.v. de live game.
  const game = gameIdProp ? { id: gameIdProp, status: gameStatus, name: gameName } : curGame;
  const { entry, picksByCategory, jokerIds, predictions, isLoading } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stagePoints = [] } = useMyStagePoints(entry?.id);
  // Mijn dagklassering per etappe: server-side RPC i.p.v. alle stage_points.
  const { data: myStageRanks } = useMyStageRanks(game?.id, user?.id);

  const allRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) set.add(id);
    for (const id of jokerIds) set.add(id);
    for (const p of predictions) set.add(p.rider_id);
    return Array.from(set);
  }, [picksByCategory, jokerIds, predictions]);
  const { data: riders = [] } = useRiders(allRiderIds);
  const ridersById = useMemo(
    () => Object.fromEntries(riders.map((r) => [r.id, r])),
    [riders]
  );

  const totalPoints = stagePoints.reduce((sum, sp) => sum + sp.points, 0);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [entries]
  );
  const myRank = entry ? sortedEntries.findIndex((e) => e.id === entry.id) + 1 : 0;

  const stagePointsByStageId = useMemo(
    () => Object.fromEntries(stagePoints.map((sp) => [sp.stage_id, sp.points])),
    [stagePoints]
  );

  const maxStagePts = useMemo(
    () => stagePoints.reduce((m, sp) => Math.max(m, sp.points), 0),
    [stagePoints]
  );

  const bestStage = useMemo(() => {
    if (stagePoints.length === 0) return null;
    const top = stagePoints.reduce((a, b) => (a.points >= b.points ? a : b));
    const stage = stages.find((s) => s.id === top.stage_id);
    return stage ? { stage, points: top.points } : null;
  }, [stagePoints, stages]);

  const myRankPerStage = myStageRanks ?? new Map<string, number>();

  const standaloneJokerIds = useMemo(() => {
    const picked = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) picked.add(id);
    return jokerIds.filter((jid) => !picked.has(jid));
  }, [picksByCategory, jokerIds]);

  if (!user) {
    return <div className="ornate-frame retro-border bg-card p-6 text-muted-foreground">Log in om je team te bekijken.</div>;
  }
  if (isLoading) {
    return <div className="ornate-frame retro-border bg-card p-6">Team laden…</div>;
  }
  if (!game) {
    return <div className="ornate-frame retro-border bg-card p-6 text-muted-foreground">Geen actieve koers gevonden.</div>;
  }
  if (!entry || picksByCategory.size === 0) {
    return (
      <Card className="ornate-frame retro-border">
        <CardContent className="p-4 text-center space-y-3">
          <div className="text-5xl mb-2">🚴‍♂️</div>
          <p className="font-display text-xl font-bold">Nog geen ploeg in de bus</p>
          <p className="text-sm text-muted-foreground font-serif italic">Stel je team samen vóór de flamme rouge.</p>
          <Button asChild className="retro-border-primary mt-2">
            <Link to="/team-samenstellen">Naar de teambuilder</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isSubmitted = entry.status === "submitted";
  const gameLocked = Boolean(game?.status && ["closed", "locked", "live", "finished"].includes(game.status as string));
  const dnfZichtbaar = game?.status === "live" || game?.status === "finished";

  const podium = ["gc-1", "gc-2", "gc-3"].map((_, i) =>
    predictions.find((p) => p.classification === "gc" && p.position === i + 1)
  );

  if (section === "prono") {
    // Jersey badge configs — parallel to getCategoryBadge in Mijn Ploeg
    const jerseyBadge: Record<string, { label: string; bg: string; color: string; border: string }> = {
      gc:     { label: "GC",  bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" },
      points: { label: "PNT", bg: "#EFF3FF", color: "#1D4A9E", border: "#2E5BA8" },
      kom:    { label: "KOM", bg: "#EDF7F1", color: "#1E6B40", border: "#2E8B57" },
      youth:  { label: "YNG", bg: "#F8F4EE", color: "#7A5610", border: "#B59240" },
    };

    const medals = ["🥇", "🥈", "🥉"];

    // Rows shared with Mijn Ploeg: number column + icon + name/team + badge
    const PronoRow = ({
      pos, icon, rider, badge, isLast, isDnf = false,
    }: {
      pos: number;
      icon: ReactNode;
      rider: { name: string; team?: string | null } | null;
      badge: { label: string; bg: string; color: string; border: string };
      isLast: boolean;
      isDnf?: boolean;
    }) => {
      const bg = (pos - 1) % 2 === 0 ? "#FAF7F2" : "#F4EFE6";
      return (
        <div className="flex items-center"
          style={{ background: isDnf ? "#FFF0F0" : bg, minHeight: "40px", borderBottom: !isLast ? "1px solid #EDE8DE" : undefined }}>
          <div className="shrink-0 px-2 border-r text-right" style={{ width: "44px", borderColor: "#E0D8CC" }}>
            <span className="font-mono font-black tabular-nums text-[17px] leading-none"
              style={{ color: isDnf ? "#C0392B" : "#C8A020" }}>{String(pos).padStart(3, " ")}</span>
          </div>
          <div className="shrink-0 w-8 text-center text-sm leading-none select-none">{isDnf ? "❌" : icon}</div>
          <div className="flex-1 min-w-0 px-1.5 py-2">
            {rider ? (
              <>
                <span className="font-display font-bold block truncate"
                  style={{ fontSize: "14px", color: isDnf ? "#8B4040" : "#2C2416", lineHeight: 1.2,
                    textDecoration: isDnf ? "line-through" : undefined }}>{rider.name}</span>
                {isDnf ? (
                  <span className="font-mono text-[9px] block" style={{ color: "#C0392B" }}>
                    Uitgevallen · geen punten
                  </span>
                ) : rider.team ? (
                  <span className="font-mono text-[9px] block truncate" style={{ color: "#8B7355" }}>{rider.team}</span>
                ) : null}
              </>
            ) : (
              <em className="font-serif text-sm text-muted-foreground">Geen keuze</em>
            )}
          </div>
          <div className="shrink-0 px-2 py-1">
            {isDnf ? (
              <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                style={{ background: "#FFEBEB", color: "#C0392B", border: "1px solid #E74C3C", letterSpacing: "0.1em" }}>
                DNF
              </span>
            ) : (
              <span className="font-mono text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: "0.1em" }}>
                {badge.label}
              </span>
            )}
          </div>
        </div>
      );
    };

    // Section divider — identical to SectionHeader in Mijn Ploeg
    const PronoSection = ({
      icon, label, badge, children,
    }: {
      icon: ReactNode;
      label: string;
      badge: { label: string; bg: string; color: string; border: string };
      children: ReactNode;
    }) => (
      <div className="border-b" style={{ borderColor: "#E8DDD0" }}>
        <div className="flex items-center gap-2 px-3 py-2"
          style={{ background: "#F0EBE1", borderBottom: `1px solid ${badge.border}` }}>
          <span className="text-sm leading-none shrink-0">{icon}</span>
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] shrink-0"
            style={{ color: badge.color }}>{label}</span>
          <div className="flex-1 h-px" style={{ background: badge.border, opacity: 0.3 }} />
        </div>
        {children}
      </div>
    );

    return (
      <div className="pb-4">
        {predictions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            Nog geen klassementsvoorspellingen ingevuld.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: "#C8A020", background: "#FAF7F2" }}>

            {/* Programme header — identiek aan Mijn Renners header */}
            <div className="px-4 py-3 flex items-center justify-between border-b-2"
              style={{ background: "#2C2416", borderColor: "#C8A020" }}>
              <div>
                <div className="text-[9px] tracking-[0.4em] uppercase font-mono mb-0.5"
                  style={{ color: "#C8A020", opacity: 0.75 }}>
                  Pronostiek · {game.name}
                </div>
                <h2 className="font-display text-xl font-black tracking-tight leading-none text-white">
                  Eindklassement Prognose
                </h2>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#C8A020", opacity: 0.6 }}>
                  keuzes
                </div>
                <div className="font-display text-2xl font-black tabular-nums" style={{ color: "#C8A020" }}>
                  {predictions.length}
                </div>
                <div className="font-mono text-[9px]" style={{ color: "#C8A020", opacity: 0.5 }}>
                  voorspeld
                </div>
              </div>
            </div>

            {/* GC Top 3 — thema-trui (leider) als section-icoon i.p.v. roos */}
            {podium.some(Boolean) && (
              <PronoSection icon={<TruiBadge type="algemeen" formaat="klein" />} label="Algemeen Klassement — Top 3" badge={jerseyBadge.gc}>
                {podium.map((p, idx) => {
                  const r = p ? ridersById[p.rider_id] : null;
                  return (
                    <PronoRow
                      key={idx}
                      pos={idx + 1}
                      icon={medals[idx]}
                      rider={r ? { name: r.name, team: r.team } : null}
                      badge={jerseyBadge.gc}
                      isLast={idx === 2}
                      isDnf={dnfZichtbaar && Boolean(r?.is_dnf)}
                    />
                  );
                })}
              </PronoSection>
            )}

            {/* Trui-winnaars: Punten, Berg, Jongeren — thema-aware TruiBadge */}
            {(["points", "kom", "youth"] as const).map((cls) => {
              const meta = JERSEY_META[cls];
              const item = predictions.find((p) => p.classification === cls && p.position === 1);
              const r = item ? ridersById[item.rider_id] : null;
              const badge = jerseyBadge[cls];
              const truiType: TruiType = cls === "points" ? "punten" : cls === "kom" ? "berg" : "jongeren";
              const trui = <TruiBadge type={truiType} formaat="klein" />;
              return (
                <PronoSection key={cls} icon={trui} label={meta.label} badge={badge}>
                  <PronoRow
                    pos={1}
                    icon={medals[0]}
                    rider={r ? { name: r.name, team: r.team } : null}
                    badge={badge}
                    isLast
                    isDnf={dnfZichtbaar && Boolean(r?.is_dnf)}
                  />
                </PronoSection>
              );
            })}

            {/* Footer rule — identiek aan Mijn Renners */}
            <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, #C8A020 30%, #E8336D 50%, #C8A020 70%, transparent)" }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Vintage header */}
      <div className="ornate-frame retro-border bg-gradient-to-br from-card via-card to-primary/5 p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="vintage-ornament mb-2">
          <span className="vintage-ornament-symbol">✦</span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-serif">
            {game.name}
          </span>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="vintage-heading text-2xl md:text-3xl font-bold leading-tight">
              {entry.team_name ?? user.user_metadata?.team_name ?? "Mijn ploeg"}
            </h2>
            <p className="text-xs text-muted-foreground font-serif italic mt-1">
              Directeur sportif: {user.user_metadata?.display_name ?? user.email}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-extrabold leading-none text-primary">{totalPoints}</span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-serif">punten</span>
          </div>
        </div>
      </div>

      <MijnPloegStats />

      {/* Form-meter — laatste 3 etappes vs seizoensgemiddelde */}
      <FormMeter stagePoints={stagePoints} stages={stages} />

      {/* Status / wijzig CTA */}
      {!gameLocked && (
        <div className={cn(
          "ornate-frame retro-border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
          isSubmitted ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40"
        )}>
          <div className="text-sm">
            {isSubmitted ? (
              <>✅ <strong>Team ingediend.</strong> Je kunt nog wijzigen tot de admin de koers op deadline zet.</>
            ) : (
              <>🚴‍♂️ <strong>Je peloton staat nog niet aan de start.</strong> Bevestig je inzending in de teambuilder.</>
            )}
          </div>
          <Button asChild size="sm" variant={isSubmitted ? "outline" : "default"}>
            <Link to="/team-samenstellen">
              <Pencil className="h-4 w-4 mr-2" />
              {isSubmitted ? "Wijzigen" : "Naar teambuilder"}
            </Link>
          </Button>
        </div>
      )}


      {/* ═══ TEAM SHEET — fantasy team-hierarchie (retro-magazinestijl) ═══
          Hero (ALIEN+GC), category-grid, DNF-blok, legenda. Reusable components
          in src/components/teamsheet/. Lijst eronder blijft voor snel scannen. */}
      {(() => {
        const sheet: SheetRiderT[] = [];
        for (const cat of categories) {
          const ids = picksByCategory.get(cat.id) ?? [];
          const detectName = `${cat.name} ${cat.short_name ?? ""}`;
          const category = detectCategoryT(detectName);
          for (const rid of ids) {
            const r = ridersById[rid];
            if (!r) continue;
            sheet.push({
              id: r.id,
              name: r.name,
              startNumber: r.start_number,
              category,
              status: dnfZichtbaar && (r as { is_dnf?: boolean | null }).is_dnf ? "DNF" : "active",
              team: r.team,
            });
          }
        }
        for (const jid of standaloneJokerIds) {
          const r = ridersById[jid];
          if (!r) continue;
          sheet.push({
            id: r.id,
            name: r.name,
            startNumber: r.start_number,
            category: "JOKER",
            status: dnfZichtbaar && (r as { is_dnf?: boolean | null }).is_dnf ? "DNF" : "active",
            team: r.team,
          });
        }
        return (
          <div className="mb-4 md:mb-6">
            <TeamSheetView riders={sheet} />
          </div>
        );
      })()}


      {/* ═══ PUNTEN PER ETAPPE ═══ */}
      <Card className="ornate-frame retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display">📊 Punten per etappe</CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-gradient-to-br from-card via-card to-secondary/20">
          <p className="text-[11px] text-muted-foreground mb-2">
            Balkhoogte ∝ km · 🟡 = jouw punten per etappe
          </p>
          <StageBars
            stages={stages}
            pointsByStageId={stagePointsByStageId}
            rankByStageId={myRankPerStage}
            gcUnlocked={stages
              .filter((x) => !x.is_gc)
              .some((x) => x.stage_number === 21 && x.results_status === "approved")}
            trackHeight={130}
          />
        </CardContent>
      </Card>
    </div>
  );
}
