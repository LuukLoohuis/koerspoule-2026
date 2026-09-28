/**
 * Pelotonbalk — de Meermarathon is één game met twee pelotons: vrouwen en
 * mannen. Eén kader met de naam van de game erboven en twee helften eronder;
 * elke helft zegt in woorden wat jij daar hebt (je plek, je halve ploeg, of
 * de uitnodiging om ook mee te doen).
 *
 * Wisselen houdt je plek: het gekozen peloton gaat als ?game= in de URL en
 * tab en sectie blijven staan (Vrouwen › Uitslagen › Klassement → Mannen ›
 * Uitslagen › Klassement).
 *
 * Bij de uitslagen komt er een derde knop bij: Totaal, de punten van beide
 * pelotons opgeteld (?klassement=totaal). Een ploeg bouw je per peloton, dus
 * elders blijft het bij twee.
 */
import type { ReactNode } from "react";
import { Check, Plus, Snowflake, Trophy } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { useAuth } from "@/hooks/useAuth";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { useMeermarathonTotaal } from "@/hooks/useMeermarathonTotaal";
import {
  isMeermarathonGame,
  MEERMARATHON_CATEGORIEEN,
  meermarathonCategorieLabel,
  meermarathonCategorieRang,
  meermarathonSeasonKort,
  parseMeermarathonCategorie,
} from "@/lib/gameTypes";
import { pelotonRegel, vandaagIso, type PelotonRegel } from "@/lib/meermarathonSeizoen";
import { totaalRegel } from "@/lib/meermarathonTotaal";

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
   * - volgt: dit peloton is er nog niet; niets te kiezen.
   */
  soort: PelotonRegel["soort"] | "volgt";
  /** "12e van 1.204", "Ploeg 3/5", "Doe ook mee", "Meekijken"; null zolang je stand laadt. */
  regel: string | null;
  /** Wedstrijddag: er wordt nu gereden, of de wedstrijd is vandaag. */
  moment?: PelotonRegel["moment"];
};

/** De knop Totaal: beide pelotons opgeteld. */
export type TotaalKnop = {
  /** "8e van 2.001" of "Meekijken"; null zolang de stand laadt. */
  regel: string | null;
  gekozen: boolean;
  onSelect: () => void;
};

/** Verloop van een peloton; mannen (en een game zonder categorie) in marine. */
function verloop(categorie: PelotonItem["categorie"]): string {
  return categorie === "vrouwen"
    ? "linear-gradient(135deg, var(--mm-v), var(--mm-v2))"
    : "linear-gradient(135deg, var(--mm-m), var(--mm-m2))";
}

/** Het totaal: de kleur van de vrouwen loopt over in die van de mannen. */
const TOTAAL_VERLOOP = "linear-gradient(90deg, var(--mm-v), var(--mm-m))";

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
              : item.soort === "volgt"
                ? "italic text-muted-foreground"
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

/** Onderstreepje onder de gekozen knop. */
function Streep() {
  return <span aria-hidden className="absolute bottom-1 left-1/2 h-[3px] w-[26px] -translate-x-1/2 rounded-full bg-white" />;
}

const KNOP = cn(
  "relative min-w-0 flex-1 px-2.5 pb-3 pt-2 outline-hidden transition-colors",
  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
);

export function Pelotonbalk({
  seizoen,
  items,
  selectedId,
  onSelect,
  totaal,
  className,
}: {
  /** "’26-’27" */
  seizoen: string;
  items: PelotonItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Alleen bij de uitslagen: de derde knop, beide pelotons opgeteld. */
  totaal?: TotaalKnop;
  className?: string;
}) {
  return (
    <nav
      data-eigen-typografie
      aria-label={`Meermarathon ${seizoen}: kies vrouwen of mannen${totaal ? " of het totaal" : ""}`}
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
            if (item.soort === "volgt") {
              return (
                <div
                  key={item.id}
                  aria-disabled="true"
                  className="relative min-w-0 flex-1 bg-secondary/40 px-2.5 pb-3 pt-2 text-muted-foreground"
                >
                  <span className="flex min-w-0 flex-col items-center gap-0.5">
                    <span className="truncate font-display text-[15px] font-bold opacity-70 @xl:text-base">{item.label}</span>
                    <Regel item={item} actief={false} />
                  </span>
                </div>
              );
            }
            const actief = !totaal?.gekozen && item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={actief ? "true" : undefined}
                className={cn(KNOP, actief ? "text-white" : "text-foreground hover:bg-secondary/70")}
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
                {actief && <Streep />}
              </button>
            );
          })}
          {totaal && (
            <button
              type="button"
              onClick={totaal.onSelect}
              aria-current={totaal.gekozen ? "true" : undefined}
              className={cn(KNOP, totaal.gekozen ? "text-white" : "text-foreground hover:bg-secondary/70")}
              style={totaal.gekozen ? { background: TOTAAL_VERLOOP } : undefined}
            >
              <span className="flex min-w-0 flex-col items-center gap-0.5">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Trophy
                    aria-hidden
                    className={cn("size-3.5 shrink-0", totaal.gekozen ? "text-white" : "text-[var(--mm-s-totaal)]")}
                    strokeWidth={2.25}
                  />
                  <span className="truncate font-display text-[15px] font-bold @xl:text-base">Totaal</span>
                  <span className="sr-only">: vrouwen en mannen opgeteld</span>
                </span>
                <Regel
                  item={{ id: "totaal", label: "Totaal", categorie: null, soort: "meekijken", regel: totaal.regel }}
                  actief={totaal.gekozen}
                />
              </span>
              {totaal.gekozen && <Streep />}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

/** Haalt de stand in het totaal op; alleen waar de knop Totaal staat. */
function MetTotaal({
  gekozen,
  onSelect,
  children,
}: {
  gekozen: boolean;
  onSelect: () => void;
  children: (knop: TotaalKnop) => ReactNode;
}) {
  const { user } = useAuth();
  const { rijen, isLoading } = useMeermarathonTotaal();
  const regel = isLoading ? null : totaalRegel(rijen, user?.id) ?? "Meekijken";
  return <>{children({ regel, gekozen, onSelect })}</>;
}

/**
 * De pelotonbalk met data: toont zich alleen als de gekozen game een
 * Meermarathon is. Is een peloton er nog niet, dan staat het er wel, als
 * "Nog niet open": de game heeft altijd vrouwen én mannen. Mobiel plakt hij
 * onder de masthead; op desktop staat hij gewoon in de flow.
 *
 * `metTotaal`: de knop Totaal erbij (Uitslagen), zodra beide pelotons er zijn.
 */
export default function MeermarathonPelotonbalk({ className, metTotaal = false }: { className?: string; metTotaal?: boolean }) {
  const { selectedGame, setSelectedGameId } = useSelectedGame();
  const { seizoen, statussen } = useMeermarathonSeizoen();
  const [params, setParams] = useSearchParams();

  if (!selectedGame || !isMeermarathonGame(selectedGame.game_type) || seizoen.length === 0) return null;

  const vandaag = vandaagIso();
  const echte: PelotonItem[] = seizoen.map((g) => {
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
  // Een game zonder categorie is een oud seizoen; daar vullen we niets aan.
  const aanwezig = new Set(echte.map((i) => i.categorie));
  const volgt: PelotonItem[] = aanwezig.has(null)
    ? []
    : MEERMARATHON_CATEGORIEEN.filter((c) => !aanwezig.has(c.value)).map((c) => ({
        id: `volgt-${c.value}`,
        label: c.label,
        categorie: c.value,
        soort: "volgt",
        regel: "Nog niet open",
      }));
  const items = [...echte, ...volgt].sort(
    (a, b) => meermarathonCategorieRang(a.categorie) - meermarathonCategorieRang(b.categorie),
  );
  if (items.length < 2) return null;

  const totaalGekozen = params.get("klassement") === "totaal";
  const kies = (id: string) => {
    setSelectedGameId(id);
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("game", id);
        next.delete("klassement");
        return next;
      },
      { replace: true },
    );
  };
  const kiesTotaal = () =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("klassement", "totaal");
        return next;
      },
      { replace: true },
    );

  const balk = (totaal?: TotaalKnop) => (
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
        totaal={totaal}
      />
    </div>
  );

  return metTotaal && echte.length >= 2 ? (
    <MetTotaal gekozen={totaalGekozen} onSelect={kiesTotaal}>
      {balk}
    </MetTotaal>
  ) : (
    balk()
  );
}
