import { useMemo, useState } from "react";
import { Snowflake, ChevronDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectPoints, type LiveGroup, type PointsSchema } from "@/lib/liveMarathon";
import { tierColor, tierLabel, tiersPresent } from "@/lib/liveRink";
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
}: LiveTabProps & { race: LiveRace }) {
  const [actief, setActief] = useState(0);
  const [standOpen, setStandOpen] = useState(false);

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

      {/* Virtuele stand */}
      <div className="flex overflow-hidden rounded-xl bg-gradient-to-r from-[#0d2f57] to-[#12508f] text-[#eaf6ff] shadow-lg">
        <div className="flex-1 px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] opacity-70">Deze ronde</div>
          <div className="mt-0.5 font-display text-xl font-bold">
            {projectie.totaal}
            <span className="ml-1 font-mono text-[10px] font-normal opacity-70">pt</span>
          </div>
        </div>
        <div className="flex-1 border-l border-white/15 px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] opacity-70">Mijn rijders</div>
          <div className="mt-0.5 font-display text-xl font-bold">
            {projectie.perBaan.reduce((s, p) => s + p.rijders.length, 0)}
          </div>
        </div>
        <div className="flex-1 border-l border-white/15 px-3 py-2.5">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] opacity-70">In koers</div>
          <div className="mt-0.5 font-display text-xl font-bold">{track.riders.length}</div>
        </div>
      </div>

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

      {/* Baan */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(18,104,168,.25)] bg-gradient-to-b from-[#fbfeff] to-[#d6ebf9]">
        <LiveRink
          groups={track.groups}
          ijsType={race.ijsType}
          mineBeennummers={mineBeennummers}
          rondeLengte={track.state?.rondeLengte ?? null}
          baanNaam={track.trackId.split(" ")[0]}
          rondeLabel={
            track.state?.maxRonden != null && track.state?.totaalRonden != null
              ? `RONDE ${track.state.maxRonden}/${track.state.totaalRonden}`
              : null
          }
        />
        <div className="flex flex-wrap gap-1.5 border-t border-[rgba(18,104,168,.15)] bg-white/55 px-3 py-2">
          {tiers.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(18,104,168,.2)] bg-white px-2.5 py-0.5 text-[10.5px] text-foreground/75"
            >
              <i className="h-2 w-2 rounded-full" style={{ background: tierColor(t) }} aria-hidden />
              {tierLabel(t)}
              <b className="font-mono text-[9.5px]">
                {track.groups.filter((g) => g.tier === t).reduce((s, g) => s + g.leden.length, 0)}
              </b>
            </span>
          ))}
        </div>
      </div>

      {/* Situatie op de baan */}
      <div>
        <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          — Situatie op de baan —
        </div>
        <div className="space-y-1.5">
          {track.groups.map((g, i) => (
            <div key={i}>
              {g.gapToPrev != null && g.gapToPrev >= 4 && (
                <div className="mb-1.5 flex items-center gap-2 px-1">
                  <span className="font-mono text-[10px] font-bold text-[#c2560c]">
                    gat {g.gapToPrev.toFixed(1)}s
                  </span>
                  <span className="h-0.5 flex-1 rounded bg-[repeating-linear-gradient(90deg,rgba(245,118,26,.55)_0_6px,transparent_6px_11px)]" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl border bg-white/65 px-3 py-2.5",
                  g.tier > 0 ? "border-[rgba(245,118,26,.5)] bg-orange-50/70" : "border-[rgba(18,104,168,.2)]",
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-display text-xs font-bold uppercase tracking-wide">
                    {g.tier > 0 ? `Kopgroep · +${g.tier}` : GROEPSNAMEN[i] ?? "Groep"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {g.leden.length} rijder{g.leden.length > 1 ? "s" : ""}
                  </span>
                  <span className="ml-auto font-mono text-[11px] font-bold text-[#0b4c91]">
                    {g.tier !== 0 ? tierLabel(g.tier) : i === 0 ? "aan kop" : `+${(g.leden[0].gapInGroup + (g.gapToPrev ?? 0)).toFixed(1)}s`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.leden.map((l) => {
                    const mine = mineBeennummers.has(l.rider.beennummer);
                    return (
                      <span
                        key={l.rider.beennummer}
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[9.5px]",
                          mine ? "bg-[#0b4c91] font-bold text-white" : "bg-foreground/[0.07] text-foreground/70",
                        )}
                      >
                        {l.rider.beennummer} {l.rider.naam.split(" ").slice(-1)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

const GROEPSNAMEN = ["Kopgroep", "Eerste achtervolgers", "Peloton", "Achterhoede", "Gelost"];

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
