import { Lock } from "lucide-react";

/**
 * Preview-schil voor gewone gebruikers in de sneak preview ('open'): de echte,
 * gevulde inhoud (uitslagen/ranking/klassement/commentaar) is nog niet zichtbaar.
 * Admins krijgen deze NIET te zien — die zien de echte data (zie maySeeLiveContent).
 */
export default function SneakPreviewLock({
  title = "Binnenkort zichtbaar",
  note = "Deze koers staat in de sneak preview. Zodra de inschrijving opengaat, verschijnen hier de echte standen, uitslagen en commentaar.",
}: {
  title?: string;
  note?: string;
}) {
  return (
    <div className="retro-border bg-card p-8 text-center space-y-3">
      <div className="vintage-ornament max-w-[12rem] mx-auto">
        <span className="vintage-ornament-symbol">✦</span>
        <Lock className="h-6 w-6 text-[hsl(var(--vintage-gold))]" />
        <span className="vintage-ornament-symbol">✦</span>
      </div>
      <p className="font-display font-bold text-xl">{title}</p>
      <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">{note}</p>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">Sneak preview</p>
    </div>
  );
}
