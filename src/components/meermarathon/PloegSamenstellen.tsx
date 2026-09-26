/**
 * Ploeg samenstellen (Meermarathon) — de weergave, zonder data-hooks (zie
 * PloegSamenstellenContainer voor de data).
 *
 * Mobiel: ploegnaam, één kaart met een plek per categorie, uitleg en een
 * plakkende actiebalk boven de onderbalk; kiezen gaat in een lade. Breed
 * (vanaf 1024px eigen breedte): drie kolommen met de plekken, de kandidaten
 * van de actieve plek en een samenvatting met de knoppen.
 *
 * Reageert op de eigen breedte (container queries), niet op het scherm, zodat
 * de testbank mobiel en desktop naast elkaar kan tonen.
 */
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoHideOnScroll } from "@/hooks/useAutoHideOnScroll";
import { mmMoment, type MmFase } from "@/lib/meermarathonSeizoen";
import {
  bouwSlots,
  kandidaten,
  MAX_JOKERS,
  nogOpenTekst,
  ondertitel,
  slotLabel,
  telling,
  zelfdeDoel,
  type KiesDoel,
  type PsCategorie,
  type PsGekozen,
  type PsRijder,
  type SluitReden,
  type Telling,
} from "@/lib/ploegSamenstellen";
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

export type PsJokers = {
  /** Rijders van de startlijst die in geen enkele categorie staan. */
  pool: PsRijder[];
  gekozen: string[];
  /** games.joker_multiplier. */
  vermenigvuldiger: number;
};

export type PsBezig = "kiezen" | "opslaan" | "bevestigen" | "aanpassen";

export type PloegSamenstellenProps = {
  /** "Meermarathon Mannen" */
  gameNaam: string;
  categorieen: PsCategorie[];
  gekozen: PsGekozen;
  /** null: geen jokerkeuze (niemand op de startlijst buiten de categorieën). */
  jokers: PsJokers | null;
  ploegnaam: string;
  /** Staat de ploegnaam zoals hij hier staat ook in de database? */
  ploegnaamBewaard: boolean;
  /** games.registration_closes_at; null als de beheerder er geen zette. */
  deadline: Date | null;
  ingelogd: boolean;
  /** Ploeg bevestigd (entries.status = submitted). */
  ingediend: boolean;
  /** Net via "Aanpassen" teruggezet naar concept, deze sessie. */
  heropend: boolean;
  bezig: PsBezig | null;
  /** Korte melding als de rijders niet te laden zijn. */
  fout?: string | null;
  /** De koersbalk; de container geeft de echte, de testbank een nep. */
  koersbalk?: ReactNode;
  volgwagenPad: string;
  /** "vast": boven de onderbalk van de app. "inline": plakt onderin de ouder (testbank). */
  actiebalk?: "vast" | "inline";
  onPloegnaam: (waarde: string) => void;
  /** Veld verlaten of Enter: bewaar de naam als hij veranderd is. */
  onPloegnaamKlaar: () => void;
  onKies: (doel: KiesDoel, rijderId: string) => void;
  onHaalWeg: (doel: KiesDoel) => void;
  onOpslaan: () => void;
  onBevestigen: () => void;
  onAanpassen: () => void;
  onInloggen: () => void;
};

// ── Bouwstenen ────────────────────────────────────────────────────────────

const SLOT_LABEL = "text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground";
const FOCUS = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
/** Actieve plek op breed scherm: lichte tint plus een streep, niet alleen kleur. */
const ACTIEF = "@5xl:bg-primary/[0.07] @5xl:shadow-[inset_3px_0_0_hsl(var(--primary))]";

function Kop({ sub, deadline }: { sub: string; deadline: Date | null }) {
  return (
    <header className="flex flex-col gap-1 @5xl:flex-row @5xl:items-end @5xl:justify-between @5xl:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="vintage-heading m-0 text-[30px] font-bold leading-[1.1] @5xl:text-[40px]">Stel je ploeg samen</h1>
        <p className="m-0 text-sm text-muted-foreground @5xl:text-[15px]">{sub}</p>
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
  onKies,
}: {
  label: string;
  rijder: PsRijder | null;
  leegTekst: string;
  actief: boolean;
  wijzigbaar: boolean;
  onKies: () => void;
}) {
  if (rijder) {
    return (
      <li
        className={cn(
          "flex min-h-[62px] items-center gap-2 border-b border-border py-2 pl-3.5 pr-1 last:border-b-0",
          actief && ACTIEF,
        )}
      >
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
      <li className="flex min-h-[58px] flex-col justify-center border-b border-border px-3.5 py-2 last:border-b-0">
        <span className={SLOT_LABEL}>{label}</span>
        <span className="text-[15px] text-muted-foreground">Niet gekozen</span>
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
          "flex min-h-[58px] w-full flex-col items-start justify-center px-3.5 py-2 text-left text-primary hover:bg-secondary/60",
          FOCUS,
          actief && ACTIEF,
        )}
      >
        <span className={SLOT_LABEL}>{label}</span>
        <span className="text-[15px] font-bold">+ {leegTekst}</span>
      </button>
    </li>
  );
}

type Knoppen = { primair: ReactNode; secundair: ReactNode | null };

function maakKnoppen(p: {
  ingelogd: boolean;
  ingediend: boolean;
  compleet: boolean;
  bezig: PsBezig | null;
  volgwagenPad: string;
  onOpslaan: () => void;
  onBevestigen: () => void;
  onAanpassen: () => void;
  onInloggen: () => void;
}): Knoppen {
  const bezig = p.bezig != null;
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
  if (p.ingediend) {
    return {
      primair: (
        <Link to={p.volgwagenPad} className={KNOP_PRIMAIR}>
          Naar je Volgwagen
        </Link>
      ),
      secundair: (
        <button
          type="button"
          className={KNOP_SECUNDAIR}
          disabled={bezig}
          aria-busy={p.bezig === "aanpassen" || undefined}
          onClick={p.onAanpassen}
        >
          {p.bezig === "aanpassen" ? "Bezig…" : "Aanpassen"}
        </button>
      ),
    };
  }
  return {
    primair: (
      <button
        type="button"
        className={KNOP_PRIMAIR}
        disabled={!p.compleet || bezig}
        aria-busy={p.bezig === "bevestigen" || undefined}
        onClick={p.onBevestigen}
      >
        {p.bezig === "bevestigen" ? "Bezig…" : "Ploeg bevestigen"}
      </button>
    ),
    secundair: (
      <button
        type="button"
        className={KNOP_SECUNDAIR}
        disabled={bezig}
        aria-busy={p.bezig === "opslaan" || undefined}
        onClick={p.onOpslaan}
      >
        {p.bezig === "opslaan" ? "Bezig…" : "Opslaan"}
      </button>
    ),
  };
}

function Actiebalk({
  modus,
  tel,
  deadline,
  ingediend,
  knoppen,
}: {
  modus: "vast" | "inline";
  tel: Telling;
  deadline: Date | null;
  ingediend: boolean;
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
          <span className="flex items-center gap-1.5 tabular-nums">
            {ingediend && (
              <>
                <Check aria-hidden className="size-4 self-center text-primary" strokeWidth={2.5} />
                <span className="font-bold">Ingeschreven</span>
                <span aria-hidden className="text-muted-foreground">
                  ·
                </span>
              </>
            )}
            <span>
              <strong className="font-bold">
                {tel.gekozen}/{tel.vereist}
              </strong>{" "}
              gekozen
            </span>
          </span>
          {deadline && <span className="text-right text-muted-foreground">Deadline {mmMoment(deadline)}</span>}
        </div>
        <div className="flex gap-2.5 [&>*]:flex-1">
          {knoppen.secundair}
          {knoppen.primair}
        </div>
      </div>
    </div>
  );
}

function uitleg(opties: { ingediend: boolean; deadline: Date | null; meerPerCategorie: boolean }): string {
  const tot = opties.deadline ? `tot de inschrijving sluit (${mmMoment(opties.deadline)})` : "tot de inschrijving sluit";
  // De database laat na het sluiten geen enkele wijziging meer toe: er zijn
  // geen wissels per wedstrijd, en dat zeggen we dan ook.
  const vast = "Daarna ligt je ploeg vast voor het hele seizoen; wisselen per wedstrijd kan niet.";
  if (opties.ingediend) return `Aanpassen kan ${tot}. ${vast}`;
  const kiezen = opties.meerPerCategorie
    ? "Kies per categorie het aangegeven aantal rijders."
    : "Kies per categorie één rijder.";
  return `${kiezen} Wisselen kan ${tot}. ${vast} Alleen een bevestigde ploeg doet mee.`;
}

// ── Het scherm ────────────────────────────────────────────────────────────

export function PloegSamenstellen(props: PloegSamenstellenProps) {
  const {
    gameNaam,
    categorieen,
    gekozen,
    jokers,
    deadline,
    ingelogd,
    ingediend,
    heropend,
    bezig,
    fout,
    koersbalk,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const zoekRef = useRef<HTMLInputElement>(null);
  const naamIdMobiel = useId();
  const naamIdBreed = useId();
  const slotsKopId = useId();
  const jokersKopId = useId();

  const [actief, setActief] = useState<KiesDoel | null>(null);
  const [ladeOpen, setLadeOpen] = useState(false);
  const [zoek, setZoek] = useState("");

  const slots = useMemo(() => bouwSlots(categorieen, gekozen), [categorieen, gekozen]);
  const tel = useMemo(() => telling(categorieen, gekozen), [categorieen, gekozen]);
  const nogOpen = useMemo(() => nogOpenTekst(categorieen, gekozen), [categorieen, gekozen]);
  const jokerRijders = useMemo(
    () =>
      jokers
        ? Array.from({ length: MAX_JOKERS }, (_, i) => jokers.pool.find((r) => r.id === jokers.gekozen[i]) ?? null)
        : [],
    [jokers],
  );

  const wijzigbaar = !ingediend;

  // Zonder eigen keuze staat de eerste lege plek in de middelste kolom.
  const doel = useMemo<KiesDoel | null>(() => {
    if (actief) return actief;
    const standaard = slots.find((s) => !s.rijder) ?? slots[0];
    return standaard ? { soort: "categorie", categorieId: standaard.categorie.id, plek: standaard.plek } : null;
  }, [actief, slots]);

  const doelInfo = useMemo(() => {
    if (!doel) return null;
    if (doel.soort === "joker") {
      if (!jokers) return null;
      return {
        titel: `Joker ${doel.plek + 1}`,
        rijders: jokers.pool,
        huidig: jokerRijders[doel.plek] ?? null,
        leeg: "Kies een rijder van buiten de categorieën.",
      };
    }
    const slot = slots.find((s) => s.categorie.id === doel.categorieId && s.plek === doel.plek);
    if (!slot) return null;
    return {
      titel: slotLabel(slot),
      rijders: slot.categorie.rijders,
      huidig: slot.rijder,
      leeg: slot.categorie.max > 1 ? "Kies een rijder voor deze plek." : "Kies één rijder.",
    };
  }, [doel, jokers, jokerRijders, slots]);

  const rijen = useMemo(() => {
    if (!doelInfo) return [];
    const bezet = new Set<string>();
    for (const s of slots) if (s.rijder) bezet.add(s.rijder.id);
    for (const r of jokerRijders) if (r) bezet.add(r.id);
    if (doelInfo.huidig) bezet.delete(doelInfo.huidig.id);
    return kandidaten(doelInfo.rijders, { huidig: doelInfo.huidig?.id ?? null, bezet, zoek });
  }, [doelInfo, slots, jokerRijders, zoek]);

  const kiesPlek = (d: KiesDoel) => {
    if (!zelfdeDoel(d, doel)) setZoek("");
    setActief(d);
    const breed = (rootRef.current?.clientWidth ?? 0) >= BREED_PX;
    if (breed) {
      // De kandidaten staan al in beeld; zet de cursor in het zoekveld.
      requestAnimationFrame(() => zoekRef.current?.focus({ preventScroll: true }));
    } else {
      setLadeOpen(true);
    }
  };

  const rijActie = {
    kiesbaar: wijzigbaar,
    bezig: bezig === "kiezen",
    huidigeNaam: doelInfo?.huidig?.naam ?? null,
    onKies: (rijderId: string) => {
      if (!doel) return;
      props.onKies(doel, rijderId);
      // Vastzetten: anders schuift de tabel zelf door naar de volgende lege
      // plek en verdwijnt je keuze uit beeld. Doorgaan doe je zelf.
      setActief(doel);
      setLadeOpen(false);
    },
    onHaalWeg: () => {
      if (!doel) return;
      props.onHaalWeg(doel);
      setLadeOpen(false);
    },
  };

  const knoppen = maakKnoppen({
    ingelogd,
    ingediend,
    compleet: tel.compleet,
    bezig,
    volgwagenPad: props.volgwagenPad,
    onOpslaan: props.onOpslaan,
    onBevestigen: props.onBevestigen,
    onAanpassen: props.onAanpassen,
    onInloggen: props.onInloggen,
  });

  const naamVeld = (id: string) => (
    <PloegnaamVeld
      id={id}
      waarde={props.ploegnaam}
      bewaard={props.ploegnaamBewaard}
      ingelogd={ingelogd}
      onChange={props.onPloegnaam}
      onKlaar={props.onPloegnaamKlaar}
    />
  );

  const isActief = (d: KiesDoel) => zelfdeDoel(d, doel);
  const meerPerCategorie = categorieen.some((c) => c.max > 1);

  return (
    <div ref={rootRef} data-eigen-typografie className="@container font-inter text-foreground">
      {koersbalk}

      <div
        className={cn(
          "mx-auto flex max-w-2xl flex-col gap-4 pt-2 @5xl:max-w-[1200px] @5xl:gap-5 @5xl:pb-12",
          // Ruimte voor de vaste actiebalk, anders valt de uitleg eronder.
          (props.actiebalk ?? "vast") === "vast" ? "pb-[150px]" : "pb-4",
        )}
      >
        <Kop sub={ondertitel(gameNaam, categorieen)} deadline={deadline} />

        {ingediend && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-[9px] border-2 border-foreground bg-card px-3.5 py-3 shadow-[3px_3px_0_hsl(var(--foreground))] @5xl:hidden"
          >
            <span className="sticker shrink-0 gap-1">
              <Check aria-hidden className="size-3" strokeWidth={3} />
              Ingeschreven
            </span>
            <p className="m-0 text-sm leading-normal">Je ploeg is bevestigd en doet mee.</p>
          </div>
        )}
        {!ingediend && heropend && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-[9px] border border-[var(--mm-alert-line)] bg-[var(--mm-alert-bg)] px-3.5 py-3 text-[var(--mm-alert-fg)]"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-[18px] shrink-0" strokeWidth={2} />
            <p className="m-0 text-sm leading-normal">
              <strong className="font-bold">Je ploeg is weer een concept.</strong> Bevestig hem opnieuw als je klaar
              bent: alleen een bevestigde ploeg doet mee.
            </p>
          </div>
        )}

        <div className="rounded-[9px] border border-border bg-card px-3.5 py-3 @5xl:hidden">{naamVeld(naamIdMobiel)}</div>

        {fout && (
          <p role="alert" className="m-0 rounded-[9px] border border-border bg-card px-3.5 py-3 text-sm text-muted-foreground">
            {fout}
          </p>
        )}

        <div className="grid items-start gap-4 @5xl:grid-cols-[340px_minmax(0,1fr)_260px] @5xl:gap-7">
          <div className="flex flex-col gap-4">
            <section aria-labelledby={slotsKopId} className="retro-border no-hover-lift overflow-hidden bg-card">
              <h2 id={slotsKopId} className="sr-only">
                Jouw rijders
              </h2>
              {slots.length === 0 ? (
                <p className="m-0 px-3.5 py-4 text-sm text-muted-foreground">
                  De categorieën zijn nog niet ingedeeld. Kom later terug om je ploeg samen te stellen.
                </p>
              ) : (
                <ul role="list" className="m-0 list-none p-0">
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
                        onKies={() => kiesPlek(d)}
                      />
                    );
                  })}
                </ul>
              )}
            </section>

            {jokers && (
              <section aria-labelledby={jokersKopId} className="retro-border no-hover-lift overflow-hidden bg-card">
                <div className="border-b border-border px-3.5 py-3">
                  <h2 id={jokersKopId} className="m-0 text-[15px] font-bold">
                    Jokers <span className="font-normal text-muted-foreground">· optioneel</span>
                  </h2>
                  <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                    Twee extra rijders van buiten de categorieën.
                    {jokers.vermenigvuldiger > 1 && ` Hun punten tellen ×${jokers.vermenigvuldiger}.`}
                  </p>
                </div>
                <ul role="list" className="m-0 list-none p-0">
                  {jokerRijders.map((rijder, plek) => {
                    const d: KiesDoel = { soort: "joker", plek };
                    return (
                      <SlotRij
                        key={plek}
                        label={`Joker ${plek + 1}`}
                        rijder={rijder}
                        leegTekst="Kies een joker"
                        actief={isActief(d)}
                        wijzigbaar={wijzigbaar}
                        onKies={() => kiesPlek(d)}
                      />
                    );
                  })}
                </ul>
              </section>
            )}

            <p className="mop-card m-0 px-3.5 py-3 text-sm leading-normal">
              {uitleg({ ingediend, deadline, meerPerCategorie })}
            </p>
          </div>

          <div className="hidden @5xl:block">
            {ingediend ? (
              // Na bevestigen valt er niets te kiezen; zeg wat wél kan, en wat
              // Aanpassen kost, vóór iemand erop drukt.
              <section className="retro-border no-hover-lift flex flex-col gap-3 bg-card px-5 py-[18px]">
                <span className="sticker w-fit gap-1">
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                  Ingeschreven
                </span>
                <h2 className="heading-oswald m-0 text-[22px] text-foreground">Je ploeg doet mee</h2>
                <p className="m-0 text-[15px] leading-normal text-secondary-foreground">
                  Wil je nog wisselen? Kies Aanpassen
                  {deadline ? `; dat kan tot ${mmMoment(deadline)}` : ""}. Bevestig je ploeg daarna opnieuw, anders
                  doet hij niet mee.
                </p>
              </section>
            ) : (
              doelInfo && (
                <KandidatenTabel
                  titel={doelInfo.titel}
                  rijen={rijen}
                  totaal={doelInfo.rijders.length}
                  zoek={zoek}
                  onZoek={setZoek}
                  zoekRef={zoekRef}
                  actie={rijActie}
                />
              )
            )}
          </div>

          <aside
            aria-label="Samenvatting"
            className="retro-border no-hover-lift hidden flex-col gap-3 bg-card p-[18px] @5xl:sticky @5xl:top-4 @5xl:flex"
          >
            {naamVeld(naamIdBreed)}
            <div aria-hidden className="h-px bg-border" />
            <p className="m-0 font-oswald text-[48px] font-bold leading-none tabular-nums">
              {tel.gekozen}/{tel.vereist}
              <span className="sr-only"> gekozen</span>
            </p>
            <p className="m-0 text-sm text-muted-foreground">
              {ingediend
                ? "Je ploeg doet mee."
                : tel.vereist === 0
                  ? "Er zijn nog geen categorieën."
                  : (nogOpen ?? "Compleet. Bevestig je ploeg om mee te doen.")}
            </p>
            {knoppen.primair}
            {knoppen.secundair}
          </aside>
        </div>
      </div>

      <Actiebalk
        modus={props.actiebalk ?? "vast"}
        tel={tel}
        deadline={deadline}
        ingediend={ingediend}
        knoppen={knoppen}
      />

      {doelInfo && (
        <KiesLade
          open={ladeOpen}
          onOpenChange={setLadeOpen}
          titel={doelInfo.titel}
          omschrijving={
            doelInfo.huidig && wijzigbaar
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
  koersbalk?: ReactNode;
  /** "Meermarathon Vrouwen" */
  gameNaam: string;
  /** "Vrouwen" */
  label: string;
  reden: SluitReden;
  /** Wat de speler in deze game heeft; null als dat niet bekend is (uitgelogd). */
  eigen: { fase: MmFase; ploegnaam: string | null } | null;
  /** De andere game van het seizoen, als die wél open staat. */
  alternatief: { id: string; label: string } | null;
  onAlternatief?: (gameId: string) => void;
  volgwagenPad: string;
  uitslagenPad: string;
};

export function PloegSamenstellenGesloten({
  koersbalk,
  gameNaam,
  label,
  reden,
  eigen,
  alternatief,
  onAlternatief,
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
      {koersbalk}
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

        {alternatief && onAlternatief && (
          <section className="flex flex-col gap-2.5 rounded-[9px] border border-border bg-card/60 p-4 @md:px-6 @md:py-5">
            <p className="m-0 font-display text-lg font-bold leading-tight">
              De inschrijving voor de {alternatief.label} is wel open
            </p>
            <div>
              <button
                type="button"
                className={cn(KNOP_PRIMAIR, "w-full @md:w-fit")}
                onClick={() => onAlternatief(alternatief.id)}
              >
                Stel je {alternatief.label}-ploeg samen
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function PloegSamenstellenLaden({ koersbalk }: { koersbalk?: ReactNode }) {
  return (
    <div data-eigen-typografie className="@container font-inter text-foreground">
      {koersbalk}
      <div aria-busy="true" className="mx-auto flex max-w-2xl flex-col gap-4 pb-12 pt-2 @5xl:max-w-[1200px]">
        <header className="flex flex-col gap-1">
          <h1 className="vintage-heading m-0 text-[30px] font-bold leading-[1.1] @5xl:text-[40px]">Stel je ploeg samen</h1>
          <p className="m-0 text-sm text-muted-foreground">Je ploeg wordt opgehaald…</p>
        </header>
        <div aria-hidden className="grid items-start gap-4 @5xl:grid-cols-[340px_minmax(0,1fr)_260px] @5xl:gap-7">
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
