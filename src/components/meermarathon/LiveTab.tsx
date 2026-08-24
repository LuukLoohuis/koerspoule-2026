import { useMemo, useState } from "react";
import { Snowflake, ChevronDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  projectPoints,
  groepsKopje,
  groepsRol,
  virtueleUitslag,
  type GroepsRol,
  type LiveGroup,
  type PointsSchema,
} from "@/lib/liveMarathon";
import { rolColor, rolLabel, rondeBadge, tierLabel, tiersPresent, EIGEN_KLEUR } from "@/lib/liveRink";
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
  /** Nagebootste koers: zet er een onmiskenbare melding boven. */
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
  // Per groep onthouden of hij openstaat: je wilt het peloton open kunnen
  // laten terwijl de koers doorloopt.
  const [openGroepen, setOpenGroepen] = useState<Set<number>>(new Set());

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

  const tiers = tiersPresent(track.groups);
  const voorsprong = tiers.filter((t) => t > 0);
  const kopgroep = track.groups[0];
  const tijdgat = kopgroep && track.groups[1]?.gapToPrev;

  return (
    <div className="space-y-3">
      {/* Koersschakelaar — alleen bij meerdere gelijktijdige koersen */}
      {race.tracks.length > 1 && (
        <div className="flex gap-1.5">
          {race.tracks.map((t, i) => (
            <button
              key={t.trackId}
              type="button"
              onClick={() => setActief(i)}
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

      {/* Kopbalk */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-[#eaf6ff]",
          verouderd ? "bg-slate-500" : "bg-gradient-to-r from-[#0d2f57] to-[#0b4c91]",
        )}
      >
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full bg-[#ff5a3c]", !verouderd && "animate-pulse")}
          aria-hidden
        />
        <span className="font-display text-xs font-bold uppercase tracking-wide">
          {verouderd ? "Verbinding onderbroken" : `Live · ${track.trackId}`}
        </span>
        {track.state?.rondenTeGaan != null && !verouderd && (
          <span className="ml-auto shrink-0 rounded-full bg-[#ff5a3c] px-2.5 py-0.5 font-display text-[11px]">
            nog {track.state.rondenTeGaan} ronde{track.state.rondenTeGaan === 1 ? "" : "n"}
          </span>
        )}
      </div>

      {verouderd && (
        <p className="px-1 text-[11px] text-muted-foreground">
          De laatste stand is van{" "}
          {race.syncedAt ? new Date(race.syncedAt).toLocaleTimeString("nl-NL") : "onbekend"}. De
          gegevens hieronder kunnen achterlopen.
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 font-mono text-[10px] text-muted-foreground">
        {track.categorie && <span>{track.categorie}</span>}
        {track.state?.raceTime && <span>Duur <b className="text-foreground">{track.state.raceTime}</b></span>}
        {track.state?.maxRonden != null && track.state?.totaalRonden != null && (
          <span>Ronde <b className="text-foreground">{track.state.maxRonden}/{track.state.totaalRonden}</b></span>
        )}
        <span className="rounded bg-[rgba(18,104,168,.12)] px-1.5 py-0.5 text-[#1268a8]">
          {race.ijsType === "natuurijs" ? "natuurijs" : "kunstijs"}
          {track.state?.rondeLengte ? ` · ${track.state.rondeLengte} m` : ""}
        </span>
      </div>

      {simulatie && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border-2 border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.12] px-3 py-2"
        >
          <span className="font-display text-[11px] font-black uppercase tracking-[0.14em] text-[hsl(var(--vintage-gold))]">
            Simulatie — geen echte koers
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            Nagebootste stand om deze weergave te bekijken. Er wordt niets opgeslagen.
          </span>
        </div>
      )}

      {/* Kop van de koers */}
      {voorsprong.length > 0 ? (
        <KopBanner
          titel={`${track.riders.filter((r) => (r.aantalRonden - (track.state?.pelotonRonden ?? r.aantalRonden)) >= voorsprong[0]).length} rijders ${voorsprong[0]} ronde${voorsprong[0] > 1 ? "n" : ""} voor op het peloton`}
          sub={mineInGroup(kopgroep, mineBeennummers)}
          groot={`+${voorsprong[0]}`}
          klein={`RONDE${voorsprong[0] > 1 ? "N" : ""}`}
          goud
        />
      ) : tijdgat != null && tijdgat >= 4 ? (
        <KopBanner
          titel={`${kopgroep.leden.length} rijder${kopgroep.leden.length > 1 ? "s" : ""} weg uit het peloton`}
          sub={mineInGroup(kopgroep, mineBeennummers)}
          groot={`+${tijdgat.toFixed(1)}s`}
          klein="VOORSPRONG"
        />
      ) : null}

      {/* KPI-strook over de volle breedte, boven de baan -- zoals in het
          ontwerp. "Te gaan" erbij: tijdens een marathon is het aantal
          resterende ronden het cijfer waar iedereen naar kijkt. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[rgba(18,104,168,.25)] sm:grid-cols-4">
        {[
          { label: "Virtuele punten", waarde: String(projectie.totaal), eenheid: "pt" },
          {
            label: "Mijn rijders in koers",
            waarde: String(projectie.perBaan.reduce((s, p) => s + p.rijders.length, 0)),
            eenheid: mineRiderIds.size > 0 ? `van ${mineRiderIds.size}` : undefined,
          },
          {
            label: "Ronde",
            waarde: track.state?.maxRonden != null ? String(track.state.maxRonden) : "—",
            eenheid: track.state?.totaalRonden != null ? `/ ${track.state.totaalRonden}` : undefined,
          },
          {
            label: "Te gaan",
            waarde: track.state?.rondenTeGaan != null ? String(track.state.rondenTeGaan) : "—",
            eenheid:
              track.state?.rondenTeGaan != null && track.state?.rondeLengte
                ? `rondes · ${((track.state.rondenTeGaan * track.state.rondeLengte) / 1000).toFixed(1)} km`
                : "rondes",
          },
        ].map((k, i) => (
          <div
            key={k.label}
            className={cn("px-4 py-3.5 text-[#eaf6ff]", KPI_KLEUREN[i])}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9dbde3]">{k.label}</div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold tabular-nums">{k.waarde}</span>
              {k.eenheid && <span className="font-mono text-[11px] text-[#9dbde3]">{k.eenheid}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Twee kolommen op breed scherm: de baan links met de cijfertegels
          eronder, je eigen punten en de virtuele uitslag rechts. De baan krijgt
          bewust het meeste gewicht -- dat is waar je tijdens de koers naar
          kijkt; de rest is naslag. */}
      <div className="grid gap-3 lg:grid-cols-[1.9fr_1fr] lg:items-start">
        <div className="space-y-3">
        {/* Baan */}
        <div className="overflow-hidden rounded-2xl border border-[rgba(18,104,168,.25)] bg-gradient-to-b from-[#fbfeff] to-[#d6ebf9]">
          <LiveRink
            groups={track.groups}
            ijsType={race.ijsType}
            mineBeennummers={mineBeennummers}
          namen={new Map(track.riders.map((r) => [r.beennummer, r.naam.split(" ").slice(-1)[0]]))}
            rondeLengte={track.state?.rondeLengte ?? null}
            baanNaam={track.trackId.split(" ")[0]}
            rondeLabel={
              track.state?.maxRonden != null && track.state?.totaalRonden != null
                ? `RONDE ${track.state.maxRonden}/${track.state.totaalRonden}`
                : null
            }
          />
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[rgba(18,104,168,.15)] bg-white/55 px-3 py-2">
            {rollenAanwezig(track.groups).map((rol) => (
              <span
                key={rol}
                className="flex items-center gap-1.5 rounded-full border border-[rgba(18,104,168,.2)] bg-white px-2.5 py-0.5 text-[10.5px] text-foreground/75"
              >
                <i className="h-2 w-2 rounded-full" style={{ background: rolColor(rol) }} aria-hidden />
                {rolLabel(rol)}
                <b className="font-mono text-[9.5px]">
                  {track.groups.reduce(
                    (n, _g, i) => n + (groepsRol(track.groups, i) === rol ? track.groups[i].leden.length : 0),
                    0,
                  )}
                </b>
              </span>
            ))}
            {mineBeennummers.size > 0 && (
              <span className="flex items-center gap-1.5 rounded-full border border-[rgba(18,104,168,.2)] bg-white px-2.5 py-0.5 text-[10.5px] text-foreground/75">
                <i
                  className="h-2 w-2 rounded-full"
                  style={{ background: "#fff", boxShadow: `0 0 0 2px ${EIGEN_KLEUR}` }}
                  aria-hidden
                />
                mijn rijders
              </span>
            )}
          </div>
        </div>
        {/* Situatie op de baan: één tegel per groep, dicht een cijfer en open
            de rijders. In een raster in plaats van rijen -- naast de baan is
            de kolom smal, en zo passen er drie op een regel. */}
        <div>
          <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            — Situatie op de baan —
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {track.groups.map((_g, i) => (
              <GroepsTegel
                key={i}
                groups={track.groups}
                index={i}
                mine={mineBeennummers}
                open={openGroepen.has(i)}
                onToggle={() =>
                  setOpenGroepen((vorig) => {
                    const next = new Set(vorig);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </div>
        </div>
        <div className="space-y-3">
        {/* Virtuele punten */}
        <div>
          <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            — Virtuele punten · deze ronde —
          </div>
          <div className="overflow-hidden rounded-xl border border-[rgba(18,104,168,.2)] bg-white/65">
            {projectie.perBaan.flatMap((p, bi) =>
              p.rijders.map((r) => (
                <div key={`${bi}-${r.rider.beennummer}`} className="flex items-center gap-2 border-b border-foreground/[0.07] px-3 py-2 last:border-b-0">
                  <span className="w-6 text-center font-display text-sm font-bold text-foreground/60">{r.positie}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {r.rider.naam}
                    {r.isJoker && (
                      <span className="ml-1.5 rounded bg-[#e0a020] px-1 py-0.5 font-mono text-[8.5px] font-bold text-[#3a2a06]">
                        JOKER ×{jokerMultiplier}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {r.basis ? `plek ${r.positie} · ${r.basis}` : "buiten de punten"}
                  </span>
                  <span className={cn("w-8 text-right font-display text-sm font-bold", !r.punten && "text-foreground/35")}>
                    {r.punten || "—"}
                  </span>
                </div>
              )),
            )}
            {projectie.perBaan.every((p) => p.rijders.length === 0) && (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                Geen van jouw rijders is aan een deelnemer in deze koers gekoppeld.
              </div>
            )}
            <div className="flex items-center gap-2 bg-[rgba(18,104,168,.09)] px-3 py-2">
              <span className="w-6" />
              <span className="flex-1 font-display text-xs font-bold uppercase tracking-wide">Ronde-totaal</span>
              <span className="font-mono text-[10px] text-muted-foreground">voorlopig</span>
              <span className="w-8 text-right font-display text-base font-bold text-[#0b4c91]">{projectie.totaal}</span>
            </div>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-muted-foreground">
            Zelfde rekenregel als bij het fiatteren: punten voor plek 1 t/m 20, joker telt dubbel.
          </p>
        </div>
        {/* Virtuele uitslag — het hele veld, niet alleen mijn rijders. Tijdens
            de koers wil je zien wie er scoort, niet alleen wat jij pakt. */}
        <div>
          <div className="mb-2 flex items-baseline gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            — Virtuele uitslag —
            <span className="ml-auto font-normal tracking-[0.1em] opacity-70">
            Top {uitslagVol ? 20 : 5} · punten
          </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[rgba(18,104,168,.2)] bg-white/65">
            {virtueleUitslag(track.groups.flatMap((g) => g.leden), {
              schema: pointsSchema,
              mineRiderIds,
              riderIdByBeennummer: track.riderIdByBeennummer,
            }).slice(0, uitslagVol ? 20 : 5).map((r) => (
              <div
                key={r.rider.beennummer}
                className={cn(
                  "flex items-center gap-2.5 border-b border-foreground/[0.07] px-3 py-1.5 last:border-b-0",
                  r.isMine && "bg-[rgba(11,76,145,.07)]",
                )}
              >
                <span className="w-6 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  {r.positie}
                </span>
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold",
                    r.isMine ? "bg-[#0b4c91] text-white" : "bg-foreground/[0.07] text-foreground/70",
                  )}
                >
                  {r.rider.beennummer}
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-xs", r.isMine ? "font-bold" : "font-medium")}>
                  {r.rider.naam}
                </span>
                <span
                  className={cn(
                    "w-9 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums",
                    r.punten === 0 ? "text-muted-foreground/60" : r.isMine ? "text-[#0b4c91]" : "text-foreground/70",
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {uitslagVol ? "Toon top 5" : "Toon top 20"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", uitslagVol && "rotate-180")} aria-hidden />
          </button>
          <p className="mt-1.5 px-1 text-[10.5px] leading-snug text-muted-foreground">
            Punten volgens het schema van deze koers. De stand loopt mee met de rondestand op de baan.
          </p>
        </div>
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
                      "flex items-center gap-2 border-b border-foreground/[0.07] px-3 py-2 last:border-b-0",
                      mine && "bg-[rgba(18,104,168,.1)]",
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
        Voorlopig · niet gefiatteerd. Punten lopen via de fiatteer-flow.
        <br />
        Bron: livemarathon.schaatsen.nl
        {race.syncedAt && ` · bijgewerkt ${new Date(race.syncedAt).toLocaleTimeString("nl-NL")}`}
      </p>
    </div>
  );
}

/** Vier tinten blauw voor de KPI-strook, oplopend van links naar rechts. */
const KPI_KLEUREN = [
  "bg-gradient-to-br from-[#0f2f5c] to-[#17457f]",
  "bg-gradient-to-br from-[#123a6d] to-[#1a4f8f]",
  "bg-gradient-to-br from-[#17457f] to-[#1f5aa3]",
  "bg-gradient-to-br from-[#1b4f8d] to-[#2465b3]",
];

/** Welke rollen er in dit veld voorkomen, van kop naar achter. */
function rollenAanwezig(groups: LiveGroup[]): GroepsRol[] {
  const aanwezig = new Set(groups.map((_g, i) => groepsRol(groups, i)));
  return (["kop", "peloton", "gelost"] as const).filter((r) => aanwezig.has(r));
}

/**
 * Eén groep als tegel. Dicht zie je hoeveel rijders er in zitten en hoe ver ze
 * van de kop liggen; open zie je wie. Een tegel met eigen rijders krijgt een
 * groene rand, zodat je zonder klikken ziet waar je zit.
 */
function GroepsTegel({
  groups,
  index,
  mine,
  open,
  onToggle,
}: {
  groups: LiveGroup[];
  index: number;
  mine: Set<string>;
  open: boolean;
  onToggle: () => void;
}) {
  const g = groups[index];
  const rol = groepsRol(groups, index);
  const badge = rondeBadge(g.tier);
  const eigen = g.leden.filter((l) => mine.has(l.rider.beennummer));
  const afstand =
    g.tier !== 0
      ? tierLabel(g.tier)
      : index === 0
        ? "aan kop"
        : `+${(g.leden[0].gapInGroup + (g.gapToPrev ?? 0)).toFixed(1)}s`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white/65",
        eigen.length > 0 ? "border-[rgba(18,112,63,.5)]" : "border-[rgba(18,104,168,.2)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "w-full px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.03]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: rolColor(rol) }} aria-hidden />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            {groepsKopje(groups, index)}
          </span>
          {badge && (
            <span className="rounded bg-[#1b2f14] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
              {badge}
            </span>
          )}
          <ChevronDown
            className={cn("ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
        <span className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-display text-lg font-bold leading-none">{g.leden.length}</span>
          <span className="text-[11px] text-muted-foreground">
            rijder{g.leden.length > 1 ? "s" : ""}
          </span>
        </span>
        <span className="mt-0.5 block font-mono text-[10.5px] text-muted-foreground">{afstand}</span>
        {eigen.length > 0 && (
          <span className="mt-1 block text-[11px] font-bold" style={{ color: EIGEN_KLEUR }}>
            {eigen.length} eigen rijder{eigen.length > 1 ? "s" : ""}
          </span>
        )}
      </button>
      {open && (
        <div className="flex flex-wrap gap-1 px-3 pb-2.5">
          {g.leden.map((l) => {
            const isMijn = mine.has(l.rider.beennummer);
            return (
              <span
                key={l.rider.beennummer}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[9.5px]",
                  isMijn ? "bg-white font-bold" : "bg-foreground/[0.07] text-foreground/70",
                )}
                style={isMijn ? { color: EIGEN_KLEUR, boxShadow: `inset 0 0 0 1.5px ${EIGEN_KLEUR}` } : undefined}
              >
                {l.rider.beennummer} {l.rider.naam.split(" ").slice(-1)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function mineInGroup(groep: LiveGroup | undefined, mine: Set<string>): string {
  const eigen = (groep?.leden ?? []).filter((l) => mine.has(l.rider.beennummer));
  if (eigen.length === 0) return "Geen rijder van jou mee vooruit";
  const namen = eigen.map((l) => l.rider.naam.split(" ").slice(-1)[0]).join(", ");
  return `${eigen.length} van jouw rijders ${eigen.length > 1 ? "zitten" : "zit"} mee — ${namen}`;
}

function KopBanner({
  titel,
  sub,
  groot,
  klein,
  goud,
}: {
  titel: string;
  sub: string;
  groot: string;
  klein: string;
  goud?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-white shadow-lg",
        goud
          ? "bg-gradient-to-r from-[#c9861a] via-[#e0a020] to-[#f0c04a]"
          : "bg-gradient-to-r from-[#f5761a] to-[#e0a020]",
      )}
    >
      <Snowflake className="h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <div className="font-display text-xs font-bold uppercase leading-tight tracking-wide">{titel}</div>
        <div className="mt-0.5 font-mono text-[9.5px] opacity-90">{sub}</div>
      </div>
      <div className="ml-auto shrink-0 text-right">
        <span className="block font-display text-lg font-bold leading-none">{groot}</span>
        <span className="font-mono text-[8px] tracking-widest opacity-90">{klein}</span>
      </div>
    </div>
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
