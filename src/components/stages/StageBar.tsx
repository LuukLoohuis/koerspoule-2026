// StageBar.tsx
// Stage-selector / standings bar voor de Koerspoule "Uitslagen"-tab.
//
// Gebruikt PNG-assets onder ASSET_BASE (public/assets/stage-bar/) voor staven,
// badges en de Frankrijk-kaart. Tooltip-iconen via ./StageIcons.

import * as React from "react";
import { StageTypeIcon, RouteIcon, type StageType } from "./StageIcons";

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
  /** Klik op de GC-kolom (eindklassement). Optioneel. */
  onSelectGc?: () => void;
  /** True als GC momenteel het geselecteerde "klassement" is. */
  gcSelected?: boolean;
  title?: string;
  subtitle?: string;
  rangeLabel?: string;
};

/* ------------------------------ helpers -------------------------------- */

function heightForValue(value: number, min: number, max: number): number {
  if (max === min) return (MIN_H + MAX_H) / 2;
  const t = (value - min) / (max - min);
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
  onSelectGc,
  gcSelected = false,
  title = "TUSSENSTAND SELECTEREN",
  subtitle = "Komende Tour de France",
  rangeLabel = "T/m rit 21 — Rome – Rome",
}: StageBarProps) {
  // Hoogte schaalt met de afstand (admin-input via Etappes-tab). Hoe meer km,
  // hoe langer de capsule. Punten blijven onder de balk staan als label.
  const kms = stages.map((s) => s.distanceKm);
  const minKm = kms.length ? Math.min(...kms) : 0;
  const maxKm = kms.length ? Math.max(...kms) : 0;

  // Mobiel: scroll geselecteerde bar centraal in beeld zodra selectie wijzigt.
  // Op desktop is dit een no-op (alles past, scroll = visible).
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!scrollRef.current || selectedStage == null) return;
    const target = scrollRef.current.querySelector<HTMLElement>(
      `[data-stage="${selectedStage}"]`,
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedStage]);

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

        <div className="sb-scroll" ref={scrollRef}>
          {stages.map((stage) => {
            const h = heightForValue(stage.distanceKm, minKm, maxKm);
            const isSel = stage.stageNumber === selectedStage;
            return (
              <button
                key={stage.stageNumber}
                data-stage={stage.stageNumber}
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

        <button
          type="button"
          className={`sb-col sb-col--gc${gcSelected ? " sb-col--selected" : ""}`}
          onClick={() => onSelectGc?.()}
          aria-pressed={gcSelected}
          aria-label={`Eindklassement, ${gcTotal} punten`}
          disabled={!onSelectGc}
          style={onSelectGc ? undefined : { cursor: "default" }}
        >
          <div className="sb-bar-wrap" style={{ height: MAX_H }}>
            <img className="sb-badge" src={BADGE_SRC.gc} alt="" aria-hidden="true" />
            <Capsule type="gc" heightPx={MAX_H} />
          </div>
          <div className="sb-num sb-num--gc">GC</div>
          <div className="sb-pts sb-pts--gc">{gcTotal}</div>
        </button>
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
  padding: 12px 18px 14px;
  /* overflow visible — anders snijdt de tooltip-tekst boven de balken af */
  color: #3A2A1A;
  font-family: inherit;
}
.sb-map-clip {
  position: absolute; inset: 0;
  /* Geen overflow:hidden meer — kaart mag rustig buiten het paneel
     vallen voor een nonchalanter affiche-gevoel. */
  pointer-events: none;
}
.sb-map {
  position: absolute; top: -6px; right: -8px;
  width: 360px; max-width: 48%;
  opacity: .22;
  user-select: none;
}
.sb-header { position: relative; z-index: 1; margin-bottom: 4px; }
.sb-title { font-weight: 800; letter-spacing: .5px; font-size: 17px; line-height: 1.15; }
.sb-subtitle { font-size: 14px; color: #5b4a37; margin-top: 0; line-height: 1.2; }
.sb-range { font-size: 12px; color: #9A8A74; margin-top: 1px; line-height: 1.2; }

.sb-row {
  position: relative; z-index: 1;
  display: flex; align-items: flex-end; gap: 14px;
  padding-top: 4px;
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
  flex: 1 1 0; min-width: 0;
  display: flex; align-items: flex-end; gap: 4px;
  overflow-y: visible;
  padding: 0 4px;
}

.sb-col {
  display: flex; flex-direction: column; align-items: center;
  flex: 1 1 0; min-width: 0;
  background: none; border: none; padding: 0; cursor: pointer;
  font: inherit; color: inherit;
}
.sb-col--gc { margin-left: 10px; flex: 0 0 auto; }

.sb-bar-wrap {
  position: relative; width: 100%; max-width: ${BAR_W}px; min-width: 24px;
  display: flex; align-items: flex-end; justify-content: center;
  border-radius: ${BAR_W}px;
  filter: drop-shadow(0 3px 5px rgba(58,42,26,.20));
  transition: box-shadow .18s ease;
}
.sb-col--gc .sb-bar-wrap { width: ${BAR_W + 4}px; max-width: none; }

.sb-capsule {
  width: 100%; position: relative;
  border-radius: ${BAR_W}px; overflow: hidden;
}
.sb-capsule-img {
  position: absolute; inset: 0;
  background-size: 100% 100%; background-repeat: no-repeat;
}
.sb-badge {
  position: absolute; top: -19px; left: 50%; transform: translateX(-50%);
  width: 38px; height: 38px; z-index: 2;
  filter: drop-shadow(0 2px 3px rgba(58,42,26,.25));
}

.sb-num {
  margin-top: 6px; font-size: 12px; color: #9A8A74;
  border-bottom: 1px solid #d8c8a8; padding: 0 6px 1px; line-height: 18px;
}
.sb-pts { font-weight: 800; font-size: 16px; line-height: 20px; margin-top: 1px; }
.sb-num--gc, .sb-pts--gc { color: #B8860B; }
.sb-pts--gc { font-size: 18px; }

.sb-col--selected .sb-bar-wrap {
  box-shadow: 0 0 0 3px rgba(232,185,35,.55), 0 0 20px rgba(232,185,35,.5);
}

.sb-tooltip {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  margin-bottom: 26px;
  background: #FBF6E9; border: 1.5px solid rgba(58,42,26,.5); border-radius: 12px;
  padding: 10px 14px; min-width: 150px; white-space: nowrap;
  box-shadow: 0 6px 16px rgba(58,42,26,.22); z-index: 50;
  color: #3A2A1A;
}
.sb-tip-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; margin-bottom: 4px; color: #3A2A1A; font-weight: 600;
}
.sb-tip-pts { font-weight: 800; color: #B8860B; font-size: 15px; }
.sb-tip-pointer {
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  width: 12px; height: 12px; background: #FBF6E9;
  border-right: 1.5px solid rgba(58,42,26,.5); border-bottom: 1.5px solid rgba(58,42,26,.5);
  margin-top: -6px; rotate: 45deg;
}

/* ------------------------------- mobile -------------------------------- */
/* 22 ritten + GC + labels passen niet zinvol op een telefoon. Strategie:
   - labels-kolom verbergen (de bars praten zelf)
   - horizontaal scrollen met scroll-snap zodat één bar mooi vastklikt
   - cols een vinger-vriendelijke vaste breedte geven (36px)
   - badges/labels/tooltip + panel-padding krimpen
   - France-map dimmer, blijft sfeer
*/
@media (max-width: 640px) {
  .sb-panel { padding: 10px 10px 12px; border-radius: 14px; }
  .sb-title { font-size: 14px; letter-spacing: .4px; line-height: 1.15; }
  .sb-subtitle { font-size: 12px; line-height: 1.2; }
  .sb-range { font-size: 10.5px; line-height: 1.2; }
  .sb-header { margin-bottom: 2px; }
  .sb-map { width: 220px; max-width: 55%; opacity: .14; }

  .sb-row { gap: 8px; padding-top: 2px; }
  .sb-labels { display: none; }

  .sb-scroll {
    gap: 8px;
    overflow-x: auto; overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 12px;
    padding: 0 6px 6px;
    /* iOS-scrollbar visueel uitzetten, content blijft pannable */
    scrollbar-width: none;
  }
  .sb-scroll::-webkit-scrollbar { display: none; }

  .sb-col {
    flex: 0 0 36px;            /* vaste vinger-target */
    scroll-snap-align: center;
  }
  .sb-col--gc { flex: 0 0 44px; margin-left: 8px; }

  .sb-bar-wrap { max-width: 36px; min-width: 0; }
  .sb-col--gc .sb-bar-wrap { width: 44px; }

  .sb-badge {
    width: 26px; height: 26px; top: -13px;
  }

  .sb-num {
    font-size: 11px; line-height: 16px;
    margin-top: 4px; padding: 0 4px 1px;
  }
  .sb-pts { font-size: 13px; line-height: 16px; margin-top: 0; }
  .sb-pts--gc { font-size: 14px; }

  /* Tooltip: smaller, mag wrappen, blijft binnen viewport */
  .sb-tooltip {
    min-width: 0;
    width: max-content;
    max-width: 70vw;
    white-space: normal;
    padding: 8px 12px;
    margin-bottom: 18px;
    font-size: 12px;
  }
  .sb-tip-row { font-size: 12px; gap: 6px; margin-bottom: 2px; }
  .sb-tip-pts { font-size: 13px; }

  /* Selectie-glow iets subtieler op mobiel */
  .sb-col--selected .sb-bar-wrap {
    box-shadow: 0 0 0 2px rgba(232,185,35,.6), 0 0 14px rgba(232,185,35,.45);
  }
}
    `}</style>
  );
}
