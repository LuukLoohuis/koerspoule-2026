import { useRef, useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useThema } from "@/contexts/ThemaContext";
import { useStages, useGameStandings } from "@/hooks/useResults";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Download, Copy, Instagram } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };

// ── Data hooks ────────────────────────────────────────────────────────────────

function usePickStats(gameId?: string) {
  return useQuery({
    queryKey: ["ig-pick-stats", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PickStat[]> => {
      const { data, error } = await (supabase as any).rpc("game_pick_stats", { p_game_id: gameId });
      if (error) throw error;
      return (data ?? []) as PickStat[];
    },
  });
}

function useRiderNames(ids: string[]) {
  const key = ids.slice().sort().join(",");
  return useQuery({
    queryKey: ["ig-rider-names", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      if (!supabase || ids.length === 0) return [] as Array<{ id: string; name: string }>;
      const { data, error } = await supabase.from("riders").select("id, name").in("id", ids);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
}

// ── Export helpers ────────────────────────────────────────────────────────────

// Vangt de export-node op echte 1080-grootte (preview-transform tijdelijk uit) en op 2×
// pixeldichtheid → scherpe Instagram-PNG (1080×1080 → 2160×2160 canvas).
async function capture(el: HTMLDivElement, w: number, h: number) {
  const prevTransform = el.style.transform;
  const prevOrigin = el.style.transformOrigin;
  el.style.transform = "none";
  el.style.transformOrigin = "top left";
  try {
    return await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null, logging: false, width: w, height: h } as any);
  } finally {
    el.style.transform = prevTransform;
    el.style.transformOrigin = prevOrigin;
  }
}

async function doDownload(ref: React.RefObject<HTMLDivElement>, filename: string, setLoading: (v: boolean) => void, w = 1080, h = 1080) {
  if (!ref.current) return;
  setLoading(true);
  try {
    const canvas = await capture(ref.current, w, h);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Afbeelding gedownload!");
  } catch {
    toast.error("Download mislukt.");
  } finally {
    setLoading(false);
  }
}

async function doCopy(ref: React.RefObject<HTMLDivElement>, setLoading: (v: boolean) => void, w = 1080, h = 1080) {
  if (!ref.current) return;
  setLoading(true);
  try {
    const canvas = await capture(ref.current, w, h);
    await new Promise<void>((res, rej) =>
      canvas.toBlob((b) => {
        if (!b) return rej(new Error("No blob"));
        navigator.clipboard.write([new ClipboardItem({ "image/png": b })]).then(res).catch(rej);
      }, "image/png")
    );
    toast.success("Afbeelding gekopieerd naar klembord!");
  } catch {
    toast.error("Kopiëren mislukt — probeer downloaden.");
  } finally {
    setLoading(false);
  }
}

// ── Preview scale wrapper ─────────────────────────────────────────────────────

const DISPLAY = 480;

function PreviewWrapper({
  children,
  refObj,
  w = 1080,
  h = 1080,
}: {
  children: React.ReactNode;
  refObj: React.RefObject<HTMLDivElement>;
  w?: number;
  h?: number;
}) {
  const scale = DISPLAY / w;
  return (
    <div
      className="mx-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
      style={{ width: DISPLAY, height: h * scale, position: "relative", flexShrink: 0 }}
    >
      <div
        ref={refObj}
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ExportButtons({
  onDownload,
  onCopy,
  loading,
}: {
  onDownload: () => void;
  onCopy: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex gap-3 justify-center mt-3">
      <button
        onClick={onCopy}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
      >
        <Copy className="h-4 w-4" />
        Kopieer afbeelding
      </button>
      <button
        onClick={onDownload}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 transition-colors disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {loading ? "Bezig…" : "Download PNG"}
      </button>
    </div>
  );
}

function StageSelect({
  label,
  stages,
  value,
  onChange,
}: {
  label: string;
  stages: Array<{ id: string; stage_number: number; name: string | null }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium focus:outline-none"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            Rit {s.stage_number}{s.name ? ` — ${s.name}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE SHARED CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PINK = "#E91E63";
const GOLD = "#FFD700";
const SILVER = "#C0C0C0";
const BRONZE = "#CD7F32";
const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const TYPE_COLOR: Record<string, string> = {
  vlak: "#34d399",
  heuvelachtig: "#fbbf24",
  bergop: "#f43f5e",
  tijdrit: "#38bdf8",
  ploegentijdrit: "#a78bfa",
};
const TYPE_LABEL: Record<string, string> = {
  vlak: "VLAK",
  heuvelachtig: "HEUVELACHTIG",
  bergop: "BERGOP",
  tijdrit: "TIJDRIT",
  ploegentijdrit: "PLOEGENTIJDRIT",
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: KLASSEMENT UPDATE
// ─────────────────────────────────────────────────────────────────────────────

function KlassementTemplate({
  gameName,
  stageNumber,
  standings,
}: {
  gameName: string;
  stageNumber: number;
  standings: Array<{ rank: number; name: string; pts: number }>;
}) {
  const rankColor = (r: number) =>
    r === 1 ? GOLD : r === 2 ? SILVER : r === 3 ? BRONZE : "rgba(255,255,255,0.65)";
  const rankBorder = (r: number) =>
    r === 1 ? `rgba(255,215,0,0.5)` : r === 2 ? `rgba(192,192,192,0.35)` : r === 3 ? `rgba(205,127,50,0.35)` : `rgba(255,255,255,0.07)`;
  const rowBg = (r: number) =>
    r === 1 ? "rgba(255,215,0,0.08)" : r === 2 ? "rgba(192,192,192,0.05)" : r === 3 ? "rgba(205,127,50,0.06)" : "rgba(255,255,255,0.04)";

  return (
    <div style={{
      width: 1080, height: 1080,
      background: "linear-gradient(145deg, #0a0418 0%, #0d1a38 55%, #0a0418 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: FONT,
      position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", top: -200, right: -150, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}18 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -150, left: -100, width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{ height: 10, background: `linear-gradient(90deg, ${PINK}, #9c27b0, ${PINK})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "58px 80px 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 10 }}>
          <div style={{ fontSize: 76, lineHeight: 1 }}>🏆</div>
          <div>
            <div style={{ fontSize: 82, fontWeight: 900, color: "white", letterSpacing: "-2px", lineHeight: 1, textTransform: "uppercase" }}>
              TUSSENSTAND
            </div>
            <div style={{ fontSize: 30, color: PINK, fontWeight: 700, marginTop: 8, letterSpacing: "3px", textTransform: "uppercase" }}>
              {gameName} · Na rit {stageNumber}
            </div>
          </div>
        </div>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${PINK} 0%, rgba(233,30,99,0.3) 60%, transparent 100%)`, marginTop: 24 }} />
      </div>

      {/* Standings */}
      <div style={{ flex: 1, padding: "4px 80px 0", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
        {standings.slice(0, 5).map((s) => (
          <div key={s.rank} style={{
            display: "flex", alignItems: "center",
            background: rowBg(s.rank),
            borderRadius: 16,
            padding: "22px 30px",
            border: `1px solid ${rankBorder(s.rank)}`,
            borderLeft: `6px solid ${s.rank <= 3 ? rankColor(s.rank) : "rgba(255,255,255,0.08)"}`,
          }}>
            <div style={{ width: 80, fontSize: s.rank <= 3 ? 60 : 40, fontWeight: 900, color: rankColor(s.rank), flexShrink: 0, lineHeight: 1, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              {s.rank}
            </div>
            <div style={{ flex: 1, fontSize: 38, fontWeight: s.rank <= 3 ? 800 : 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: s.rank === 1 ? 56 : 46, fontWeight: 900, color: s.rank === 1 ? GOLD : "white", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {s.pts}
              </div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", marginTop: 3, letterSpacing: "2px" }}>PT</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "24px 80px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        marginTop: 20,
      }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>koerspoule.nl</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: PINK }} />
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Giro d'Italia 2026</div>
        </div>
      </div>
      <div style={{ height: 8, background: `linear-gradient(90deg, ${PINK}, #9c27b0, ${PINK})`, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: DAGSCORE
// ─────────────────────────────────────────────────────────────────────────────

function DagscoreTemplate({
  stageNumber,
  stageName,
  stageType,
  standings,
}: {
  stageNumber: number;
  stageName?: string;
  stageType?: string;
  standings: Array<{ rank: number; name: string; pts: number }>;
}) {
  const accent = TYPE_COLOR[stageType ?? "vlak"] ?? "#38bdf8";

  return (
    <div style={{
      width: 1080, height: 1080,
      background: "linear-gradient(150deg, #050d1a 0%, #0a1628 60%, #050d1a 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: FONT,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -180, left: -180, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -120, right: -120, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}18 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ height: 10, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "52px 80px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 28, color: accent, fontWeight: 700, letterSpacing: "5px", textTransform: "uppercase", marginBottom: 6 }}>
              DAGUITSLAG
            </div>
            <div style={{ fontSize: 96, fontWeight: 900, color: "white", letterSpacing: "-4px", lineHeight: 0.9, textTransform: "uppercase" }}>
              RIT {stageNumber}
            </div>
            {stageName && (
              <div style={{ fontSize: 30, color: "rgba(255,255,255,0.5)", marginTop: 14, fontWeight: 500 }}>
                {stageName}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", paddingTop: 8 }}>
            <div style={{ fontSize: 64, lineHeight: 1 }}>🚴</div>
            {stageType && (
              <div style={{
                marginTop: 14,
                padding: "8px 22px",
                borderRadius: 40,
                background: `${accent}20`,
                border: `1px solid ${accent}55`,
                color: accent,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}>
                {TYPE_LABEL[stageType] ?? stageType}
              </div>
            )}
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${PINK}, transparent)`, marginTop: 24 }} />
      </div>

      {/* Standings */}
      <div style={{ flex: 1, padding: "8px 80px 0", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" }}>
        {standings.slice(0, 5).map((s) => (
          <div key={s.rank} style={{
            display: "flex", alignItems: "center",
            background: s.rank === 1 ? `${accent}15` : "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: "20px 28px",
            border: `1px solid ${s.rank === 1 ? `${accent}45` : "rgba(255,255,255,0.07)"}`,
            borderLeft: `5px solid ${s.rank === 1 ? accent : s.rank === 2 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
          }}>
            <div style={{ width: 64, fontSize: s.rank === 1 ? 56 : 38, fontWeight: 900, color: s.rank === 1 ? accent : "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums", flexShrink: 0, lineHeight: 1, textAlign: "center" }}>
              {s.rank}
            </div>
            <div style={{ flex: 1, fontSize: 38, fontWeight: s.rank === 1 ? 800 : 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.name}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: s.rank === 1 ? 56 : 44, fontWeight: 900, color: s.rank === 1 ? accent : "white", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                +{s.pts}
              </div>
              <div style={{ fontSize: 17, color: "rgba(255,255,255,0.3)", marginTop: 3, letterSpacing: "2px" }}>PT</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "22px 80px", marginTop: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>koerspoule.nl</div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Giro d'Italia 2026</div>
      </div>
      <div style={{ height: 8, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: ETAPPE PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

function EtappePreviewTemplate({
  stageNumber,
  stageName,
  distanceKm,
  stageType,
  date,
  topRiders,
}: {
  stageNumber: number;
  stageName?: string;
  distanceKm?: number;
  stageType?: string;
  date?: string;
  topRiders: Array<{ name: string; pickPct: number }>;
}) {
  const accent = TYPE_COLOR[stageType ?? "vlak"] ?? "#38bdf8";
  const dateStr = date
    ? new Date(date).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div style={{
      width: 1080, height: 1080,
      background: `linear-gradient(148deg, #05111e 0%, #0b1e2e 55%, #05111e 100%)`,
      display: "flex", flexDirection: "column",
      fontFamily: FONT,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -100, right: -100, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, ${accent}1e 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${PINK}14 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ height: 10, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: "52px 80px 28px", flexShrink: 0 }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.38)", letterSpacing: "5px", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>
          PREVIEW 👀
        </div>
        <div style={{ fontSize: 98, fontWeight: 900, color: "white", letterSpacing: "-4px", lineHeight: 0.88 }}>
          RIT {stageNumber}
        </div>
        {stageName && (
          <div style={{ fontSize: 40, fontWeight: 700, color: "rgba(255,255,255,0.8)", marginTop: 16 }}>
            {stageName}
          </div>
        )}
        {/* Meta pills row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
          {stageType && (
            <div style={{
              padding: "8px 24px", borderRadius: 40,
              background: `${accent}1e`, border: `1px solid ${accent}55`,
              color: accent, fontSize: 23, fontWeight: 700, letterSpacing: "2px",
            }}>
              {TYPE_LABEL[stageType]}
            </div>
          )}
          {distanceKm && (
            <div style={{
              padding: "8px 24px", borderRadius: 40,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.75)", fontSize: 23, fontWeight: 600,
            }}>
              {distanceKm} km
            </div>
          )}
          {dateStr && (
            <div style={{ fontSize: 23, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
              {dateStr}
            </div>
          )}
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${PINK}, transparent)`, marginTop: 28 }} />
      </div>

      {/* Top riders */}
      <div style={{ flex: 1, padding: "8px 80px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.30)", letterSpacing: "5px", fontWeight: 700, textTransform: "uppercase", marginBottom: 22 }}>
          Meest gekozen renners
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {topRiders.slice(0, 3).map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 24,
              background: i === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
              borderRadius: 18,
              padding: "30px 36px",
              border: `1px solid ${i === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
            }}>
              <div style={{ fontSize: 56, lineHeight: 1, flexShrink: 0 }}>{MEDALS[i]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: accent, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {r.pickPct.toFixed(0)}%
                </div>
                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>van de pools</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "22px 80px", marginTop: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>koerspoule.nl</div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.35)", letterSpacing: "4px", fontWeight: 700, textTransform: "uppercase" }}>Giro d'Italia 2026</div>
      </div>
      <div style={{ height: 8, background: `linear-gradient(90deg, ${PINK}, ${accent}, ${PINK})`, flexShrink: 0 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RACE-TEMPLATES — vintage trading-card-stijl per koers. Tour en Tour Femmes
// delen het gele sitethema, maar hebben hier ieder hun eigen PNG-sjablonen.
// ─────────────────────────────────────────────────────────────────────────────

const R_PAPER = "#F1E7CE";
const R_ROW = "#F7EFD8";
const R_INK = "#1C1813";
const R_BORDER = "#2A2317";
const R_SILVER = "#C9C4BB";
const R_BRONZE = "#C08A3E";
const R_SERIF = "'Playfair Display', Georgia, serif";
const R_OSWALD = "'Oswald', 'Archivo Black', sans-serif";

type RaceTheme = {
  primary: string;
  onPrimary: string; // leesbare tekst op de primaire kleur
  race: string; // footer-tekst
  title: React.ReactNode; // koptitel (script/bold per koers)
  klassementBg: string; // PNG-sjabloon (public/) voor klassement
  daguitslagBg: string; // PNG-sjabloon (public/) voor daguitslag
};

type RaceKey = "roze" | "geel" | "rood" | "femmes";

function RaceBike({ size = 54, color = R_INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round">
      <circle cx="16" cy="44" r="13" />
      <circle cx="48" cy="44" r="13" />
      <path d="M16 44 L28 24 L44 24 M28 24 L40 44 M44 24 L48 44 M24 24 L32 24" />
      <path d="M40 22 q4 -5 9 -2" />
    </svg>
  );
}

function RaceFlag({ size = 30 }: { size?: number }) {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) cells.push(<rect key={`${r}-${c}`} x={c * 7} y={r * 6} width="7" height="6" fill={(r + c) % 2 === 0 ? R_INK : "transparent"} />);
  return (
    <svg width={size} height={size} viewBox="0 0 24 30">
      <line x1="1" y1="0" x2="1" y2="30" stroke={R_INK} strokeWidth="2" />
      <g transform="translate(2 2)">{cells}</g>
    </svg>
  );
}

function RaceJersey({ size = 120, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M30 20 L20 30 L28 40 L30 38 L30 80 L70 80 L70 38 L72 40 L80 30 L70 20 L60 20 Q50 30 40 20 Z"
        fill={color} stroke={R_INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 20 Q50 30 60 20" fill="none" stroke={R_INK} strokeWidth="3" />
    </svg>
  );
}

function RaceMountains({ width = 360, height = 150 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 360 150" fill="none" stroke={R_INK} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M0 150 L70 60 L110 100 L160 30 L210 95 L260 50 L320 110 L360 75 L360 150 Z" fill="rgba(28,24,19,0.06)" />
      <path d="M160 30 L175 48 L150 52 Z" fill="rgba(255,255,255,0.6)" stroke="none" />
      <path d="M0 150 L70 60 L110 100 L160 30 L210 95 L260 50 L320 110 L360 75" />
    </svg>
  );
}

function RaceLaurel({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={R_INK} strokeWidth="2">
      <path d="M20 6 C10 10 8 24 14 34 M20 6 C30 10 32 24 26 34" />
      {[12, 18, 24, 30].map((y, i) => (
        <g key={i}>
          <ellipse cx={14 - i} cy={y} rx="3" ry="1.6" transform={`rotate(-40 ${14 - i} ${y})`} />
          <ellipse cx={26 + i} cy={y} rx="3" ry="1.6" transform={`rotate(40 ${26 + i} ${y})`} />
        </g>
      ))}
    </svg>
  );
}

// Titels per koers (script voor Giro/Tour, bold voor Vuelta).
const GiroTitle = (
  <div style={{ fontFamily: R_SERIF, fontStyle: "italic", fontWeight: 900, lineHeight: 0.9 }}>
    <span style={{ fontSize: 98, color: "#E8336D" }}>Giro</span><br />
    <span style={{ fontSize: 64, color: R_INK }}>d'Italia</span>
    <div style={{ display: "flex", gap: 0, marginTop: 6, width: 150 }}>
      <span style={{ flex: 1, height: 5, background: "#009246" }} /><span style={{ flex: 1, height: 5, background: "#fff" }} /><span style={{ flex: 1, height: 5, background: "#CE2B37" }} />
    </div>
  </div>
);
const TourTitle = (
  <div style={{ fontFamily: R_SERIF, fontStyle: "italic", fontWeight: 900, lineHeight: 0.9, color: R_INK }}>
    <span style={{ fontSize: 60 }}>Le </span><span style={{ fontSize: 92 }}>Tour</span><br />
    <span style={{ fontSize: 50 }}>de France</span>
  </div>
);
const VueltaTitle = (
  <div style={{ fontFamily: R_OSWALD, fontStyle: "italic", fontWeight: 700, lineHeight: 0.88 }}>
    <div style={{ fontSize: 50, color: R_INK }}>LA</div>
    <div style={{ fontSize: 96, color: "#CC0000" }}>VUELTA</div>
    <div style={{ fontSize: 40, color: R_INK }}>A ESPAÑA</div>
  </div>
);

const RACE_THEMES: Record<RaceKey, RaceTheme> = {
  geel: { primary: "#E0A411", onPrimary: "#1C1813", race: "TOUR DE FRANCE 2026", title: TourTitle, klassementBg: "/ig/klassement-template.png", daguitslagBg: "/ig/daguitslag-template.png" },
  femmes: { primary: "#E0A411", onPrimary: "#1C1813", race: "TOUR DE FRANCE FEMMES 2026", title: TourTitle, klassementBg: "/ig/klassement-template-femmes.png", daguitslagBg: "/ig/daguitslag-template-femmes.png" },
  roze: { primary: "#E8336D", onPrimary: "#FFFFFF", race: "GIRO D'ITALIA 2026", title: GiroTitle, klassementBg: "/ig/klassement-template-giro.png", daguitslagBg: "/ig/daguitslag-template-giro.png" },
  rood: { primary: "#CC0000", onPrimary: "#FFF4EC", race: "LA VUELTA 2026", title: VueltaTitle, klassementBg: "/ig/klassement-template-vuelta.png", daguitslagBg: "/ig/daguitslag-template-vuelta.png" },
};

function RaceFooter({ theme }: { theme: RaceTheme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 44px", background: R_INK, color: R_PAPER }}>
      <span style={{ fontFamily: R_OSWALD, fontSize: 24, letterSpacing: 1 }}>koerspoule.nl</span>
      <div style={{ width: 64, height: 64, borderRadius: "50%", border: `3px solid ${theme.primary}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RaceBike size={40} color={theme.primary} />
      </div>
      <span style={{ fontFamily: R_OSWALD, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: theme.primary }}>{theme.race}</span>
    </div>
  );
}

function RaceCardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 1080, height: 1080, fontFamily: R_OSWALD, background: R_INK, padding: 26, boxSizing: "border-box" }}>
      <div style={{ width: "100%", height: "100%", background: R_PAPER, border: `6px solid ${R_BORDER}`, borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", backgroundImage: "radial-gradient(rgba(28,24,19,0.05) 1px, transparent 1px)", backgroundSize: "5px 5px" }}>
        {children}
      </div>
    </div>
  );
}

function RaceRow({ rank, name, value, theme, medal }: {
  rank: number; name: string; value: string; theme: RaceTheme; medal?: "gold" | "silver" | "bronze";
}) {
  const bg = medal === "gold" ? theme.primary : medal === "silver" ? R_SILVER : medal === "bronze" ? R_BRONZE : "transparent";
  const text = medal === "gold" ? theme.onPrimary : R_INK;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 30px 0 0", height: 76, background: bg, borderBottom: `2px solid rgba(28,24,19,0.16)` }}>
      <span style={{ fontFamily: R_OSWALD, fontWeight: 700, fontSize: 40, width: 78, textAlign: "center", color: text }}>{rank}</span>
      <span style={{ flex: 1, fontFamily: R_OSWALD, fontWeight: 700, fontSize: 34, textTransform: "uppercase", color: text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.5 }}>{name}</span>
      {medal === "gold" && <RaceLaurel size={40} />}
      <span style={{ fontFamily: R_OSWALD, fontWeight: 700, fontSize: 34, color: text, display: "flex", alignItems: "flex-end", gap: 3 }}>
        {value}<span style={{ fontSize: 16, marginBottom: 5 }}>PT</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PNG-SJABLOON TEMPLATES — de retro-PNG dient als achtergrond, alleen de data
// (namen + punten + ritnummer + traject) wordt er als tekst-laag overheen gelegd.
//
// backgroundSize "100% 100%" → de PNG vult de container exact, dus de overlay-
// posities hieronder zijn fracties van de container en schalen automatisch mee.
// De ranks 1..10 en "PT" staan al IN de PNG; wij vullen alleen naam + getal.
//
// FIJN-AFSTELLEN: pas onderstaande px-waarden aan op jouw echte PNG. Ze gelden
// in container-ruimte (klassement 1080×1080, daguitslag 1080×DAG_H).
// ─────────────────────────────────────────────────────────────────────────────

const KLAS_W = 1080, KLAS_H = 1080;     // klassement-sjabloon: vierkant (1254×1254 → 1:1)
const DAG_W = 1080, DAG_H = 1080;       // daguitslag-sjabloon: ook vierkant (1254×1254 → 1:1)

// Uitlijn-geometrie per koers — px in 1080×1080-ruimte, afgemeten op de PNG-sjablonen.
// (rows: 10 gelijke rijen tussen top/bottom; naam vanaf left, getal tot right-inset.)
type RaceGeo = {
  klasRows: { top: number; bottom: number; left: number; right: number };
  klasRit: { top: number; height: number };          // "NA RIT N"-cover (gecentreerd)
  dagRows: { top: number; bottom: number; left: number; right: number };
  dagRit: { top: number; left: number; width: number; height: number };  // "RIT N"-cover (donkere balk)
  dagTraject: { top: number; height: number; width: number };            // traject-cover (gecentreerd)
  ritColor: string;                                  // kleur van "RIT N" op de donkere balk
  // Exacte y-posities van de 11 tabellijnen (gemeten op de PNG) wanneer de
  // rijen NIET gelijk verdeeld zijn (met de hand getekende sjablonen). Rij-
  // centers = midden tussen twee opeenvolgende lijnen. Ontbreekt de array,
  // dan valt de renderer terug op 10 gelijke rijen tussen top/bottom.
  klasLines?: number[];
  dagLines?: number[];
};

// Tour (geel) — daguitslag afgemeten op de NIEUWE PNG (1254², overlay in 1080²,
// factor ≈0.861): donkere balk y474-602, "RIT XX" geel x838-1100, nummerboxjes
// eindigen x206, rijscheidingen 700→1117 (10 rijen ~42px), "PT" op x1099-1153,
// traject-placeholder ("PLAATS START – PLAATS FINISH") y≈665-695.
const GEO_TOUR: RaceGeo = {
  klasRows: { top: 497, bottom: 83, left: 150, right: 150 },
  klasRit: { top: 440, height: 40 },
  // Rij-band opnieuw afgemeten op de Tour-daguitslag-PNG (grid 603.7→965.5 bij
  // 1080²): band lag ~12px te laag → tekst zakte op de scheidingslijnen.
  dagRows: { top: 604, bottom: 114, left: 188, right: 158 },
  dagRit: { top: 408, left: 706, width: 262, height: 110 },
  // Ingebakken plaatsnamen-regel gemeten op y 574–590; eerste tabellijn op 604.
  // Cover 570–602 → bedekt de regel zonder rij 1 of de lijn te raken.
  dagTraject: { top: 570, height: 32, width: 620 },
  ritColor: "#E0A411",
  // Gemeten tabellijnen (1080²): het klassement-sjabloon heeft ONgelijke rijen
  // (boven ~58px, onder ~46px), de daguitslag is vrijwel uniform (~36px).
  klasLines: [479.7, 537.8, 593.4, 647.7, 698.5, 745.0, 792.3, 840.6, 888.4, 935.3, 981.8],
  dagLines: [603.7, 640.8, 676.9, 712.2, 748.4, 784.6, 819.9, 856.1, 891.4, 927.6, 965.5],
};

// Vuelta (rood) — kop is hoger, dus rijen zitten lager dan bij Tour.
const GEO_VUELTA: RaceGeo = {
  klasRows: { top: 565, bottom: 94, left: 122, right: 150 },
  klasRit: { top: 509, height: 40 },
  dagRows: { top: 570, bottom: 88, left: 165, right: 155 },
  dagRit: { top: 452, left: 698, width: 304, height: 92 },
  dagTraject: { top: 570, height: 42, width: 640 },
  ritColor: "#FFFFFF",
};

// Giro (roze) — eigen (ongewijzigd) sjabloon. Bewust NIET meer via spread van
// GEO_TOUR: die dag-geometrie is opnieuw afgemeten op de nieuwe Tour-PNG. Dit
// zijn de oude, voor het Giro-sjabloon geldende waarden. RIT N is wit op zwarte vlag.
const GEO_GIRO: RaceGeo = {
  klasRows: { top: 484, bottom: 96, left: 150, right: 150 },
  klasRit: { top: 440, height: 40 },
  dagRows: { top: 565, bottom: 108, left: 235, right: 205 },
  dagRit: { top: 392, left: 712, width: 268, height: 88 },
  dagTraject: { top: 524, height: 42, width: 620 },
  ritColor: "#FFFFFF",
};

// Tour Femmes — afgemeten op de twee aangeleverde 1254×1254-sjablonen en
// omgerekend naar de 1080×1080 canvasruimte. Beide tabellen hebben eigen,
// handgetekende lijnposities; die gebruiken we voor exact gecentreerde tekst.
const GEO_FEMMES: RaceGeo = {
  klasRows: { top: 447, bottom: 127, left: 165, right: 150 },
  klasRit: { top: 395, height: 38 },
  dagRows: { top: 618, bottom: 108, left: 188, right: 145 },
  dagRit: { top: 422, left: 730, width: 282, height: 116 },
  dagTraject: { top: 586, height: 30, width: 620 },
  ritColor: "#E0A411",
  klasLines: [446.1, 506.3, 563.3, 617.5, 669.2, 716.4, 763.9, 810.5, 857.7, 904.3, 952.4],
  dagLines: [617.5, 652.7, 688.0, 723.4, 758.8, 794.1, 829.5, 865.6, 900.0, 935.3, 971.4],
};

const RACE_GEO: Record<RaceKey, RaceGeo> = {
  geel: GEO_TOUR,
  femmes: GEO_FEMMES,
  rood: GEO_VUELTA,
  roze: GEO_GIRO,
};

// ── Canvas-export voor de race-templates ─────────────────────────────────────
// html2canvas bleek onbetrouwbaar voor deze pixel-precieze overlays (tekst zakt
// per element nét anders). Daarom tekenen we de kaart DIRECT op een 2D-canvas:
// template-PNG + fillText met textBaseline "middle" — deterministisch, en de
// preview toont exact dezelfde pixels als de download.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function ellipsizeCanvas(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

const EXPORT_SCALE = 2; // 1080 → 2160: scherp op Instagram

async function renderRaceCanvas(
  kind: "dag" | "klas",
  theme: RaceTheme,
  geo: RaceGeo,
  opts: { stageNumber: number; traject?: string; rows: Array<{ rank: number; name: string; pts: number }> },
): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W * EXPORT_SCALE;
  canvas.height = H * EXPORT_SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

  // Oswald moet geladen zijn vóór measureText/fillText.
  try { await document.fonts.load("700 32px Oswald"); await document.fonts.ready; } catch { /* system-fallback */ }
  const bg = await loadImage(kind === "dag" ? theme.daguitslagBg : theme.klassementBg);
  ctx.drawImage(bg, 0, 0, W, H);
  ctx.textBaseline = "middle";

  if (kind === "dag") {
    // RIT N — donkere balk over de ingebakken "RIT XX".
    ctx.fillStyle = R_INK;
    ctx.fillRect(geo.dagRit.left, geo.dagRit.top, geo.dagRit.width, geo.dagRit.height);
    ctx.fillStyle = geo.ritColor;
    ctx.font = "700 56px Oswald, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`RIT ${opts.stageNumber}`, geo.dagRit.left + geo.dagRit.width / 2, geo.dagRit.top + geo.dagRit.height / 2 + 2);

    // Traject-cover over de ingebakken plaatsnamen-regel.
    const tr = geo.dagTraject;
    ctx.font = "600 24px Oswald, sans-serif";
    const label = ellipsizeCanvas(ctx, (opts.traject ?? "—").toUpperCase(), 780);
    const tw = Math.min(820, Math.max(tr.width, ctx.measureText(label).width + 40));
    ctx.fillStyle = R_PAPER;
    ctx.fillRect(W / 2 - tw / 2, tr.top, tw, tr.height);
    ctx.fillStyle = R_INK;
    ctx.fillText(label, W / 2, tr.top + tr.height / 2 + 1);
  } else {
    // NA RIT N — paper-badge over de ingebakken "NA RIT XX".
    const kr = geo.klasRit;
    ctx.font = "700 30px Oswald, sans-serif";
    const label = `NA RIT ${opts.stageNumber}`;
    const kw = Math.max(250, ctx.measureText(label).width + 44);
    ctx.fillStyle = R_PAPER;
    ctx.fillRect(W / 2 - kw / 2, kr.top, kw, kr.height);
    ctx.fillStyle = R_INK;
    ctx.textAlign = "center";
    ctx.fillText(label, W / 2, kr.top + kr.height / 2 + 1);
  }

  // Top-10-rijen: naam links, punten rechts, exact op het rij-midden. Bij
  // gemeten lijnposities (ongelijke, met de hand getekende rijen) is het
  // rij-center het midden tussen twee opeenvolgende lijnen; anders 10 gelijke
  // rijen tussen top/bottom.
  const band = kind === "dag" ? geo.dagRows : geo.klasRows;
  const lines = kind === "dag" ? geo.dagLines : geo.klasLines;
  const centers: number[] = [];
  let minRowH: number;
  if (lines && lines.length === 11) {
    for (let i = 0; i < 10; i++) centers.push((lines[i] + lines[i + 1]) / 2);
    minRowH = Math.min(...lines.slice(1).map((v, i) => v - lines[i]));
  } else {
    const rowH = (H - band.top - band.bottom) / 10;
    for (let i = 0; i < 10; i++) centers.push(band.top + i * rowH + rowH / 2);
    minRowH = rowH;
  }
  const fontSize = Math.min(30, Math.round(minRowH * 0.62));
  ctx.font = `700 ${fontSize}px Oswald, sans-serif`;
  ctx.fillStyle = R_INK;
  const valuePrefix = kind === "dag" ? "+" : "";
  for (let i = 0; i < 10; i++) {
    const s = opts.rows[i];
    if (!s) continue;
    const cy = centers[i] + 1;
    const nameMax = W - band.left - band.right - 170;
    ctx.textAlign = "left";
    ctx.fillText(ellipsizeCanvas(ctx, s.name.toUpperCase(), nameMax), band.left, cy);
    ctx.textAlign = "right";
    ctx.fillText(`${valuePrefix}${s.pts}`, W - band.right, cy);
  }
  return canvas;
}

// Preview + download/copy voor één race-kaart. De <img> IS de export (dataURL
// van hetzelfde canvas), dus wat je ziet is wat je downloadt.
function RaceCanvasCard({ kind, theme, geo, stageNumber, traject, rows, filename }: {
  kind: "dag" | "klas";
  theme: RaceTheme;
  geo: RaceGeo;
  stageNumber: number;
  traject?: string;
  rows: Array<{ rank: number; name: string; pts: number }>;
  filename: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rowsKey = JSON.stringify(rows.slice(0, 10));

  useEffect(() => {
    let alive = true;
    setUrl(null);
    (async () => {
      try {
        const c = await renderRaceCanvas(kind, theme, geo, { stageNumber, traject, rows: JSON.parse(rowsKey) });
        if (!alive) return;
        canvasRef.current = c;
        setUrl(c.toDataURL("image/png"));
      } catch (e) {
        console.error("renderRaceCanvas:", e);
        if (alive) toast.error("Kaart renderen mislukt — staat de template-PNG klaar?");
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, theme, geo, stageNumber, traject, rowsKey]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.download = filename;
    a.href = url;
    a.click();
    toast.success("Afbeelding gedownload!");
  };

  const copy = async () => {
    const c = canvasRef.current;
    if (!c) return;
    setLoading(true);
    try {
      const blob = await new Promise<Blob | null>((r) => c.toBlob((b) => r(b), "image/png"));
      if (!blob) throw new Error("geen blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Afbeelding gekopieerd!");
    } catch {
      toast.error("Kopiëren mislukt — probeer downloaden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {url ? (
        <img src={url} alt="Instagram-kaart preview" style={{ width: 460, height: 460 }} className="rounded-xl border border-foreground/10 shadow-md" />
      ) : (
        <div style={{ width: 460, height: 460 }} className="rounded-xl border border-foreground/10 bg-secondary/40 animate-pulse" />
      )}
      <ExportButtons onDownload={download} onCopy={() => void copy()} loading={loading || !url} />
    </div>
  );
}

export default function InstagramExport({ gameId: propGameId, gameInfo }: {
  gameId?: string;
  gameInfo?: { name: string; game_type?: string | null } | null;
}) {
  const { data: currentGame } = useCurrentGame();
  // In Admin kan een andere game geselecteerd zijn dan de globale game-switcher.
  // Gebruik dan expliciet de metadata van die adminselectie voor het sjabloon.
  const game = gameInfo ?? currentGame;
  const gameId = propGameId ?? game?.id;
  // Tour en Tour Femmes hebben allebei het gele sitethema. Gebruik daarom voor
  // de export ook het game_type/de naam, zodat Femmes haar eigen templates pakt.
  const { key: themaKey } = useThema();
  const isFemmes = game?.game_type === "femmes" || /femmes/i.test(game?.name ?? "");
  const raceKey: RaceKey = isFemmes ? "femmes" : themaKey;
  const raceTheme = RACE_THEMES[raceKey];
  const raceGeo = RACE_GEO[raceKey];

  const { data: stages = [] } = useStages(gameId);
  const { data: pickStats = [] } = usePickStats(gameId);

  const [activeTab, setActiveTab] = useState<"klassement" | "dagscore" | "etappe">("klassement");
  const [klassementStageId, setKlassementStageId] = useState<string>("");
  const [dagscoreStageId, setDagscoreStageId] = useState<string>("");
  const [previewStageId, setPreviewStageId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);

  const approvedStages = useMemo(() => stages.filter((s) => !s.is_gc && s.results_status === "approved"), [stages]);
  const allRegularStages = useMemo(() => stages.filter((s) => !s.is_gc), [stages]);

  // Auto-select latest approved stage
  useEffect(() => {
    if (approvedStages.length > 0) {
      const last = approvedStages[approvedStages.length - 1].id;
      setKlassementStageId((v) => v || last);
      setDagscoreStageId((v) => v || last);
    }
    if (allRegularStages.length > 0) {
      setPreviewStageId((v) => v || allRegularStages[allRegularStages.length - 1].id);
    }
  }, [approvedStages.length, allRegularStages.length]);

  const gameName = game?.name ?? "Giro d'Italia 2026";

  // Klassement standings (cumulatief t/m gekozen etappe) — server-side via
  // game_standings (cum_points), i.p.v. alle stage_points naar de client.
  const klassementStage = stages.find((s) => s.id === klassementStageId);
  const { data: klassementRows = [] } = useGameStandings(gameId, klassementStage?.stage_number, false);
  const klassementStandings = useMemo(() => {
    return [...klassementRows]
      .map((r) => ({ name: r.team_name ?? r.display_name ?? "—", pts: r.cum_points }))
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [klassementRows]);

  // Dagscore standings (één etappe) — game_standings stage_points voor die rit.
  const dagscoreStage = stages.find((s) => s.id === dagscoreStageId);
  const { data: dagscoreRows = [] } = useGameStandings(gameId, dagscoreStage?.stage_number);
  const dagscoreStandings = useMemo(() => {
    return [...dagscoreRows]
      .map((r) => ({ name: r.team_name ?? r.display_name ?? "—", pts: r.stage_points }))
      .filter((e) => e.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [dagscoreRows]);

  // Preview stage
  const previewStage = stages.find((s) => s.id === previewStageId);

  // Top picked riders
  const topRiderIds = useMemo(
    () => [...pickStats].sort((a, b) => b.pick_count - a.pick_count).slice(0, 10).map((p) => p.rider_id),
    [pickStats]
  );
  const { data: riderData = [] } = useRiderNames(topRiderIds);
  const ridersById = useMemo(() => Object.fromEntries(riderData.map((r) => [r.id, r])), [riderData]);
  const topRidersForPreview = useMemo(() => {
    const totalEntries = pickStats[0]?.total_entries ?? 1;
    return [...pickStats]
      .sort((a, b) => b.pick_count - a.pick_count)
      .slice(0, 3)
      .map((p) => ({
        name: ridersById[p.rider_id]?.name ?? "Onbekend",
        pickPct: (p.pick_count / Math.max(1, totalEntries)) * 100,
      }));
  }, [pickStats, ridersById]);

  const tabs = [
    { key: "klassement" as const, label: "Klassement Update" },
    { key: "dagscore" as const, label: "Daguitslag" },
    { key: "etappe" as const, label: "Etappe Preview" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-pink-500/10">
          <Instagram className="h-6 w-6 text-pink-500" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">Instagram Export</h2>
          <p className="text-sm text-muted-foreground">Genereer 1080×1080px posts klaar voor Instagram.</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              activeTab === key
                ? "bg-card text-foreground shadow-sm border border-foreground/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Template 1: Klassement ── */}
      {activeTab === "klassement" && (
        <div>
          <StageSelect
            label="Na rit:"
            stages={approvedStages}
            value={klassementStageId}
            onChange={setKlassementStageId}
          />
          <RaceCanvasCard
            kind="klas"
            theme={raceTheme}
            geo={raceGeo}
            stageNumber={klassementStage?.stage_number ?? 0}
            rows={klassementStandings.slice(0, 10)}
            filename={`klassement-rit${klassementStage?.stage_number ?? 0}.png`}
          />
        </div>
      )}

      {/* ── Template 2: Dagscore ── */}
      {activeTab === "dagscore" && (
        <div>
          <StageSelect
            label="Rit:"
            stages={approvedStages}
            value={dagscoreStageId}
            onChange={setDagscoreStageId}
          />
          <RaceCanvasCard
            kind="dag"
            theme={raceTheme}
            geo={raceGeo}
            stageNumber={dagscoreStage?.stage_number ?? 0}
            traject={`${dagscoreStage?.name ?? "—"}${dagscoreStage?.stage_type ? ` · ${TYPE_LABEL[dagscoreStage.stage_type] ?? dagscoreStage.stage_type.toUpperCase()}` : ""}`}
            rows={dagscoreStandings.slice(0, 10)}
            filename={`daguitslag-rit${dagscoreStage?.stage_number ?? 0}.png`}
          />
        </div>
      )}

      {/* ── Template 3: Etappe Preview ── */}
      {activeTab === "etappe" && (
        <div>
          <StageSelect
            label="Rit:"
            stages={allRegularStages}
            value={previewStageId}
            onChange={setPreviewStageId}
          />
          <div className="flex flex-col items-center gap-3">
            <PreviewWrapper refObj={ref3}>
              <EtappePreviewTemplate
                stageNumber={previewStage?.stage_number ?? 0}
                stageName={previewStage?.name ?? undefined}
                distanceKm={previewStage?.distance_km ?? undefined}
                stageType={previewStage?.stage_type ?? undefined}
                date={previewStage?.date ?? undefined}
                topRiders={topRidersForPreview}
              />
            </PreviewWrapper>
            <ExportButtons
              onDownload={() => doDownload(ref3, `preview-rit${previewStage?.stage_number ?? 0}.png`, setLoading)}
              onCopy={() => doCopy(ref3, setLoading)}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
