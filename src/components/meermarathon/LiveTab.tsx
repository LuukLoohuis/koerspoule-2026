import { Fragment, useMemo, useRef, useState } from "react";
import { Snowflake, ChevronDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  projectPoints,
  groepsKopje,
  groepsRol,
  kopSamenvatting,
  virtueleUitslag,
  type LiveGroup,
  type PointsSchema,
} from "@/lib/liveMarathon";
import { rolColor, rondeBadge, tierLabel, EIGEN_KLEUR } from "@/lib/liveRink";
import { isStale, type LiveRace } from "@/hooks/useLiveRace";
import LiveRink from "@/components/meermarathon/LiveRink";

/**
 * Live-tab in de Volgwagen: de baan, de situatie in koers en wat het jou
 * voorlopig oplevert. Alleen zichtbaar bij Meermarathon met een gekoppelde baan.
 */
type LiveTabProps = {
  race: LiveRace | null;
  mineRiderIds: Set<string>;
  jokerRiderIds: Set<string>;
  pointsSchema: PointsSchema;
  jokerMultiplier: number;
  /** Nagebootste koers: zet een stempel "Simulatie" in het scorebord. */
  simulatie?: boolean;
};

/**
 * Het tabje staat er altijd, ook buiten een wedstrijd — beter een rustige
 * uitleg dan een tab die verschijnt en verdwijnt. De keuze zit bewust in deze
 * wrapper: de inhoud gebruikt hooks, en die mogen niet achter een early return
 * staan.
 */
export default function LiveTab(props: LiveTabProps) {
  if (!props.race || props.race.tracks.length === 0) return <LiveLeeg />;
  return <LiveInhoud {...props} race={props.race} />;
}

/** Eén rijder van jou, met waar hij op dit moment rijdt. */
type EigenRegel = {
  sleutel: string;
  positie: number;
  naam: string;
  isJoker: boolean;
  punten: number;
  basis: number;
  groep: { rol: ReturnType<typeof groepsRol>; kopje: string; badge: string | null };
  verschil: number | null | undefined;
};

function LiveInhoud({
  race,
  mineRiderIds,
  jokerRiderIds,
  pointsSchema,
  jokerMultiplier,
  simulatie,
}: LiveTabProps & { race: LiveRace }) {
  const [actief, setActief] = useState(0);
  const [standOpen, setStandOpen] = useState(false);
  // Vijf regels zichtbaar: genoeg om de kop van de koers te zien zonder dat de
  // kolom langer wordt dan de baan ernaast. Twintig is één tik verderop.
  const [uitslagVol, setUitslagVol] = useState(false);
  // Eén groep tegelijk open: de strook is smal, en je kijkt naar één pak.
  const [openGroep, setOpenGroep] = useState<number | null>(null);

  const track = race.tracks[Math.min(actief, race.tracks.length - 1)];
  const verouderd = isStale(race.syncedAt);

  // Eigen rijders per baan, zodat de koersschakelaar kan tonen waar je zit.
  const mineCount = (t: (typeof race.tracks)[number]) =>
    t.riders.filter((r) => {
      const id = t.riderIdByBeennummer.get(r.beennummer);
      return id ? mineRiderIds.has(id) : false;
    }).length;

  const mineBeennummers = useMemo(() => {
    const set = new Set<string>();
    for (const r of track.riders) {
      const id = track.riderIdByBeennummer.get(r.beennummer);
      if (id && mineRiderIds.has(id)) set.add(r.beennummer);
    }
    return set;
  }, [track, mineRiderIds]);

  // Punten over álle banen samen: je ploeg kan bij natuurijs rijders in de
  // mannen- én de vrouwenkoers hebben.
  const projectie = useMemo(() => {
    const perBaan = race.tracks.map((t) =>
      projectPoints(t.groups.flatMap((g) => g.leden), {
        schema: pointsSchema,
        mineRiderIds,
        jokerRiderIds,
        riderIdByBeennummer: t.riderIdByBeennummer,
        jokerMultiplier,
      }),
    );
    return {
      perBaan,
      totaal: perBaan.reduce((s, p) => s + p.ritPunten, 0),
    };
  }, [race.tracks, pointsSchema, mineRiderIds, jokerRiderIds, jokerMultiplier]);

  // Stand aan het eind van de vorige ronde: voor het pijltje bij je punten en
  // bij elke plek. "Vorige ronde" en niet "vorige meting" -- per twintig
  // seconden schommelt het te veel om iets te zeggen.
  const nu = useMemo(() => {
    const posities = new Map<string, number>();
    race.tracks.forEach((t, bi) => {
      for (const g of t.groups) for (const l of g.leden) posities.set(`${bi}:${l.rider.beennummer}`, l.positie);
    });
    return { totaal: projectie.totaal, posities };
  }, [race.tracks, projectie.totaal]);
  const vorige = useVorigeRonde(race.tracks.map((t) => t.state?.maxRonden ?? "?").join("|"), nu);
  const plekVerschil = (sleutel: string, positie: number) => {
    if (!vorige) return undefined;
    const oud = vorige.posities.get(sleutel);
    return oud != null ? oud - positie : null;
  };

  const eigen: EigenRegel[] = projectie.perBaan.flatMap((p, bi) => {
    const groups = race.tracks[bi].groups;
    const groepVan = new Map<string, number>();
    groups.forEach((g, gi) => g.leden.forEach((l) => groepVan.set(l.rider.beennummer, gi)));
    return p.rijders.map((r) => {
      const gi = groepVan.get(r.rider.beennummer) ?? 0;
      const sleutel = `${bi}:${r.rider.beennummer}`;
      return {
        sleutel,
        positie: r.positie,
        naam: r.rider.naam,
        isJoker: r.isJoker,
        punten: r.punten,
        basis: r.basis,
        groep: { rol: groepsRol(groups, gi), kopje: groepsKopje(groups, gi), badge: rondeBadge(groups[gi]?.tier ?? 0) },
        verschil: plekVerschil(sleutel, r.positie),
      };
    });
  });

  const uitslag = virtueleUitslag(track.groups.flatMap((g) => g.leden), {
    schema: pointsSchema,
    mineRiderIds,
    riderIdByBeennummer: track.riderIdByBeennummer,
  });

  return (
    <div className="space-y-3">
      {/* Koersschakelaar — alleen bij meerdere gelijktijdige koersen */}
      {race.tracks.length > 1 && (
        <div className="flex gap-1.5">
          {race.tracks.map((t, i) => (
            <button
              key={t.trackId}
              type="button"
              onClick={() => {
                setActief(i);
                setOpenGroep(null);
              }}
              aria-pressed={i === actief}
              className={cn(
                "flex-1 rounded-lg border px-2.5 py-2 text-left transition-colors",
                i === actief
                  ? "border-[#071b3d] bg-[#071b3d] text-[#eaf6ff]"
                  : "border-[rgba(18,104,168,.2)] bg-white/60",
              )}
            >
              <span className="block font-display text-xs font-bold uppercase tracking-wide">
                {t.label ?? t.categorie ?? t.trackId}
                {mineCount(t) > 0 && (
                  <span className="ml-1.5 rounded bg-[#0b4c91] px-1 py-0.5 font-mono text-[9px] text-white">
                    {mineCount(t)}×
                  </span>
                )}
              </span>
              <span className="block font-mono text-[10px] opacity-70">{t.riders.length} rijders</span>
            </button>
          ))}
        </div>
      )}

      <Scorebord race={race} track={track} verouderd={verouderd} simulatie={simulatie} />

      {verouderd && (
        <p className="px-1 text-[11px] text-muted-foreground">
          De laatste stand is van{" "}
          {race.syncedAt ? new Date(race.syncedAt).toLocaleTimeString("nl-NL") : "onbekend"}. De
          gegevens hieronder kunnen achterlopen.
        </p>
      )}

      {/* Twee kolommen op breed scherm: links wat er op het ijs gebeurt, rechts
          wat het jou oplevert. Op een telefoon in die volgorde onder elkaar --
          de baan eerst, want die vertelt in één blik hoe de koers ligt. */}
      <div className="grid gap-3 lg:grid-cols-[1.9fr_1fr] lg:items-start">
        {/* min-w-0: anders rekt de scrollende koersstrook de kolom op. */}
        <div className="min-w-0 space-y-3">
          <div className="overflow-hidden rounded-xl border-2 border-[#0b2c4d] bg-linear-to-b from-[#fbfeff] to-[#d6ebf9] shadow-[3px_3px_0_#0b2c4d]">
            <KopRegel groups={track.groups} mine={mineBeennummers} />
            <LiveRink
              groups={track.groups}
              ijsType={race.ijsType}
              mineBeennummers={mineBeennummers}
              namen={new Map(track.riders.map((r) => [r.beennummer, r.naam.split(" ").slice(-1)[0]]))}
              rondeLengte={track.state?.rondeLengte ?? null}
              baanNaam={track.trackId.split(" ")[0]}
              rondeLabel={null}
            />
          </div>
          <SituatieStrook
            groups={track.groups}
            mine={mineBeennummers}
            open={openGroep}
            onOpen={(i) => setOpenGroep((v) => (v === i ? null : i))}
          />
        </div>

        <div className="min-w-0 space-y-3">
          <JouwPloeg
            totaal={projectie.totaal}
            delta={vorige ? projectie.totaal - vorige.totaal : null}
            eigen={eigen}
            aantalEigen={mineRiderIds.size}
            jokerMultiplier={jokerMultiplier}
          />

          {/* Virtuele uitslag — het hele veld, niet alleen mijn rijders. Tijdens
              de koers wil je zien wie er scoort, niet alleen wat jij pakt. */}
          <section>
            <Kopje rechts={`top ${uitslagVol ? 20 : 5}`}>Virtuele uitslag</Kopje>
            <div className="overflow-hidden rounded-xl border border-[rgba(18,104,168,.25)] bg-white/75">
              {uitslag.slice(0, uitslagVol ? 20 : 5).map((r) => (
                <div
                  key={r.rider.beennummer}
                  className={cn(
                    "flex items-center gap-2 border-b border-foreground/7 px-3 py-1.5 last:border-b-0",
                    r.isMine && "bg-[rgba(18,112,63,.07)]",
                  )}
                >
                  <span className="w-5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {r.positie}
                  </span>
                  <Pijltje verschil={plekVerschil(`${actief}:${r.rider.beennummer}`, r.positie)} />
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold",
                      r.isMine ? "text-white" : "bg-foreground/7 text-foreground/70",
                    )}
                    style={r.isMine ? { background: EIGEN_KLEUR } : undefined}
                  >
                    {r.rider.beennummer}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-xs", r.isMine ? "font-bold" : "font-medium")}>
                    {r.rider.naam}
                  </span>
                  <span
                    className={cn(
                      "w-8 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums",
                      r.punten === 0 ? "text-muted-foreground/60" : "text-foreground/75",
                    )}
                  >
                    {r.punten || "—"}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUitslagVol((v) => !v)}
              aria-expanded={uitslagVol}
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded font-mono text-[10px] font-bold uppercase tracking-[0.16em]",
                "text-[#0b4c91] transition-colors hover:text-[#12508f]",
                "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {uitslagVol ? "Toon top 5" : "Toon top 20"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", uitslagVol && "rotate-180")} aria-hidden />
            </button>
          </section>
        </div>
      </div>

      {/* Volledige stand */}
      <div>
        <button
          type="button"
          onClick={() => setStandOpen((v) => !v)}
          className="flex w-full items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
        >
          — Volledige stand · {track.riders.length} —
          <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", standOpen && "rotate-180")} />
        </button>
        {standOpen && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[rgba(18,104,168,.2)] bg-white/65">
            {track.groups.flatMap((g) =>
              g.leden.map((l) => {
                const mine = mineBeennummers.has(l.rider.beennummer);
                return (
                  <div
                    key={l.rider.beennummer}
                    className={cn(
                      "flex items-center gap-2 border-b border-foreground/7 px-3 py-2 last:border-b-0",
                      mine && "bg-[rgba(18,112,63,.07)]",
                    )}
                  >
                    <span className="w-6 text-center font-display text-sm font-bold">{l.positie}</span>
                    <span className="shrink-0 rounded bg-[#071b3d] px-1.5 py-0.5 font-mono text-[9.5px] text-[#dff3ff]">
                      {l.rider.beennummer}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">{l.rider.naam}</span>
                    <span className="shrink-0 text-right font-mono text-[10px]">
                      <span className="block">{l.rider.tijd ?? "—"}</span>
                      <span className={cn("block", l.tier > 0 ? "font-bold text-[#a06a06]" : l.tier < 0 ? "text-[#b3352a]" : "text-muted-foreground")}>
                        {l.tier !== 0 ? tierLabel(l.tier) : l.gapInGroup ? `+${l.gapInGroup.toFixed(1)}` : "—"}
                      </span>
                    </span>
                  </div>
                );
              }),
            )}
          </div>
        )}
      </div>

      <p className="px-1 font-mono text-[9px] leading-relaxed text-muted-foreground">
        Voorlopig · niet gefiatteerd. Zelfde rekenregel als bij het fiatteren: plek 1 t/m 20 scoort, joker telt ×
        {jokerMultiplier}.
        <br />
        Bron: livemarathon.schaatsen.nl
      </p>
    </div>
  );
}

/**
 * Onthoudt een waarde zoals hij was aan het eind van de vorige ronde. Wisselt
 * `ronde`, dan schuift de laatst geziene waarde door naar "vorige".
 */
function useVorigeRonde<T>(ronde: string, waarde: T): T | null {
  const ref = useRef<{ ronde: string; laatste: T; vorige: T | null }>({ ronde, laatste: waarde, vorige: null });
  const r = ref.current;
  if (ronde !== r.ronde) {
    r.vorige = r.laatste;
    r.ronde = ronde;
  }
  r.laatste = waarde;
  return r.vorige;
}

/** Mono-kopje met streepjes, zoals elders in de Volgwagen. */
function Kopje({ children, rechts }: { children: React.ReactNode; rechts?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2 whitespace-nowrap font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      — {children} —
      {rechts && <span className="ml-auto font-normal tracking-widest opacity-70">{rechts}</span>}
    </div>
  );
}

/**
 * Scorebord: alles over de stand van de koers in één blok. Voorheen stond de
 * ronde op vier plekken (kopbalk, meta-regel, cijfertegel, op de baan); nu
 * één keer, groot, met een balk die laat zien hoe ver de koers is.
 */
function Scorebord({
  race,
  track,
  verouderd,
  simulatie,
}: {
  race: LiveRace;
  track: LiveRace["tracks"][number];
  verouderd: boolean;
  simulatie?: boolean;
}) {
  const s = track.state;
  const voortgang = s?.maxRonden != null && s?.totaalRonden ? Math.min(1, s.maxRonden / s.totaalRonden) : null;
  const km = s?.rondenTeGaan != null && s?.rondeLengte ? ((s.rondenTeGaan * s.rondeLengte) / 1000).toFixed(1).replace(".", ",") : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl text-[#eaf6ff] shadow-[3px_3px_0_rgba(7,27,61,.3)]",
        verouderd ? "bg-slate-600" : "bg-linear-to-r from-[#0a2547] via-[#0d3a6e] to-[#0b4c91]",
      )}
    >
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-2 py-0.5">
          <span className="relative flex h-2 w-2">
            {!verouderd && <span className="absolute inset-0 animate-ping rounded-full bg-[#ff5a3c] opacity-70" />}
            <span className="relative h-2 w-2 rounded-full bg-[#ff5a3c]" />
          </span>
          <span className="font-mono text-[10px] font-bold tracking-[0.18em]">{verouderd ? "ONDERBROKEN" : "LIVE"}</span>
        </span>
        <span className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-wide">
          {track.trackId}
          {track.categorie && <span className="ml-1.5 font-mono text-[10px] font-normal normal-case opacity-70">{track.categorie}</span>}
        </span>
        {simulatie && (
          <span
            role="status"
            className="ml-auto shrink-0 rotate-[-4deg] rounded-sm border-2 border-dashed border-[#f0c04a] px-1.5 py-0.5 font-stamp text-[10px] uppercase tracking-[0.15em] text-[#f0c04a]"
            title="Nagebootste stand om deze weergave te bekijken. Er wordt niets opgeslagen."
          >
            Simulatie
            <span className="sr-only"> — geen echte koers, er wordt niets opgeslagen</span>
          </span>
        )}
      </div>

      <div className="flex items-end gap-3 px-3.5 pt-2.5">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9dbde3]">Ronde</div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold leading-none tabular-nums">{s?.maxRonden ?? "—"}</span>
            {s?.totaalRonden != null && <span className="font-mono text-xs text-[#9dbde3]">/ {s.totaalRonden}</span>}
          </div>
        </div>
        {s?.rondenTeGaan != null && (
          <div className="ml-auto text-right">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9dbde3]">Te gaan</div>
            <div className="flex items-baseline justify-end gap-1">
              <span className="font-display text-3xl font-bold leading-none tabular-nums text-[#ffb199]">{s.rondenTeGaan}</span>
              <span className="font-mono text-xs text-[#9dbde3]">
                ronde{s.rondenTeGaan === 1 ? "" : "n"}
                {km && ` · ${km} km`}
              </span>
            </div>
          </div>
        )}
      </div>

      {voortgang != null && (
        <div className="mx-3.5 mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div
            className="h-full rounded-full bg-linear-to-r from-[#ff8a5c] to-[#ff5a3c] transition-[width] duration-700"
            style={{ width: `${voortgang * 100}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-3.5 pb-2.5 pt-2 font-mono text-[10px] text-[#9dbde3]">
        <span>
          {race.ijsType === "natuurijs" ? "natuurijs" : "kunstijs"}
          {s?.rondeLengte ? ` · ${s.rondeLengte} m` : ""}
        </span>
        {s?.raceTime && <span>duur {s.raceTime}</span>}
        {race.syncedAt && <span className="ml-auto">bijgewerkt {new Date(race.syncedAt).toLocaleTimeString("nl-NL")}</span>}
      </div>
    </div>
  );
}

/** Eén regel bovenop de baan als er iemand weg is (tekst uit `kopSamenvatting`). */
function KopRegel({ groups, mine }: { groups: LiveGroup[]; mine: Set<string> }) {
  const kop = kopSamenvatting(groups, mine);
  if (!kop) return null;
  return (
    <div className="flex items-center gap-2 border-b-2 border-[#0b2c4d] bg-linear-to-r from-[#c9861a] via-[#e0a020] to-[#f0c04a] px-3 py-1.5 text-[#2a1c02]">
      <Snowflake className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="shrink-0 font-display text-[11px] font-bold uppercase tracking-wide">{kop.titel}</span>
      <span className={cn("ml-auto truncate font-mono text-[10px]", kop.eigen.length > 0 && "font-bold")}>{kop.sub}</span>
    </div>
  );
}

/**
 * De koers als strook, zoals op tv bij het wielrennen: groepen van voor naar
 * achter met het gat ertussen. Tik op een groep om te zien wie erin zit.
 * Vervangt de losse tegels én de legenda onder de baan -- de kleuren en
 * aantallen staan hier al.
 */
function SituatieStrook({
  groups,
  mine,
  open,
  onOpen,
}: {
  groups: LiveGroup[];
  mine: Set<string>;
  open: number | null;
  onOpen: (i: number) => void;
}) {
  const openG = open != null ? groups[open] : null;
  return (
    <section>
      <Kopje rechts="tik voor namen">Koerssituatie</Kopje>
      <div className="-mx-1 flex items-stretch overflow-x-auto px-1 pb-1 scrollbar-none">
        {groups.map((g, i) => {
          const rol = groepsRol(groups, i);
          const badge = rondeBadge(g.tier);
          const eigen = g.leden.filter((l) => mine.has(l.rider.beennummer)).length;
          const vorig = groups[i - 1];
          const gat =
            i === 0
              ? null
              : vorig.tier !== g.tier
                ? `${vorig.tier - g.tier} rnd`
                : g.gapToPrev != null
                  ? `${g.gapToPrev.toFixed(1).replace(".", ",")}s`
                  : "";
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div className="flex min-w-8 shrink-0 flex-col items-center justify-center px-0.5" aria-hidden>
                  <span className="whitespace-nowrap font-mono text-[9.5px] font-bold text-foreground/55">{gat}</span>
                  <span className="mt-0.5 h-0.5 w-full rounded-full bg-foreground/20" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onOpen(i)}
                aria-expanded={open === i}
                className={cn(
                  "relative min-w-max flex-1 shrink-0 overflow-hidden rounded-lg border-2 bg-white/85 px-2 pb-2 pt-2.5 text-left transition-shadow",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  open === i ? "border-[#0b2c4d] shadow-[2px_2px_0_#0b2c4d]" : "border-[rgba(18,104,168,.25)]",
                )}
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: rolColor(rol) }} aria-hidden />
                <span className="flex items-center gap-1">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {groepsKopje(groups, i)}
                  </span>
                  {badge && (
                    <span className="rounded bg-[#1b2f14] px-1 py-px font-mono text-[8.5px] font-bold text-white">{badge}</span>
                  )}
                </span>
                <span className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-xl font-bold leading-none tabular-nums">{g.leden.length}</span>
                  <span className="text-[10px] text-muted-foreground">rijder{g.leden.length > 1 ? "s" : ""}</span>
                </span>
                <span
                  className={cn("mt-1 flex items-center gap-1 text-[10px] font-bold", eigen === 0 && "invisible")}
                  style={{ color: EIGEN_KLEUR }}
                >
                  <i className="h-2 w-2 rounded-full bg-white" style={{ boxShadow: `0 0 0 2px ${EIGEN_KLEUR}` }} />
                  {eigen} van jou
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
      {openG && (
        <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-[rgba(18,104,168,.25)] bg-white/75 p-2.5">
          {openG.leden.map((l) => {
            const isMijn = mine.has(l.rider.beennummer);
            return (
              <span
                key={l.rider.beennummer}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px]",
                  isMijn ? "bg-white font-bold" : "bg-foreground/7 text-foreground/75",
                )}
                style={isMijn ? { color: EIGEN_KLEUR, boxShadow: `inset 0 0 0 1.5px ${EIGEN_KLEUR}` } : undefined}
              >
                {l.rider.beennummer} {l.rider.naam.split(" ").slice(-1)}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Wat het jou nu oplevert: het totaal groot, met hoeveel het de afgelopen
 * ronde veranderde, en per rijder waar hij zit en wat hij pakt. Vervangt de
 * cijfertegels en de losse puntenlijst.
 */
function JouwPloeg({
  totaal,
  delta,
  eigen,
  aantalEigen,
  jokerMultiplier,
}: {
  totaal: number;
  delta: number | null;
  eigen: EigenRegel[];
  aantalEigen: number;
  jokerMultiplier: number;
}) {
  const inDePunten = eigen.filter((r) => r.basis > 0).length;
  return (
    <section className="overflow-hidden rounded-xl border-2 border-[#0b2c4d] bg-white/85 shadow-[3px_3px_0_#0b2c4d]">
      <div className="flex items-end gap-3 px-3.5 pb-2.5 pt-3">
        <div className="min-w-0">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Jouw ploeg nu</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-black leading-none tabular-nums text-[#0b2c4d]">{totaal}</span>
            <span className="font-mono text-xs text-muted-foreground">pt</span>
            {delta != null && delta !== 0 && (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 font-mono text-[10.5px] font-bold",
                  delta > 0 ? "bg-[rgba(18,112,63,.12)] text-[#12703f]" : "bg-[rgba(192,57,43,.12)] text-[#a3301f]",
                )}
                title="Verschil met het eind van de vorige ronde"
              >
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">In de punten</div>
          <div className="mt-1 flex items-baseline justify-end gap-0.5">
            <span className="font-display text-2xl font-bold leading-none tabular-nums">{inDePunten}</span>
            <span className="font-mono text-xs text-muted-foreground">&nbsp;/ {aantalEigen || eigen.length}</span>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-[#0b2c4d]/15">
        {eigen.map((r) => (
          <div key={r.sleutel} className="flex items-center gap-2 border-b border-foreground/7 px-3 py-2 last:border-b-0">
            <span className="w-6 text-right font-display text-sm font-bold tabular-nums text-foreground/70">{r.positie}</span>
            <Pijltje verschil={r.verschil} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold">{r.naam}</span>
                {r.isJoker && (
                  <span className="shrink-0 rounded bg-[#e0a020] px-1 py-px font-mono text-[8.5px] font-bold text-[#3a2a06]">
                    ×{jokerMultiplier}
                  </span>
                )}
              </span>
              <span className="mt-0.5 flex items-center gap-1 font-mono text-[9.5px] text-muted-foreground">
                <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: rolColor(r.groep.rol) }} aria-hidden />
                {r.groep.kopje.toLowerCase()}
                {r.groep.badge && ` ${r.groep.badge}`}
              </span>
            </span>
            <span className={cn("w-8 text-right font-display text-base font-bold tabular-nums", !r.punten && "text-foreground/30")}>
              {r.punten || "—"}
            </span>
          </div>
        ))}
        {eigen.length === 0 && (
          <div className="px-3 py-3 text-xs text-muted-foreground">
            Geen van jouw rijders is aan een deelnemer in deze koers gekoppeld.
          </div>
        )}
      </div>
    </section>
  );
}

/** Plekken gewonnen (groen, omhoog) of verloren sinds de vorige ronde. */
function Pijltje({ verschil }: { verschil: number | null | undefined }) {
  // undefined: nog geen vorige ronde bekend -- dan ook geen lege kolom.
  if (verschil === undefined) return null;
  if (!verschil) return <span className="w-5 shrink-0" aria-hidden />;
  const op = verschil > 0;
  return (
    <span
      className={cn("w-5 shrink-0 font-mono text-[9px] font-bold tabular-nums", op ? "text-[#12703f]" : "text-[#b3352a]")}
      title={`${Math.abs(verschil)} plek${Math.abs(verschil) > 1 ? "ken" : ""} ${op ? "gewonnen" : "verloren"} sinds de vorige ronde`}
    >
      {op ? "▲" : "▼"}
      {Math.abs(verschil)}
    </span>
  );
}

function LiveLeeg() {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(18,104,168,.35)] bg-[rgba(236,248,255,.6)] px-4 py-8 text-center">
      <Radio className="mx-auto h-6 w-6 text-[#1268a8]" aria-hidden />
      <p className="mt-2.5 font-display text-sm font-bold uppercase tracking-wide text-[#071b3d]">
        Nog geen wedstrijd live
      </p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
        Zodra er gereden wordt zie je hier de baan, de groepen op het ijs en wat jouw
        rijders op dat moment opleveren.
      </p>
    </div>
  );
}
