/**
 * Mijn Meermarathon — de weergave, zonder data-hooks (zie MijnMeermarathon.tsx
 * voor de container). Per game een kaart: meedoen = harde retro-kaart met
 * stand, volgende wedstrijd, deadline en één knop; niet meedoen = zachte
 * uitnodiging zonder harde schaduw.
 *
 * Reageert op de eigen breedte (container queries), niet op het scherm: het
 * blok staat in de kolom van de Krant-tab, en zo toont de testbank mobiel en
 * desktop naast elkaar.
 */
import { useId, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import WedstrijdKalender from "@/components/meermarathon/WedstrijdKalender";
import { bouwKalender } from "@/lib/meermarathonKalender";
import { mmMoment, vandaagIso, type MeermarathonGameStatus } from "@/lib/meermarathonSeizoen";
import {
  deadlineRegel,
  doetMee,
  gameNaam,
  kaartActie,
  kaartPil,
  kalenderGameId,
  klassementStat,
  mijnKop,
  ploegStat,
  uitnodiging,
  volgendeDeadline,
  volgendeStat,
  type KaartActie,
} from "@/lib/mijnMeermarathon";

type Acties = {
  /** Kies deze game en ga naar de Volgwagen. */
  onNaarVolgwagen: (gameId: string) => void;
  /** Kies deze game en ga naar zijn Uitslagen. Zonder: geen rondkijk-links. */
  onRondkijken?: (gameId: string) => void;
};

// ── Bouwstenen ────────────────────────────────────────────────────────────

const KNOP = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] border-2 px-[18px] text-[15px] font-bold",
  "transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);
const KNOP_PRIMAIR = cn(
  KNOP,
  "w-full border-primary bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--primary)/0.5)] hover:bg-primary/90",
);
const KNOP_SECUNDAIR = cn(
  KNOP,
  "border-foreground bg-card text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:bg-secondary",
);
const TEKSTLINK = cn(
  "inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline",
  "rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
);

function teambouwerPad(gameId: string): string {
  // SelectedGameContext kiest via ?game= deze game; de teambouwer volgt hem.
  return `/team-samenstellen?game=${encodeURIComponent(gameId)}`;
}

/** Verloopstreep van 4px bovenin, in de kleur van de game. */
function Streep({ status }: { status: MeermarathonGameStatus }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-1 bg-linear-to-r",
        status.categorie === "vrouwen" ? "from-[var(--mm-v)] to-[var(--mm-v2)]" : "from-[var(--mm-m)] to-[var(--mm-m2)]",
      )}
    />
  );
}

/** "❄ MEERMARATHON VROUWEN" — de naam van de game als kop van de kaart. */
function GameLabel({ status, id }: { status: MeermarathonGameStatus; id: string }) {
  return (
    <h3 id={id} className="m-0 inline-flex min-w-0 items-center gap-1.5 font-inter text-xs font-bold uppercase leading-snug tracking-[0.08em] text-foreground">
      <span
        aria-hidden
        className={cn(
          "grid size-[22px] shrink-0 place-items-center rounded-full bg-[var(--mm-chip)]",
          status.categorie === "vrouwen" ? "text-[var(--mm-v)]" : "text-[var(--mm-m)]",
        )}
      >
        <Snowflake className="size-3.5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0">{gameNaam(status)}</span>
    </h3>
  );
}

function Stat({ label, waarde, sub, groot }: { label: string; waarde: ReactNode; sub: ReactNode; groot?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "m-0",
          groot
            ? "font-oswald text-[30px] font-bold leading-[1.05] tracking-[0.01em] tabular-nums @2xl:text-[40px]"
            : "text-[15px] font-bold leading-snug",
        )}
      >
        {waarde}
      </dd>
      {sub != null && <dd className="m-0 text-[13px] tabular-nums text-muted-foreground">{sub}</dd>}
    </div>
  );
}

function Actie({ actie, gameId, acties, primair }: { actie: KaartActie; gameId: string; acties: Acties; primair: boolean }) {
  const klas = primair ? KNOP_PRIMAIR : KNOP_SECUNDAIR;
  if (actie.soort === "volgwagen") {
    return (
      <button type="button" className={klas} onClick={() => acties.onNaarVolgwagen(gameId)}>
        {actie.tekst}
      </button>
    );
  }
  if (actie.soort === "teambouwer") {
    return (
      <Link to={teambouwerPad(gameId)} className={klas}>
        {actie.tekst}
      </Link>
    );
  }
  // Het klassement staat onder Uitslagen; zonder route daarheen geen knop.
  if (!acties.onRondkijken) return null;
  const naar = acties.onRondkijken;
  return (
    <button type="button" className={klas} onClick={() => naar(gameId)}>
      {actie.tekst}
    </button>
  );
}

// ── Kaarten ───────────────────────────────────────────────────────────────

function GameKaart({ status, nu, acties }: { status: MeermarathonGameStatus; nu: Date; acties: Acties }) {
  const titelId = useId();
  const pil = kaartPil(status);
  const regel = deadlineRegel(status, nu);
  const volgende = volgendeStat(status, vandaagIso(nu));
  const actie = kaartActie(status);

  let eersteStat: ReactNode;
  if (status.fase === "ingeschreven") {
    const k = klassementStat(status);
    eersteStat =
      k.soort === "stand" ? (
        <Stat
          label="Klassement"
          groot
          waarde={k.rang}
          sub={
            <>
              van {k.totaal}
              {k.delta != null && (
                <>
                  {" · "}
                  <span aria-hidden>
                    {k.delta > 0 ? "▲" : "▼"} {Math.abs(k.delta)}
                  </span>
                  <span className="sr-only">
                    , {Math.abs(k.delta)} {Math.abs(k.delta) === 1 ? "plaats" : "plaatsen"} {k.delta > 0 ? "gestegen" : "gezakt"}
                  </span>
                </>
              )}
            </>
          }
        />
      ) : (
        <Stat
          label="Klassement"
          groot
          waarde={
            <>
              <span aria-hidden>–</span>
              <span className="sr-only">nog geen plek</span>
            </>
          }
          sub={k.toelichting}
        />
      );
  } else {
    const p = ploegStat(status);
    eersteStat = <Stat label="Jouw ploeg" groot waarde={p.waarde} sub={p.sub} />;
  }

  return (
    <section aria-labelledby={titelId} className="retro-border no-hover-lift overflow-hidden bg-card text-card-foreground">
      <Streep status={status} />
      <div className="flex flex-col gap-3.5 p-4 @2xl:px-6 @2xl:py-[22px]">
        <div className="flex items-center justify-between gap-2.5">
          <GameLabel status={status} id={titelId} />
          <span
            className={cn(
              // Mag op een smal scherm over twee regels ("Ploeg niet / compleet"), zoals het ontwerp.
              "inline-flex items-center gap-1 rounded-full border px-[7px] py-0.5 text-[10px] font-bold uppercase leading-[1.3] tracking-[0.08em]",
              pil.soort === "ingeschreven"
                ? "border-primary/35 bg-primary/12 text-foreground"
                : "border-[var(--mm-alert-line)] bg-[var(--mm-alert-bg)] text-[var(--mm-alert-fg)]",
            )}
          >
            {pil.soort === "ingeschreven" && <Check aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />}
            {pil.tekst}
          </span>
        </div>

        <dl className="m-0 grid grid-cols-2 gap-3">
          {eersteStat}
          <Stat label="Volgende" waarde={volgende.waarde} sub={volgende.sub} />
        </dl>

        {regel && (
          <p
            className={cn(
              "m-0 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm leading-snug",
              regel.toon === "alert" ? "bg-[var(--mm-alert-bg)] text-[var(--mm-alert-fg)]" : "bg-background text-foreground",
            )}
          >
            <Clock aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
            <span>
              {regel.voor}
              {regel.moment && <strong className="font-bold">{regel.moment}</strong>}
              {regel.na}
            </span>
          </p>
        )}

        <Actie actie={actie} gameId={status.game.id} acties={acties} primair={actie.soort !== "klassement"} />
      </div>
    </section>
  );
}

function UitnodigingKaart({
  status,
  ookAl,
  nu,
  acties,
}: {
  status: MeermarathonGameStatus;
  ookAl: boolean;
  nu: Date;
  acties: Acties;
}) {
  const titelId = useId();
  const u = uitnodiging(status, ookAl, nu);
  const rondkijken = u.rondkijken ? acties.onRondkijken : undefined;
  return (
    <section aria-labelledby={titelId} className="overflow-hidden rounded-[9px] border border-border bg-card/60">
      <Streep status={status} />
      <div className="flex flex-col gap-2.5 p-4 @2xl:px-6 @2xl:py-[22px]">
        <GameLabel status={status} id={titelId} />
        <p className="m-0 font-display text-xl font-bold leading-[1.25] text-foreground @2xl:text-2xl">{u.titel}</p>
        <p className="m-0 text-[14.5px] leading-normal text-secondary-foreground">{u.tekst}</p>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 pt-1">
          <Actie actie={u.actie} gameId={status.game.id} acties={acties} primair={false} />
          {rondkijken && (
            <button type="button" className={TEKSTLINK} onClick={() => rondkijken(status.game.id)}>
              Eerst rondkijken
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Kop ───────────────────────────────────────────────────────────────────

function Kop({ titelId, children, rechts }: { titelId: string; children?: ReactNode; rechts?: ReactNode }) {
  return (
    <header className="flex flex-col gap-0.5 @2xl:flex-row @2xl:items-end @2xl:justify-between @2xl:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="editor-eyebrow">Krant · vandaag</span>
        {/* Mobiel een Oswald-krantenkop, desktop de Playfair-kapitalen. */}
        <h2 id={titelId} className="m-0 mt-1.5 @2xl:mt-2">
          <span className="heading-oswald block text-[30px] @2xl:hidden">Mijn Meermarathon</span>
          <span className="vintage-heading hidden text-[34px] font-bold leading-tight @2xl:block">Mijn Meermarathon</span>
        </h2>
        {children}
      </div>
      {rechts}
    </header>
  );
}

// ── Het blok ──────────────────────────────────────────────────────────────

export function MijnMeermarathonOverzicht({
  statussen,
  gekozenGameId,
  nu,
  onNaarVolgwagen,
  onRondkijken,
  className,
}: Acties & {
  statussen: MeermarathonGameStatus[];
  /** De game die elders gekozen is; bepaalt voor welke game de kalender punten toont. */
  gekozenGameId: string | null;
  nu: Date;
  className?: string;
}) {
  const titelId = useId();
  const acties: Acties = { onNaarVolgwagen, onRondkijken };
  const kop = mijnKop(statussen);
  const deadline = volgendeDeadline(statussen, nu);
  const ookAl = statussen.some(doetMee);
  const kalender = useMemo(
    () => bouwKalender(statussen, kalenderGameId(statussen, gekozenGameId)),
    [statussen, gekozenGameId],
  );

  return (
    <div data-eigen-typografie className={cn("@container font-inter", className)}>
      <section aria-labelledby={titelId} className="flex flex-col gap-[18px] pb-8 @2xl:gap-5 @2xl:pb-10">
        <Kop
          titelId={titelId}
          rechts={
            deadline && (
              <p className="m-0 hidden shrink-0 items-center gap-2 text-[15px] text-foreground @2xl:flex">
                <Clock aria-hidden className="size-[18px]" strokeWidth={2} />
                <span>
                  Volgende deadline: <strong className="font-bold">{mmMoment(deadline)}</strong>
                </span>
              </p>
            )
          }
        >
          <p className="m-0 text-sm text-muted-foreground @2xl:text-[15px]">
            <span className="@2xl:hidden">
              {kop.zin}
              {kop.seizoen && ` · seizoen ${kop.seizoen}`}
            </span>
            <span className="hidden @2xl:inline">
              {kop.uitnodiging ? `${kop.zin}: ${kop.uitnodiging.charAt(0).toLowerCase()}${kop.uitnodiging.slice(1)}` : kop.zin}
            </span>
          </p>
        </Kop>

        {kop.uitnodiging && (
          <p className="m-0 text-[15px] leading-[1.55] text-secondary-foreground @2xl:hidden">
            {kop.uitnodiging} en volg ze het hele seizoen.
          </p>
        )}

        <div className="grid items-start gap-[18px] @2xl:grid-cols-2 @2xl:gap-7">
          {statussen.map((s) =>
            doetMee(s) ? (
              <GameKaart key={s.game.id} status={s} nu={nu} acties={acties} />
            ) : (
              <UitnodigingKaart key={s.game.id} status={s} ookAl={ookAl} nu={nu} acties={acties} />
            ),
          )}
        </div>

        {/* Desktop: het ontwerp zet hier IJsjournaal links en de kalender
            rechts. Het IJsjournaal volgt onder dit blok op volle breedte, dus
            de kalender krijgt de rechterkolom, onder de tweede kaart. Mobiel
            laat hem weg, zoals het mobiele ontwerp. */}
        {kalender.length > 0 && (
          <div className="hidden @2xl:block">
            <div aria-hidden className="vintage-ornament mb-6 mt-1.5">
              <span className="vintage-ornament-symbol">❄</span>
            </div>
            <div className="grid grid-cols-2 gap-7">
              <WedstrijdKalender className="col-start-2" titel="Komende wedstrijden" rijen={kalender} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** Rustige laadstaat: kop en twee lege kaarten, zonder te knipperen bij reduced motion. */
export function MijnMeermarathonLaden({ className }: { className?: string }) {
  const titelId = useId();
  return (
    <div data-eigen-typografie className={cn("@container font-inter", className)}>
      <section aria-labelledby={titelId} aria-busy="true" className="flex flex-col gap-[18px] pb-8 @2xl:gap-5 @2xl:pb-10">
        <Kop titelId={titelId}>
          <p className="m-0 text-sm text-muted-foreground @2xl:text-[15px]">Je games worden opgehaald…</p>
        </Kop>
        <div aria-hidden className="grid items-start gap-[18px] @2xl:grid-cols-2 @2xl:gap-7">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-[9px] border border-border bg-card/60">
              <div className="h-1 bg-secondary" />
              <div className="flex flex-col gap-3.5 p-4 motion-safe:animate-pulse @2xl:px-6 @2xl:py-[22px]">
                <div className="h-[22px] w-1/2 rounded-full bg-secondary" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-14 rounded-md bg-secondary" />
                  <div className="h-14 rounded-md bg-secondary" />
                </div>
                <div className="h-11 rounded-[9px] bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
