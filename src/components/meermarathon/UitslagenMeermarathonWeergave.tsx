/**
 * Uitslagen van de Meermarathon (scherm 5): Klassement · Kalender · Per
 * wedstrijd. Alleen weergave; de data komt binnen via props, zie
 * UitslagenMeermarathon.tsx voor de hooks.
 *
 * Smal (telefoon, of een smalle kolom naast de zijbalk) staat de kalender
 * onder het klassement; breed staan ze naast elkaar, de kalender in een kaart.
 * Dat hangt aan de breedte van dit blok zelf (container queries), niet aan het
 * scherm: in Mijn Peloton kan er rechts een zijkolom staan die de ruimte
 * halveert.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import { BarChart3, Flag, Trophy } from "lucide-react";
import { RetroTabs, type RetroTab } from "@/components/RetroTabs";
import WedstrijdKalender from "@/components/meermarathon/WedstrijdKalender";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { rangtekst } from "@/lib/meermarathonSeizoen";
import type { KalenderRij } from "@/lib/meermarathonKalender";
import {
  achterstandTekst,
  bewegingLabel,
  bewegingTeken,
  jouwPlek,
  klassementRegels,
  mmGetal,
  ploegenTekst,
  ploegnaam,
  verborgenRijen,
  type Beweging,
  type JouwPlek,
  type MmStandRij,
} from "@/lib/meermarathonKlassement";

export type UitslagenSegment = "klassement" | "kalender" | "wedstrijd";

export type KlassementStand =
  | { soort: "laden" }
  | { soort: "fout" }
  /** Nog geen goedgekeurde uitslag; `volgende` is de eerstvolgende wedstrijd, als die bekend is. */
  | { soort: "leeg"; volgende: { label: string; dag: string | null } | null }
  | {
      soort: "stand";
      /** De wedstrijd tot en met welke het klassement telt: "Cup 2". */
      wedstrijdLabel: string;
      rijen: MmStandRij[];
      /** Alleen als er vóór deze wedstrijd al een uitslag was; anders zegt de delta niets. */
      metBeweging: boolean;
    };

const SEGMENTEN: readonly (RetroTab & { key: UitslagenSegment })[] = [
  { key: "klassement", label: "Klassement", Icon: Trophy },
  { key: "kalender", label: "Kalender", Icon: Flag },
  { key: "wedstrijd", label: "Per wedstrijd", Icon: BarChart3 },
];

export const KALENDER_ONDERTITEL = "Cups op kunstijs · Grand Prix' op natuurijs · ONK · NK";

export default function UitslagenMeermarathonWeergave({
  categorieLabel,
  stand,
  eigenUserId,
  kalender,
  segment,
  onSegment,
  perWedstrijd,
  className,
}: {
  /** "Vrouwen" of "Mannen"; null voor een game zonder categorie. */
  categorieLabel: string | null;
  stand: KlassementStand;
  eigenUserId: string | null;
  /** null zolang de kalender laadt. */
  kalender: KalenderRij[] | null;
  segment: UitslagenSegment;
  onSegment: (segment: UitslagenSegment) => void;
  /** De uitslag per wedstrijd; wordt pas gemount als dat segment open staat. */
  perWedstrijd: ReactNode;
  className?: string;
}) {
  const actief = SEGMENTEN.find((s) => s.key === segment) ?? SEGMENTEN[0];
  // data-eigen-typografie staat per blok en niet op de buitenste div: de
  // bestaande uitslag onder "Per wedstrijd" moet de sitebrede Inter houden.
  return (
    <div className={cn("@container", className)}>
      <RetroTabs
        variant="segment"
        aria-label="Uitslagen"
        active={actief.key}
        onChange={(k) => onSegment(k as UitslagenSegment)}
        tabs={SEGMENTEN}
        // Op de telefoon moet elk segment een duimbreed raakvlak hebben.
        className="mb-4 font-inter @max-2xl:[&>button]:min-h-11 @2xl:mb-5"
      />
      <div role="tabpanel" aria-label={actief.label}>
        {actief.key === "klassement" && (
          <div
            data-eigen-typografie
            className="grid gap-8 font-inter @4xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] @4xl:items-start @4xl:gap-9"
          >
            <KlassementBlok categorieLabel={categorieLabel} stand={stand} eigenUserId={eigenUserId} />
            <KalenderBlok rijen={kalender} kaartVanaf="4xl" />
          </div>
        )}
        {actief.key === "kalender" && (
          // WedstrijdKalender draagt zelf data-eigen-typografie.
          <KalenderBlok rijen={kalender} kaartVanaf="2xl" className="max-w-2xl font-inter" />
        )}
        {actief.key === "wedstrijd" && perWedstrijd}
      </div>
    </div>
  );
}

// ── Klassement ────────────────────────────────────────────────────────────

function KlassementBlok({
  categorieLabel,
  stand,
  eigenUserId,
}: {
  categorieLabel: string | null;
  stand: KlassementStand;
  eigenUserId: string | null;
}) {
  const kopId = useId();
  const tabelId = useId();
  const [volledig, setVolledig] = useState(false);
  const titel = categorieLabel ? `Klassement ${categorieLabel}` : "Klassement";

  const rijen = useMemo(() => (stand.soort === "stand" ? stand.rijen : []), [stand]);
  const plek = useMemo(
    () => (stand.soort === "stand" ? jouwPlek(stand.rijen, eigenUserId, { metBeweging: stand.metBeweging }) : null),
    [stand, eigenUserId],
  );
  const ingeklapt = useMemo(() => klassementRegels(rijen, eigenUserId), [rijen, eigenUserId]);
  const regels = useMemo(
    () => (volledig ? klassementRegels(rijen, eigenUserId, { volledig: true }) : ingeklapt),
    [volledig, rijen, eigenUserId, ingeklapt],
  );
  const heeftMeer = verborgenRijen(rijen, ingeklapt) > 0;

  return (
    <section aria-labelledby={kopId} className="flex min-w-0 flex-col gap-4 @2xl:gap-3">
      {/* Op de telefoon neemt de jouw-plek-kaart de rol van de kop over; de
          kop blijft dan alleen voor schermlezers staan. */}
      <header className={cn("flex items-end justify-between gap-4", plek && "@max-2xl:sr-only")}>
        <div className="min-w-0">
          <h2 id={kopId} className="heading-oswald m-0 text-xl @2xl:text-[30px]">
            {titel}
          </h2>
          {stand.soort === "stand" && (
            <p className="m-0 text-sm text-muted-foreground">
              Na {stand.wedstrijdLabel} · {ploegenTekst(stand.rijen.length)}
            </p>
          )}
        </div>
        {plek && <PlekKort plek={plek} className="hidden @2xl:flex" />}
      </header>

      {stand.soort === "laden" && <KlassementLaden />}

      {stand.soort === "fout" && (
        <p role="status" className="m-0 rounded-[9px] border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
          Het klassement kon niet worden geladen. Probeer het straks nog eens.
        </p>
      )}

      {stand.soort === "leeg" && <NogGeenUitslag volgende={stand.volgende} />}

      {stand.soort === "stand" && (
        <>
          {plek && (
            <PlekKaart
              plek={plek}
              categorieLabel={categorieLabel}
              wedstrijdLabel={stand.wedstrijdLabel}
              className="@2xl:hidden"
            />
          )}

          <table id={tabelId} aria-labelledby={kopId} className="table-editorial w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th scope="col" className="w-10 text-left">
                  <span aria-hidden="true">#</span>
                  <span className="sr-only">Plek</span>
                </th>
                <th scope="col" className="text-left">Ploeg</th>
                <th scope="col" className="hidden text-right @2xl:table-cell">{stand.wedstrijdLabel}</th>
                <th scope="col" className="text-right">Punten</th>
              </tr>
            </thead>
            <tbody>
              {regels.map((regel, i) =>
                regel.soort === "gat" ? (
                  <tr key={`gat-${i}`}>
                    <td />
                    <td className="text-muted-foreground">
                      <span aria-hidden="true">⋮</span>
                      <span className="sr-only">{ploegenTekst(regel.verborgen)} overgeslagen</span>
                    </td>
                    <td className="hidden @2xl:table-cell" />
                    <td />
                  </tr>
                ) : (
                  <KlassementRij key={regel.rij.entry_id} rij={regel.rij} jij={regel.jij} />
                ),
              )}
            </tbody>
          </table>

          {heeftMeer && (
            <button
              type="button"
              aria-expanded={volledig}
              aria-controls={tabelId}
              onClick={() => setVolledig((v) => !v)}
              className={cn(
                "inline-flex min-h-11 items-center self-start rounded-sm text-sm font-semibold text-primary",
                "underline-offset-4 hover:underline",
                "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {volledig ? "Toon minder" : "Toon volledig klassement"}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function KlassementRij({ rij, jij }: { rij: MmStandRij; jij: boolean }) {
  const naam = ploegnaam(rij);
  // De spelersnaam alleen als die iets toevoegt: niet bij jezelf, en niet als
  // hij al als ploegnaam staat.
  const speler = !jij && rij.team_name?.trim() && rij.display_name?.trim() ? rij.display_name.trim() : null;
  return (
    <tr className={cn(jij && "bg-primary/[0.09]")}>
      <td className={cn("w-10 font-oswald tabular-nums", jij && "font-bold")}>{rij.rank}</td>
      <td>
        <div className={cn("text-[13px] leading-snug", jij ? "font-bold" : "font-semibold")}>
          {naam}
          {jij && <span className="sticker ml-1.5 align-middle">Jij</span>}
        </div>
        {speler && <div className="text-xs leading-snug text-muted-foreground">{speler}</div>}
      </td>
      <td className="hidden text-right tabular-nums text-muted-foreground @2xl:table-cell">
        {rij.stage_points > 0 ? `+${mmGetal(rij.stage_points)}` : "0"}
      </td>
      <td className="text-right font-bold tabular-nums">{mmGetal(rij.total)}</td>
    </tr>
  );
}

/** Pijltje voor het oog, een hele zin voor de schermlezer. */
function BewegingTekst({ beweging }: { beweging: Beweging }) {
  return (
    <>
      <span aria-hidden="true">{bewegingTeken(beweging)}</span>
      <span className="sr-only">{bewegingLabel(beweging)}</span>
    </>
  );
}

/** Telefoon: de kaart boven de tabel. */
function PlekKaart({
  plek,
  categorieLabel,
  wedstrijdLabel,
  className,
}: {
  plek: JouwPlek;
  categorieLabel: string | null;
  wedstrijdLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("retro-border flex items-center gap-3.5 bg-card px-3.5 py-3", className)}>
      {/* Het grote cijfer is voor het oog; de schermlezer hoort het in het label. */}
      <span aria-hidden="true" className="shrink-0 font-oswald text-[36px] font-bold leading-none tabular-nums text-primary">
        {plek.rank}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Jouw plek{categorieLabel && ` · ${categorieLabel}`}
          <span className="sr-only">: {rangtekst(plek.rank)}</span>
        </span>
        <span className="break-words font-bold leading-snug">
          {plek.ploegnaam} · {mmGetal(plek.punten)} pnt
        </span>
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {plek.beweging ? (
            <>
              <BewegingTekst beweging={plek.beweging} /> na {wedstrijdLabel}
            </>
          ) : (
            <>Na {wedstrijdLabel}</>
          )}
          {` · ${achterstandTekst(plek)}`}
        </span>
      </div>
    </div>
  );
}

/** Breed: je plek rechts naast de kop. */
function PlekKort({ plek, className }: { plek: JouwPlek; className?: string }) {
  return (
    <div className={cn("shrink-0 items-center gap-3", className)}>
      <span aria-hidden="true" className="font-oswald text-[40px] font-bold leading-none tabular-nums text-primary">
        {plek.rank}
      </span>
      <span className="text-sm leading-[1.35]">
        <strong className="block font-bold">
          Jouw plek<span className="sr-only">: {rangtekst(plek.rank)}</span>
        </strong>
        <span className="tabular-nums text-muted-foreground">
          {plek.beweging && (
            <>
              <BewegingTekst beweging={plek.beweging} />
              {" · "}
            </>
          )}
          {achterstandTekst(plek, true)}
        </span>
      </span>
    </div>
  );
}

function NogGeenUitslag({ volgende }: { volgende: { label: string; dag: string | null } | null }) {
  return (
    <div className="rounded-[9px] border border-border bg-card px-5 py-7 text-center">
      <Trophy aria-hidden="true" className="mx-auto size-6 text-[hsl(var(--vintage-gold))]" />
      <p className="m-0 mt-2 font-display text-lg font-bold">Nog geen uitslag</p>
      <p className="m-0 mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Het klassement verschijnt zodra de uitslag van de eerste wedstrijd binnen is.
        {volgende && (
          <>
            {" "}
            Eerstvolgende: <strong className="font-semibold text-foreground">{volgende.label}</strong>
            {volgende.dag && `, ${volgende.dag}`}.
          </>
        )}
      </p>
    </div>
  );
}

function KlassementLaden() {
  return (
    <div role="status" aria-label="Klassement laden" className="flex flex-col gap-3">
      <Skeleton className="h-[68px] w-full @2xl:hidden" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4" style={{ width: `${46 - (i % 4) * 7}%` }} />
          <Skeleton className="ml-auto h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

// ── Kalender ──────────────────────────────────────────────────────────────

/**
 * Smal staat de kalender los op het papier, zoals op de telefoon; vanaf de
 * gegeven breedte krijgt hij een kaart. In een kaart valt de lijn achter de
 * kop weg: de kaartrand kadert al.
 */
const KAART = {
  "2xl": "@2xl:retro-border @2xl:bg-card @2xl:px-5 @2xl:py-[18px] @2xl:[&_h3]:after:hidden",
  "4xl": "@4xl:retro-border @4xl:bg-card @4xl:px-5 @4xl:py-[18px] @4xl:[&_h3]:after:hidden",
} as const;

function KalenderBlok({
  rijen,
  kaartVanaf,
  className,
}: {
  rijen: KalenderRij[] | null;
  kaartVanaf: keyof typeof KAART;
  className?: string;
}) {
  if (rijen == null) {
    return (
      <div role="status" aria-label="Kalender laden" className={cn("flex flex-col gap-3", KAART[kaartVanaf], className)}>
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  return (
    <WedstrijdKalender rijen={rijen} ondertitel={KALENDER_ONDERTITEL} className={cn(KAART[kaartVanaf], className)} />
  );
}
