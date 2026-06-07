// StageBar.tsx
// Stage-selector / standings bar voor de Koerspoule "Uitslagen"-tab.
//
// Gebruikt PNG-assets onder ASSET_BASE (public/assets/stage-bar/) voor staven,
// badges en de Frankrijk-kaart. Tooltip-iconen via ./StageIcons.

import * as React from "react";
import { StageTypeIcon, MountainTexture, RouteIcon, type StageType } from "./StageIcons";

/* ------------------------------- config -------------------------------- */

const MIN_H = 40;
const MAX_H = 140;   // matcht ongeveer header-hoogte
const BAR_W = 44;    // bredere capsule
const BAR_GAP = 14;

/** Pad onder public/ waar de PNG-assets staan. */
const ASSET_BASE = "/assets/stage-bar";
const MAP_SRC = `${ASSET_BASE}/france-map.png`;

const BAR_SRC: Record<StageType | "gc", string> = {
  flat: `${ASSET_BASE}/bar-flat.png`,
  hilly: `${ASSET_BASE}/bar-hilly.png`,
  mountain: `${ASSET_BASE}/bar-mountain.png`,
  timetrial: `${ASSET_BASE}/bar-timetrial.png`,
  gc: `${ASSET_BASE}/bar-gc.png`,
};
const BADGE_SRC: Record<StageType | "gc", string> = {
  flat: `${ASSET_BASE}/badge-flat.png`,
  hilly: `${ASSET_BASE}/badge-hilly.png`,
  mountain: `${ASSET_BASE}/badge-mountain.png`,
  timetrial: `${ASSET_BASE}/badge-timetrial.png`,
  gc: `${ASSET_BASE}/badge-gc.png`,
};

const MOUNTAIN_TEXTURE = "#8E2A33";

const TYPE_LABEL: Record<StageType, string> = {
  flat: "Vlakke rit",
  hilly: "Heuvelachtig",
  mountain: "Bergrit",
  timetrial: "Tijdrit",
};
const BADGE_TINT: Record<StageType, string> = {
  flat: "#2E6A4F",
  hilly: "#C2691C",
  mountain: "#C0395B",
  timetrial: "#2E5E8C",
};

/* -------------------------------- types -------------------------------- */

export type Stage = {
  stageNumber: number;
  type: StageType;
  distanceKm: number;
  earnedPoints: number;
};

export type StageBarProps = {
  stages: Stage[];
  gcTotal: number;
  selectedStage: number | null;
  onSelectStage: (stageNumber: number) => void;
  title?: string;
  subtitle?: string;
  rangeLabel?: string;
};

/* ------------------------------ helpers -------------------------------- */

function heightForPoints(points: number, min: number, max: number): number {
  if (max === min) return (MIN_H + MAX_H) / 2;
  const t = (points - min) / (max - min);
  return Math.round(MIN_H + t * (MAX_H - MIN_H));
}

/* ------------------------------ Capsule -------------------------------- */

function Capsule({ type, heightPx }: { type: StageType | "gc"; heightPx: number }) {
  return (
    <div className="sb-capsule" style={{ height: heightPx }}>
      <div
        className="sb-capsule-img"
        style={{ backgroundImage: `url(${BAR_SRC[type]})` }}
      />
      {type === "mountain" && (
        <div className="sb-texture" style={{ color: MOUNTAIN_TEXTURE }}>
          <MountainTexture />
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Tooltip -------------------------------- */

function Tooltip({ stage }: { stage: Stage }) {
  return (
    <div className="sb-tooltip" role="status">
      <div className="sb-tip-row">
        <span style={{ color: BADGE_TINT[stage.type], display: "inline-flex" }}>
          <StageTypeIcon type={stage.type} size={15} />
        </span>
        <span>{TYPE_LABEL[stage.type]}</span>
      </div>
      <div className="sb-tip-row">
        <span style={{ color: "#9A8A74", display: "inline-flex" }}>
          <RouteIcon size={15} />
        </span>
        <span>{stage.distanceKm} km</span>
      </div>
      <div className="sb-tip-pts">{stage.earnedPoints} pt</div>
      <div className="sb-tip-pointer" />
    </div>
  );
}

/* ------------------------------ StageBar ------------------------------- */

export default function StageBar({
  stages,
  gcTotal,
  selectedStage,
  onSelectStage,
  title = "TUSSENSTAND SELECTEREN",
  subtitle = "Komende Tour de France",
  rangeLabel = "T/m rit 21 — Rome – Rome",
}: StageBarProps) {
  const pts = stages.map((s) => s.earnedPoints);
  const minP = pts.length ? Math.min(...pts) : 0;
  const maxP = pts.length ? Math.max(...pts) : 0;

  return (
    <div className="sb-panel">
      <Styles />
      {/* Map zit in eigen clip-container, panel zelf mag overflow:visible
          zodat tooltip-tekst niet meer afsnijdt. */}
      {MAP_SRC && (
        <div className="sb-map-clip" aria-hidden>
          <img className="sb-map" src={MAP_SRC} alt="" />
        </div>
      )}

      <div className="sb-header">
        <div className="sb-title">{title}</div>
        <div className="sb-subtitle">{subtitle}</div>
        <div className="sb-range">{rangeLabel}</div>
      </div>

      <div className="sb-row">
        <div className="sb-labels">
          <div className="sb-label-stage">STAGE</div>
          <div className="sb-label-points">EARNED&nbsp;POINTS</div>
        </div>

        <div className="sb-scroll">
          {stages.map((stage) => {
            const h = heightForPoints(stage.earnedPoints, minP, maxP);
            const isSel = stage.stageNumber === selectedStage;
            return (
              <button
                key={stage.stageNumber}
                className={`sb-col${isSel ? " sb-col--selected" : ""}`}
                onClick={() => onSelectStage(stage.stageNumber)}
                aria-pressed={isSel}
                aria-label={`Rit ${stage.stageNumber}, ${TYPE_LABEL[stage.type]}, ${stage.earnedPoints} punten`}
              >
                <div className="sb-bar-wrap" style={{ height: h }}>
                  {isSel && <Tooltip stage={stage} />}
                  <img className="sb-badge" src={BADGE_SRC[stage.type]} alt="" aria-hidden="true" />
                  <Capsule type={stage.type} heightPx={h} />
                </div>
                <div className="sb-num">{stage.stageNumber}</div>
                <div className="sb-pts">{stage.earnedPoints}</div>
              </button>
            );
          })}
        </div>

        <div className="sb-col sb-col--gc">
          <div className="sb-bar-wrap" style={{ height: MAX_H }}>
            <img className="sb-badge" src={BADGE_SRC.gc} alt="" aria-hidden="true" />
            <Capsule type="gc" heightPx={MAX_H} />
          </div>
          <div className="sb-num sb-num--gc">GC</div>
          <div className="sb-pts sb-pts--gc">{gcTotal}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- styles -------------------------------- */

function Styles() {
  return (
    <style>{`
.sb-panel {
  position: relative;
  background: #F4ECD8;
  border: 1.5px solid rgba(58,42,26,.65);
  border-radius: 18px;
  padding: 18px 20px 20px;
  /* overflow visible — anders snijdt de tooltip-tekst boven de balken af */
  color: #3A2A1A;
  font-family: inherit;
}
.sb-map-clip {
  position: absolute; inset: 0;
  border-radius: 18px;
  overflow: hidden;
  pointer-events: none;
}
.sb-map {
  position: absolute; top: -6px; right: -8px;
  width: 360px; max-width: 48%;
  opacity: .22;
  user-select: none;
}
.sb-header { position: relative; z-index: 1; margin-bottom: 8px; }
.sb-title { font-weight: 800; letter-spacing: .5px; font-size: 18px; }
.sb-subtitle { font-size: 15px; color: #5b4a37; margin-top: 1px; }
.sb-range { font-size: 12px; color: #9A8A74; margin-top: 2px; }

.sb-row {
  position: relative; z-index: 1;
  display: flex; align-items: flex-end; gap: 14px;
  padding-top: 56px;
}
.sb-labels {
  display: flex; flex-direction: column; justify-content: flex-end;
  text-align: right; flex: none; padding-bottom: 2px;
}
.sb-label-stage, .sb-label-points {
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: #9A8A74; line-height: 22px;
}
.sb-label-stage { margin-bottom: 4px; }

.sb-scroll {
  display: flex; align-items: flex-end; gap: ${BAR_GAP}px;
  overflow-x: auto; overflow-y: visible;
  padding: 56px 4px 0; margin-top: -56px;
  scrollbar-width: thin;
}
.sb-scroll::-webkit-scrollbar { height: 6px; }
.sb-scroll::-webkit-scrollbar-thumb { background: #d8c8a8; border-radius: 3px; }

.sb-col {
  display: flex; flex-direction: column; align-items: center;
  flex: none; background: none; border: none; padding: 0; cursor: pointer;
  font: inherit; color: inherit;
}
.sb-col--gc { margin-left: 8px; }

.sb-bar-wrap {
  position: relative; width: ${BAR_W}px;
  display: flex; align-items: flex-end; justify-content: center;
  border-radius: ${BAR_W}px;
  filter: drop-shadow(0 3px 5px rgba(58,42,26,.20));
  transition: box-shadow .18s ease;
}
.sb-col--gc .sb-bar-wrap { width: ${BAR_W + 6}px; }

.sb-capsule {
  width: 100%; position: relative;
  border-radius: ${BAR_W}px; overflow: hidden;
}
.sb-capsule-img {
  position: absolute; inset: 0;
  background-size: 100% 100%; background-repeat: no-repeat;
}
.sb-texture {
  position: absolute; left: 0; right: 0; bottom: 0;
  width: 100%; height: 55%; pointer-events: none;
}

.sb-badge {
  position: absolute; top: -19px; left: 50%; transform: translateX(-50%);
  width: 38px; height: 38px; z-index: 2;
  filter: drop-shadow(0 2px 3px rgba(58,42,26,.25));
}

.sb-num {
  margin-top: 10px; font-size: 13px; color: #9A8A74;
  border-bottom: 1px solid #d8c8a8; padding: 0 6px 2px; line-height: 22px;
}
.sb-pts { font-weight: 800; font-size: 17px; line-height: 22px; margin-top: 2px; }
.sb-num--gc, .sb-pts--gc { color: #B8860B; }
.sb-pts--gc { font-size: 18px; }

.sb-col--selected .sb-bar-wrap {
  box-shadow: 0 0 0 3px rgba(232,185,35,.55), 0 0 20px rgba(232,185,35,.5);
}

.sb-tooltip {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  margin-bottom: 26px;
  background: #FBF6E9; border: 1.5px solid rgba(58,42,26,.5); border-radius: 12px;
  padding: 10px 14px; min-width: 130px; white-space: nowrap;
  box-shadow: 0 6px 16px rgba(58,42,26,.22); z-index: 5;
}
.sb-tip-row { display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 4px; }
.sb-tip-pts { font-weight: 800; color: #B8860B; font-size: 15px; }
.sb-tip-pointer {
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  width: 12px; height: 12px; background: #FBF6E9;
  border-right: 1.5px solid rgba(58,42,26,.5); border-bottom: 1.5px solid rgba(58,42,26,.5);
  margin-top: -6px; rotate: 45deg;
}

@media (max-width: 640px) {
  .sb-title { font-size: 16px; }
  .sb-row { gap: 8px; }
}
    `}</style>
  );
}
