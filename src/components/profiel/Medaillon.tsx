/**
 * Medaillon — het emaille-rondje (vintage-medal) in goud, zilver of brons
 * voor een podiumplaats. Grootte en lettergrootte geeft de aanroeper mee;
 * zonder inhoud is het een sierdot (dan aria-hidden meegeven).
 */
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Rang = 1 | 2 | 3;
type MedalStijl = CSSProperties & { "--medal-rim"?: string; "--medal-fill"?: string };

const TONEN: Record<Rang, { stijl: MedalStijl; inkt: string }> = {
  1: { stijl: {}, inkt: "text-[#2a190b]" },
  2: { stijl: { "--medal-rim": "var(--medal-silver)", "--medal-fill": "var(--medal-silver)" }, inkt: "text-[#2a190b]" },
  3: { stijl: { "--medal-rim": "var(--medal-bronze)", "--medal-fill": "var(--medal-bronze)" }, inkt: "text-white" },
};

export default function Medaillon({
  rang,
  className,
  children,
  "aria-hidden": ariaHidden,
}: {
  rang: Rang;
  className?: string;
  children?: ReactNode;
  "aria-hidden"?: boolean;
}) {
  const toon = TONEN[rang];
  return (
    <span
      aria-hidden={ariaHidden}
      className={cn("vintage-medal inline-grid shrink-0 place-items-center rounded-full font-oswald font-bold leading-none", toon.inkt, className)}
      style={toon.stijl}
    >
      {children}
    </span>
  );
}
