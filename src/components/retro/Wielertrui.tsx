import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import wielershirt from "@/assets/wielershirt.png";

/**
 * De wielertrui van de handoff Krant C / Ploeg C.
 *
 * Twee gedaanten. Met `src` is het de echte ploegtrui uit de startlijst
 * (`teams.jersey_url`). Zonder `src` is het de blanco trui, ingekleurd met
 * `kleur`: een gekleurd vlak met de PNG als masker, en daaroverheen dezelfde
 * PNG in multiply zodat de plooien en naden erin blijven. Zo kleurt één
 * afbeelding mee met het thema (primary, de bergtrui, wit) zonder per kleur
 * een export.
 *
 * Wat op de borst staat (een cijfer, een aantal) komt via `children`.
 */
export default function Wielertrui({
  src,
  kleur = "hsl(var(--primary))",
  bolletjes,
  breedte,
  hoogte,
  schaduw = 1.5,
  alt = "",
  className,
  children,
}: {
  /** Echte trui; wint van `kleur`. */
  src?: string | null;
  /** CSS-kleur voor de blanco trui. */
  kleur?: string;
  /** Kleur van de bolletjes (bergtrui Tour/Vuelta); zonder = effen. */
  bolletjes?: string | null;
  breedte: number;
  hoogte: number;
  /** Harde offset-schaduw in px; 0 = geen. */
  schaduw?: number;
  alt?: string;
  className?: string;
  children?: ReactNode;
}) {
  const maat: CSSProperties = { width: breedte, height: hoogte };
  const filter = schaduw > 0 ? `drop-shadow(${schaduw}px ${schaduw}px 0 hsl(var(--foreground)))` : undefined;

  if (src) {
    return (
      <span className={cn("relative block shrink-0", className)} style={{ ...maat, filter }}>
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
        {children}
      </span>
    );
  }

  // Bolletjes: witte trui met stippen, zoals de utility .trui-bolletjes maar
  // dan als vulling onder het masker.
  const vulling: CSSProperties = bolletjes
    ? {
        backgroundColor: kleur,
        backgroundImage: `radial-gradient(circle, ${bolletjes} 30%, transparent 31%)`,
        backgroundSize: `${Math.max(8, Math.round(breedte / 6))}px ${Math.max(8, Math.round(breedte / 6))}px`,
      }
    : { background: kleur };

  const masker: CSSProperties = {
    WebkitMaskImage: `url(${wielershirt})`,
    maskImage: `url(${wielershirt})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };

  return (
    <span className={cn("relative block shrink-0", className)} style={{ ...maat, filter }} role={alt ? "img" : undefined} aria-label={alt || undefined}>
      <span aria-hidden className="absolute inset-0" style={{ ...vulling, ...masker }} />
      <img
        src={wielershirt}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain mix-blend-multiply"
        draggable={false}
      />
      {children}
    </span>
  );
}

/** Tekst midden op de borst; `top` als aandeel van de hoogte. */
export function TruiBorst({ children, top = 0.37, className }: { children: ReactNode; top?: number; className?: string }) {
  return (
    <span
      className={cn("absolute inset-x-[14%] flex justify-center leading-none", className)}
      style={{ top: `${Math.round(top * 100)}%` }}
    >
      {children}
    </span>
  );
}
