/**
 * Oude spellen — het archief op /profiel. Links (telefoon: eerst) het
 * archiefkastje met elke koers die je hebt gereden, per seizoen; kies je er
 * een, dan laadt rechts (telefoon: in plaats van de lijst) het dossier van die
 * koers: je eindstand, je punten per rit, het eindklassement rond jou, je
 * ploeg en je subpoules.
 *
 * Puur weergave: de pagina haalt de lijst (usePalmares) en het dossier op en
 * geeft ze hier door, zodat de testbank hetzelfde scherm op nepdata toont.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, CornerDownRight, FolderOpen, RotateCcw, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import Stamp from "@/components/retro/Stamp";
import Medaillon from "@/components/profiel/Medaillon";
import { koersBeeld } from "@/components/profiel/koersBeeld";
import { KoersIcoon, MiniStempel, naamEnJaar, raceGradient } from "@/components/koersSegment";
import type { GameRow } from "@/hooks/useAllGames";
import type { PalmaresGame } from "@/hooks/usePalmares";
import { isMeermarathonGame } from "@/lib/gameTypes";

export type ArchiefRit = {
  nummer: number;
  naam: string | null;
  punten: number;
  /** Jouw plaats in de daguitslag van deze rit. */
  plaats: number | null;
};

export type ArchiefKlassementRij = {
  rang: number;
  ploegnaam: string;
  naam: string | null;
  punten: number;
  ikZelf: boolean;
  /** Er zitten rijen tussen deze en de vorige (de ⋯ in het klassement). */
  gatErvoor: boolean;
};

export type ArchiefRenner = {
  naam: string;
  ploeg: string | null;
  punten: number;
  joker?: boolean;
  opgave?: boolean;
};

export type ArchiefSubpoule = {
  id: string;
  naam: string;
  rang: number;
  leden: number;
};

export type ArchiefDossier = {
  ploegnaam: string | null;
  ritten: ArchiefRit[];
  /** Top van het klassement plus de rijen rond jou, oplopend op rang. */
  klassement: ArchiefKlassementRij[];
  ploeg: ArchiefRenner[];
  subpoules: ArchiefSubpoule[];
};

/** Een koers uit de erelijst, bij de Meermarathon met het peloton erbij. */
export type ArchiefKoers = PalmaresGame & { categorie?: string | null };

type Props = {
  koersen: ArchiefKoers[];
  gekozenId: string | null;
  onKies: (gameId: string | null) => void;
  dossier: ArchiefDossier | null;
  laden: boolean;
  /** Laden mislukt: melding met een knop om het opnieuw te proberen. */
  fout?: boolean;
  onOpnieuw?: () => void;
  /** Opent de koers in Mijn Peloton (terugkijk-strook bovenaan). */
  onOpenInPeloton?: (gameId: string) => void;
};

const alsGameRow = (k: ArchiefKoers): GameRow => ({
  id: k.game_id,
  name: k.game_name,
  year: k.year ?? 0,
  status: k.status,
  game_type: k.game_type,
  categorie: k.categorie ?? null,
});

/** "Tour" / "Meermarathon Vrouwen" + jaartal, zoals in het archiefkastje. */
function koersNaam(k: ArchiefKoers) {
  const { naam, jaar } = naamEnJaar(alsGameRow(k));
  const peloton = isMeermarathonGame(k.game_type) && k.categorie ? ` ${k.categorie[0].toUpperCase()}${k.categorie.slice(1)}` : "";
  return { naam: naam + peloton, jaar };
}

/** De Meermarathon rijdt wedstrijden, geen ritten: i18n-context "mm". */
const labelContext = (k: ArchiefKoers) => (isMeermarathonGame(k.game_type) ? "mm" : undefined);

const topProcent = (k: PalmaresGame) =>
  k.my_rank > 0 && k.total_participants > 0 ? Math.max(0.1, (k.my_rank / k.total_participants) * 100) : null;

function perSeizoen(koersen: ArchiefKoers[]) {
  const map = new Map<number, ArchiefKoers[]>();
  for (const k of koersen) map.set(k.year ?? 0, [...(map.get(k.year ?? 0) ?? []), k]);
  return [...map.entries()].sort(([a], [b]) => b - a);
}

// ── Archiefkastje ───────────────────────────────────────────────────────────

function Archiefkast({ koersen, gekozenId, onKies }: Pick<Props, "koersen" | "gekozenId" | "onKies">) {
  const { t, i18n } = useTranslation();
  return (
    <nav aria-label={t("profiel.oudeSpellen.titel")} className="space-y-5">
      {perSeizoen(koersen).map(([jaar, lijst]) => (
        <section key={jaar}>
          {/* Seizoenskop als tabje op een dossiermap: het lijntje loopt vanaf
              de onderrand van het tabje door naar rechts. */}
          <div className="mb-2 flex items-end">
            <h3 className="rounded-t-[6px] border-2 border-b-0 border-foreground/35 bg-card px-3 pb-1 pt-[5px] font-mono text-[11px] font-bold leading-none tracking-[0.2em] text-muted-foreground">{jaar || "—"}</h3>
            <span aria-hidden className="h-0.5 flex-1 bg-foreground/35" />
          </div>
          <ul className="space-y-2">
            {lijst.map((k) => {
              const gekozen = k.game_id === gekozenId;
              const { naam, jaar: jaartal } = koersNaam(k);
              return (
                <li key={k.game_id}>
                  <button
                    type="button"
                    onClick={() => onKies(k.game_id)}
                    aria-current={gekozen ? "true" : undefined}
                    className={cn(
                      "relative flex w-full min-h-[60px] items-center gap-3 overflow-hidden rounded-[10px] border-2 bg-card py-2.5 pl-5 pr-3 text-left transition-[transform,box-shadow,background-color] duration-100 motion-reduce:transition-none",
                      "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                      gekozen
                        ? "translate-x-1 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                        : "border-foreground/25 hover:border-foreground/60 hover:bg-secondary/40 active:translate-y-px",
                    )}
                  >
                    {/* Rug van de dossiermap in de landskleuren. */}
                    <span aria-hidden className="absolute inset-y-0 left-0 w-2" style={{ background: raceGradient(k.game_type) }} />
                    <KoersIcoon game={alsGameRow(k)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className={cn("truncate font-display text-[16px]", gekozen ? "font-black" : "font-bold")}>{naam}</span>
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">{jaartal}</span>
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                        {k.approved_points.toLocaleString(i18n.language)} pt
                        {k.stage_wins > 0 && ` · ${t("profiel.samenvatting.dagzeges", { context: labelContext(k), count: k.stage_wins })}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-right leading-none">
                      {k.my_rank >= 1 && k.my_rank <= 3 ? (
                        <Medaillon rang={k.my_rank as 1 | 2 | 3} className="h-8 w-8 text-[13px]">{k.my_rank}</Medaillon>
                      ) : (
                        <strong className="block font-oswald text-[22px] font-bold">#{k.my_rank || "—"}</strong>
                      )}
                      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                        {t("profiel.oudeSpellen.van", { total: k.total_participants.toLocaleString(i18n.language) })}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className={cn("h-4 w-4 shrink-0 text-muted-foreground lg:hidden")} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

// ── Dossier ─────────────────────────────────────────────────────────────────

function Kopje({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3 border-b border-foreground/25 pb-1.5">
      <h4 className="heading-oswald text-[17px] md:text-[19px]">{children}</h4>
      {hint && <span className="overline-stamp text-[10px]">{hint}</span>}
    </div>
  );
}

/** Punten per rit als staafjes; een dagzege is goud en krijgt een bekertje. */
function Ritverloop({ ritten, context }: { ritten: ArchiefRit[]; context?: string }) {
  const { t, i18n } = useTranslation();
  const [actief, setActief] = useState<number | null>(null);
  const max = Math.max(1, ...ritten.map((r) => r.punten));
  const n = ritten.length;
  const beste = ritten.reduce<ArchiefRit | null>((b, r) => (!b || r.punten > b.punten ? r : b), null);
  const gemiddeld = n > 0 ? Math.round(ritten.reduce((s, r) => s + r.punten, 0) / n) : 0;
  const toonLabel = (nr: number) => nr === 1 || nr === n || nr % 5 === 0;

  return (
    <div>
      <div className="relative pt-12">
        <div className="relative flex h-[128px] items-end gap-[2px] border-b border-foreground/40 md:h-[148px]" onMouseLeave={() => setActief(null)}>
          {/* Het gemiddelde als gestippelde lijn over de staafjes, "gem." aan het eind. */}
          {n > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/55"
              style={{ bottom: `${Math.min(100, (gemiddeld / max) * 100)}%` }}
            >
              <span className="absolute right-0 top-0 -translate-y-1/2 rounded-sm bg-card px-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-foreground/70">
                {t("profiel.oudeSpellen.gemLabel")}
              </span>
            </span>
          )}
          {ritten.map((r, i) => {
            const dagzege = r.plaats === 1 && r.punten > 0;
            const hoogte = Math.max(2, (r.punten / max) * 100);
            return (
              <button
                key={r.nummer}
                type="button"
                onMouseEnter={() => setActief(i)}
                onFocus={() => setActief(i)}
                onBlur={() => setActief(null)}
                onClick={() => setActief(actief === i ? null : i)}
                aria-label={`${t("profiel.oudeSpellen.rit", { context, n: r.nummer })}: ${t("profiel.oudeSpellen.ritPunten", { punten: r.punten })}${dagzege ? ` (${t("profiel.oudeSpellen.dagzege", { context })})` : ""}`}
                className="group relative flex h-full flex-1 items-end justify-center focus-visible:outline-hidden"
              >
                {actief === i && (
                  <span
                    role="status"
                    className={cn(
                      "pointer-events-none absolute z-20 w-max max-w-[220px] rounded-md border-2 border-foreground bg-card px-2.5 py-1.5 text-left shadow-[2px_2px_0_hsl(var(--foreground))]",
                      i < 3 ? "left-0" : i > n - 4 ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                    style={{ bottom: `calc(${hoogte}% + ${dagzege ? 24 : 8}px)` }}
                  >
                    <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {t("profiel.oudeSpellen.rit", { context, n: r.nummer })}
                      {r.naam && <span className="normal-case tracking-normal"> · {r.naam}</span>}
                    </span>
                    <span className="mt-0.5 block text-[13px] font-semibold">
                      {t("profiel.oudeSpellen.ritPunten", { punten: r.punten.toLocaleString(i18n.language) })}
                      {r.plaats != null && (
                        <span className="font-normal text-muted-foreground"> · {t("profiel.oudeSpellen.ritPlaats", { context, plaats: r.plaats.toLocaleString(i18n.language) })}</span>
                      )}
                    </span>
                  </span>
                )}
                {dagzege && (
                  <span
                    aria-hidden
                    className="absolute left-1/2 -translate-x-1/2 text-[hsl(var(--vintage-gold))]"
                    style={{ bottom: `calc(${hoogte}% + 3px)` }}
                  >
                    <Trophy className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2.4} />
                  </span>
                )}
                <span
                  aria-hidden
                  className={cn(
                    "w-full max-w-[22px] rounded-t-[4px] transition-colors",
                    dagzege ? "border border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold)/0.72)]" : "bg-primary/70 group-hover:bg-primary group-focus-visible:bg-primary",
                    actief === i && !dagzege && "bg-primary",
                    actief === i && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                  )}
                  style={{ height: `${hoogte}%` }}
                />
              </button>
            );
          })}
        </div>
        <div aria-hidden className="mt-1 flex gap-[2px]">
          {ritten.map((r) => (
            <span
              key={r.nummer}
              className={cn(
                "flex-1 text-center font-mono text-[9px] text-muted-foreground md:text-[10px]",
                !toonLabel(r.nummer) && "invisible sm:visible",
              )}
            >
              {r.nummer}
            </span>
          ))}
        </div>
      </div>
      {beste && (
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          <strong className="font-semibold text-foreground">
            {t("profiel.oudeSpellen.besteRit", { context, n: beste.nummer, punten: beste.punten.toLocaleString(i18n.language) })}
          </strong>
          {" · "}
          {t("profiel.oudeSpellen.gemiddeld", { context, punten: gemiddeld.toLocaleString(i18n.language) })}
        </p>
      )}
    </div>
  );
}

function Klassement({ rijen }: { rijen: ArchiefKlassementRij[] }) {
  const { t, i18n } = useTranslation();
  return (
    <ol className="divide-y divide-foreground/12 text-[13.5px]">
      {rijen.flatMap((r, i) => {
        return [
          r.gatErvoor && (
            <li key={`gat-${i}`} aria-hidden className="py-0.5 text-center font-mono text-[12px] leading-none tracking-[0.3em] text-muted-foreground">
              ⋯
            </li>
          ),
          <li
            key={`rij-${i}`}
            className={cn(
              "relative grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5",
              r.ikZelf && "rounded-md bg-[hsl(var(--vintage-gold)/0.16)] pl-4",
            )}
          >
              {/* Dun goudlint langs je eigen rij, met een ingeknipt staartje. */}
              {r.ikZelf && (
                <span
                  aria-hidden
                  className="absolute -top-1 bottom-0.5 left-1 w-1.5 bg-[hsl(var(--vintage-gold))] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]"
                />
              )}
              <span className="font-mono text-[12px] font-bold tabular-nums">
                {r.rang >= 1 && r.rang <= 3 ? (
                  <Medaillon rang={r.rang as 1 | 2 | 3} className="h-6 w-6 text-[11px]">{r.rang}</Medaillon>
                ) : (
                  r.rang.toLocaleString(i18n.language)
                )}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate", r.ikZelf ? "font-bold" : "font-medium")}>
                  {r.ploegnaam}
                  {r.ikZelf && <span className="ml-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("profiel.oudeSpellen.jij")}</span>}
                </span>
                {r.naam && <span className="block truncate text-[11.5px] text-muted-foreground">{r.naam}</span>}
              </span>
              <span className="font-mono text-[12.5px] font-semibold tabular-nums">{r.punten.toLocaleString(i18n.language)}</span>
          </li>,
        ];
      })}
    </ol>
  );
}

function Ploeg({ renners }: { renners: ArchiefRenner[] }) {
  const { t, i18n } = useTranslation();
  const gesorteerd = [...renners].sort((a, b) => b.punten - a.punten);
  const max = Math.max(1, ...gesorteerd.map((r) => r.punten));
  return (
    <ul className="space-y-1 text-[13.5px]">
      {gesorteerd.map((r) => (
        <li key={r.naam} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-1 py-1">
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className={cn("truncate font-medium", r.opgave && "text-muted-foreground line-through decoration-foreground/40")}>{r.naam}</span>
              {r.joker && (
                <span className="relative shrink-0 rounded-[3px] border border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold)/0.2)] px-1.5 font-oswald text-[9px] font-bold uppercase leading-[15px] tracking-[0.1em]">
                  {/* Mini-dossard: een speldje in elke bovenhoek. */}
                  <span aria-hidden className="absolute left-[2px] top-[2px] h-[3px] w-[3px] rounded-full bg-[hsl(var(--vintage-gold))]" />
                  <span aria-hidden className="absolute right-[2px] top-[2px] h-[3px] w-[3px] rounded-full bg-[hsl(var(--vintage-gold))]" />
                  {t("profiel.oudeSpellen.joker")}
                </span>
              )}
              {r.opgave && <MiniStempel>{t("profiel.oudeSpellen.opgave")}</MiniStempel>}
            </span>
            {r.ploeg && <span className="block truncate text-[11px] text-muted-foreground">{r.ploeg}</span>}
            {/* Dun spoor onder de naam: aandeel in de beste renner van je ploeg. */}
            <span aria-hidden className="mt-1 block h-[3px] rounded-full bg-foreground/10">
              <span className="block h-full rounded-full bg-primary/60" style={{ width: `${(r.punten / max) * 100}%` }} />
            </span>
          </span>
          <span className="font-mono text-[12.5px] font-semibold tabular-nums">{r.punten.toLocaleString(i18n.language)}</span>
        </li>
      ))}
    </ul>
  );
}

function DossierSkelet() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-[138px] animate-pulse rounded-[12px] bg-secondary/70" />
      <div className="h-[200px] animate-pulse rounded-[12px] bg-secondary/50" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-[240px] animate-pulse rounded-[12px] bg-secondary/50" />
        <div className="h-[240px] animate-pulse rounded-[12px] bg-secondary/50" />
      </div>
    </div>
  );
}

function Dossier({
  koers,
  dossier,
  laden,
  fout,
  onOpnieuw,
  onOpenInPeloton,
}: Pick<Props, "dossier" | "laden" | "fout" | "onOpnieuw" | "onOpenInPeloton"> & { koers: ArchiefKoers }) {
  const { t, i18n } = useTranslation();
  const procent = topProcent(koers);
  const game = alsGameRow(koers);
  const { naam, jaar } = koersNaam(koers);
  const context = labelContext(koers);
  const beeld = koersBeeld(koers.game_type);

  return (
    <article className="kp-terugkijk space-y-5" aria-busy={laden}>
      {/* Kop van het dossier: welke koers, en hoe je eindigde. */}
      <header className="relative overflow-hidden rounded-[12px] border-2 border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
        <span aria-hidden className="absolute inset-y-0 left-0 w-3" style={{ background: raceGradient(koers.game_type) }} />
        <span aria-hidden className="absolute inset-y-0 left-3 w-px bg-foreground/60" />
        <div className="flex items-start gap-3 py-4 pl-6 pr-4 md:gap-4 md:py-5 md:pl-8 md:pr-6">
          {/* Het racerondje van deze koers, als zegel links op het dossier. */}
          {beeld && (
            <img
              src={beeld.rondje}
              alt=""
              loading="lazy"
              decoding="async"
              className="mt-0.5 h-11 w-11 shrink-0 rounded-full border-2 border-foreground object-cover shadow-[2px_2px_0_hsl(var(--foreground))] md:h-14 md:w-14"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <KoersIcoon game={game} />
              <span className="overline-stamp text-[10px] md:text-[11px]">{t("profiel.oudeSpellen.eindstand")}</span>
            </div>
            <h3 className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-display text-[24px] font-black leading-tight md:text-[30px]">{naam}</span>
              <span className="font-mono text-[13px] font-semibold text-muted-foreground">{jaar}</span>
              <Stamp tone="wine" rotation={-3} className="ml-1 hidden sm:inline-block">{t("oudeKoersen.afgerond")}</Stamp>
            </h3>
            {dossier?.ploegnaam && (
              <p className="mt-1 truncate font-serif text-[14px] italic text-muted-foreground">
                <CornerDownRight aria-hidden className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                {dossier.ploegnaam}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right leading-none">
            <span className="flex items-center justify-end gap-2">
              {/* Top-10: de algemeen-trui van deze koers naast je rang. */}
              {beeld && koers.my_rank >= 1 && koers.my_rank <= 10 && (
                <img src={beeld.trui} alt="" loading="lazy" decoding="async" className="h-9 w-auto object-contain md:h-11" />
              )}
              <strong className="block font-oswald text-[46px] font-bold leading-[0.9] md:text-[60px]">#{koers.my_rank || "—"}</strong>
            </span>
            <span className="mt-1.5 block font-mono text-[11px] text-muted-foreground">
              {t("profiel.oudeSpellen.van", { total: koers.total_participants.toLocaleString(i18n.language) })}
            </span>
            {procent != null && (
              <span className="mt-1.5 inline-block rounded-sm border border-foreground/50 px-1.5 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.08em]">
                {t("profiel.oudeSpellen.top", { percent: procent.toLocaleString(i18n.language, { maximumFractionDigits: 1 }) })}
              </span>
            )}
          </div>
        </div>
        <dl className="ml-[13px] grid grid-cols-3 border-t-2 border-foreground">
          {[
            [t("profiel.oudeSpellen.punten"), koers.approved_points.toLocaleString(i18n.language)],
            [t("profiel.oudeSpellen.dagzeges", { context }), koers.stage_wins],
            [t("profiel.oudeSpellen.ritpodia", { context }), koers.stage_podiums],
          ].map(([label, waarde], i) => (
            <div key={String(label)} className={cn("px-3 py-2 md:px-5", i > 0 && "border-l border-foreground/25")}>
              <dt className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground md:text-[10.5px]">{label}</dt>
              <dd className="font-oswald text-[20px] font-bold leading-tight md:text-[24px]">{waarde}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* De hele koers terugkijken: Mijn Peloton met deze koers gekozen. Staat
          vooraan en hangt niet aan het dossier, dus ook bruikbaar tijdens het
          laden of als dat mislukt. */}
      {onOpenInPeloton && (
        <button
          type="button"
          onClick={() => onOpenInPeloton(koers.game_id)}
          className="kp-knop-fysiek group flex w-full items-center gap-3 px-3.5 py-3 text-left md:gap-4 md:px-5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]"
        >
          {beeld ? (
            <img src={beeld.rondje} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-full border-2 border-foreground object-cover" />
          ) : (
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-foreground bg-primary text-primary-foreground">
              <FolderOpen className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[12.5px] font-bold uppercase tracking-[0.12em] md:text-[13px]">{t("profiel.oudeSpellen.openInPeloton")}</span>
            <span className="mt-0.5 block font-serif text-[13px] italic leading-snug text-muted-foreground">{t("profiel.oudeSpellen.openInPelotonHint")}</span>
          </span>
          <ArrowRight aria-hidden className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2.25} />
        </button>
      )}

      {fout && !dossier ? (
        <div role="alert" className="rounded-[12px] border-2 border-dashed border-foreground/30 px-6 py-8 text-center">
          <p className="font-display text-[17px] font-bold">{t("profiel.oudeSpellen.fout")}</p>
          {onOpnieuw && (
            <button
              type="button"
              onClick={onOpnieuw}
              className="kp-knop-fysiek mt-4 inline-flex items-center gap-2 px-3.5 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]"
            >
              <RotateCcw aria-hidden className="h-4 w-4" strokeWidth={2.25} />
              {t("profiel.oudeSpellen.opnieuw")}
            </button>
          )}
        </div>
      ) : laden || !dossier ? (
        <DossierSkelet />
      ) : (
        <>
          {dossier.ritten.length > 0 && (
            <section className="rounded-[12px] border border-foreground/25 bg-card px-4 pb-3 pt-3 md:px-5">
              <Kopje hint={t("profiel.oudeSpellen.ritverloopHint", { context })}>{t("profiel.oudeSpellen.ritverloop", { context })}</Kopje>
              <Ritverloop ritten={dossier.ritten} context={context} />
            </section>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-[12px] border border-foreground/25 bg-card px-3 pb-2 pt-3 md:px-4">
              <Kopje>{t("profiel.oudeSpellen.klassement")}</Kopje>
              <Klassement rijen={dossier.klassement} />
            </section>
            <section className="rounded-[12px] border border-foreground/25 bg-card px-3 pb-2 pt-3 md:px-4">
              <Kopje>{t("profiel.oudeSpellen.jePloeg")}</Kopje>
              <Ploeg renners={dossier.ploeg} />
            </section>
          </div>

          {dossier.subpoules.length > 0 && (
            <section>
              <Kopje>{t("profiel.oudeSpellen.subpoules")}</Kopje>
              <ul className="flex flex-wrap gap-2">
                {dossier.subpoules.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-[8px] border-2 px-3 py-1.5 text-[13px]",
                      s.rang === 1 ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold)/0.14)]" : "border-foreground/25 bg-card",
                    )}
                  >
                    {s.rang === 1 && <Trophy aria-hidden className="h-3.5 w-3.5 text-[hsl(var(--vintage-gold))]" strokeWidth={2.4} />}
                    <span className="font-semibold">{s.naam}</span>
                    <span className="font-mono text-[11.5px] text-muted-foreground">
                      {t("profiel.oudeSpellen.subpouleRang", { rang: s.rang, leden: s.leden })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </article>
  );
}

// ── Geheel ──────────────────────────────────────────────────────────────────

export default function OudeSpellen({ koersen, gekozenId, onKies, dossier, laden, fout, onOpnieuw, onOpenInPeloton }: Props) {
  const { t } = useTranslation();
  const gekozen = koersen.find((k) => k.game_id === gekozenId) ?? null;
  const dossierRef = useRef<HTMLDivElement>(null);

  // Telefoon: het dossier vervangt de lijst, dus breng de bovenkant ervan in
  // beeld. Op desktop staan ze naast elkaar en blijft alles waar het is.
  useEffect(() => {
    if (!gekozenId || window.matchMedia("(min-width: 1024px)").matches) return;
    dossierRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [gekozenId]);

  if (koersen.length === 0) {
    return (
      <div className="rounded-[12px] border-2 border-dashed border-foreground/30 px-6 py-10 text-center">
        <FolderOpen aria-hidden className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="font-display text-[17px] font-bold">{t("profiel.oudeSpellen.leeg")}</p>
        <p className="mt-1 font-serif text-[14px] italic text-muted-foreground">{t("profiel.oudeSpellen.leegHint")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      {/* Telefoon: lijst óf dossier. Desktop: allebei naast elkaar. */}
      <div className={cn(gekozen && "hidden lg:block", "lg:sticky lg:top-4")}>
        <p className="mb-3 font-serif text-[14px] italic text-muted-foreground">{t("profiel.oudeSpellen.hint")}</p>
        <Archiefkast koersen={koersen} gekozenId={gekozenId} onKies={onKies} />
      </div>

      <div ref={dossierRef} className={cn("scroll-mt-4", !gekozen && "hidden lg:block")}>
        {gekozen ? (
          <>
            <button
              type="button"
              onClick={() => onKies(null)}
              className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground lg:hidden"
            >
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("profiel.oudeSpellen.terug")}
            </button>
            <Dossier key={gekozen.game_id} koers={gekozen} dossier={dossier} laden={laden} fout={fout} onOpnieuw={onOpnieuw} onOpenInPeloton={onOpenInPeloton} />
          </>
        ) : (
          <div className="grid min-h-[320px] place-items-center rounded-[12px] border-2 border-dashed border-foreground/25 px-6 text-center">
            <div>
              <FolderOpen aria-hidden className="mx-auto mb-3 h-10 w-10 text-muted-foreground/45" strokeWidth={1.6} />
              <p className="font-display text-[18px] font-bold">{t("profiel.oudeSpellen.kies")}</p>
              <p className="mt-1 font-serif text-[14px] italic text-muted-foreground">{t("profiel.oudeSpellen.kiesHint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
