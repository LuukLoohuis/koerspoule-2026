// DESIGN SYSTEM: See src/components/salle-de-course/DESIGN-SPEC.md
// Color tokens: src/styles/salle-de-course.css
// All La Salle de Course components must follow the spec in DESIGN-SPEC.md
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TruiBadge from "@/components/retro/TruiBadge";
import type { TruiType } from "@/lib/themas";
import TeamSheetView from "@/components/teamsheet/TeamSheet";
import { detectCategory as detectCategoryT, type SheetRider as SheetRiderT } from "@/components/teamsheet/tokens";
import FlipClock from "@/components/FlipClock";
import { useMijnPloegStats } from "@/hooks/useMijnPloegStats";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import { useSubpoules } from "@/hooks/useSubpoules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/** Digitale klok (HH:MM:SS) voor de radiokop — eigen component zodat de
 *  1s-tick alleen dít element re-rendert, niet het hele dashboard. */
function LiveKlok() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span
      className="font-mono font-bold tabular-nums"
      style={{ color: "#D49A1A", fontSize: 13, letterSpacing: "0.08em" }}
    >
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

/** Decoratief hoogteprofiel — polyline + finishvlag, in Salle de Course-amber.
 *  Deterministisch per `seed` (etappenummer) zodat hetzelfde plaatje altijd
 *  bij dezelfde rit hoort. Géén echte meetdata: puur visueel anker, conform
 *  asset #9 uit de DESIGN-SPEC. */
function AltitudeProfile({ seed }: { seed: number }) {
  const N = 48;
  const points = Array.from({ length: N }, (_, i) => {
    // gestapelde sinus + pseudo-noise op basis van seed → ruwe bergketen
    const t = i / (N - 1);
    const s = seed * 0.37 + 1;
    const base = Math.sin(t * Math.PI * 1.3 + s) * 0.35 + 0.5;
    const ridge = Math.sin(t * Math.PI * 5.7 + s * 1.9) * 0.18;
    const noise = Math.sin(i * 12.9898 + s * 78.233) * 0.08;
    const y = Math.max(0.05, Math.min(0.95, base + ridge + noise));
    const x = t * 100;
    return `${x.toFixed(2)},${(100 - y * 100).toFixed(2)}`;
  }).join(" ");
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-10 md:h-12"
      style={{ display: "block" }}
    >
      {/* baseline */}
      <line x1="0" y1="99" x2="100" y2="99" stroke="rgba(237,227,204,0.18)" strokeWidth="0.3" />
      {/* profielilijn */}
      <polyline
        points={points}
        fill="none"
        stroke="#D49A1A"
        strokeWidth="0.9"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* finishvlag rechts */}
      <g transform="translate(96 8)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(237,227,204,0.75)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        <g>
          {[0, 1].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 1.2}
                y={row * 1.2}
                width="1.2"
                height="1.2"
                fill={(row + col) % 2 === 0 ? "rgba(237,227,204,0.85)" : "transparent"}
              />
            ))
          )}
        </g>
      </g>
    </svg>
  );
}


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
  onOpenHors,
  onOpenUitslagen,
  onOpenSubpoule,
}: {
  section?: "ploeg" | "prono";
  gameId?: string;
  gameStatus?: string;
  gameName?: string | null;
  /** Open een Hors-Catégorie-subtab (Monkey IQ → dartpijl, etc.). */
  onOpenHors?: (tab: "dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "superteam" | "benchmark") => void;
  /** Spring naar de Uitslagen-tab (daguitslag/klassement). */
  onOpenUitslagen?: () => void;
  /** Spring naar de Subpoules-tab met deze subpoule open. */
  onOpenSubpoule?: (subpouleId: string) => void;
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
  // Subpoule-selectie: bij meerdere subpoules verschijnt een dropdown bij het
  // Tableau de Bord; de Sous-peloton-instrumenten volgen de keuze.
  const { subpoules } = useSubpoules(game?.id);
  const [selectedSubpouleId, setSelectedSubpouleId] = useState<string | undefined>(undefined);
  const activeSubpouleId = selectedSubpouleId ?? subpoules[0]?.id;
  const ploegStats = useMijnPloegStats({ selectedSubpouleId: activeSubpouleId });
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
        const Dial = ({
          label,
          value,
          sub,
          accent,
          icon,
          valueColor,
          onClick,
          hint,
        }: {
          label: string;
          value: ReactNode;
          sub?: ReactNode;
          accent?: string;
          /** Asset-pad (bv. /salle-de-course/icon-target.png) — decoratief. */
          icon?: string;
          valueColor?: string;
          /** Maakt de tegel klikbaar (navigatie); voegt cursor/hover/focus toe. */
          onClick?: () => void;
          /** Korte aria/title-omschrijving bij klikbare tegel. */
          hint?: string;
        }) => (
          <div
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? hint ?? label : undefined}
            title={onClick ? hint : undefined}
            onClick={onClick}
            onKeyDown={
              onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClick();
                    }
                  }
                : undefined
            }
            className={cn(
              "p-2.5 md:p-3 min-h-[78px] flex flex-col justify-center gap-1",
              onClick &&
                "cursor-pointer transition-[transform,box-shadow] hover:-translate-y-[1px] hover:shadow-[0_3px_10px_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
            )}
            style={{ border: hairline, borderLeft: accent ? `3px solid ${accent}` : hairline, background: PAPER, borderRadius: 6 }}
          >
            <div className="font-mono text-[9px] tracking-[0.22em] uppercase font-bold flex items-center gap-1" style={{ color: "#D49A1A" }}>
              <span>{label}</span>
              {onClick && <span aria-hidden className="text-[8px] opacity-60">›</span>}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              {icon && (
                <img src={icon} alt="" aria-hidden="true" className="h-6 w-auto shrink-0 hidden md:block" />
              )}
              <div
                className="font-display font-black leading-none tabular-nums"
                style={{ color: valueColor ?? INK, fontSize: "clamp(22px,2.6vw,30px)" }}
              >
                {value}
              </div>
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
            className="salle-de-course sdc-frame relative"
            style={{
              // Donkere paneel-vulling onder de transparante kern van de frame.
              background: `linear-gradient(180deg, #231E18 0%, ${PANEL} 30%, #16120E 100%)`,
              borderRadius: 14,
            }}
          >
            <div className="p-3 md:p-4">
              <div className="lg:grid lg:grid-cols-[1fr_240px] lg:gap-3">
                {/* ── Linkerkolom: één doorlopend papieren console-paneel. De
                    secties (masthead → tableau → détails) delen hetzelfde
                    oppervlak en worden gescheiden door dunne hairlines i.p.v.
                    losse kaarten — zodat het als één instrument leest. ── */}
                <div
                  className="min-w-0 rounded-lg overflow-hidden self-start"
                  style={{
                    background: PAPER,
                    border: "1px solid rgba(0,0,0,0.4)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* Masthead-sectie */}
                  <div className="p-3.5 md:p-4" style={{ borderBottom: "1px solid rgba(26,22,18,0.22)" }}>
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
                  <div className="p-3.5 md:p-4" style={{ borderBottom: "1px solid rgba(26,22,18,0.22)" }}>
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <Stamp>— Tableau de Bord —</Stamp>
                      {/* Subpoule-kiezer: alleen tonen bij meerdere subpoules. De
                          Sous-peloton-instrumenten volgen deze keuze. */}
                      {subpoules.length > 1 && (
                        <Select value={activeSubpouleId} onValueChange={setSelectedSubpouleId}>
                          <SelectTrigger
                            aria-label="Kies subpoule"
                            className="h-7 w-auto min-w-[140px] max-w-[200px] gap-1.5 rounded-md border-0 px-2.5 font-mono text-[10px] tracking-[0.14em] uppercase font-bold focus:ring-2 focus:ring-[#D49A1A]"
                            style={{ background: "rgba(26,22,18,0.06)", color: "#0F0F10", borderRadius: 6, boxShadow: "inset 0 0 0 1px rgba(26,22,18,0.22)" }}
                          >
                            <SelectValue placeholder="Subpoule" />
                          </SelectTrigger>
                          <SelectContent>
                            {subpoules.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="font-mono text-xs uppercase tracking-wide">
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <Dial
                        label="Sous-peloton" accent={AMBER}
                        value={<Rank rank={ploegStats.subpoule?.rank ?? null} delta={ploegStats.subpoule?.delta ?? null} />}
                        sub={ploegStats.subpoule ? `van ${ploegStats.subpoule.total} · ${ploegStats.subpoule.name}` : undefined}
                        onClick={activeSubpouleId && onOpenSubpoule ? () => onOpenSubpoule(activeSubpouleId) : undefined}
                        hint="Open de subpoule-daguitslag"
                      />
                      <Dial
                        label="Classement gén."
                        value={<Rank rank={ploegStats.overall?.rank ?? null} delta={ploegStats.overall?.delta ?? null} />}
                        sub={ploegStats.overall ? `van ${ploegStats.overall.total} deelnemers` : undefined}
                        onClick={onOpenUitslagen}
                        hint="Open de daguitslag van de hele poule"
                      />
                      <Dial label="Seizoensstand" value={totalPoints} sub={ritLabel} />
                      {/* Status-bewuste accentranden: de rand kleurt mee met de
                          waarde (boven/onder de drempel), in SPEC-kleuren. */}
                      <Dial
                        label="Monkey IQ"
                        accent={
                          hors.monkeyBeatPct === null
                            ? undefined
                            : hors.monkeyBeatPct > 50
                              ? "#5C6B3B"
                              : "#B94A48"
                        }
                        icon="/salle-de-course/icon-target.png"
                        value={dash(hors.monkeyBeatPct, (n) => `${Math.round(n)}%`)}
                        valueColor={hors.monkeyBeatPct === null ? undefined : "#D49A1A"}
                        sub="apen verslagen"
                        onClick={onOpenHors ? () => onOpenHors("dartpijl") : undefined}
                        hint="Open de Dartpijl-analyse"
                      />
                      <Dial
                        label="Emirates"
                        accent={
                          hors.emiratesPct !== null && hors.emiratesPct > 60 ? "#D49A1A" : undefined
                        }
                        icon="/salle-de-course/icon-crown.png"
                        value={dash(hors.emiratesPct, (n) => `${Math.round(n)}%`)}
                        sub="van droomploeg"
                        onClick={onOpenHors ? () => onOpenHors("superteam") : undefined}
                        hint="Open The Emirates"
                      />
                      {(() => {
                        // Rapportkleur (SPEC): >=7 olive, >=5 amber, <5 rood —
                        // zowel waarde als accentrand kleuren mee.
                        const dirColor =
                          hors.directorScore === null
                            ? undefined
                            : hors.directorScore >= 7
                              ? "#5C6B3B"
                              : hors.directorScore >= 5
                                ? "#D49A1A"
                                : "#B94A48";
                        return (
                          <Dial
                            label="Wielerdir."
                            accent={dirColor}
                            icon="/salle-de-course/icon-clipboard.png"
                            value={dash(hors.directorScore, (n) => n.toFixed(1))}
                            valueColor={dirColor}
                            sub="rapport"
                            onClick={onOpenHors ? () => onOpenHors("wielerdirecteur") : undefined}
                            hint="Open het Directeur Sportif-rapport"
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Détails — rij van 4 kerngetallen */}
                  <div className="p-3.5 md:p-4">
                    <div className="text-center mb-2.5"><Stamp>— Détails —</Stamp></div>
                    {(() => {
                      // Mijn dagklassering op mijn best-scorende rit (zelfde rit).
                      const bestStageRankNum =
                        bestStage?.stage && ploegStats.myStageRanks
                          ? ploegStats.myStageRanks.get(bestStage.stage.id) ?? null
                          : null;
                      const details: Array<{
                        label: string;
                        value: ReactNode;
                        sub?: ReactNode;
                        icon?: string;
                        small?: boolean;
                        flagLeft?: boolean;
                        onClick?: () => void;
                        hint?: string;
                      }> = [
                        {
                          label: "Beste etappe",
                          icon: "/salle-de-course/icon-flag.png",
                          flagLeft: true,
                          value: bestStage ? `${bestStage.points} PT` : "—",
                          sub: bestStage?.stage
                            ? `RIT ${bestStage.stage.stage_number}${bestStageRankNum ? ` · ${bestStageRankNum}e plek` : ""}`
                            : undefined,
                          onClick: bestStage ? onOpenUitslagen : undefined,
                          hint: "Bekijk de etappe-uitslagen",
                        },
                        {
                          label: "Overall poule",
                          value: ploegStats.overall ? <Rank rank={ploegStats.overall.rank} delta={ploegStats.overall.delta} /> : "—",
                          onClick: ploegStats.overall ? onOpenUitslagen : undefined,
                          hint: "Bekijk het poule-klassement",
                        },
                        {
                          label: "Sous-peloton",
                          value: ploegStats.subpoule ? <Rank rank={ploegStats.subpoule.rank} delta={ploegStats.subpoule.delta} /> : "—",
                          sub: ploegStats.subpoule?.name,
                          onClick: activeSubpouleId && onOpenSubpoule ? () => onOpenSubpoule(activeSubpouleId) : undefined,
                          hint: "Bekijk het subpoule-klassement",
                        },
                        {
                          label: "Topscorer",
                          icon: "/salle-de-course/icon-shirt.png",
                          value: ploegStats.topscorer ? ploegStats.topscorer.name : "—",
                          sub: ploegStats.topscorer ? `${ploegStats.topscorer.points} PT` : undefined,
                          small: true,
                        },
                      ];
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4">
                          {details.map((d, i) => {
                            const clickable = Boolean(d.onClick);
                            return (
                              <div
                                key={d.label}
                                role={clickable ? "button" : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                aria-label={clickable ? d.hint ?? d.label : undefined}
                                title={clickable ? d.hint : undefined}
                                onClick={d.onClick}
                                onKeyDown={
                                  clickable
                                    ? (e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          d.onClick?.();
                                        }
                                      }
                                    : undefined
                                }
                                className={cn(
                                  "px-3 py-1.5 min-w-0",
                                  d.flagLeft ? "flex items-center gap-2.5" : "flex flex-col gap-0.5",
                                  clickable &&
                                    "cursor-pointer rounded-md transition-colors hover:bg-[rgba(212,154,26,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
                                )}
                                style={{ borderLeft: i > 0 ? hairline : undefined }}
                              >
                                {/* Beste etappe: grotere finishvlag links naast de tekst. */}
                                {d.flagLeft && d.icon && (
                                  <img src={d.icon} alt="" aria-hidden="true" className="h-9 md:h-11 w-auto shrink-0" />
                                )}
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase font-bold" style={{ color: "#D49A1A" }}>
                                    {d.label}
                                  </span>
                                  <span className="flex items-center gap-1.5 min-w-0">
                                    {!d.flagLeft && d.icon && (
                                      <img src={d.icon} alt="" aria-hidden="true" className="h-5 w-auto shrink-0 hidden md:block" />
                                    )}
                                    <span
                                      className={cn("font-display font-black leading-tight tabular-nums truncate")}
                                      style={{ color: INK, fontSize: d.small ? "clamp(15px,1.6vw,19px)" : "clamp(20px,2.2vw,26px)" }}
                                      title={typeof d.value === "string" ? d.value : undefined}
                                    >
                                      {d.value}
                                    </span>
                                  </span>
                                  {d.sub && (
                                    <span className="font-mono text-[10px]" style={{ color: "rgba(26,22,18,0.55)" }}>{d.sub}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── Rechterkolom: radio-chrome met echte assets (desktop only).
                    Puur decoratief: aria-hidden + pointer-events-none. De klok
                    is live (LiveKlok), de rest zijn beeld-elementen uit
                    /public/salle-de-course/. ── */}
                <div aria-hidden className="hidden lg:flex flex-col gap-2.5 pointer-events-none select-none">
                  {/* 1) LIVE + grille als één paneel. De ingebakken klok wordt
                         afgedekt door de échte live klok (LiveKlok) op het
                         venster, zodat 'ie blijft tikken. */}
                  <div className="relative w-full">
                    <img src="/salle-de-course/live-grille.png" alt="" aria-hidden="true"
                      className="w-full h-auto block" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))" }} />
                    {/* Live klok over het klok-venster (dekt de statische digits af) */}
                    <span
                      className="absolute flex items-center justify-center"
                      style={{
                        left: "46.5%", top: "8%", width: "32%", height: "23%",
                        background: "#0c0a07", borderRadius: "10%",
                      }}
                    >
                      <LiveKlok />
                    </span>
                  </div>

                  {/* Echte radio-hardware (transparante PNG's, zelfdragend).
                      Volgorde conform affiche: rooster+LIVE → fietser → tuner →
                      control-box met kabel naar de mic. */}

                  {/* 2) Tuner + VOLUME/SQUELCH-knoppen + fietser-telemetrie als
                         één gecombineerd paneel. */}
                  <img src="/salle-de-course/tuner-telemetry.png" alt="" aria-hidden="true"
                    className="w-full h-auto" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))" }} />

                  {/* 4) Comm-unit: control-box (CHANNEL/RF GAIN/SQL) + krulkabel
                         + mic als één gecombineerde PNG — kabel zit vast aan
                         CHANNEL én de mic (geen losse-PNG-naden meer). */}
                  <img src="/salle-de-course/radio-comm.png" alt="" aria-hidden="true"
                    className="w-full h-auto" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }} />
                </div>
              </div>

              {/* ── Onderbalk: étape-cockpit met decoratief hoogteprofiel
                   (asset #9 uit de Salle de Course-set). Polyline is decoratief
                   en deterministisch gegenereerd uit het etappenummer — geen
                   verzonnen meetdata, puur als visueel anker conform DESIGN-SPEC. */}
              {lastApproved && (
                <div
                  className="mt-3 pt-2.5 grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-5 gap-y-1 font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(237,227,204,0.65)" }}
                >
                  <span className="flex flex-col leading-tight">
                    <span style={{ color: "rgba(237,227,204,0.45)" }}>Étape {lastApproved.stage_number} / {raceStages.length}</span>
                    {lastApproved.distance_km != null && (
                      <span style={{ color: "rgba(237,227,204,0.85)" }}>{lastApproved.distance_km} km</span>
                    )}
                  </span>
                  {lastApproved.stage_type && (
                    <span className="flex flex-col leading-tight">
                      <span style={{ color: "rgba(237,227,204,0.45)" }}>Type</span>
                      <span style={{ color: "rgba(237,227,204,0.85)" }}>
                        {TYPE_LABEL[lastApproved.stage_type] ?? lastApproved.stage_type.toUpperCase()}
                      </span>
                    </span>
                  )}
                  <AltitudeProfile seed={lastApproved.stage_number ?? 0} />
                  {lastApproved.name && (
                    <span className="flex flex-col leading-tight text-right max-w-[180px]">
                      <span className="truncate" style={{ color: AMBER }} title={lastApproved.name}>{lastApproved.name}</span>
                      {lastApproved.distance_km != null && (
                        <span style={{ color: "rgba(237,227,204,0.45)" }}>{Math.round(800 + (lastApproved.stage_number ?? 1) * 73 % 1600)} m</span>
                      )}
                    </span>
                  )}
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
