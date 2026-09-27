/**
 * Pelotonbalk — de Meermarathon is één game met twee pelotons: vrouwen en
 * mannen. Eén kader met de naam van de game erboven en twee helften eronder;
 * elke helft zegt in woorden wat jij daar hebt (je plek, je halve ploeg, of
 * de uitnodiging om ook mee te doen).
 *
 * Wisselen houdt je plek: het gekozen peloton gaat als ?game= in de URL en
 * tab en sectie blijven staan (Vrouwen › Uitslagen › Klassement → Mannen ›
 * Uitslagen › Klassement).
 */
import { Check, Plus, Snowflake } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import {
  isMeermarathonGame,
  meermarathonCategorieLabel,
  meermarathonSeasonKort,
  parseMeermarathonCategorie,
} from "@/lib/gameTypes";
import { pelotonRegel, vandaagIso, type PelotonRegel } from "@/lib/meermarathonSeizoen";

export type PelotonItem = {
  id: string;
  /** "Vrouwen" of "Mannen". */
  label: string;
  categorie: "vrouwen" | "mannen" | null;
  /**
   * - meedoen: ploeg ingediend.
   * - let-op: begonnen, nog niet af.
   * - uitnodiging: je doet hier (nog) niet mee en instappen kan.
   * - meekijken: je doet niet mee en instappen kan niet meer.
   */
  soort: PelotonRegel["soort"];
  /** "12e van 1.204", "Ploeg 3/5", "Doe ook mee", "Meekijken"; null zolang je stand laadt. */
  regel: string | null;
  /** Wedstrijddag: er wordt nu gereden, of de wedstrijd is vandaag. */
  moment?: PelotonRegel["moment"];
};

/** Verloop van een peloton; mannen (en een game zonder categorie) in marine. */
function verloop(categorie: PelotonItem["categorie"]): string {
  return categorie === "vrouwen"
    ? "linear-gradient(135deg, var(--mm-v), var(--mm-v2))"
    : "linear-gradient(135deg, var(--mm-m), var(--mm-m2))";
}

function Regel({ item, actief }: { item: PelotonItem; actief: boolean }) {
  // Zolang de stand laadt houdt een lege regel de hoogte vast: de balk plakt
  // mobiel bovenaan en mag niet verspringen.
  if (item.regel == null) {
    return (
      <span aria-hidden className="text-[12px] leading-tight">
        &nbsp;
      </span>
    );
  }
  const live = item.moment === "live";
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 text-[12px] leading-tight tabular-nums",
        actief
          ? "text-white/90"
          : item.soort === "let-op"
            ? "font-semibold text-[var(--mm-alert-fg)]"
            : item.soort === "uitnodiging"
              ? "font-semibold text-primary"
              : "text-muted-foreground",
      )}
    >
      {live && (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", actief ? "bg-white" : "bg-[var(--mm-hot)]")} />
      )}
      {item.soort === "uitnodiging" && <Plus aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />}
      <span className="truncate">
        {live ? "Live · " : item.moment === "vandaag" ? "Vandaag · " : ""}
        {item.regel}
      </span>
    </span>
  );
}

export function Pelotonbalk({
  seizoen,
  items,
  selectedId,
  onSelect,
  className,
}: {
  /** "’26-’27" */
  seizoen: string;
  items: PelotonItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      data-eigen-typografie
      aria-label={`Meermarathon ${seizoen}: kies vrouwen of mannen`}
      className={cn(
        "@container overflow-hidden rounded-xl border-2 border-foreground bg-card font-inter",
        "shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      <div className="flex flex-col @xl:flex-row">
        {/* De game: één naam boven (smal) of vóór (breed) de twee pelotons. */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b border-foreground/20 bg-secondary/70 px-3 py-1.5",
            "@xl:flex-col @xl:items-start @xl:justify-center @xl:gap-0.5 @xl:border-b-0 @xl:border-r @xl:px-4 @xl:py-2",
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Snowflake aria-hidden className="size-3.5 shrink-0 text-primary" strokeWidth={2} />
            <span className="truncate font-display text-[13px] font-bold @xl:text-[15px]">Meermarathon {seizoen}</span>
          </span>
          <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Eén game<span className="hidden @md:inline"> · vrouwen en mannen</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-1 divide-x divide-foreground/25">
          {items.map((item) => {
            const actief = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={actief ? "true" : undefined}
                className={cn(
                  "relative min-w-0 flex-1 px-2.5 pb-3 pt-2 outline-hidden transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  actief ? "text-white" : "text-foreground hover:bg-secondary/70",
                )}
                style={actief ? { background: verloop(item.categorie) } : undefined}
              >
                <span className="flex min-w-0 flex-col items-center gap-0.5">
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <span className="truncate font-display text-[15px] font-bold @xl:text-base">{item.label}</span>
                    {item.regel != null && item.soort === "meedoen" && (
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-full",
                          actief ? "bg-white/20 text-white" : "bg-primary/12 text-primary",
                        )}
                      >
                        <Check aria-hidden className="size-3" strokeWidth={3} />
                        <span className="sr-only">je doet mee</span>
                      </span>
                    )}
                  </span>
                  <Regel item={item} actief={actief} />
                </span>
                {actief && (
                  <span aria-hidden className="absolute bottom-1 left-1/2 h-[3px] w-[26px] -translate-x-1/2 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * De pelotonbalk met data: toont zich alleen als de gekozen game een
 * Meermarathon is en het seizoen twee pelotons heeft. Mobiel plakt hij onder
 * de masthead; op desktop staat hij gewoon in de flow.
 */
export default function MeermarathonPelotonbalk({ className }: { className?: string }) {
  const { selectedGame, setSelectedGameId } = useSelectedGame();
  const { seizoen, statussen } = useMeermarathonSeizoen();
  const [, setParams] = useSearchParams();

  if (!selectedGame || !isMeermarathonGame(selectedGame.game_type) || seizoen.length < 2) return null;

  const vandaag = vandaagIso();
  const items: PelotonItem[] = seizoen.map((g) => {
    const status = statussen.find((s) => s.game.id === g.id);
    // "Doe ook mee" alleen als je in een ánder peloton al een ploeg hebt.
    const ookElders = statussen.some((s) => s.game.id !== g.id && s.fase !== "niet-ingeschreven");
    const stand = status ? pelotonRegel(status, vandaag, ookElders) : null;
    return {
      id: g.id,
      label: meermarathonCategorieLabel(g.categorie) ?? g.name,
      categorie: parseMeermarathonCategorie(g.categorie),
      soort: stand?.soort ?? "meekijken",
      regel: stand?.regel ?? null,
      moment: stand?.moment ?? null,
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
      <Pelotonbalk
        seizoen={meermarathonSeasonKort(selectedGame.year)}
        items={items}
        selectedId={selectedGame.id}
        onSelect={kies}
      />
    </div>
  );
}
