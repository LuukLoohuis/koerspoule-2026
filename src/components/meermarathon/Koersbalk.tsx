/**
 * Koersbalk — de schakelaar tussen Meermarathon Vrouwen en Mannen.
 *
 * Zelfde vorm als de GameSwitcher (2px inktrand, 3px harde schaduw, segmenten
 * met een haarlijn ertussen), maar met twee vaste helften. Het actieve segment
 * draagt het verloop van zijn categorie en een wit streepje ("je bent hier").
 * De naam staat er altijd als tekst: kleur is nooit de enige drager.
 *
 * Wisselen houdt je plek: de gekozen game gaat als ?game= in de URL en tab en
 * sectie blijven staan (Vrouwen › Uitslagen › Klassement → Mannen › Uitslagen
 * › Klassement).
 */
import { Snowflake } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { isMeermarathonGame, meermarathonCategorieLabel, parseMeermarathonCategorie } from "@/lib/gameTypes";
import { koersbalkPil, vandaagIso, type KoersbalkPil } from "@/lib/meermarathonSeizoen";

export type KoersbalkItem = {
  id: string;
  /** "Vrouwen" of "Mannen". */
  label: string;
  categorie: "vrouwen" | "mannen" | null;
  /** Seizoen kort: "26/27". */
  seizoen: string;
  pil?: KoersbalkPil | null;
};

export function seizoenSlash(startYear: number): string {
  const kort = (j: number) => String(j % 100).padStart(2, "0");
  return `${kort(startYear)}/${kort(startYear + 1)}`;
}

/** Verloop van een categorie; mannen (en een game zonder categorie) in marine. */
function verloop(categorie: KoersbalkItem["categorie"]): string {
  return categorie === "vrouwen"
    ? "linear-gradient(135deg, var(--mm-v), var(--mm-v2))"
    : "linear-gradient(135deg, var(--mm-m), var(--mm-m2))";
}

function Pil({ pil, actief }: { pil: KoersbalkPil; actief: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 leading-none",
        "text-[9.5px] font-bold uppercase tracking-[0.08em] whitespace-nowrap",
        actief
          ? "border-white/60 text-white bg-white/10"
          : pil.soort === "let-op"
            ? "border-[var(--mm-alert-line)] bg-[var(--mm-alert-bg)] text-[var(--mm-alert-fg)]"
            : pil.soort === "live"
              ? "border-[var(--mm-hot)] text-[var(--mm-hot)]"
              : pil.soort === "open"
                ? "border-primary/40 text-primary"
                : "border-foreground/20 bg-secondary text-muted-foreground",
      )}
    >
      {pil.soort === "live" && (
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", actief ? "bg-white" : "bg-[var(--mm-hot)]")} />
      )}
      {pil.tekst}
    </span>
  );
}

export function Koersbalk({
  items,
  selectedId,
  onSelect,
  className,
}: {
  items: KoersbalkItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      data-eigen-typografie
      aria-label="Meermarathon: kies Vrouwen of Mannen"
      className={cn(
        "flex overflow-hidden rounded-xl border-2 border-foreground bg-card",
        "shadow-[3px_3px_0_hsl(var(--foreground))] divide-x divide-foreground/25",
        className,
      )}
    >
      {items.map((item) => {
        const actief = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={actief ? "true" : undefined}
            className={cn(
              "relative flex-1 min-w-0 px-2 pt-3 pb-3.5 outline-hidden transition-colors",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              actief ? "text-white" : "text-foreground hover:bg-secondary/70",
            )}
            style={actief ? { background: verloop(item.categorie) } : undefined}
          >
            <span className="flex flex-col items-center gap-1.5 min-w-0">
              <span className="flex items-center gap-2 min-w-0 max-w-full">
                <span
                  aria-hidden
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                    actief ? "bg-white/15 text-white" : "bg-[var(--mm-chip)]",
                  )}
                  style={actief ? undefined : { color: item.categorie === "vrouwen" ? "var(--mm-v)" : "var(--mm-m)" }}
                >
                  <Snowflake className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="font-display text-[14px] md:text-[15px] font-bold truncate">
                  {item.label} {item.seizoen}
                </span>
              </span>
              {item.pil && <Pil pil={item.pil} actief={actief} />}
            </span>
            {actief && (
              <span aria-hidden className="absolute bottom-1.5 left-1/2 h-[3px] w-[26px] -translate-x-1/2 rounded-full bg-white" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * De koersbalk met data: toont zich alleen als de gekozen game een
 * Meermarathon is en het seizoen er twee heeft. Mobiel plakt hij onder de
 * masthead; op desktop staat hij gewoon in de flow.
 */
export default function MeermarathonKoersbalk({ className }: { className?: string }) {
  const { selectedGame, setSelectedGameId } = useSelectedGame();
  const { seizoen, statussen } = useMeermarathonSeizoen();
  const [, setParams] = useSearchParams();

  if (!selectedGame || !isMeermarathonGame(selectedGame.game_type) || seizoen.length < 2) return null;

  const vandaag = vandaagIso();
  const items: KoersbalkItem[] = seizoen.map((g) => {
    const status = statussen.find((s) => s.game.id === g.id);
    return {
      id: g.id,
      label: meermarathonCategorieLabel(g.categorie) ?? g.name,
      categorie: parseMeermarathonCategorie(g.categorie),
      seizoen: seizoenSlash(g.year),
      pil: status ? koersbalkPil(status, vandaag) : null,
    };
  });

  const kies = (id: string) => {
    setSelectedGameId(id);
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("game", id);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div
      className={cn(
        // Mobiel: plakt onder de masthead, met papier erachter zodat scrollende
        // inhoud niet door de marges heen schemert. De marge volgt .container,
        // die onder md hard op 0.75rem staat (index.css).
        "sticky top-0 z-30 -mx-3 px-3 pt-2 pb-3 bg-background md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 md:bg-transparent",
        className,
      )}
    >
      <Koersbalk items={items} selectedId={selectedGame.id} onSelect={kies} />
    </div>
  );
}
