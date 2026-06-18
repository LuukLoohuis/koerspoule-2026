/**
 * DaguitslagCelebration — feestelijk micro-moment wanneer de ingelogde gebruiker
 * zelf dagwinnaar (of podium) is in de daguitslag.
 *
 *  - 'win'    → stevige confetti-burst + retro-banner met een WISSELENDE
 *               Michel/José-quote ("Ritzege!").
 *  - 'podium' → klein confetti-pufje + rustigere banner ("Op het podium!").
 *
 * Confetti is een dependency-vrije DOM-burst in de retro-palette (tokens). De
 * banner is perkament/goud met inkt-border + harde offset-shadow, komt kort in
 * beeld (~3,5s) en fade't daarna weg. prefers-reduced-motion → GEEN confetti,
 * alleen de banner.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Celebration = { type: "win" | "podium"; rank: number };

/** Korte juich-/felicitatiezinnen in de Michel Wuyts / José De Cauwer-stem. */
const RITZEGE_QUOTES: { text: string; who: "Michel" | "José" }[] = [
  { text: "Handen in de lucht, wat een nummer!", who: "Michel" },
  { text: "Van A tot Z gecontroleerd — chapeau!", who: "José" },
  { text: "Vandaag stond er geen maat op.", who: "Michel" },
  { text: "Oe lala, dat is niet min hé!", who: "José" },
  { text: "Tiens Michel, die laat er geen twijfel over bestaan.", who: "José" },
  { text: "Dat is koers zoals het hoort — meesterlijk.", who: "Michel" },
  { text: "Da's tekenen bij het kruisje: ritzege!", who: "José" },
  { text: "Een nummer om in te kaderen.", who: "Michel" },
  { text: "Allez, díe doet de armen omhoog — verdiend!", who: "José" },
  { text: "Wat een demonstratie, kippenvel hé.", who: "Michel" },
  { text: "Hier is geen woord teveel aan: subliem.", who: "José" },
  { text: "Die rit, die zat in de benen én in het hoofd.", who: "Michel" },
];

function pickQuote() {
  return RITZEGE_QUOTES[Math.floor(Math.random() * RITZEGE_QUOTES.length)];
}

/** Dependency-vrije confetti-burst in de retro-palette. No-op bij reduced-motion. */
function fireConfetti(kind: "win" | "podium") {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const colors = [
    "hsl(var(--vintage-gold))",
    "hsl(var(--primary))",
    "hsl(var(--foreground))",
    "hsl(var(--accent))",
    "hsl(var(--card))",
  ];
  const count = kind === "win" ? 90 : 34;
  const spread = kind === "win" ? 1 : 0.55;

  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden";
  document.body.appendChild(root);

  const W = window.innerWidth;
  const H = window.innerHeight;
  const originX = W / 2;
  const originY = H * 0.34;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const size = 6 + Math.random() * 6;
    const color = colors[i % colors.length];
    const round = Math.random() > 0.5;
    p.style.cssText = `position:absolute;left:${originX}px;top:${originY}px;width:${size}px;height:${size * (round ? 1 : 0.6)}px;background:${color};border-radius:${round ? "9999px" : "1px"};will-change:transform,opacity`;
    root.appendChild(p);

    const angle = (Math.random() - 0.5) * Math.PI * 2 * spread - Math.PI / 2;
    const power = 120 + Math.random() * (kind === "win" ? 240 : 120);
    const dx = Math.cos(angle) * power + (Math.random() - 0.5) * 60;
    const upY = Math.sin(angle) * power;
    const fallY = H * 0.5 + Math.random() * H * 0.4;
    const rot = (Math.random() - 0.5) * 1080;
    const duration = 1100 + Math.random() * 1100;

    p.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx * 0.6}px, ${upY}px) rotate(${rot * 0.4}deg)`,
          opacity: 1,
          offset: 0.3,
        },
        {
          transform: `translate(${dx}px, ${fallY}px) rotate(${rot}deg)`,
          opacity: 0,
        },
      ],
      { duration, easing: "cubic-bezier(0.2,0.6,0.3,1)", fill: "forwards" },
    );
  }

  window.setTimeout(() => root.remove(), 2600);
}

export default function DaguitslagCelebration({
  celebration,
  onClose,
}: {
  celebration: Celebration | null;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  // Eén quote per ritzege; vast tijdens de hele weergave.
  const [quote, setQuote] = useState(pickQuote);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!celebration) {
      setShown(false);
      return;
    }
    if (celebration.type === "win") setQuote(pickQuote());
    fireConfetti(celebration.type);
    const raf = requestAnimationFrame(() => setShown(true));
    const tHide = window.setTimeout(() => setShown(false), 3300);
    const tDone = window.setTimeout(() => onCloseRef.current(), 3850);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(tHide);
      window.clearTimeout(tDone);
    };
  }, [celebration]);

  if (!celebration) return null;
  const isWin = celebration.type === "win";
  const medal = celebration.rank === 2 ? "🥈" : "🥉";

  return (
    <div
      className="fixed inset-x-0 top-[14%] z-[60] flex justify-center px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border-2 border-foreground bg-card text-foreground overflow-hidden",
          "shadow-[4px_4px_0_hsl(var(--foreground))] motion-safe:transition-all motion-safe:duration-500",
          shown ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        )}
      >
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="px-4 py-3 text-center">
          {isWin ? (
            <>
              <div className="text-2xl leading-none mb-1">🏆</div>
              <div className="font-display font-bold text-base leading-tight">
                Ritzege! Jij was vandaag de snelste
              </div>
              <p className="mt-1.5 font-serif italic text-sm text-muted-foreground">
                “{quote.text}”
              </p>
              <p className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                — {quote.who}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl leading-none mb-1">{medal}</div>
              <div className="font-display font-bold text-base leading-tight">
                Op het podium!
              </div>
              <p className="mt-1 font-serif italic text-sm text-muted-foreground">
                Je werd {celebration.rank}e vandaag.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
