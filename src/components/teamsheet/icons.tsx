/**
 * Categorie-icoon badges — circulair, in categorie-kleur.
 * Lucide-iconen i.p.v. emoji's voor scherpe, consistente look.
 */

import type { LucideIcon } from "lucide-react";
import { Flag, Mountain, Timer, Swords, Sparkles, Star, Crown, Skull, Bike } from "lucide-react";
import { categoryTone, type RiderCategory } from "./tokens";

const ICON_MAP: Record<RiderCategory, LucideIcon> = {
  ALIEN:    Crown,
  GC:       Crown,
  SPRINT:   Flag,
  KLIM:     Mountain,
  TIJDRIT:  Timer,
  AANVAL:   Swords,
  PUNCH:    Star,
  KLASSIEK: Sparkles,
  TALENT:   Star,
  OUD:      Bike,
  JOKER:    Sparkles,
  OVERIG:   Bike,
};

type Props = {
  category: RiderCategory;
  size?: number;
  className?: string;
};

/** Cirkelvormige badge met categorie-icoon in eigen accentkleur. */
export default function CategoryBadgeIcon({ category, size = 28, className }: Props) {
  const Icon = ICON_MAP[category] ?? Bike;
  const tone = categoryTone(category);
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "9999px",
        background: tone.jersey,
        color: "#fff",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.25), 0 1px 0 rgba(58,42,26,0.25)",
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.55)} strokeWidth={2.5} />
    </span>
  );
}

export { Skull };
