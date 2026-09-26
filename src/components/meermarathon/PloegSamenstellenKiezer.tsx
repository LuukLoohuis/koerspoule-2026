/**
 * Kiezer voor Ploeg samenstellen: de kandidaten voor één plek. Op desktop een
 * tabel in de middelste kolom, mobiel een lade die van onderen opschuift.
 * Beide krijgen dezelfde rijen uit kandidaten(), zodat "Al gekozen" en
 * "Haal weg" op elk scherm hetzelfde betekenen.
 */
import { forwardRef, useId, type ReactNode, type Ref } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import type { Kandidaat } from "@/lib/ploegSamenstellen";

// ── Knoppen (zelfde maat en schaduw als de rest van de Meermarathon) ───────

const KNOP = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] border-2 px-[18px] text-[15px] font-bold",
  "transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:cursor-not-allowed disabled:opacity-50",
);
export const KNOP_PRIMAIR = cn(
  KNOP,
  "border-primary bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--primary)/0.5)] enabled:hover:bg-primary/90",
);
export const KNOP_SECUNDAIR = cn(
  KNOP,
  "border-foreground bg-card text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] enabled:hover:bg-secondary",
);
/** Kleinere variant voor in een tabelrij; de tikhoogte blijft 44px. */
const KNOP_RIJ = cn(KNOP_SECUNDAIR, "px-3.5 text-sm");

export const LABEL = "text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground";

export const ZOEKVELD = cn(
  "min-h-11 w-full rounded-[2px] border border-input bg-background px-3 text-[15px] text-foreground",
  "placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
);

type RijActie = {
  /** Mag er gekozen worden? Na bevestigen blijft de lijst alleen om te kijken. */
  kiesbaar: boolean;
  bezig: boolean;
  /** Naam van wie nu op de plek staat; voor een duidelijke schermlezertekst. */
  huidigeNaam: string | null;
  onKies: (rijderId: string) => void;
  onHaalWeg: () => void;
};

function RijKnop({ k, actie }: { k: Kandidaat; actie: RijActie }) {
  if (!actie.kiesbaar) return null;
  if (k.status === "bezet") {
    return <span className="whitespace-nowrap text-[13px] font-semibold text-muted-foreground">Al gekozen</span>;
  }
  if (k.status === "huidig") {
    return (
      <button
        type="button"
        className={KNOP_RIJ}
        disabled={actie.bezig}
        onClick={actie.onHaalWeg}
        aria-label={`${k.rijder.naam} weghalen`}
      >
        Haal weg
      </button>
    );
  }
  return (
    <button
      type="button"
      className={KNOP_RIJ}
      disabled={actie.bezig}
      onClick={() => actie.onKies(k.rijder.id)}
      aria-label={
        actie.huidigeNaam ? `${k.rijder.naam} kiezen in plaats van ${actie.huidigeNaam}` : `${k.rijder.naam} kiezen`
      }
    >
      Kies
    </button>
  );
}

function Naam({ k }: { k: Kandidaat }) {
  return (
    <>
      <span className="flex items-center gap-1.5 font-bold text-foreground">
        {k.rijder.naam}
        {k.status === "huidig" && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
            <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
            In je ploeg
          </span>
        )}
      </span>
      {k.rijder.ploeg && <span className="block text-[12.5px] font-normal text-muted-foreground">{k.rijder.ploeg}</span>}
    </>
  );
}

function GeenTreffers({ zoek, leeg }: { zoek: string; leeg: boolean }) {
  return (
    <p className="m-0 rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      {leeg ? "Nog geen rijders in deze categorie." : `Geen rijder gevonden voor “${zoek.trim()}”.`}
    </p>
  );
}

export const Zoekveld = forwardRef<
  HTMLInputElement,
  { waarde: string; onChange: (v: string) => void; className?: string }
>(function Zoekveld({ waarde, onChange, className }, ref) {
  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={ref}
        type="search"
        value={waarde}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Zoek een rijder op naam of ploeg"
        placeholder="Zoek op naam of ploeg"
        className={cn(ZOEKVELD, "pl-9")}
      />
    </div>
  );
});

// ── Desktop: kandidatentabel ──────────────────────────────────────────────

export function KandidatenTabel({
  titel,
  rijen,
  totaal,
  zoek,
  onZoek,
  zoekRef,
  actie,
}: {
  titel: string;
  rijen: Kandidaat[];
  /** Aantal rijders vóór het zoeken; 0 = lege categorie. */
  totaal: number;
  zoek: string;
  onZoek: (v: string) => void;
  zoekRef?: Ref<HTMLInputElement>;
  actie: RijActie;
}) {
  const kopId = useId();
  const metNummer = rijen.some((k) => k.rijder.nummer != null);
  return (
    <section aria-labelledby={kopId} className="retro-border no-hover-lift flex flex-col gap-3 bg-card px-5 py-[18px]">
      <h2 id={kopId} className="heading-oswald m-0 text-[22px] text-foreground">
        {titel}
      </h2>
      <Zoekveld ref={zoekRef} waarde={zoek} onChange={onZoek} />
      {rijen.length === 0 ? (
        <GeenTreffers zoek={zoek} leeg={totaal === 0} />
      ) : (
        <table className="table-editorial w-full border-collapse">
          <thead className="border-b-2 border-foreground">
            <tr>
              <th scope="col" className="text-left">
                Rijder
              </th>
              {metNummer && (
                <th scope="col" className="text-right">
                  Nr.
                </th>
              )}
              {actie.kiesbaar && (
                <th scope="col">
                  <span className="sr-only">Actie</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rijen.map((k) => (
              <tr
                key={k.rijder.id}
                className={cn("border-b border-border last:border-b-0", k.status === "huidig" && "bg-primary/[0.07]")}
              >
                <td className="py-2.5! text-[15px]!">
                  <Naam k={k} />
                </td>
                {metNummer && (
                  <td className="text-right text-[15px]! tabular-nums text-foreground">{k.rijder.nummer ?? "–"}</td>
                )}
                {actie.kiesbaar && (
                  <td className="w-px text-right">
                    <RijKnop k={k} actie={actie} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── Mobiel: lijst in een lade ─────────────────────────────────────────────

export function KandidatenLijst({
  rijen,
  totaal,
  zoek,
  onZoek,
  actie,
  className,
}: {
  rijen: Kandidaat[];
  totaal: number;
  zoek: string;
  onZoek: (v: string) => void;
  actie: RijActie;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      {/* Blijft staan terwijl de lijst eronder scrolt. */}
      <Zoekveld waarde={zoek} onChange={onZoek} className="sticky top-0 z-10 bg-background py-1" />
      {rijen.length === 0 ? (
        <GeenTreffers zoek={zoek} leeg={totaal === 0} />
      ) : (
        <ul role="list" className="m-0 list-none p-0">
          {rijen.map((k) => (
            <li
              key={k.rijder.id}
              className={cn(
                "flex min-h-[60px] items-center gap-3 border-b border-border py-2 pl-1 last:border-b-0",
                k.status === "huidig" && "bg-primary/[0.07]",
              )}
            >
              <div className="min-w-0 flex-1 text-[15px] leading-snug">
                <Naam k={k} />
              </div>
              {k.rijder.nummer != null && (
                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                  <span className="sr-only">Beennummer </span>
                  {k.rijder.nummer}
                </span>
              )}
              <RijKnop k={k} actie={actie} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function KiesLade({
  open,
  onOpenChange,
  titel,
  omschrijving,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titel: string;
  omschrijving: string;
  children: ReactNode;
}) {
  return (
    // handleOnly: slepen alleen aan het handvat, anders vecht de lade met het
    // scrollen door een lange lijst.
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly shouldScaleBackground={false}>
      <DrawerContent data-eigen-typografie className="max-h-[88vh] font-inter">
        <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <DrawerTitle className="heading-oswald m-0 text-[22px] text-foreground">{titel}</DrawerTitle>
            <DrawerDescription className="mt-1">{omschrijving}</DrawerDescription>
          </div>
          <DrawerClose
            aria-label="Sluiten"
            className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-5" />
          </DrawerClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] [touch-action:pan-y]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
