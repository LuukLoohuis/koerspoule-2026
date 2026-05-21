import { useState } from "react";
import { Mic, ChevronDown, ChevronUp } from "lucide-react";
import { useStageCommentary, type StageCommentary } from "@/hooks/useStageCommentary";
import { cn } from "@/lib/utils";

/**
 * Toont het Wuyts/De Cauwer-commentaar voor deze subpoule, boven de chat.
 * Nieuwste etappe altijd zichtbaar; oudere etappes inklapbaar.
 */
export default function KoerscommentaarBanner({ subpouleId }: { subpouleId: string | undefined }) {
  const { data: commentaren = [], isLoading } = useStageCommentary(subpouleId);
  const [expanded, setExpanded] = useState(false);

  if (!subpouleId || isLoading || commentaren.length === 0) return null;

  const [latest, ...older] = commentaren;

  return (
    <div className="border-b-2 border-foreground/15 bg-gradient-to-b from-[hsl(var(--vintage-gold))/0.08] to-background px-3 py-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Mic className="h-4 w-4 text-[hsl(var(--vintage-gold))] shrink-0" />
          <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground truncate">
            Koerscommentaar — Etappe {latest.stage_number}
            {latest.stage_name ? ` · ${latest.stage_name}` : ""}
          </span>
        </div>
        {older.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="flex items-center gap-1 text-[10px] font-display uppercase tracking-widest text-muted-foreground hover:text-foreground shrink-0"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Inklappen
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> + {older.length} eerder
              </>
            )}
          </button>
        )}
      </div>

      {/* Nieuwste commentaar */}
      <CommentaarPaar c={latest} highlighted />

      {/* Geschiedenis */}
      {expanded && older.length > 0 && (
        <div className="pt-2 mt-1 border-t border-foreground/10 space-y-3">
          {older.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="vintage-ornament">
                <span className="vintage-ornament-symbol">✦</span>
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Etappe {c.stage_number}
                  {c.stage_name ? ` · ${c.stage_name}` : ""}
                </span>
                <span className="vintage-ornament-symbol">✦</span>
              </div>
              <CommentaarPaar c={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentaarPaar({ c, highlighted = false }: { c: StageCommentary; highlighted?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <CommentaarBubble
        speaker="Michel Wuyts"
        text={c.michel_tekst}
        accent="primary"
        highlighted={highlighted}
      />
      <CommentaarBubble
        speaker="José De Cauwer"
        text={c.jose_tekst}
        accent="gold"
        highlighted={highlighted}
      />
    </div>
  );
}

function CommentaarBubble({
  speaker,
  text,
  accent,
  highlighted,
}: {
  speaker: string;
  text: string;
  accent: "primary" | "gold";
  highlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2.5 md:p-3 relative",
        accent === "primary"
          ? "border-primary/30"
          : "border-[hsl(var(--vintage-gold))/0.6]",
        highlighted && "shadow-[2px_2px_0_hsl(var(--foreground)/0.15)]",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Mic
          className={cn(
            "h-3 w-3 shrink-0",
            accent === "primary" ? "text-primary" : "text-[hsl(var(--vintage-gold))]",
          )}
        />
        <span
          className={cn(
            "font-display text-[10px] uppercase tracking-[0.2em] font-bold",
            accent === "primary" ? "text-primary" : "text-[hsl(var(--vintage-gold))]",
          )}
        >
          {speaker}
        </span>
      </div>
      <p className="font-serif italic text-sm leading-snug text-foreground/90">{text}</p>
    </div>
  );
}
