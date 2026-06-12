import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TruiBadge from "@/components/retro/TruiBadge";
import type { TruiType } from "@/lib/themas";
import TeamSheetView from "@/components/teamsheet/TeamSheet";
import { detectCategory as detectCategoryT, type SheetRider as SheetRiderT } from "@/components/teamsheet/tokens";
import FlipClock from "@/components/FlipClock";
import { useMijnPloegStats } from "@/hooks/useMijnPloegStats";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useEntries } from "@/hooks/useResults";
import { useRiderEntryTotals } from "@/hooks/useRiderEntryTotals";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Check, Pencil, X } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
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
  const { entry, picksByCategory, jokerIds, predictions, isLoading, teamName, saveTeamName } = useEntry(game?.id);
  const { toast } = useToast();
  // Ploegnaam-editor (verhuisd uit MijnPeloton): inline nudge in Zone 1 van
  // het Salle-de-Course-dashboard zolang er geen naam is ingesteld.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const { data: categories = [] } = useCategories(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stagePoints = [] } = useMyStagePoints(entry?.id);
  // Totaal behaalde punten per renner (t/m laatst gefiatteerde etappe).
  const { data: riderTotals, isSuccess: riderTotalsReady } = useRiderEntryTotals(
    game?.id,
    entry?.id,
  );
  // La Salle de Course: één databron voor rangen/delta's/topscorer + de
  // Hors-Catégorie-percentages (— zolang null).
  const ploegStats = useMijnPloegStats();
  const hors = useHorsCategorieSummary({ id: game?.id, status: game?.status as string | undefined });

  // Welke renner heeft z'n per-etappe-punten dropdown open (één tegelijk).
  const [expandedRiderId, setExpandedRiderId] = useState<string | null>(null);
  const toggleRider = (id: string) =>
    setExpandedRiderId((cur) => (cur === id ? null : id));
  // Escape sluit de open dropdown.
  useEffect(() => {
    if (!expandedRiderId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedRiderId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedRiderId]);

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
      {/* ═══ LA SALLE DE COURSE — retro cockpit-dashboard ═══
          Donker ham-radio-paneel met warm-witte instrumentenkaarten. Chrome
          (schroeven, grille, FM-schaal, knoppen, oscilloscoop) is CSS/SVG —
          decoratief, aria-hidden, verdwijnt op mobiel. CTA + TeamSheet eronder. */}
      {(() => {
        const PANEL = "#1A1612";
        const PAPER = "#F5ECD7";
        const INK = "#1A1612";
        const CREAM = "#EDE3CC";
        const AMBER = "hsl(var(--vintage-gold))";
        const hairline = "1px solid rgba(26,22,18,0.18)";

        const hasName = Boolean(entry.team_name?.trim());
        const shownName = entry.team_name ?? user.user_metadata?.team_name ?? "Mijn ploeg";

        // Etappe-info uit echte stage-data (géén verzonnen klim/hoogte-data).
        const raceStages = stages.filter((s) => !s.is_gc);
        const approved = raceStages.filter((s) => s.results_status === "approved");
        const lastApproved = approved.length
          ? approved.reduce((a, b) => (a.stage_number > b.stage_number ? a : b))
          : null;
        const ritLabel = lastApproved ? `punten t/m rit ${lastApproved.stage_number}` : "nog geen uitslagen";
        const TYPE_LABEL: Record<string, string> = {
          vlak: "VLAK", heuvelachtig: "HEUVELS", tijdrit: "TIJDRIT",
          bergop: "BERG & COLS", ploegentijdrit: "PLOEGENTIJDRIT",
        };

        // "—" zolang waardes null zijn (expliciete null-check, loading-proof).
        const dash = (v: number | null | undefined, fmt: (n: number) => string) =>
          v === null || v === undefined ? "—" : fmt(v);

        const DeltaArrow = ({ n }: { n: number }) =>
          n === 0 ? (
            <span className="text-[11px] font-bold" style={{ color: "#9A9A9A" }}>—</span>
          ) : (
            <span className="text-[12px] font-bold tabular-nums" style={{ color: n > 0 ? "#2E8B57" : "#C0392B" }}>
              {n > 0 ? "▲" : "▼"}{Math.abs(n)}
            </span>
          );

        const Stamp = ({ children }: { children: ReactNode }) => (
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "rgba(26,22,18,0.55)" }}>
            {children}
          </div>
        );

        // Instrument-tegel voor het Tableau de Bord
        const Dial = ({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) => (
          <div
            className="p-2.5 md:p-3 min-h-[78px] flex flex-col justify-center gap-1"
            style={{ border: hairline, borderLeft: accent ? `3px solid ${accent}` : hairline, background: PAPER, borderRadius: 6 }}
          >
            <div className="font-mono text-[9px] tracking-[0.22em] uppercase font-bold" style={{ color: "rgba(26,22,18,0.55)" }}>
              {label}
            </div>
            <div className="font-display font-black leading-none tabular-nums" style={{ color: INK, fontSize: "clamp(22px,2.6vw,30px)" }}>
              {value}
            </div>
            {sub && <div className="font-mono text-[10px] leading-tight" style={{ color: "rgba(26,22,18,0.55)" }}>{sub}</div>}
          </div>
        );

        const Rank = ({ rank, delta }: { rank: number | null; delta: number | null }) => (
          <span className="inline-flex items-baseline gap-2">
            <span>{rank === null ? "—" : <>{rank}<span style={{ fontSize: "0.55em" }}>e</span></>}</span>
            {rank !== null && delta !== null && <DeltaArrow n={delta} />}
          </span>
        );

        return (
          <section
            className="relative rounded-2xl"
            style={{
              background: `linear-gradient(180deg, #231E18 0%, ${PANEL} 30%, #16120E 100%)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 30px -18px rgba(0,0,0,0.8)",
              border: "1px solid rgba(0,0,0,0.6)",
            }}
          >
            {/* Schroefjes in de hoeken */}
            {[
              "top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2",
            ].map((pos) => (
              <span
                key={pos}
                aria-hidden
                className={`pointer-events-none absolute ${pos} w-2.5 h-2.5 rounded-full`}
                style={{
                  background: "radial-gradient(circle at 35% 30%, #4A4138 0%, #2A241D 55%, #0E0B08 100%)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.25), 0 1px 1px rgba(0,0,0,0.6)",
                }}
              />
            ))}

            <div className="p-3 md:p-4">
              <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-3">
                {/* ── Linkerkolom: de instrumenten ── */}
                <div className="flex flex-col gap-2.5 min-w-0">
                  {/* Masthead-kaart */}
                  <div className="rounded-lg p-3.5 md:p-4" style={{ background: PAPER, border: "1px solid rgba(0,0,0,0.35)" }}>
                    <div className="font-mono text-[10px] tracking-[0.3em] uppercase font-bold mb-2.5" style={{ color: AMBER }}>
                      ◆ La Salle de Course ◆
                    </div>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2
                          className="font-display font-black uppercase leading-none truncate flex items-center gap-2"
                          style={{ color: INK, fontSize: "clamp(26px,4.5vw,40px)" }}
                          title={shownName}
                        >
                          <span className="truncate">{shownName}</span>
                          {hasName && !editingName && (
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 shrink-0"
                              disabled={!entry?.id}
                              onClick={() => { setNameDraft(teamName ?? ""); setEditingName(true); }}
                              title="Ploegnaam wijzigen"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </h2>
                        <p className="font-serif italic text-xs mt-1.5" style={{ color: "rgba(26,22,18,0.65)" }}>
                          Directeur sportif: {user.user_metadata?.display_name ?? user.email}
                        </p>

                        {/* Ploegnaam-nudge (alleen zonder naam of tijdens edit) */}
                        {(!hasName || editingName) && (
                          <div className="mt-2.5 flex items-center gap-2 text-sm flex-wrap">
                            {editingName ? (
                              <>
                                <Input
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  placeholder="bv. Team Bidon"
                                  className="h-8 w-48"
                                  maxLength={40}
                                  autoFocus
                                />
                                <Button
                                  size="sm" variant="default"
                                  disabled={!entry?.id || saveTeamName.isPending}
                                  onClick={async () => {
                                    if (!entry?.id) return;
                                    try {
                                      await saveTeamName.mutateAsync({ entryId: entry.id, teamName: nameDraft });
                                      toast({ title: "Ploegnaam opgeslagen" });
                                      setEditingName(false);
                                    } catch (e) {
                                      toast({ title: "Opslaan mislukt", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
                                    }
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 transition-colors"
                                style={{ color: "rgba(26,22,18,0.6)" }}
                                disabled={!entry?.id}
                                onClick={() => { setNameDraft(teamName ?? ""); setEditingName(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="font-serif italic">Stel je ploegnaam in</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Seizoensstand als split-flap teller */}
                      <div className="shrink-0 md:text-right md:pl-4 md:border-l" style={{ borderColor: "rgba(26,22,18,0.18)" }}>
                        <div className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold mb-1.5" style={{ color: "rgba(26,22,18,0.55)" }}>
                          Seizoensstand
                        </div>
                        <FlipClock value={totalPoints} suffix="PT" size={40} />
                        <div className="font-mono text-[10px] mt-1.5" style={{ color: "rgba(26,22,18,0.55)" }}>
                          {ritLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tableau de Bord — 2×3 instrumenten */}
                  <div className="rounded-lg p-3.5 md:p-4" style={{ background: PAPER, border: "1px solid rgba(0,0,0,0.35)" }}>
                    <div className="mb-2.5"><Stamp>— Tableau de Bord —</Stamp></div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Dial
                        label="Sous-peloton" accent={AMBER}
                        value={<Rank rank={ploegStats.subpoule?.rank ?? null} delta={ploegStats.subpoule?.delta ?? null} />}
                        sub={ploegStats.subpoule ? `van ${ploegStats.subpoule.total} · ${ploegStats.subpoule.name}` : undefined}
                      />
                      <Dial
                        label="Classement gén."
                        value={<Rank rank={ploegStats.overall?.rank ?? null} delta={ploegStats.overall?.delta ?? null} />}
                        sub={ploegStats.overall ? `van ${ploegStats.overall.total} deelnemers` : undefined}
                      />
                      <Dial label="Seizoensstand" value={totalPoints} sub={ritLabel} />
                      <Dial
                        label="Monkey IQ" accent="#2E8B57"
                        value={dash(hors.monkeyBeatPct, (n) => `${Math.round(n)}%`)}
                        sub="apen verslagen"
                      />
                      <Dial
                        label="Emirates"
                        value={dash(hors.emiratesPct, (n) => `${Math.round(n)}%`)}
                        sub="van droomploeg"
                      />
                      <Dial
                        label="Wielerdir."
                        value={dash(hors.directorScore, (n) => n.toFixed(1))}
                        sub="rapport"
                      />
                    </div>
                  </div>

                  {/* Détails — rij van 4 kerngetallen */}
                  <div className="rounded-lg p-3.5 md:p-4" style={{ background: PAPER, border: "1px solid rgba(0,0,0,0.35)" }}>
                    <div className="text-center mb-2.5"><Stamp>— Détails —</Stamp></div>
                    <div className="grid grid-cols-2 md:grid-cols-4">
                      {[
                        {
                          label: "Beste etappe",
                          value: bestStage ? `${bestStage.points} PT` : "—",
                          sub: bestStage?.stage ? `RIT ${bestStage.stage.stage_number}` : undefined,
                        },
                        {
                          label: "Overall poule",
                          value: ploegStats.overall ? <Rank rank={ploegStats.overall.rank} delta={ploegStats.overall.delta} /> : "—",
                          sub: undefined,
                        },
                        {
                          label: "Sous-peloton",
                          value: ploegStats.subpoule ? <Rank rank={ploegStats.subpoule.rank} delta={ploegStats.subpoule.delta} /> : "—",
                          sub: undefined,
                        },
                        {
                          label: "Topscorer",
                          value: ploegStats.topscorer ? ploegStats.topscorer.name : "—",
                          sub: ploegStats.topscorer ? `${ploegStats.topscorer.points} PT` : undefined,
                          small: true,
                        },
                      ].map((d, i) => (
                        <div
                          key={d.label}
                          className="px-3 py-1.5 flex flex-col gap-0.5 min-w-0"
                          style={{ borderLeft: i > 0 ? hairline : undefined }}
                        >
                          <span className="font-mono text-[9px] tracking-[0.2em] uppercase font-bold" style={{ color: "rgba(26,22,18,0.55)" }}>
                            {d.label}
                          </span>
                          <span
                            className={cn("font-display font-black leading-tight tabular-nums truncate")}
                            style={{ color: INK, fontSize: d.small ? "clamp(15px,1.6vw,19px)" : "clamp(20px,2.2vw,26px)" }}
                            title={typeof d.value === "string" ? d.value : undefined}
                          >
                            {d.value}
                          </span>
                          {d.sub && (
                            <span className="font-mono text-[10px]" style={{ color: "rgba(26,22,18,0.55)" }}>{d.sub}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Rechterkolom: decoratieve radio-chrome (desktop only) ── */}
                <div aria-hidden className="hidden lg:flex flex-col gap-2.5 pointer-events-none select-none">
                  {/* EN DIRECT + luidsprekergrille */}
                  <div className="rounded-lg p-3" style={{ background: PAPER, border: "1px solid rgba(0,0,0,0.35)" }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="font-mono text-[10px] tracking-[0.25em] uppercase font-bold" style={{ color: "#C0392B" }}>
                        En direct
                      </span>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#C0392B" }} />
                    </div>
                    <div
                      className="h-16 rounded"
                      style={{
                        backgroundImage: `radial-gradient(${PANEL} 1.3px, transparent 1.4px)`,
                        backgroundSize: "7px 7px",
                        backgroundPosition: "center",
                      }}
                    />
                  </div>

                  {/* FM-schaal + knoppen */}
                  <div className="rounded-lg p-3" style={{ background: PAPER, border: "1px solid rgba(0,0,0,0.35)" }}>
                    <svg viewBox="0 0 200 34" className="w-full" style={{ display: "block" }}>
                      <line x1="6" y1="12" x2="194" y2="12" stroke={INK} strokeOpacity="0.55" strokeWidth="1" />
                      {Array.from({ length: 21 }, (_, i) => 6 + i * 9.4).map((x, i) => (
                        <line key={x} x1={x} y1={12} x2={x} y2={i % 5 === 0 ? 4 : 8} stroke={INK} strokeOpacity="0.5" strokeWidth="1" />
                      ))}
                      {["88", "92", "96", "100", "104", "108"].map((t, i) => (
                        <text key={t} x={6 + i * 37.6} y={26} fontFamily="'JetBrains Mono',monospace" fontSize="7" fill={INK} fillOpacity="0.6">
                          {t}
                        </text>
                      ))}
                      <line x1="118" y1="2" x2="118" y2="16" stroke="#C0392B" strokeWidth="1.5" />
                      <text x="160" y="33" fontFamily="'JetBrains Mono',monospace" fontSize="6.5" fill={INK} fillOpacity="0.5">FM · MHz</text>
                    </svg>
                    <div className="flex justify-end gap-4 mt-2">
                      {["VOLUME", "SQUELCH"].map((k) => (
                        <div key={k} className="flex flex-col items-center gap-1">
                          <svg viewBox="0 0 36 36" width="34" height="34">
                            <circle cx="18" cy="18" r="15" fill="#221C16" stroke="rgba(0,0,0,0.7)" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 4" />
                            <circle cx="13" cy="12" r="4" fill="rgba(255,255,255,0.10)" />
                            <line x1="18" y1="18" x2="18" y2="6" stroke={CREAM} strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                          <span className="font-mono text-[7px] tracking-[0.2em] uppercase" style={{ color: "rgba(26,22,18,0.55)" }}>{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Oscilloscoop met fietser-line-art (geen verzonnen telemetrie) */}
                  <div className="rounded-lg flex-1 min-h-[120px] p-2" style={{ background: "#0F0C09", border: "1px solid rgba(0,0,0,0.7)" }}>
                    <svg viewBox="0 0 160 110" className="w-full h-full" fill="none" stroke={CREAM} strokeOpacity="0.85" strokeWidth="1.4" strokeLinecap="round">
                      {/* raster */}
                      {[22, 44, 66, 88].map((y) => (
                        <line key={y} x1="4" y1={y} x2="156" y2={y} stroke={CREAM} strokeOpacity="0.07" strokeWidth="0.75" />
                      ))}
                      {/* wielen */}
                      <circle cx="48" cy="78" r="17" />
                      <circle cx="116" cy="78" r="17" />
                      <circle cx="48" cy="78" r="2" />
                      <circle cx="116" cy="78" r="2" />
                      {/* frame */}
                      <path d="M48 78 L72 50 L102 50 L116 78 M72 50 L82 74 L48 78 M82 74 L84 78" />
                      {/* stuur + zadel */}
                      <path d="M102 50 L108 42 L114 40 M70 46 L62 44" />
                      {/* renner */}
                      <path d="M66 46 Q78 24 100 36" />
                      <circle cx="104" cy="30" r="5" />
                      <path d="M82 36 L78 56 L86 62 M82 36 L90 52" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* ── Onderbalk: etappe-info uit echte data ── */}
              {lastApproved && (
                <div
                  className="mt-3 pt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(237,227,204,0.65)" }}
                >
                  <span>Étape {lastApproved.stage_number} / {raceStages.length}</span>
                  {lastApproved.distance_km != null && <span>{lastApproved.distance_km} km</span>}
                  {lastApproved.stage_type && (
                    <span>Type · {TYPE_LABEL[lastApproved.stage_type] ?? lastApproved.stage_type.toUpperCase()}</span>
                  )}
                  {lastApproved.name && <span className="truncate" style={{ color: AMBER }}>{lastApproved.name}</span>}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── Orders van de DS — status/CTA (ongewijzigde logica) ── */}
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
          <Button asChild size="sm" variant={isSubmitted ? "outline" : "default"} className="w-full sm:w-auto">
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
            <TeamSheetView
              riders={sheet}
              expandedRiderId={expandedRiderId}
              onToggleRider={toggleRider}
              gameId={game?.id}
              entryId={entry?.id}
              riderTotals={riderTotals}
              riderTotalsReady={riderTotalsReady}
            />
          </div>
        );
      })()}


    </div>
  );
}
