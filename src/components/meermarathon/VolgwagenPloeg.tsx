/**
 * Volgwagen › Mijn ploeg voor de Meermarathon (scherm 3 van de handoff).
 *
 * Alleen presentatie: alles komt binnen via props, zodat de testbank elke
 * staat kan tonen zonder database. De data haalt VolgwagenPloegContainer op.
 *
 * Twee kaarten: je ploeg (naam, stand, rijders) en de volgende wedstrijd met
 * een aftelling. Ze staan onder elkaar, en naast elkaar zodra er ruimte is.
 * Dat hangt aan de breedte van de kolom, niet van het scherm: op Mijn Peloton
 * kan er rechts een zijkolom staan die de inhoud smaller maakt.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, Pencil, Snowflake, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mmMoment, rangtekst, type MmFase } from "@/lib/meermarathonSeizoen";
import {
  deadlineBijschrift,
  ploegActie,
  teambouwerHref,
  type Aftelling,
  type PloegRij,
  type VolgendeKaart,
} from "@/lib/meermarathonVolgwagen";

type Categorie = "vrouwen" | "mannen" | null;

// ── Bouwstenen ────────────────────────────────────────────────────────────

/** Hoofdknop: vlak in primary met een halfdoorzichtige harde schaduw. */
const KNOP_PRIMAIR = cn(
  "retro-border-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] bg-primary px-[18px]",
  "text-[15px] font-bold text-primary-foreground outline-hidden transition-colors hover:bg-primary/90",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
);

const MONO = "font-['JetBrains_Mono',monospace] uppercase";

/**
 * Twee kolommen zodra de inhoud er breed genoeg voor is (±768px).
 * data-eigen-typografie: de pagina forceert anders overal Inter (content-font),
 * en dan verliezen de Oswald-cijfers, Playfair-naam en mono-kopregel hun font.
 */
function Opmaak({ children }: { children: ReactNode }) {
  return (
    <div data-eigen-typografie className="@container pb-4">
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_380px] @3xl:items-start @3xl:gap-7">{children}</div>
    </div>
  );
}

/** "❄ Meermarathon Volgwagen ❄" in de kleur van de game. */
function Kopregel({ categorie }: { categorie: Categorie }) {
  return (
    <p className={cn(MONO, "mm-gametekst text-[10px] tracking-[0.18em]")} data-categorie={categorie ?? undefined}>
      <span aria-hidden>❄ </span>Meermarathon Volgwagen<span aria-hidden> ❄</span>
    </p>
  );
}

/** Een getal in het ploeghoofd. "—" zolang er nog niets te tellen valt. */
function Stat({
  label,
  waarde,
  toelichting,
  onClick,
}: {
  label: string;
  waarde: string | null;
  /** Voor schermlezers, bv. "van 1204" of "in De Ijsvogels". */
  toelichting?: string;
  onClick?: () => void;
}) {
  const inhoud = (
    <>
      <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground @2xl/kaart:text-[11px]">
        {label}
      </span>
      <span className="block font-oswald text-[26px] font-bold leading-tight tracking-[0.01em] tabular-nums @2xl/kaart:text-[34px]">
        {waarde ?? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">nog geen uitslag</span>
          </>
        )}
        {waarde && toelichting && <span className="sr-only"> {toelichting}</span>}
      </span>
    </>
  );
  if (!onClick) return <div className="min-w-0">{inhoud}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mx-1.5 -my-1 min-w-0 rounded-md px-1.5 py-1 text-left outline-hidden transition-colors",
        "hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inhoud}
    </button>
  );
}

/** Nummertegel voor een rijder; gestippeld voor een plek die nog open is. */
function Tegel({ nummer, open = false }: { nummer: number; open?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[6px] font-oswald text-[13px] tabular-nums",
        open ? "border border-dashed border-foreground/35 text-muted-foreground" : "bg-primary text-primary-foreground",
      )}
    >
      {nummer}
    </span>
  );
}

function RijderRij({ rij, teambouwer }: { rij: PloegRij; teambouwer: string | null }) {
  if (rij.soort === "open") {
    const inhoud = (
      <>
        <Tegel nummer={rij.nummer} open />
        <span className="flex min-w-0 flex-1 flex-col py-2">
          <span className="font-serif text-[15px] italic leading-snug text-muted-foreground">Nog te kiezen</span>
          <span className="text-[12.5px] leading-snug text-muted-foreground">{rij.categorie}</span>
        </span>
        {teambouwer && (
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary">
            Kies
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </>
    );
    return (
      <li className="border-b border-border last:border-b-0">
        {teambouwer ? (
          <Link
            to={teambouwer}
            aria-label={`Kies een rijder bij ${rij.categorie}`}
            className="flex min-h-14 items-center gap-3 px-3.5 outline-hidden transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {inhoud}
          </Link>
        ) : (
          <div className="flex min-h-14 items-center gap-3 px-3.5">{inhoud}</div>
        )}
      </li>
    );
  }

  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-border px-3.5 last:border-b-0">
      <Tegel nummer={rij.nummer} />
      <span className="flex min-w-0 flex-1 flex-col py-2">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 text-[15px] font-bold leading-snug wrap-break-word">{rij.naam}</span>
          {rij.afgemeld && (
            <span className="rounded-full border border-[var(--mm-alert-line)] bg-[var(--mm-alert-bg)] px-1.5 py-px text-[9.5px] font-bold uppercase leading-tight tracking-[0.08em] text-[var(--mm-alert-fg)]">
              Afgemeld
            </span>
          )}
        </span>
        <span className="text-[12.5px] leading-snug text-muted-foreground">
          {rij.categorie}
          {rij.ploeg && <> · {rij.ploeg}</>}
        </span>
      </span>
      <span className="shrink-0 font-bold tabular-nums">
        {rij.punten ?? <span aria-hidden>—</span>}
        <span className="sr-only">{rij.punten == null ? "nog geen punten" : " punten"}</span>
      </span>
    </li>
  );
}

// ── Ploegnaam ─────────────────────────────────────────────────────────────

function Ploegnaam({
  naam,
  onOpslaan,
  bewerkSignaal,
}: {
  naam: string | null;
  onOpslaan?: (naam: string) => Promise<boolean>;
  bewerkSignaal?: number;
}) {
  const [bewerken, setBewerken] = useState(false);
  const [concept, setConcept] = useState("");
  const [bezig, setBezig] = useState(false);
  const invoer = useRef<HTMLInputElement>(null);

  // "Stel je ploegnaam in" elders op Mijn Peloton opent de bewerker hier.
  // Eén signaal opent hem één keer, ook als de component opnieuw rendert.
  const verwerkt = useRef(bewerkSignaal ?? 0);
  useEffect(() => {
    if (!onOpslaan || !bewerkSignaal || bewerkSignaal === verwerkt.current) return;
    verwerkt.current = bewerkSignaal;
    setConcept(naam ?? "");
    setBewerken(true);
  }, [bewerkSignaal, naam, onOpslaan]);

  useEffect(() => {
    if (!bewerken) return;
    const id = requestAnimationFrame(() => invoer.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [bewerken]);

  const open = () => {
    setConcept(naam ?? "");
    setBewerken(true);
  };

  const opslaan = async (e: FormEvent) => {
    e.preventDefault();
    if (!onOpslaan || bezig) return;
    setBezig(true);
    try {
      if (await onOpslaan(concept)) setBewerken(false);
    } finally {
      setBezig(false);
    }
  };

  if (bewerken && onOpslaan) {
    return (
      <form onSubmit={opslaan} className="mt-1.5 flex flex-wrap items-center gap-2">
        <input
          ref={invoer}
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          maxLength={40}
          aria-label="Ploegnaam"
          placeholder="Naam van je ploeg"
          className="h-11 min-w-0 flex-1 basis-48 rounded-md border border-input bg-background px-3 font-display text-lg font-bold outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={bezig} aria-label="Ploegnaam opslaan" className={cn(KNOP_PRIMAIR, "w-11 px-0 disabled:opacity-60")}>
          <Check className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setBewerken(false)}
          aria-label="Annuleren"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground outline-hidden hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </form>
    );
  }

  return (
    <>
      <h2 className="mt-1.5 flex items-start gap-1 font-display text-[26px] font-black uppercase leading-[1.05] @2xl/kaart:text-4xl @2xl/kaart:leading-none">
        <span className={cn("min-w-0 wrap-break-word", !naam && "text-muted-foreground")}>{naam ?? "Mijn ploeg"}</span>
        {onOpslaan && naam && (
          <button
            type="button"
            onClick={open}
            aria-label="Ploegnaam wijzigen"
            className="-my-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-hidden hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        )}
      </h2>
      {onOpslaan && !naam && (
        <button
          type="button"
          onClick={open}
          className="-mx-1 mt-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 font-serif text-sm italic text-muted-foreground outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Geef je ploeg een naam
        </button>
      )}
    </>
  );
}

// ── Volgende wedstrijd ────────────────────────────────────────────────────

function Tijdtegel({ waarde, eenheid }: { waarde: string; eenheid: string }) {
  return (
    <div className="rounded-[9px] border border-border bg-card py-2 text-center">
      {/* Bewust foreground: de ontwerpkleur (sepia) verdween in de nacht. */}
      <div className="font-oswald text-[28px] font-bold leading-[1.05] tabular-nums text-foreground">{waarde}</div>
      <div className="text-xs text-muted-foreground">{eenheid}</div>
    </div>
  );
}

const twee = (n: number) => String(n).padStart(2, "0");
const meervoud = (n: number, een: string, meer: string) => `${n} ${n === 1 ? een : meer}`;

function AftellingBlok({ aftelling, fase }: { aftelling: Aftelling; fase: MmFase }) {
  switch (aftelling.soort) {
    case "deadline": {
      const bijschrift = deadlineBijschrift(fase);
      const { dagen, uren, minuten } = aftelling;
      return (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{bijschrift}</p>
          <p className="sr-only">
            {bijschrift} {meervoud(dagen, "dag", "dagen")}, {meervoud(uren, "uur", "uur")} en {meervoud(minuten, "minuut", "minuten")}.
          </p>
          <div aria-hidden className="grid grid-cols-3 gap-2">
            <Tijdtegel waarde={String(dagen)} eenheid={dagen === 1 ? "dag" : "dagen"} />
            <Tijdtegel waarde={twee(uren)} eenheid="uur" />
            <Tijdtegel waarde={twee(minuten)} eenheid="min" />
          </div>
        </div>
      );
    }
    case "dagen":
      // Zonder starttijd valt er niet in uren af te tellen; alleen dagen.
      return (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Tot de wedstrijd</p>
          <div className="grid grid-cols-3 gap-2">
            <Tijdtegel waarde={String(aftelling.dagen)} eenheid="dagen" />
          </div>
        </div>
      );
    case "morgen":
    case "vandaag":
      return (
        <div className="rounded-[9px] border border-border bg-card py-2 text-center">
          <div className="font-oswald text-[28px] font-bold uppercase leading-[1.05] text-foreground">
            {aftelling.soort === "vandaag" ? "Vandaag" : "Morgen"}
          </div>
          <div className="text-xs text-muted-foreground">wedstrijddag</div>
        </div>
      );
    default:
      return null;
  }
}

function VolgendeWedstrijdKaart({
  volgende,
  aftelling,
  fase,
  deadline,
  wijzigbaar,
  actie,
}: {
  volgende: VolgendeKaart;
  aftelling: Aftelling;
  fase: MmFase;
  deadline: Date | null;
  wijzigbaar: boolean;
  /** Tekst en doel van de knop; null = geen knop. */
  actie: { tekst: string; href: string } | null;
}) {
  return (
    <section aria-label="Volgende wedstrijd" className="retro-border flex flex-col gap-3 bg-card p-4 @3xl:p-[22px]">
      <span className="editor-eyebrow">{volgende.gepland ? "Volgende wedstrijd" : "Kalender"}</span>
      <div>
        <h2 className="heading-oswald m-0 text-2xl @3xl:text-[28px]">{volgende.titel}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{volgende.detail}</p>
      </div>
      <AftellingBlok aftelling={aftelling} fase={fase} />
      {aftelling.soort === "deadline" && deadline && (
        <p className="text-sm">
          Deadline <strong>{mmMoment(deadline)}</strong>
        </p>
      )}
      {!wijzigbaar && fase !== "niet-ingeschreven" && (
        <p className="text-sm text-muted-foreground">De inschrijving is gesloten: je ploeg ligt vast voor dit seizoen.</p>
      )}
      {actie && (
        <Link to={actie.href} className={KNOP_PRIMAIR}>
          {actie.tekst}
        </Link>
      )}
    </section>
  );
}

/**
 * Keuzelijst onder het subpoule-cijfer, alleen bij meer dan één subpoule.
 * Native select: op de telefoon krijg je de systeemkiezer. Visueel een
 * compacte regel, maar het tikvlak is 44px hoog (negatieve marge).
 */
function SubpouleKiezer({
  huidigId,
  opties,
  onKies,
}: {
  huidigId: string;
  opties: { id: string; naam: string }[];
  onKies: (id: string) => void;
}) {
  return (
    <label className="relative mt-0.5 inline-flex min-w-0 max-w-full items-center">
      <span className="sr-only">Kies welke subpoule je hier ziet</span>
      <select
        value={huidigId}
        onChange={(e) => onKies(e.target.value)}
        className={cn(
          "-my-3 min-h-11 w-auto min-w-0 max-w-full appearance-none truncate rounded-sm border-0 bg-transparent py-3 pl-0 pr-5",
          "text-xs font-semibold text-muted-foreground underline decoration-dotted underline-offset-4",
          "outline-hidden hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {opties.map((o) => (
          <option key={o.id} value={o.id}>
            {o.naam}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-muted-foreground" />
    </label>
  );
}

// ── Scherm: je ploeg ──────────────────────────────────────────────────────

export type VolgwagenPloegProps = {
  gameId: string;
  /** "Vrouwen" of "Mannen". */
  label: string;
  categorie: Categorie;
  fase: MmFase;
  ploegnaam: string | null;
  /** Weergavenaam van de speler; null als die er niet is. */
  ploegleider: string | null;
  klassement: { rank: number; totaal: number } | null;
  punten: number | null;
  /** null: je zit in geen subpoule, dan geen stat. rank null: nog geen uitslag. */
  subpoule: { id: string; naam: string; rank: number | null; totaal: number } | null;
  /** Alle subpoules waar je in zit; bij meer dan één komt er een keuzelijst. */
  subpouleKeuze?: { opties: { id: string; naam: string }[]; onKies: (id: string) => void };
  rijen: PloegRij[];
  gekozen: number;
  vereist: number;
  volgende: VolgendeKaart;
  aftelling: Aftelling;
  deadline: Date | null;
  wijzigbaar: boolean;
  onKlassement?: () => void;
  onSubpoule?: (id: string) => void;
  /** Slaat de ploegnaam op; true als het lukte. Zonder: niet te wijzigen. */
  onPloegnaam?: (naam: string) => Promise<boolean>;
  /** Ophogen opent de naambewerker. */
  bewerkSignaal?: number;
};

export default function VolgwagenPloeg(p: VolgwagenPloegProps) {
  const href = teambouwerHref(p.gameId);
  const actieTekst = ploegActie({ fase: p.fase, gekozen: p.gekozen, vereist: p.vereist, wijzigbaar: p.wijzigbaar });
  const onderschrift = ["Ploegleider", p.ploegleider, p.label].filter(Boolean).join(" · ");

  return (
    <Opmaak>
      <section aria-label="Mijn ploeg" className="@container/kaart retro-border overflow-hidden bg-card">
        <div
          className={cn(
            "border-b border-border px-3.5 pb-3 pt-3.5",
            "@2xl/kaart:flex @2xl/kaart:items-end @2xl/kaart:justify-between @2xl/kaart:gap-5 @2xl/kaart:px-[22px] @2xl/kaart:py-5",
          )}
        >
          <div className="min-w-0">
            <Kopregel categorie={p.categorie} />
            <Ploegnaam naam={p.ploegnaam} onOpslaan={p.onPloegnaam} bewerkSignaal={p.bewerkSignaal} />
            <p className="mt-1 font-serif text-[13px] italic text-muted-foreground @2xl/kaart:mt-1.5 @2xl/kaart:text-sm">
              {onderschrift}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 @2xl/kaart:mt-0 @2xl/kaart:flex @2xl/kaart:shrink-0 @2xl/kaart:gap-7">
            <Stat
              label="Klassement"
              waarde={p.klassement ? rangtekst(p.klassement.rank) : null}
              toelichting={p.klassement ? `van ${p.klassement.totaal}` : undefined}
              onClick={p.onKlassement}
            />
            <Stat label="Punten" waarde={p.punten != null ? String(p.punten) : null} />
            {p.subpoule && (
              <div className="min-w-0">
                <Stat
                  label="Subpoule"
                  waarde={p.subpoule.rank != null ? rangtekst(p.subpoule.rank) : null}
                  toelichting={`van ${p.subpoule.totaal} in ${p.subpoule.naam}`}
                  onClick={p.onSubpoule ? () => p.onSubpoule?.(p.subpoule!.id) : undefined}
                />
                {p.subpouleKeuze && p.subpouleKeuze.opties.length > 1 && (
                  <SubpouleKiezer huidigId={p.subpoule.id} opties={p.subpouleKeuze.opties} onKies={p.subpouleKeuze.onKies} />
                )}
              </div>
            )}
          </div>
        </div>
        {p.rijen.length > 0 ? (
          <ul aria-label="Jouw rijders">
            {p.rijen.map((rij) => (
              <RijderRij key={rij.sleutel} rij={rij} teambouwer={p.wijzigbaar ? href : null} />
            ))}
          </ul>
        ) : (
          <p className="px-3.5 py-4 text-sm text-muted-foreground">Nog geen rijders gekozen.</p>
        )}
      </section>

      <VolgendeWedstrijdKaart
        volgende={p.volgende}
        aftelling={p.aftelling}
        fase={p.fase}
        deadline={p.deadline}
        wijzigbaar={p.wijzigbaar}
        actie={actieTekst ? { tekst: actieTekst, href } : null}
      />
    </Opmaak>
  );
}

// ── Scherm: nog geen ploeg ────────────────────────────────────────────────

export type VolgwagenPloegUitnodigingProps = {
  gameId: string;
  label: string;
  categorie: Categorie;
  /** Aantal rijders in een complete ploeg; 0 als dat nog niet vaststaat. */
  vereist: number;
  deadline: Date | null;
  wijzigbaar: boolean;
  volgende: VolgendeKaart;
  aftelling: Aftelling;
};

/**
 * Voor wie in deze game (nog) geen ploeg heeft. Rustig, zonder harde
 * schaduw: het is een uitnodiging, geen melding dat er iets mis is.
 */
export function VolgwagenPloegUitnodiging(p: VolgwagenPloegUitnodigingProps) {
  const verloop =
    p.categorie === "vrouwen"
      ? "linear-gradient(90deg, var(--mm-v), var(--mm-v2))"
      : "linear-gradient(90deg, var(--mm-m), var(--mm-m2))";
  return (
    <Opmaak>
      <section
        aria-label={`Meedoen met de ${p.label}`}
        className="overflow-hidden rounded-[9px] border border-border bg-[color-mix(in_srgb,hsl(var(--card))_60%,hsl(var(--background)))]"
      >
        <div aria-hidden className="h-1" style={{ background: verloop }} />
        <div className="flex flex-col gap-2.5 p-4 @3xl:p-[22px]">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em]">
            <span
              aria-hidden
              className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[var(--mm-chip)]"
              style={{ color: p.categorie === "vrouwen" ? "var(--mm-v)" : "var(--mm-m)" }}
            >
              <Snowflake className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            Meermarathon {p.label}
          </span>
          {p.wijzigbaar ? (
            <>
              <h2 className="font-display text-xl font-bold leading-tight">Meedoen met de {p.label}?</h2>
              <p className="text-[14.5px] leading-normal text-secondary-foreground">
                Je hebt hier nog geen ploeg.
                {p.vereist > 0 && <> Kies {p.vereist} rijders en rijd het hele seizoen mee.</>}
                {p.deadline && (
                  <>
                    {" "}Inschrijven kan tot <strong>{mmMoment(p.deadline)}</strong>.
                  </>
                )}
              </p>
              <Link to={teambouwerHref(p.gameId)} className={cn(KNOP_PRIMAIR, "self-start")}>
                Stel je ploeg samen
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold leading-tight">Geen ploeg dit seizoen</h2>
              <p className="text-[14.5px] leading-normal text-secondary-foreground">
                De inschrijving voor de {p.label} is gesloten. Meekijken kan nog: bij Live en in de uitslagen.
              </p>
            </>
          )}
        </div>
      </section>

      <VolgendeWedstrijdKaart
        volgende={p.volgende}
        aftelling={p.aftelling}
        fase="niet-ingeschreven"
        deadline={p.deadline}
        wijzigbaar={p.wijzigbaar}
        actie={null}
      />
    </Opmaak>
  );
}

// ── Scherm: seizoen nog niet ingericht ────────────────────────────────────

/** Zonder categorieën valt er geen ploeg te kiezen. */
export function VolgwagenPloegInrichting({ label, beheerder = false }: { label: string; beheerder?: boolean }) {
  return (
    <div data-eigen-typografie className="pb-4">
      <section role="status" className="flex items-start gap-3 rounded-[9px] border border-border bg-card p-4">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--mm-chip)] text-primary">
          <Snowflake className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="heading-oswald text-lg">De {label} worden nog ingericht</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Zodra de categorieën en rijders bekend zijn, stel je hier je ploeg samen.
          </p>
          {beheerder && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Beheer: voeg eerst de categorieën, rijders en wedstrijden toe.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
