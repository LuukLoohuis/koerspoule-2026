/**
 * Ploeg samenstellen (Meermarathon) — de weergave, zonder data-hooks (zie
 * PloegSamenstellenContainer voor de data).
 *
 * Eén game, twee pelotons: de vrouwen en de mannen staan samen op het scherm,
 * elk met een eigen ploeg. Meedoen bij allebei mag, maar hoeft niet: een
 * peloton waar je niet meerijdt, toont alleen de uitnodiging om mee te doen.
 *
 * Mobiel: per peloton een kaart met ploegnaam en een plek per categorie,
 * daaronder de uitleg en een plakkende actiebalk boven de onderbalk; kiezen
 * gaat in een lade. Breed (vanaf 1024px eigen breedte): drie kolommen met de
 * pelotons, de kandidaten van de actieve plek en een samenvatting met de knoppen.
 *
 * Reageert op de eigen breedte (container queries), niet op het scherm, zodat
 * de testbank mobiel en desktop naast elkaar kan tonen.
 */
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, Clock, Lock, Plus, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoHideOnScroll } from "@/hooks/useAutoHideOnScroll";
import { mmMoment, type MmFase } from "@/lib/meermarathonSeizoen";
import {
  bouwSlots,
  kandidaten,
  nogOpenTekst,
  ondertitel,
  slotLabel,
  telling,
  zelfdeDoel,
  type KiesDoel,
  type PsCategorie,
  type PsGekozen,
  type Klassement,
  type PsRijder,
  type PsVoorspellingen,
  type SluitReden,
  type Telling,
} from "@/lib/ploegSamenstellen";
import { SoortEmbleem } from "@/components/meermarathon/WedstrijdSoort";
import {
  KandidatenLijst,
  KandidatenTabel,
  KiesLade,
  KNOP_PRIMAIR,
  KNOP_SECUNDAIR,
  LABEL,
  ZOEKVELD,
} from "@/components/meermarathon/PloegSamenstellenKiezer";

/** Zelfde grens als @5xl (64rem): daaronder kies je in de lade. */
const BREED_PX = 1024;

export type PsBezig = "kiezen" | "opslaan" | "bevestigen" | "aanpassen";

export type PsPronostiek = {
  /** De hele startlijst van dit peloton: iedereen kan het klassement winnen. */
  rijders: PsRijder[];
  gekozen: PsVoorspellingen;
  /**
   * Los van de ploeg: ook na bevestigen te wijzigen zolang de inschrijving
   * open is (save_entry_predictions kijkt alleen naar de status van de game).
   * Zo hoeft niemand zijn ploeg terug naar concept te zetten voor een
   * voorspelling.
   */
  wijzigbaar: boolean;
};

/** De twee klassementen van de pronostiek, in de volgorde van het scherm. */
const KLASSEMENTEN: ReadonlyArray<{ key: Klassement; label: string; ondergrond: string }> = [
  { key: "cup", label: "Cup-klassement", ondergrond: "kunstijs" },
  { key: "grandprix", label: "Grand Prix-klassement", ondergrond: "natuurijs" },
];

/** De ploeg van één peloton waar je meerijdt. */
export type PsBouw = {
  categorieen: PsCategorie[];
  gekozen: PsGekozen;
  /** Pronostiek: de winnaars van het Cup- en het Grand Prix-klassement. */
  pronostiek?: PsPronostiek | null;
  ploegnaam: string;
  /** Staat de ploegnaam zoals hij hier staat ook in de database? */
  ploegnaamBewaard: boolean;
  /** Ploeg bevestigd (entries.status = submitted). */
  ingediend: boolean;
  /** Net via "Aanpassen" teruggezet naar concept, deze sessie. */
  heropend: boolean;
  /** Wat er in dit peloton loopt; opslaan en bevestigen gelden voor de hele pagina. */
  bezig: "kiezen" | "aanpassen" | null;
  /** Korte melding als de rijders of de ploeg niet te laden zijn. */
  fout?: string | null;
  onPloegnaam: (waarde: string) => void;
  /** Veld verlaten of Enter: bewaar de naam als hij veranderd is. */
  onPloegnaamKlaar: () => void;
  onKies: (doel: KiesDoel, rijderId: string) => void;
  onHaalWeg: (doel: KiesDoel) => void;
  onAanpassen: () => void;
  /** Nog niets gekozen: je kunt je bedenken. Null als dat niet (meer) kan. */
  onNietMeedoen?: (() => void) | null;
};

/**
 * Eén peloton op het scherm.
 *
 * - bouwen: je rijdt hier mee en de inschrijving is open.
 * - laden: je rijdt hier mee, de rijders en je ploeg komen eraan.
 * - uitnodiging: je rijdt hier (nog) niet mee en instappen kan.
 * - gesloten: instappen of wijzigen kan hier niet (meer).
 */
export type PsPeloton = {
  id: string;
  /** "Vrouwen", "Mannen", of "Meermarathon" zonder categorie. */
  label: string;
  categorie: "vrouwen" | "mannen" | null;
} & (
  | { stand: "bouwen"; bouw: PsBouw }
  | { stand: "laden" }
  | {
      stand: "uitnodiging";
      /** "Ploeg van vijf rijders · 9 wedstrijden · vanaf 31 okt" */
      info: string;
      onMeedoen: () => void;
    }
  | { stand: "gesloten"; reden: SluitReden; fase: MmFase | null }
);

export type PloegSamenstellenProps = {
  /** "Meermarathon 2026-2027" */
  gameNaam: string;
  /** Vrouwen voorop, zoals overal. */
  pelotons: PsPeloton[];
  /** Het eerstvolgende sluitmoment; null als de beheerder er geen zette. */
  deadline: Date | null;
  ingelogd: boolean;
  bezig: "opslaan" | "bevestigen" | null;
  volgwagenPad: string;
  uitslagenPad?: string;
  /** "vast": boven de onderbalk van de app. "inline": plakt onderin de ouder (testbank). */
  actiebalk?: "vast" | "inline";
  /** Bewaart de ploegnamen van alle pelotons. */
  onOpslaan: () => void;
  /** Bevestigt elke complete ploeg die nog niet bevestigd is. */
  onBevestigen: () => void;
  onInloggen: () => void;
};

// ── Bouwstenen ────────────────────────────────────────────────────────────

const SLOT_LABEL = "text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground";
const FOCUS = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
/** Actieve plek op breed scherm: lichte tint plus een streep, niet alleen kleur. */
const ACTIEF = "@5xl:bg-primary/[0.07] @5xl:shadow-[inset_3px_0_0_hsl(var(--primary))]";
const KNOP_KLEIN = cn(KNOP_SECUNDAIR, "min-h-11 px-3.5 text-sm");

/** Verloop van een peloton, zoals in de pelotonbalk; mannen (en zonder categorie) in marine. */
function verloop(categorie: PsPeloton["categorie"]): string {
  return categorie === "vrouwen"
    ? "linear-gradient(135deg, var(--mm-v), var(--mm-v2))"
    : "linear-gradient(135deg, var(--mm-m), var(--mm-m2))";
}

function pelotonKleur(categorie: PsPeloton["categorie"]): string {
  return categorie === "vrouwen" ? "var(--mm-v)" : "var(--mm-m)";
}

/** "Vrouwenploeg"; zonder categorie gewoon "Ploeg". */
function ploegWoord(p: Pick<PsPeloton, "label" | "categorie">): string {
  return p.categorie ? `${p.label}ploeg` : "Ploeg";
}

function Kop({ titel, eyebrow, sub, deadline }: { titel: string; eyebrow?: string; sub: string; deadline: Date | null }) {
  return (
    <header className="flex flex-col gap-1 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <span className="editor-eyebrow">{eyebrow}</span>}
        <h1 className="vintage-heading m-0 text-[30px] font-bold leading-[1.1] @5xl:text-[40px]">{titel}</h1>
        <p className="m-0 max-w-2xl text-sm text-muted-foreground @5xl:text-[15px]">{sub}</p>
      </div>
      {deadline && (
        <p className="m-0 hidden shrink-0 items-center gap-2 text-[15px] @5xl:flex">
          <Clock aria-hidden className="size-[18px]" strokeWidth={2} />
          Deadline <strong className="font-bold">{mmMoment(deadline)}</strong>
        </p>
      )}
    </header>
  );
}

function PloegnaamVeld({
  id,
  waarde,
  bewaard,
  ingelogd,
  onChange,
  onKlaar,
}: {
  id: string;
  waarde: string;
  bewaard: boolean;
  ingelogd: boolean;
  onChange: (v: string) => void;
  onKlaar: () => void;
}) {
  const statusId = `${id}-status`;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onKlaar();
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={LABEL}>
          Ploegnaam
        </label>
        <span id={statusId} aria-live="polite" className="text-[11px] text-muted-foreground">
          {ingelogd && !bewaard ? "Nog niet bewaard" : ""}
        </span>
      </div>
      <input
        id={id}
        value={waarde}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onKlaar}
        maxLength={40}
        autoComplete="off"
        disabled={!ingelogd}
        placeholder={ingelogd ? "Bedenk een naam" : "Log in om een naam te kiezen"}
        aria-describedby={statusId}
        className={cn(ZOEKVELD, "disabled:cursor-not-allowed disabled:opacity-60")}
      />
    </form>
  );
}

function SlotRij({
  label,
  rijder,
  leegTekst,
  actief,
  wijzigbaar,
  icoon,
  onKies,
}: {
  label: string;
  rijder: PsRijder | null;
  leegTekst: string;
  actief: boolean;
  wijzigbaar: boolean;
  /** Embleem vóór de plek (de pronostiek); de categorieën hebben er geen. */
  icoon?: ReactNode;
  onKies: () => void;
}) {
  if (rijder) {
    return (
      <li
        className={cn(
          "flex min-h-[62px] items-center gap-2 border-b border-border py-2 pl-3.5 pr-1 last:border-b-0",
          icoon && "gap-3",
          actief && ACTIEF,
        )}
      >
        {icoon}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={SLOT_LABEL}>{label}</span>
          <span className="truncate text-[15px] font-bold">{rijder.naam}</span>
          {rijder.ploeg && <span className="truncate text-[12.5px] text-muted-foreground">{rijder.ploeg}</span>}
        </div>
        {wijzigbaar && (
          <button
            type="button"
            onClick={onKies}
            aria-current={actief ? "true" : undefined}
            aria-label={`${rijder.naam} wisselen (${label})`}
            className={cn(
              "min-h-11 min-w-11 shrink-0 rounded-md px-2.5 text-[13px] font-bold text-muted-foreground hover:text-foreground",
              FOCUS,
            )}
          >
            Wissel
          </button>
        )}
      </li>
    );
  }
  if (!wijzigbaar) {
    return (
      <li className="flex min-h-[58px] items-center gap-3 border-b border-border px-3.5 py-2 last:border-b-0">
        {icoon}
        <span className="flex min-w-0 flex-col">
          <span className={SLOT_LABEL}>{label}</span>
          <span className="text-[15px] text-muted-foreground">Niet gekozen</span>
        </span>
      </li>
    );
  }
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onKies}
        aria-current={actief ? "true" : undefined}
        aria-label={`${leegTekst} voor ${label}`}
        className={cn(
          "flex min-h-[58px] w-full items-center gap-3 px-3.5 py-2 text-left text-primary hover:bg-secondary/60",
          FOCUS,
          actief && ACTIEF,
        )}
      >
        {icoon}
        <span className="flex min-w-0 flex-col items-start">
          <span className={SLOT_LABEL}>{label}</span>
          <span className="text-[15px] font-bold">+ {leegTekst}</span>
        </span>
      </button>
    </li>
  );
}

/** De kop van een pelotonkaart: in de kleur van het peloton zodra je meerijdt. */
function KaartKop({
  id,
  peloton,
  gekleurd,
  rechts,
}: {
  id: string;
  peloton: Pick<PsPeloton, "label" | "categorie">;
  gekleurd: boolean;
  rechts?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[46px] items-center justify-between gap-3 px-3.5 py-2",
        gekleurd ? "text-white" : "border-b border-border bg-secondary/70 text-foreground",
      )}
      style={gekleurd ? { background: verloop(peloton.categorie) } : undefined}
    >
      <h2
        id={id}
        className="m-0 inline-flex min-w-0 items-center gap-2 font-display text-lg font-bold uppercase tracking-wide"
        style={gekleurd ? { textShadow: "0 1px 2px rgba(10,10,40,0.45)" } : undefined}
      >
        <Snowflake
          aria-hidden
          className="size-4 shrink-0"
          strokeWidth={2}
          style={gekleurd ? undefined : { color: pelotonKleur(peloton.categorie) }}
        />
        <span className="truncate">{peloton.label}</span>
      </h2>
      {rechts}
    </div>
  );
}

/** Geen primaire knop zolang je nergens meerijdt: de kaarten hebben hun eigen knop. */
type Knoppen = { primair: ReactNode | null; secundair: ReactNode | null };

type BouwPeloton = Extract<PsPeloton, { stand: "bouwen" }>;

function maakKnoppen(p: {
  ingelogd: boolean;
  enkel: boolean;
  bouwend: BouwPeloton[];
  /** Pelotons waar je meerijdt maar die nog laden. */
  laden: boolean;
  bezig: boolean;
  bezigMet: "opslaan" | "bevestigen" | null;
  volgwagenPad: string;
  onOpslaan: () => void;
  onBevestigen: () => void;
  onInloggen: () => void;
}): Knoppen {
  if (!p.ingelogd) {
    return {
      primair: (
        <button type="button" className={KNOP_PRIMAIR} onClick={p.onInloggen}>
          Inloggen om mee te doen
        </button>
      ),
      secundair: null,
    };
  }
  const open = p.bouwend.filter((b) => !b.bouw.ingediend);
  if (p.bouwend.length === 0 && !p.laden) return { primair: null, secundair: null };
  if (open.length === 0 && !p.laden) {
    return {
      primair: (
        <Link to={p.volgwagenPad} className={KNOP_PRIMAIR}>
          Naar je Volgwagen
        </Link>
      ),
      secundair: null,
    };
  }
  const klaar = open.filter((b) => telling(b.bouw.categorieen, b.bouw.gekozen).compleet);
  const tekst = p.enkel
    ? "Ploeg bevestigen"
    : klaar.length > 1
      ? "Beide ploegen bevestigen"
      : klaar.length === 1
        ? `${ploegWoord(klaar[0])} bevestigen`
        : open.length === 1
          ? `${ploegWoord(open[0])} bevestigen`
          : "Ploegen bevestigen";
  return {
    primair: (
      <button
        type="button"
        className={KNOP_PRIMAIR}
        disabled={klaar.length === 0 || p.bezig}
        aria-busy={p.bezigMet === "bevestigen" || undefined}
        onClick={p.onBevestigen}
      >
        {p.bezigMet === "bevestigen" ? "Bezig…" : tekst}
      </button>
    ),
    secundair: (
      <button
        type="button"
        className={KNOP_SECUNDAIR}
        disabled={p.bezig}
        aria-busy={p.bezigMet === "opslaan" || undefined}
        onClick={p.onOpslaan}
      >
        {p.bezigMet === "opslaan" ? "Bezig…" : "Opslaan"}
      </button>
    ),
  };
}

/** "Vrouwen 3/5", of "Vrouwen" met een vinkje als de ploeg bevestigd is. */
function Stand({ peloton, enkel }: { peloton: BouwPeloton; enkel: boolean }) {
  const tel = telling(peloton.bouw.categorieen, peloton.bouw.gekozen);
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      {!enkel && <span>{peloton.label}</span>}
      {peloton.bouw.ingediend ? (
        <>
          <Check aria-hidden className="size-4 self-center text-primary" strokeWidth={2.5} />
          <span className={cn("font-bold", !enkel && "sr-only")}>Ingeschreven</span>
        </>
      ) : (
        <span>
          <strong className="font-bold">
            {tel.gekozen}/{tel.vereist}
          </strong>
          {enkel && " gekozen"}
        </span>
      )}
    </span>
  );
}

function Actiebalk({
  modus,
  bouwend,
  enkel,
  deadline,
  knoppen,
}: {
  modus: "vast" | "inline";
  bouwend: BouwPeloton[];
  enkel: boolean;
  deadline: Date | null;
  knoppen: Knoppen;
}) {
  // Loopt gelijk op met de BottomNav, die wegglijdt terwijl je leest. Zonder
  // dit bleef er een gat van een onderbalkhoogte onder deze balk hangen.
  const navZichtbaar = useAutoHideOnScroll();
  return (
    <div
      className={cn(
        "z-40 border-t-2 border-foreground bg-card px-3 pt-3 @5xl:hidden",
        modus === "vast"
          ? cn(
              "fixed inset-x-0 bottom-0 pb-[calc(18px+env(safe-area-inset-bottom))]",
              "transition-[bottom] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
              // Onder md staat de BottomNav (58px + 3px rand, fixed, z-50).
              navZichtbaar && "max-md:bottom-[calc(3.8rem+env(safe-area-inset-bottom))] max-md:pb-[18px]",
            )
          : // Testbank: plakt onderin het kader, tot aan de randen ervan.
            "sticky bottom-0 -mx-3 pb-[18px]",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            {bouwend.length === 0 ? (
              <span className="text-muted-foreground">Kies waar je meerijdt</span>
            ) : (
              bouwend.map((b, i) => (
                <span key={b.id} className="inline-flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden className="text-muted-foreground">
                      ·
                    </span>
                  )}
                  <Stand peloton={b} enkel={enkel} />
                </span>
              ))
            )}
          </span>
          {deadline && (
            // Kort, zodat "Vrouwen 3/5 · Mannen 5/5" ernaast op één regel past.
            <span className="inline-flex shrink-0 items-center gap-1 text-right text-muted-foreground">
              <Clock aria-hidden className="size-3.5 self-center" strokeWidth={2} />
              <span className="sr-only">Deadline </span>
              {mmMoment(deadline)}
            </span>
          )}
        </div>
        {/* Bevestigen krijgt de ruimte: "Beide ploegen bevestigen" moet op één regel. */}
        {knoppen.primair && (
          <div className="flex gap-2.5 [&>*:last-child]:flex-1">
            {knoppen.secundair}
            {knoppen.primair}
          </div>
        )}
      </div>
    </div>
  );
}

/** enkel: één peloton, of één dat nog openstaat; dan valt er niets te combineren. */
function uitleg(opties: { enkel: boolean; deadline: Date | null; meerPerCategorie: boolean }): string {
  const tot = opties.deadline ? `tot de inschrijving sluit (${mmMoment(opties.deadline)})` : "tot de inschrijving sluit";
  // De database laat na het sluiten geen enkele wijziging meer toe: er zijn
  // geen wissels per wedstrijd, en dat zeggen we dan ook.
  const vast = "Daarna ligt je ploeg vast voor het hele seizoen; wisselen per wedstrijd kan niet.";
  const kiezen = opties.meerPerCategorie
    ? "Kies per categorie het aangegeven aantal rijders."
    : "Kies per categorie één rijder.";
  const beide = opties.enkel
    ? ""
    : " Meedoen bij de vrouwen én de mannen mag, maar hoeft niet: elk peloton heeft een eigen klassement.";
  return `${kiezen} Wisselen kan ${tot}. ${vast} Alleen een bevestigde ploeg doet mee.${beide}`;
}

/** Eén regel per peloton in de samenvatting (desktop). */
function samenvattingRegel(p: PsPeloton): string {
  switch (p.stand) {
    case "bouwen": {
      const { bouw } = p;
      if (bouw.ingediend) return "Ingeschreven: je ploeg doet mee.";
      if (telling(bouw.categorieen, bouw.gekozen).vereist === 0) return "Er zijn nog geen categorieën.";
      return nogOpenTekst(bouw.categorieen, bouw.gekozen) ?? "Compleet. Bevestig je ploeg om mee te doen.";
    }
    case "laden":
      return "Je ploeg wordt opgehaald…";
    case "uitnodiging":
      return "Je rijdt hier niet mee.";
    case "gesloten":
      return p.reden === "nog-niet-open" ? "Nog niet open." : "Inschrijving gesloten.";
  }
}

// ── Pelotonkaarten ────────────────────────────────────────────────────────

type Actief = { pelotonId: string; doel: KiesDoel };

function BouwKaart({
  peloton,
  enkel,
  ingelogd,
  deadline,
  actief,
  onKiesPlek,
}: {
  peloton: BouwPeloton;
  enkel: boolean;
  ingelogd: boolean;
  deadline: Date | null;
  actief: Actief | null;
  onKiesPlek: (doel: KiesDoel) => void;
}) {
  const { bouw } = peloton;
  const kopId = useId();
  const naamId = useId();
  const slots = useMemo(() => bouwSlots(bouw.categorieen, bouw.gekozen), [bouw.categorieen, bouw.gekozen]);
  const tel = telling(bouw.categorieen, bouw.gekozen);
  const nogOpen = nogOpenTekst(bouw.categorieen, bouw.gekozen);
  const pronostiek = bouw.pronostiek ?? null;
  const voorspeld = useMemo(() => {
    const van = (k: Klassement) => pronostiek?.rijders.find((r) => r.id === pronostiek.gekozen[k]) ?? null;
    return { cup: van("cup"), grandprix: van("grandprix") };
  }, [pronostiek]);
  const wijzigbaar = !bouw.ingediend;
  const isActief = (d: KiesDoel) => actief?.pelotonId === peloton.id && zelfdeDoel(d, actief.doel);

  return (
    <section aria-labelledby={kopId} className="retro-border no-hover-lift overflow-hidden bg-card">
      <KaartKop
        id={kopId}
        peloton={peloton}
        gekleurd
        rechts={
          bouw.ingediend ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]">
              <Check aria-hidden className="size-3" strokeWidth={3} />
              Ingeschreven
            </span>
          ) : (
            <span className="shrink-0 font-oswald text-lg font-bold tabular-nums">
              {tel.gekozen}/{tel.vereist}
              <span className="sr-only"> gekozen</span>
            </span>
          )
        }
      />

      {!bouw.ingediend && bouw.heropend && (
        <div
          role="status"
          className="flex items-start gap-2.5 border-b border-[var(--mm-alert-line)] bg-[var(--mm-alert-bg)] px-3.5 py-3 text-[var(--mm-alert-fg)]"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-[18px] shrink-0" strokeWidth={2} />
          <p className="m-0 text-sm leading-normal">
            <strong className="font-bold">Je {ploegWoord(peloton).toLowerCase()} is weer een concept.</strong> Bevestig
            hem opnieuw als je klaar bent: alleen een bevestigde ploeg doet mee.
          </p>
        </div>
      )}

      <div className="border-b border-border px-3.5 py-3">
        <PloegnaamVeld
          id={naamId}
          waarde={bouw.ploegnaam}
          bewaard={bouw.ploegnaamBewaard}
          ingelogd={ingelogd}
          onChange={bouw.onPloegnaam}
          onKlaar={bouw.onPloegnaamKlaar}
        />
      </div>

      {bouw.fout && (
        <p role="alert" className="m-0 border-b border-border px-3.5 py-3 text-sm text-muted-foreground">
          {bouw.fout}
        </p>
      )}

      {slots.length === 0 ? (
        <p className="m-0 px-3.5 py-4 text-sm text-muted-foreground">
          De categorieën zijn nog niet ingedeeld. Kom later terug om je ploeg samen te stellen.
        </p>
      ) : (
        <ul role="list" aria-label={enkel ? "Jouw rijders" : `Jouw rijders bij de ${peloton.label.toLowerCase()}`} className="m-0 list-none p-0">
          {slots.map((slot) => {
            const d: KiesDoel = { soort: "categorie", categorieId: slot.categorie.id, plek: slot.plek };
            return (
              <SlotRij
                key={slot.sleutel}
                label={slotLabel(slot)}
                rijder={slot.rijder}
                leegTekst="Kies een rijder"
                actief={isActief(d)}
                wijzigbaar={wijzigbaar}
                onKies={() => onKiesPlek(d)}
              />
            );
          })}
        </ul>
      )}

      {pronostiek && (
        <div className="border-t-2 border-border">
          <div className="px-3.5 pb-1 pt-3">
            <h3 className="m-0 text-[15px] font-bold">
              Pronostiek <span className="font-normal text-muted-foreground">· optioneel</span>
            </h3>
            <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
              Wie wint aan het eind van de winter het klassement? Een rijder uit je eigen ploeg mag ook.
            </p>
          </div>
          <ul role="list" className="m-0 list-none p-0">
            {KLASSEMENTEN.map((k) => {
              const d: KiesDoel = { soort: "voorspelling", klassement: k.key };
              return (
                <SlotRij
                  key={k.key}
                  icoon={<SoortEmbleem soort={k.key} maat={28} />}
                  label={`${k.label} · ${k.ondergrond}`}
                  rijder={voorspeld[k.key]}
                  leegTekst="Kies een winnaar"
                  actief={isActief(d)}
                  wijzigbaar={pronostiek.wijzigbaar}
                  onKies={() => onKiesPlek(d)}
                />
              );
            })}
          </ul>
        </div>
      )}

      {bouw.ingediend ? (
        <div className="flex items-center justify-between gap-3 border-t-2 border-border px-3.5 py-3">
          <p className="m-0 text-[13.5px] leading-snug text-secondary-foreground">
            Je ploeg doet mee. Wisselen kan via Aanpassen{deadline ? ` tot ${mmMoment(deadline)}` : ""}; bevestig daarna
            opnieuw.
          </p>
          <button
            type="button"
            className={cn(KNOP_KLEIN, "shrink-0")}
            disabled={bouw.bezig != null}
            aria-busy={bouw.bezig === "aanpassen" || undefined}
            aria-label={enkel ? "Aanpassen" : `${ploegWoord(peloton)} aanpassen`}
            onClick={bouw.onAanpassen}
          >
            {bouw.bezig === "aanpassen" ? "Bezig…" : "Aanpassen"}
          </button>
        </div>
      ) : (
        (nogOpen || (bouw.onNietMeedoen && tel.gekozen === 0)) && (
          <div className="flex items-center justify-between gap-3 border-t-2 border-border px-3.5 py-2.5 text-[13px]">
            <span className="text-muted-foreground">{tel.vereist > 0 && (nogOpen ?? "")}</span>
            {bouw.onNietMeedoen && tel.gekozen === 0 && (
              <button
                type="button"
                onClick={bouw.onNietMeedoen}
                className={cn(
                  "min-h-11 shrink-0 rounded-md px-1 font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground",
                  FOCUS,
                )}
              >
                Toch niet meedoen
              </button>
            )}
          </div>
        )
      )}
    </section>
  );
}

function LaadKaart({ peloton }: { peloton: PsPeloton }) {
  const kopId = useId();
  return (
    <section aria-labelledby={kopId} aria-busy="true" className="retro-border no-hover-lift overflow-hidden bg-card">
      <KaartKop id={kopId} peloton={peloton} gekleurd />
      <p className="sr-only">Je ploeg wordt opgehaald…</p>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="flex flex-col gap-1.5 border-b border-border px-3.5 py-3 last:border-b-0 motion-safe:animate-pulse"
        >
          <div className="h-2.5 w-2/5 rounded-full bg-secondary" />
          <div className="h-4 w-3/5 rounded-full bg-secondary" />
        </div>
      ))}
    </section>
  );
}

function UitnodigingKaart({
  peloton,
  elders,
}: {
  peloton: Extract<PsPeloton, { stand: "uitnodiging" }>;
  /** Het peloton waar je al meerijdt, als dat er is. */
  elders: Pick<PsPeloton, "label" | "categorie"> | null;
}) {
  const ookElders = elders != null;
  const kopId = useId();
  const deDe = `de ${peloton.label.toLowerCase()}`;
  return (
    <section aria-labelledby={kopId} className="retro-border no-hover-lift overflow-hidden bg-card">
      <KaartKop id={kopId} peloton={peloton} gekleurd={false} />
      <div className="flex flex-col gap-3 px-3.5 py-3.5">
        <p className="m-0 text-[14px] leading-snug text-secondary-foreground">
          {peloton.info}
          {ookElders && (
            <>
              <br />
              <span className="text-muted-foreground">
                Niet verplicht: je {ploegWoord(elders).toLowerCase()} doet ook alleen mee.
              </span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={peloton.onMeedoen}
          className={cn(ookElders ? KNOP_SECUNDAIR : KNOP_PRIMAIR, "w-full")}
        >
          <Plus aria-hidden className="size-4" strokeWidth={2.5} />
          {ookElders ? `Doe ook mee bij ${deDe}` : `Doe mee bij ${deDe}`}
        </button>
      </div>
    </section>
  );
}

function GeslotenKaart({
  peloton,
  volgwagenPad,
  uitslagenPad,
}: {
  peloton: Extract<PsPeloton, { stand: "gesloten" }>;
  volgwagenPad: string;
  uitslagenPad: string;
}) {
  const kopId = useId();
  const deDe = `de ${peloton.label.toLowerCase()}`;
  const tekst =
    peloton.reden === "nog-niet-open"
      ? `De inschrijving voor ${deDe} is nog niet open.`
      : peloton.fase === "ingeschreven"
        ? `Je ploeg doet mee. De inschrijving voor ${deDe} is gesloten; je ploeg ligt vast voor het hele seizoen.`
        : peloton.fase === "onvolledig"
          ? `Je ploeg voor ${deDe} was nog niet bevestigd en kan niet meer veranderen.`
          : `Meedoen bij ${deDe} kan dit seizoen niet meer. Meekijken wel.`;
  return (
    <section aria-labelledby={kopId} className="retro-border no-hover-lift overflow-hidden bg-card">
      <KaartKop
        id={kopId}
        peloton={peloton}
        gekleurd={false}
        rechts={
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <Lock aria-hidden className="size-3.5" strokeWidth={2.2} />
            {peloton.reden === "nog-niet-open" ? "Nog niet open" : "Gesloten"}
          </span>
        }
      />
      <div className="flex flex-col gap-3 px-3.5 py-3.5">
        <p className="m-0 text-[14px] leading-snug text-secondary-foreground">{tekst}</p>
        {peloton.reden === "gesloten" && (
          <Link
            to={peloton.fase === "ingeschreven" ? volgwagenPad : uitslagenPad}
            className={cn(KNOP_KLEIN, "w-fit")}
          >
            {peloton.fase === "ingeschreven" ? "Naar je Volgwagen" : "Bekijk de uitslagen"}
          </Link>
        )}
      </div>
    </section>
  );
}

// ── Het scherm ────────────────────────────────────────────────────────────

export function PloegSamenstellen(props: PloegSamenstellenProps) {
  const { gameNaam, pelotons, deadline, ingelogd, bezig } = props;
  const enkel = pelotons.length < 2;

  const rootRef = useRef<HTMLDivElement>(null);
  const zoekRef = useRef<HTMLInputElement>(null);

  const [actief, setActief] = useState<Actief | null>(null);
  const [ladeOpen, setLadeOpen] = useState(false);
  const [zoek, setZoek] = useState("");

  const bouwend = useMemo(() => pelotons.filter((p): p is BouwPeloton => p.stand === "bouwen"), [pelotons]);
  const laden = pelotons.some((p) => p.stand === "laden");
  const meedoenErgens = bouwend.length > 0 || laden;

  // Zonder eigen keuze staat de eerste lege plek in de middelste kolom, in
  // welk peloton die ook zit. Is alles vol, dan de eerste plek van een ploeg
  // die nog niet bevestigd is.
  const doel = useMemo<Actief | null>(() => {
    if (actief && bouwend.some((p) => p.id === actief.pelotonId)) return actief;
    const open = bouwend.filter((p) => !p.bouw.ingediend);
    for (const p of open) {
      const leeg = bouwSlots(p.bouw.categorieen, p.bouw.gekozen).find((s) => !s.rijder);
      if (leeg) return { pelotonId: p.id, doel: { soort: "categorie", categorieId: leeg.categorie.id, plek: leeg.plek } };
    }
    const kandidaat = open[0] ?? bouwend[0];
    const eerste = kandidaat ? bouwSlots(kandidaat.bouw.categorieen, kandidaat.bouw.gekozen)[0] : undefined;
    return eerste
      ? { pelotonId: kandidaat.id, doel: { soort: "categorie", categorieId: eerste.categorie.id, plek: eerste.plek } }
      : null;
  }, [actief, bouwend]);

  const doelPeloton = doel ? (bouwend.find((p) => p.id === doel.pelotonId) ?? null) : null;

  const doelInfo = useMemo(() => {
    if (!doel || !doelPeloton) return null;
    const { bouw } = doelPeloton;
    const voor = (titel: string) => (enkel ? titel : `${doelPeloton.label} · ${titel}`);
    const slots = bouwSlots(bouw.categorieen, bouw.gekozen);
    const d = doel.doel;
    if (d.soort === "voorspelling") {
      const pronostiek = bouw.pronostiek;
      if (!pronostiek) return null;
      const k = KLASSEMENTEN.find((x) => x.key === d.klassement)!;
      const huidigId = pronostiek.gekozen[k.key];
      return {
        titel: voor(`Winnaar ${k.label}`),
        rijders: pronostiek.rijders,
        huidig: pronostiek.rijders.find((r) => r.id === huidigId) ?? null,
        leeg: `Kies wie volgens jou het ${k.label} wint.`,
        // Een voorspelling mag op elke rijder, ook een uit je eigen ploeg.
        bezet: new Set<string>(),
        wijzigbaar: pronostiek.wijzigbaar,
      };
    }
    const slot = slots.find((s) => s.categorie.id === d.categorieId && s.plek === d.plek);
    if (!slot) return null;
    const bezet = new Set<string>();
    for (const s of slots) if (s.rijder && s.rijder.id !== slot.rijder?.id) bezet.add(s.rijder.id);
    return {
      titel: voor(slotLabel(slot)),
      rijders: slot.categorie.rijders,
      huidig: slot.rijder,
      leeg: slot.categorie.max > 1 ? "Kies een rijder voor deze plek." : "Kies één rijder.",
      bezet,
      // De ploeg ligt na bevestigen vast, de pronostiek niet.
      wijzigbaar: !bouw.ingediend,
    };
  }, [doel, doelPeloton, enkel]);

  const rijen = useMemo(
    () =>
      doelInfo ? kandidaten(doelInfo.rijders, { huidig: doelInfo.huidig?.id ?? null, bezet: doelInfo.bezet, zoek }) : [],
    [doelInfo, zoek],
  );

  const kiesPlek = (pelotonId: string, d: KiesDoel) => {
    const nieuw: Actief = { pelotonId, doel: d };
    if (!(doel?.pelotonId === pelotonId && zelfdeDoel(d, doel.doel))) setZoek("");
    setActief(nieuw);
    const breed = (rootRef.current?.clientWidth ?? 0) >= BREED_PX;
    if (breed) {
      // De kandidaten staan al in beeld; zet de cursor in het zoekveld.
      requestAnimationFrame(() => zoekRef.current?.focus({ preventScroll: true }));
    } else {
      setLadeOpen(true);
    }
  };

  const rijActie = {
    kiesbaar: Boolean(doelInfo?.wijzigbaar),
    bezig: doelPeloton?.bouw.bezig === "kiezen",
    huidigeNaam: doelInfo?.huidig?.naam ?? null,
    onKies: (rijderId: string) => {
      if (!doel || !doelPeloton) return;
      doelPeloton.bouw.onKies(doel.doel, rijderId);
      // Vastzetten: anders schuift de tabel zelf door naar de volgende lege
      // plek en verdwijnt je keuze uit beeld. Doorgaan doe je zelf.
      setActief(doel);
      setLadeOpen(false);
    },
    onHaalWeg: () => {
      if (!doel || !doelPeloton) return;
      doelPeloton.bouw.onHaalWeg(doel.doel);
      setLadeOpen(false);
    },
  };

  const ergensBezig = bezig != null || bouwend.some((p) => p.bouw.bezig != null);
  const knoppen = maakKnoppen({
    ingelogd,
    enkel,
    bouwend,
    laden,
    bezig: ergensBezig,
    bezigMet: bezig,
    volgwagenPad: props.volgwagenPad,
    onOpslaan: props.onOpslaan,
    onBevestigen: props.onBevestigen,
    onInloggen: props.onInloggen,
  });

  const meerPerCategorie = bouwend.some((p) => p.bouw.categorieen.some((c) => c.max > 1));
  const enkeleBouw = enkel ? bouwend[0] : undefined;
  const titel = enkel ? "Stel je ploeg samen" : "Stel je ploegen samen";
  const sub = enkel
    ? enkeleBouw
      ? ondertitel(gameNaam, enkeleBouw.bouw.categorieen)
      : gameNaam
    : "Eén game, twee pelotons. Doe mee bij de vrouwen, de mannen of allebei: elk peloton heeft een eigen ploeg en een eigen klassement.";

  return (
    <div ref={rootRef} data-eigen-typografie className="@container font-inter text-foreground">
      <div
        className={cn(
          "mx-auto flex max-w-2xl flex-col gap-4 pt-2 @5xl:max-w-[1200px] @5xl:gap-5 @5xl:pb-12",
          // Ruimte voor de vaste actiebalk, anders valt de uitleg eronder.
          (props.actiebalk ?? "vast") === "vast" ? "pb-[150px]" : "pb-4",
        )}
      >
        <Kop titel={titel} eyebrow={enkel ? undefined : gameNaam} sub={sub} deadline={deadline} />

        <div className="grid items-start gap-4 @5xl:grid-cols-[360px_minmax(0,1fr)_290px] @5xl:gap-7">
          <div className="flex flex-col gap-4">
            {pelotons.map((p) => {
              if (p.stand === "bouwen") {
                return (
                  <BouwKaart
                    key={p.id}
                    peloton={p}
                    enkel={enkel}
                    ingelogd={ingelogd}
                    deadline={deadline}
                    actief={doel}
                    onKiesPlek={(d) => kiesPlek(p.id, d)}
                  />
                );
              }
              if (p.stand === "laden") return <LaadKaart key={p.id} peloton={p} />;
              if (p.stand === "uitnodiging") {
                return (
                  <UitnodigingKaart
                    key={p.id}
                    peloton={p}
                    elders={pelotons.find((q) => q.id !== p.id && (q.stand === "bouwen" || q.stand === "laden")) ?? null}
                  />
                );
              }
              return (
                <GeslotenKaart
                  key={p.id}
                  peloton={p}
                  volgwagenPad={props.volgwagenPad}
                  uitslagenPad={props.uitslagenPad ?? "/uitslagen"}
                />
              );
            })}

            {meedoenErgens && (
              <p className="mop-card m-0 px-3.5 py-3 text-sm leading-normal">
                {uitleg({ enkel: enkel || pelotons.some((p) => p.stand === "gesloten"), deadline, meerPerCategorie })}
              </p>
            )}
          </div>

          {/* Plakt naast de pelotons, zodat de kandidaten ook bij de mannenploeg in beeld staan. */}
          <div className="hidden @5xl:sticky @5xl:top-4 @5xl:block @5xl:max-h-[calc(100dvh-2rem)] @5xl:overflow-y-auto @5xl:pb-1 @5xl:pr-1">
            {!doelPeloton || !doelInfo ? (
              <section className="retro-border no-hover-lift flex flex-col gap-3 bg-card px-5 py-[18px]">
                <h2 className="heading-oswald m-0 text-[22px] text-foreground">
                  {laden ? "Je ploeg wordt opgehaald" : "Waar rijd je mee?"}
                </h2>
                <p className="m-0 text-[15px] leading-normal text-secondary-foreground">
                  {laden
                    ? "Zo meteen kies je hier de rijders."
                    : "Kies links de vrouwen, de mannen of allebei. Daarna kies je hier per categorie je rijders."}
                </p>
              </section>
            ) : doelPeloton.bouw.ingediend && doel?.doel.soort !== "voorspelling" ? (
              // Na bevestigen valt er niets te kiezen; zeg wat wél kan, en wat
              // Aanpassen kost, vóór iemand erop drukt.
              <section className="retro-border no-hover-lift flex flex-col gap-3 bg-card px-5 py-[18px]">
                <span className="sticker w-fit gap-1">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                  Ingeschreven
                </span>
                <h2 className="heading-oswald m-0 text-[22px] text-foreground">
                  {enkel ? "Je ploeg doet mee" : `Je ${ploegWoord(doelPeloton).toLowerCase()} doet mee`}
                </h2>
                <p className="m-0 text-[15px] leading-normal text-secondary-foreground">
                  Wil je nog wisselen? Kies Aanpassen
                  {deadline ? `; dat kan tot ${mmMoment(deadline)}` : ""}. Bevestig je ploeg daarna opnieuw, anders
                  doet hij niet mee.
                </p>
              </section>
            ) : (
              <KandidatenTabel
                titel={doelInfo.titel}
                rijen={rijen}
                totaal={doelInfo.rijders.length}
                zoek={zoek}
                onZoek={setZoek}
                zoekRef={zoekRef}
                actie={rijActie}
              />
            )}
          </div>

          <aside
            aria-label="Samenvatting"
            className="retro-border no-hover-lift hidden flex-col gap-3 bg-card p-[18px] @5xl:sticky @5xl:top-4 @5xl:flex"
          >
            {pelotons.map((p, i) => {
              const bouw = p.stand === "bouwen" ? p.bouw : null;
              const tel: Telling | null = bouw ? telling(bouw.categorieen, bouw.gekozen) : null;
              return (
                <div key={p.id} className={cn("flex flex-col gap-0.5", i > 0 && "border-t border-border pt-3")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="font-display text-[15px] font-bold uppercase tracking-wide"
                      style={{ color: pelotonKleur(p.categorie) }}
                    >
                      {p.label}
                    </span>
                    {tel && (
                      <span className="font-oswald text-[30px] font-bold leading-none tabular-nums">
                        {bouw?.ingediend ? (
                          <Check aria-label="Ingeschreven" className="inline size-6 text-primary" strokeWidth={3} />
                        ) : (
                          <>
                            {tel.gekozen}/{tel.vereist}
                            <span className="sr-only"> gekozen</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="m-0 text-[13px] leading-snug text-muted-foreground">{samenvattingRegel(p)}</p>
                </div>
              );
            })}
            {knoppen.primair && <div aria-hidden className="h-px bg-border" />}
            {knoppen.primair}
            {knoppen.secundair}
          </aside>
        </div>
      </div>

      <Actiebalk
        modus={props.actiebalk ?? "vast"}
        bouwend={bouwend}
        enkel={enkel}
        deadline={deadline}
        knoppen={knoppen}
      />

      {doelInfo && (
        <KiesLade
          open={ladeOpen}
          onOpenChange={setLadeOpen}
          titel={doelInfo.titel}
          omschrijving={
            doelInfo.huidig && doelInfo.wijzigbaar
              ? `Nu gekozen: ${doelInfo.huidig.naam}. Kies een andere rijder of haal de keuze weg.`
              : doelInfo.leeg
          }
        >
          <KandidatenLijst
            rijen={rijen}
            totaal={doelInfo.rijders.length}
            zoek={zoek}
            onZoek={setZoek}
            actie={rijActie}
          />
        </KiesLade>
      )}
    </div>
  );
}

// ── Gesloten en laden ─────────────────────────────────────────────────────

export type PloegSamenstellenGeslotenProps = {
  pelotonbalk?: ReactNode;
  /** "Meermarathon Vrouwen" */
  gameNaam: string;
  /** "Vrouwen" */
  label: string;
  reden: SluitReden;
  /** Wat de speler in deze game heeft; null als dat niet bekend is (uitgelogd). */
  eigen: { fase: MmFase; ploegnaam: string | null } | null;
  volgwagenPad: string;
  uitslagenPad: string;
};

/** Niets meer open in het hele seizoen. Is één peloton nog open, dan toont de bouwer het andere als kaart. */
export function PloegSamenstellenGesloten({
  pelotonbalk,
  gameNaam,
  label,
  reden,
  eigen,
  volgwagenPad,
  uitslagenPad,
}: PloegSamenstellenGeslotenProps) {
  const kopId = useId();
  const deDe = `de ${label}`;

  let kop: string;
  let tekst: string;
  let actie: ReactNode = null;
  if (reden === "nog-niet-open") {
    kop = "De inschrijving is nog niet open";
    tekst = `Zodra de rijders en categorieën voor ${deDe} vaststaan, stel je hier je ploeg samen.`;
  } else if (eigen?.fase === "ingeschreven") {
    kop = eigen.ploegnaam?.trim() ? `${eigen.ploegnaam.trim()} doet mee` : "Je ploeg doet mee";
    tekst = `De inschrijving voor ${deDe} is gesloten. Je ploeg ligt vast voor het hele seizoen; wisselen per wedstrijd kan niet.`;
    actie = (
      <Link to={volgwagenPad} className={cn(KNOP_PRIMAIR, "w-full @md:w-fit")}>
        Naar je Volgwagen
      </Link>
    );
  } else {
    kop = "De inschrijving is gesloten";
    tekst =
      eigen?.fase === "onvolledig"
        ? `Je ploeg voor ${deDe} was nog niet bevestigd en kan niet meer veranderen. Alleen bevestigde ploegen doen mee.`
        : `Meedoen met ${deDe} kan dit seizoen niet meer. Meekijken wel: de uitslagen en het klassement staan open.`;
    actie = (
      <Link to={uitslagenPad} className={cn(KNOP_SECUNDAIR, "w-full @md:w-fit")}>
        Bekijk de uitslagen
      </Link>
    );
  }

  return (
    <div data-eigen-typografie className="@container font-inter text-foreground">
      {pelotonbalk}
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-12 pt-2">
        <header className="flex flex-col gap-1">
          <h1 className="vintage-heading m-0 text-[30px] font-bold leading-[1.1] @5xl:text-[40px]">Stel je ploeg samen</h1>
          <p className="m-0 text-sm text-muted-foreground @5xl:text-[15px]">{gameNaam}</p>
        </header>

        <section aria-labelledby={kopId} className="retro-border no-hover-lift flex flex-col gap-3 bg-card p-4 @md:px-6 @md:py-5">
          <p className="m-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <Lock aria-hidden className="size-3.5" strokeWidth={2.2} />
            {reden === "nog-niet-open" ? "Nog niet open" : "Inschrijving gesloten"}
          </p>
          <h2 id={kopId} className="m-0 font-display text-xl font-bold leading-tight @md:text-2xl">
            {kop}
          </h2>
          <p className="m-0 text-[14.5px] leading-normal text-secondary-foreground">{tekst}</p>
          {actie && <div className="pt-1">{actie}</div>}
        </section>
      </div>
    </div>
  );
}

export function PloegSamenstellenLaden({ pelotonbalk }: { pelotonbalk?: ReactNode }) {
  return (
    <div data-eigen-typografie className="@container font-inter text-foreground">
      {pelotonbalk}
      <div aria-busy="true" className="mx-auto flex max-w-2xl flex-col gap-4 pb-12 pt-2 @5xl:max-w-[1200px]">
        <header className="flex flex-col gap-1">
          <h1 className="vintage-heading m-0 text-[30px] font-bold leading-[1.1] @5xl:text-[40px]">Stel je ploeg samen</h1>
          <p className="m-0 text-sm text-muted-foreground">Je ploeg wordt opgehaald…</p>
        </header>
        <div aria-hidden className="grid items-start gap-4 @5xl:grid-cols-[360px_minmax(0,1fr)_290px] @5xl:gap-7">
          <div className="overflow-hidden rounded-[9px] border border-border bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 border-b border-border px-3.5 py-3 last:border-b-0 motion-safe:animate-pulse">
                <div className="h-2.5 w-2/5 rounded-full bg-secondary" />
                <div className="h-4 w-3/5 rounded-full bg-secondary" />
              </div>
            ))}
          </div>
          <div className="hidden h-80 rounded-[9px] border border-border bg-card motion-safe:animate-pulse @5xl:block" />
          <div className="hidden h-56 rounded-[9px] border border-border bg-card motion-safe:animate-pulse @5xl:block" />
        </div>
      </div>
    </div>
  );
}
