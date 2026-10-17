import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  projectPoints,
  groepsKopje,
  groepsNaam,
  groepsRol,
  kopSamenvatting,
  virtueleUitslag,
  type LiveGroup,
  type LiveRider,
  type PointsSchema,
} from "@/lib/liveMarathon";
import { groepsGat, puntenSchaal, rolColor, rondeBadge, tierLabel } from "@/lib/liveRink";
import { meermarathonCategorieLabel, meermarathonStageLabel } from "@/lib/gameTypes";
import { schemaMetWeging } from "@/lib/wegingsfactor";
import { isStale, type LiveRace } from "@/hooks/useLiveRace";
import LiveRink from "@/components/meermarathon/LiveRink";

/**
 * Mono zoals in het ontwerp (JetBrains Mono); Tailwinds font-mono is de
 * systeemletter. De hint family-name is nodig: zonder ziet tailwind-merge dit
 * als een gewicht en gooit cn() het weg zodra er font-bold achter staat.
 */
const MONO = "font-[family-name:'JetBrains_Mono',ui-monospace,monospace]";
/** Kaartkop: "MIJN RIJDERS", "OP DE BAAN". */
const KAART_LABEL = cn(MONO, "text-[11px] font-normal uppercase tracking-[0.18em]");
/**
 * Tekst in de hot-kleur ("1 van jou"). In Nachtijs haalt het rood op de
 * donkere kaart geen 4,5:1; daar mengen we er wat van de tekstkleur door.
 */
const HOT_TEKST =
  "text-[var(--mm-hot)] in-data-[modus=nacht]:text-[color-mix(in_srgb,var(--mm-hot)_70%,hsl(var(--foreground)))]";
/** Achtergrond van een regel met een rijder van jou. */
const EIGEN_REGEL = "bg-[color-mix(in_srgb,var(--mm-hot)_8%,transparent)]";

/**
 * Live-tab in de Volgwagen: de baan, de situatie in koers en wat het jou
 * voorlopig oplevert. Alleen zichtbaar bij Meermarathon met een gekoppelde baan.
 *
 * Presentatie: alles komt via props. De data haalt MyTeamPanel op
 * (useLiveRace, de ploeg en het puntenschema).
 */
type LiveTabProps = {
  race: LiveRace | null;
  mineRiderIds: Set<string>;
  pointsSchema: PointsSchema;
  /** Hoe zwaar deze wedstrijd telt (lib/wegingsfactor); 1 = gewoon. */
  weging?: number;
  /** Nagebootste koers: zet een stempel "Simulatie" in de kop. */
  simulatie?: boolean;
  /** Categorie van de game ("vrouwen" | "mannen"), voor de titel. Onbekend: dat deel vervalt. */
  categorie?: string | null;
  /** wedstrijd_type van de live wedstrijd; zonder valt de naam terug op het ijstype (Cup of Grand Prix). */
  wedstrijdType?: string | null;
  /** Ploegnaam, rechts naast de titel op een breed scherm. */
  ploegNaam?: string | null;
  /** Je rijders met naam: zo staat ook wie niet in de koers zit in "Mijn rijders". */
  mijnRijders?: { id: string; naam: string }[];
};

/**
 * Het tabje staat er altijd, ook buiten een wedstrijd — beter een rustige
 * uitleg dan een tab die verschijnt en verdwijnt. De keuze zit bewust in deze
 * wrapper: de inhoud gebruikt hooks, en die mogen niet achter een early return
 * staan.
 */
export default function LiveTab(props: LiveTabProps) {
  // Containerqueries i.p.v. lg: de tab staat in een kolom van MijnPeloton, en
  // in de testbank naast elkaar op 390 en 1200 px. Breekpunten: @2xl (672 px)
  // voor de KPI's op één rij, @4xl (896 px) voor de twee kolommen.
  return (
    <div data-eigen-typografie className="@container/live w-full min-w-0 font-inter">
      {!props.race || props.race.tracks.length === 0 ? <LiveLeeg /> : <LiveInhoud {...props} race={props.race} />}
    </div>
  );
}

/** Eén rijder van jou, met waar hij op dit moment rijdt. */
type EigenRegel = {
  sleutel: string;
  riderId: string | null;
  positie: number;
  naam: string;
  punten: number;
  groep: { kopje: string; badge: string | null };
  verschil: number | null | undefined;
};

type Baan = LiveRace["tracks"][number];

function LiveInhoud({
  race,
  mineRiderIds,
  pointsSchema,
  weging = 1,
  simulatie,
  categorie,
  wedstrijdType,
  ploegNaam,
  mijnRijders,
}: LiveTabProps & { race: LiveRace }) {
  const [actief, setActief] = useState(0);
  const [standOpen, setStandOpen] = useState(false);
  // Vijf regels zichtbaar: genoeg om de kop van de koers te zien zonder dat de
  // kolom langer wordt dan de baan ernaast. Twintig is één tik verderop.
  const [uitslagVol, setUitslagVol] = useState(false);
  // Eén groep tegelijk open: je kijkt naar één pak.
  const [openGroep, setOpenGroep] = useState<number | null>(null);
  // Mijn rijders dichtgeklapt: eerst wie er scoort, je eigen ploeg op verzoek.
  const [mijnOpen, setMijnOpen] = useState(false);

  const track = race.tracks[Math.min(actief, race.tracks.length - 1)];
  const verouderd = isStale(race.syncedAt);

  // Eigen rijders per baan, zodat de koersschakelaar kan tonen waar je zit.
  const mineCount = (t: Baan) =>
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

  // Telt deze wedstrijd zwaarder (Grand Prix ×2), dan ook de voorlopige
  // punten: dezelfde regel als de telling na het fiatteren.
  const schema = useMemo(() => schemaMetWeging(pointsSchema, weging), [pointsSchema, weging]);

  // Punten over álle banen samen: een oudere, gecombineerde game kan rijders
  // in de mannen- én de vrouwenkoers hebben.
  const projectie = useMemo(() => {
    const perBaan = race.tracks.map((t) =>
      projectPoints(t.groups.flatMap((g) => g.leden), {
        schema,
        mineRiderIds,
        riderIdByBeennummer: t.riderIdByBeennummer,
      }),
    );
    return {
      perBaan,
      totaal: perBaan.reduce((s, p) => s + p.ritPunten, 0),
    };
  }, [race.tracks, schema, mineRiderIds]);

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
    const t = race.tracks[bi];
    const groepVan = new Map<string, number>();
    t.groups.forEach((g, gi) => g.leden.forEach((l) => groepVan.set(l.rider.beennummer, gi)));
    return p.rijders.map((r) => {
      const gi = groepVan.get(r.rider.beennummer) ?? 0;
      const sleutel = `${bi}:${r.rider.beennummer}`;
      return {
        sleutel,
        riderId: t.riderIdByBeennummer.get(r.rider.beennummer) ?? null,
        positie: r.positie,
        naam: r.rider.naam,
        punten: r.punten,
        groep: { kopje: groepsKopje(t.groups, gi), badge: rondeBadge(t.groups[gi]?.tier ?? 0) },
        verschil: plekVerschil(sleutel, r.positie),
      };
    });
  });

  // Wie van jou niet in de uitslag van de bron staat, is niet gestart. Alleen
  // rijders uit mineRiderIds: in de simulatie is dat een nagebootste ploeg.
  const inKoers = new Set(eigen.map((r) => r.riderId));
  const nietGestart = (mijnRijders ?? []).filter((r) => mineRiderIds.has(r.id) && !inKoers.has(r.id));

  const uitslag = virtueleUitslag(track.groups.flatMap((g) => g.leden), {
    schema,
    mineRiderIds,
    riderIdByBeennummer: track.riderIdByBeennummer,
  });

  const wedstrijd = meermarathonStageLabel({
    name: race.stageName,
    stage_number: race.stageNumber,
    ijs_type: race.ijsType,
    wedstrijd_type: wedstrijdType ?? null,
  });
  const categorieLabel = meermarathonCategorieLabel(categorie);
  const bijgewerkt = race.syncedAt ? new Date(race.syncedAt).toLocaleTimeString("nl-NL") : null;

  return (
    <div className="space-y-3.5 @4xl/live:space-y-5">
      <Kop
        race={race}
        track={track}
        verouderd={verouderd}
        simulatie={simulatie}
        titel={categorieLabel ? `${wedstrijd} — ${categorieLabel}` : wedstrijd}
        ploegNaam={ploegNaam}
      />

      {verouderd && (
        <p
          role="status"
          className="rounded-[9px] border border-[var(--mm-alert-line)] bg-[var(--mm-alert-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--mm-alert-fg)]"
        >
          De laatste stand is van {bijgewerkt ?? "een onbekend moment"}. De gegevens hieronder kunnen achterlopen.
        </p>
      )}

      {/* Koersschakelaar — alleen bij meerdere gelijktijdige koersen */}
      {race.tracks.length > 1 && (
        <div className="flex gap-2" role="group" aria-label="Kies de koers">
          {race.tracks.map((t, i) => {
            const n = mineCount(t);
            return (
              <button
                key={t.trackId}
                type="button"
                onClick={() => {
                  setActief(i);
                  setOpenGroep(null);
                }}
                aria-pressed={i === actief}
                className={cn(
                  "min-h-11 flex-1 rounded-[9px] border-2 px-3 py-2 text-left transition-colors",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  i === actief ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-card",
                )}
              >
                <span className="flex items-center gap-1.5 font-display text-sm font-bold">
                  {t.label ?? t.categorie ?? t.trackId}
                  {n > 0 && (
                    <span className={cn(MONO, "rounded bg-[var(--mm-hot)] px-1 py-px text-[9px] font-bold text-white")}>
                      {n} van jou
                    </span>
                  )}
                </span>
                <span className={cn(MONO, "block text-[10px] opacity-75")}>{t.riders.length} rijders</span>
              </button>
            );
          })}
        </div>
      )}

      <Kpis
        totaal={projectie.totaal}
        delta={vorige ? projectie.totaal - vorige.totaal : null}
        inKoers={eigen.length}
        aantalEigen={mineRiderIds.size || eigen.length}
        state={track.state}
      />

      {/* Twee kolommen op breed scherm: links wat er op het ijs gebeurt, rechts
          wie er scoort en wat het jou oplevert. Op een telefoon onder elkaar,
          met de uitslag eerst: tijdens een wedstrijd is "wie wint er nu?" de
          eerste vraag. De DOM-volgorde is die van de telefoon; op breed zet het
          grid de baan links. */}
      <div className="grid gap-3.5 @4xl/live:grid-cols-[minmax(0,1fr)_360px] @4xl/live:items-start @4xl/live:gap-5">
        <div className="min-w-0 space-y-3.5 @4xl/live:col-start-2 @4xl/live:row-start-1 @4xl/live:space-y-5">
          <VirtueleUitslag
            regels={uitslag}
            vol={uitslagVol}
            onToggle={() => setUitslagVol((v) => !v)}
            verschil={(r) => plekVerschil(`${actief}:${r.rider.beennummer}`, r.positie)}
          />
          <SnelsteRonde
            state={track.state}
            mijn={track.state?.snelsteRondeBeennummer ? mineBeennummers.has(track.state.snelsteRondeBeennummer) : false}
          />
          <MijnRijders
            open={mijnOpen}
            onToggle={() => setMijnOpen((v) => !v)}
            totaal={projectie.totaal}
            aantal={mineRiderIds.size || eigen.length}
            eigen={eigen}
            nietGestart={nietGestart}
            schaal={puntenSchaal(pointsSchema, 20, weging)}
          />
        </div>

        {/* Op een telefoon is alleen de baan een kaart en staan de groepen er
            los onder; op een breed scherm zit alles in één kaart. */}
        <section
          aria-label="Op de baan"
          className="@container/baan min-w-0 space-y-3.5 @4xl/live:col-start-1 @4xl/live:row-start-1 @4xl/live:retro-border @4xl/live:bg-card @4xl/live:p-4"
        >
          <div className="hidden items-center justify-between @4xl/live:flex">
            <h3 className={KAART_LABEL}>Op de baan</h3>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="size-[9px] rounded-full bg-[var(--mm-hot)]" aria-hidden />= mijn rijder
            </span>
          </div>
          <div className="rounded-[9px] border-2 border-foreground bg-card p-3 shadow-[3px_3px_0_hsl(var(--foreground))] @4xl/live:rounded-none @4xl/live:border-0 @4xl/live:bg-transparent @4xl/live:p-0 @4xl/live:shadow-none">
            <KopRegel groups={track.groups} mine={mineBeennummers} />
            <LiveRink
              groups={track.groups}
              mineBeennummers={mineBeennummers}
              rondeLengte={track.state?.rondeLengte ?? null}
              baanNaam={track.trackId}
            />
          </div>
          <GroepKaarten
            groups={track.groups}
            mine={mineBeennummers}
            open={openGroep}
            onOpen={(i) => setOpenGroep((v) => (v === i ? null : i))}
          />
        </section>
      </div>

      <VolledigeStand
        track={track}
        mine={mineBeennummers}
        open={standOpen}
        onToggle={() => setStandOpen((v) => !v)}
      />

      <p className={cn(MONO, "px-1 text-[10px] leading-relaxed text-muted-foreground")}>
        Voorlopig · niet gefiatteerd, wel met dezelfde rekenregel als bij het fiatteren.
        <br />
        Bron: livemarathon.schaatsen.nl
        {bijgewerkt && ` · bijgewerkt ${bijgewerkt}`}
        {track.state?.raceTime && ` · duur ${track.state.raceTime}`}
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

/**
 * Kop van de pagina: LIVE, waar er gereden wordt, en welke wedstrijd. Alleen
 * wat de bron en de database weten: geen rondelengte of ijssoort, dan vervalt
 * dat stukje.
 */
function Kop({
  race,
  track,
  verouderd,
  simulatie,
  titel,
  ploegNaam,
}: {
  race: LiveRace;
  track: Baan;
  verouderd: boolean;
  simulatie?: boolean;
  titel: string;
  ploegNaam?: string | null;
}) {
  const lengte = track.state?.rondeLengte ? `${track.state.rondeLengte} m` : null;
  const ijs = race.ijsType === "kunstijs" || race.ijsType === "natuurijs" ? race.ijsType : null;
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 @2xl/live:gap-x-2.5">
          {verouderd ? (
            <span
              className={cn(
                MONO,
                "inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-2 py-[3px] text-[11px] leading-[14px] tracking-[0.16em] text-secondary-foreground",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              ONDERBROKEN
            </span>
          ) : (
            <span
              className={cn(
                MONO,
                "inline-flex items-center gap-1.5 rounded-[4px] bg-[var(--mm-hot)] px-[9px] py-1 text-[11px] leading-[14px] tracking-[0.16em] text-white",
              )}
            >
              <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" aria-hidden />
              LIVE
            </span>
          )}
          <span className={cn(MONO, "text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground @2xl/live:text-[11px]")}>
            {track.trackId}
            {lengte && ` · ${lengte}`}
            {ijs && <span className="hidden @4xl/live:inline">{lengte ? ` ${ijs}` : ` · ${ijs}`}</span>}
          </span>
          <Bijgewerkt iso={race.syncedAt} />
          {simulatie && (
            <span
              role="status"
              className="-rotate-2 rounded-sm border-2 border-dashed border-[hsl(var(--vintage-gold))] px-1.5 py-0.5 font-stamp text-[10px] uppercase tracking-[0.15em] text-foreground"
              title="Nagebootste stand om deze weergave te bekijken. Er wordt niets opgeslagen."
            >
              Simulatie
              <span className="sr-only"> — geen echte koers, er wordt niets opgeslagen</span>
            </span>
          )}
        </div>
        <h2 className="mt-1 font-display text-[26px] font-bold leading-[1.1] @2xl/live:mt-2 @2xl/live:text-[34px]">{titel}</h2>
      </div>
      {ploegNaam && (
        <div className="hidden min-w-0 shrink text-right @2xl/live:block">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Mijn ploeg</div>
          <div className="truncate text-[19px] font-bold">{ploegNaam}</div>
        </div>
      )}
    </header>
  );
}

/**
 * De vier cijfers van de avond: wat je ploeg nu scoort, hoeveel rijders van
 * jou meedoen, en hoe ver de koers is. Twee bij twee op een telefoon, één rij
 * op een breed scherm.
 */
function Kpis({
  totaal,
  delta,
  inKoers,
  aantalEigen,
  state,
}: {
  totaal: number;
  delta: number | null;
  inKoers: number;
  aantalEigen: number;
  state: Baan["state"];
}) {
  const s = state;
  const voortgang = s?.maxRonden != null && s?.totaalRonden ? Math.min(1, s.maxRonden / s.totaalRonden) : null;
  const km =
    s?.rondenTeGaan != null && s?.rondeLengte
      ? ((s.rondenTeGaan * s.rondeLengte) / 1000).toFixed(1).replace(".", ",")
      : null;
  return (
    <dl className="grid grid-cols-2 gap-[2px] overflow-hidden rounded-[10px] border border-border bg-border @2xl/live:grid-cols-4">
      <Kpi label="Virtuele punten">
        {totaal}
        <Eenheid>pt</Eenheid>
        {delta != null && delta !== 0 && (
          <span
            className={cn(MONO, "text-[11px] font-semibold tracking-normal text-[var(--mm-kpi-sub)]")}
            title="Verschil met het eind van de vorige ronde"
          >
            {delta > 0 ? "▲" : "▼"}
            {Math.abs(delta)}
            <span className="sr-only"> sinds de vorige ronde</span>
          </span>
        )}
      </Kpi>
      <Kpi
        label={
          <>
            Mijn rijders<span className="hidden @4xl/live:inline"> in koers</span>
          </>
        }
      >
        {aantalEigen > 0 ? (
          <>
            {inKoers}
            <Eenheid>van {aantalEigen}</Eenheid>
          </>
        ) : (
          "—"
        )}
      </Kpi>
      <Kpi
        label="Ronde"
        onder={
          voortgang != null && (
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[color-mix(in_srgb,var(--mm-kpi-sub)_22%,transparent)]" aria-hidden>
              <span
                className="block h-full bg-[var(--mm-kpi-sub)] transition-[width] duration-700"
                style={{ width: `${voortgang * 100}%` }}
              />
            </span>
          )
        }
      >
        {s?.maxRonden ?? "—"}
        {s?.totaalRonden != null && <Eenheid>/ {s.totaalRonden}</Eenheid>}
      </Kpi>
      <Kpi label="Te gaan">
        {s?.rondenTeGaan ?? "—"}
        {s?.rondenTeGaan != null && (
          <Eenheid>
            ronde{s.rondenTeGaan === 1 ? "" : "n"}
            {km && <span className="hidden @4xl/live:inline"> · {km} km</span>}
          </Eenheid>
        )}
      </Kpi>
    </dl>
  );
}

function Kpi({ label, onder, children }: { label: ReactNode; onder?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative min-w-0 bg-[var(--mm-kpi1)] px-4 py-3.5 text-[var(--mm-kpi-fg)] even:bg-[var(--mm-kpi2)] @4xl/live:px-5 @4xl/live:py-4">
      <dt className={cn(MONO, "truncate text-[10px] uppercase tracking-[0.18em] text-[var(--mm-kpi-sub)]")}>{label}</dt>
      <dd className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums">
        {children}
      </dd>
      {onder}
    </div>
  );
}

function Eenheid({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium tracking-normal text-[var(--mm-kpi-sub)]">{children}</span>;
}

/** Eén regel bovenop de baan als er iemand weg is (tekst uit `kopSamenvatting`). */
function KopRegel({ groups, mine }: { groups: LiveGroup[]; mine: Set<string> }) {
  const kop = kopSamenvatting(groups, mine);
  if (!kop) return null;
  const kleur = rolColor(groepsRol(groups, 0));
  return (
    <p className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-0.5 text-[13px] @4xl/live:mb-3">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: kleur }} aria-hidden />
      <span className="font-display font-bold">{kop.titel}</span>
      <span className={cn("text-xs", kop.eigen.length > 0 ? cn("font-bold", HOT_TEKST) : "text-muted-foreground")}>
        {kop.sub}
      </span>
    </p>
  );
}

/**
 * Eén kaart per groep, van voor naar achter: kleur, naam, hoeveel rijders en
 * hoe ver van het peloton. Tik op een kaart om te zien wie erin zit.
 */
function GroepKaarten({
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
  const lijstId = useId();
  const openG = open != null ? groups[open] : null;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 @xl/baan:grid-cols-4">
        {groups.map((g, i) => {
          const rol = groepsRol(groups, i);
          const badge = rondeBadge(g.tier);
          const eigen = g.leden.filter((l) => mine.has(l.rider.beennummer)).length;
          const gat = groepsGat(groups, i);
          const n = g.leden.length;
          const isOpen = open === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onOpen(i)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? lijstId : undefined}
              className={cn(
                "min-h-11 min-w-0 rounded-[9px] border bg-card px-3 py-2.5 text-left transition-shadow",
                "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                isOpen ? "border-foreground shadow-[2px_2px_0_hsl(var(--foreground))]" : "border-border",
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: rolColor(rol) }} aria-hidden />
                <span className={cn(MONO, "min-w-0 truncate text-[10px] uppercase tracking-[0.1em] text-secondary-foreground")}>
                  {groepsKopje(groups, i)}
                  {badge && ` ${badge}`}
                </span>
              </span>
              <span className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold leading-tight tabular-nums">{n}</span>
                <span className="min-w-0 text-xs text-muted-foreground">
                  rijder{n === 1 ? "" : "s"}
                  {gat && ` · ${gat}`}
                </span>
                <ChevronDown
                  className={cn("ml-auto size-3.5 shrink-0 self-center text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  aria-hidden
                />
              </span>
              {eigen > 0 && <span className={cn("block text-xs font-bold", HOT_TEKST)}>{eigen} van jou</span>}
            </button>
          );
        })}
      </div>
      {openG && open != null && (
        <div id={lijstId} className="mt-2 rounded-[9px] border border-border bg-card p-2.5">
          <p className={cn(MONO, "mb-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground")}>
            {groepsNaam(groups, open)} · {openG.leden.length} rijder{openG.leden.length === 1 ? "" : "s"}
          </p>
          <ul className="flex flex-wrap gap-1">
            {openG.leden.map((l) => {
              const isMijn = mine.has(l.rider.beennummer);
              return (
                <li
                  key={l.rider.beennummer}
                  className={cn(
                    MONO,
                    "rounded px-1.5 py-0.5 text-[10px]",
                    isMijn
                      ? cn("bg-card font-bold shadow-[inset_0_0_0_1.5px_var(--mm-hot)]", HOT_TEKST)
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {l.rider.beennummer} {l.rider.naam.split(" ").slice(-1)}
                  {isMijn && <span className="sr-only"> (jouw rijder)</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * "bijgewerkt 12 s geleden": tikt elke seconde door, zodat je ziet dat de stand
 * meeloopt. De gegevens zelf ververst useLiveRace; dit is alleen de klok.
 */
function Bijgewerkt({ iso }: { iso: string | null }) {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNu(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!iso) return null;
  const s = Math.max(0, Math.round((nu - new Date(iso).getTime()) / 1000));
  return (
    <span className={cn(MONO, "text-[10.5px] tabular-nums text-muted-foreground @2xl/live:text-[11px]")}>
      <span aria-hidden>· </span>bijgewerkt {s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`} geleden
    </span>
  );
}

type UitslagRegel = ReturnType<typeof virtueleUitslag>[number];

/** Achterstand op de leider zoals de bron die toont: in seconden, of in ronden. */
function achterstand(r: LiveRider, leider: LiveRider | undefined): string {
  if (!leider || r.beennummer === leider.beennummer) return "leider";
  const ronden = (leider.aantalRonden ?? 0) - (r.aantalRonden ?? 0);
  if (ronden > 0) return `+${ronden} ronde${ronden === 1 ? "" : "n"}`;
  if (r.tijdSort == null || leider.tijdSort == null) return "";
  return `+${((r.tijdSort - leider.tijdSort) / 1000).toFixed(2).replace(".", ",")} s`;
}

/**
 * Wie er nu scoort: de top van het veld met de punten als de koers nu stopt.
 * Staat bovenaan, want dat is tijdens een wedstrijd de eerste vraag. Het hele
 * veld, niet alleen jouw rijders; die zijn rood gemarkeerd.
 */
function VirtueleUitslag({
  regels,
  vol,
  onToggle,
  verschil,
}: {
  regels: UitslagRegel[];
  vol: boolean;
  onToggle: () => void;
  verschil: (r: UitslagRegel) => number | null | undefined;
}) {
  const leider = regels[0]?.rider;
  return (
    <section aria-label="Virtuele uitslag" className="retro-border overflow-hidden bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-3.5 py-3 @4xl/live:px-4 @4xl/live:py-3.5">
        <h3 className={KAART_LABEL}>Virtuele uitslag</h3>
        <span className={cn(MONO, "text-[10px] uppercase tracking-[0.1em] text-muted-foreground")}>
          als de koers nu stopt
        </span>
      </div>
      <ol>
        {regels.slice(0, vol ? 20 : 5).map((r) => (
          <li
            key={r.rider.beennummer}
            className={cn(
              "flex min-h-[52px] items-center gap-2.5 border-b border-border px-3.5 py-1.5 @4xl/live:px-4",
              r.isMine && EIGEN_REGEL,
            )}
          >
            <Plek positie={r.positie} />
            <Pijltje verschil={verschil(r)} vast />
            <Rugnummer nummer={r.rider.beennummer} mijn={r.isMine} />
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-[14px] leading-tight", r.isMine ? "font-bold" : "font-semibold")}>
                {r.rider.naam}
                {r.isMine && <span className="sr-only"> (jouw rijder)</span>}
              </span>
              <span className={cn(MONO, "block text-[10px] tabular-nums text-muted-foreground")}>
                {achterstand(r.rider, leider)}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-right text-[14px] font-bold tabular-nums",
                r.punten === 0
                  ? "text-muted-foreground"
                  : r.isMine
                    ? "bg-[var(--mm-hot)] text-white"
                    : "bg-secondary text-secondary-foreground",
              )}
            >
              {r.punten}
              <span className="text-[10px] font-medium"> pt</span>
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={vol}
        className={cn(
          MONO,
          "flex min-h-11 w-full items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
          "transition-colors hover:bg-secondary focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        )}
      >
        {vol ? "Toon top 5" : "Toon top 20"}
        <ChevronDown className={cn("size-3.5 transition-transform", vol && "rotate-180")} aria-hidden />
      </button>
    </section>
  );
}

/** Plek in de uitslag; het podium krijgt een ring, plek 1 in goud. */
function Plek({ positie }: { positie: number }) {
  const podium = positie <= 3;
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold tabular-nums",
        positie === 1 && "border-2 border-[hsl(var(--vintage-gold))]",
        podium && positie > 1 && "border-2 border-border",
        !podium && "font-medium text-muted-foreground",
      )}
    >
      {positie}
    </span>
  );
}

/** "26.851" → "26,851 s"; met minuten ("1:02.345") blijft de s weg. */
function rondeTijd(v: string): string {
  const t = v.trim().replace(/\.(\d+)$/, ",$1");
  return t.includes(":") ? t : `${t} s`;
}

/** "53,6km/u" → "53,6 km/u". */
function snelheid(v: string): string {
  return `${v.replace(/\s*km\/u\s*$/i, "").trim()} km/u`;
}

/**
 * Snelste ronde van de wedstrijd tot nu toe, met het gemiddelde eronder: zoals
 * de bron hem toont, maar met je eigen rijder gemarkeerd. Zonder snelste ronde
 * (koers net begonnen, of de bron kent hem niet) blijft de kaart weg.
 */
function SnelsteRonde({ state, mijn }: { state: Baan["state"]; mijn: boolean }) {
  if (!state?.snelsteRondeTijd) return null;
  return (
    <section aria-label="Snelste ronde" className="overflow-hidden rounded-[9px] border border-border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-3.5 py-3 @4xl/live:px-4">
        <h3 className={KAART_LABEL}>Snelste ronde</h3>
        {state.snelsteRondeNr != null && (
          <span className={cn(MONO, "text-[10px] uppercase tracking-[0.1em] text-muted-foreground")}>
            ronde {state.snelsteRondeNr}
          </span>
        )}
      </div>
      <div className={cn("flex items-center gap-3 px-3.5 py-3 @4xl/live:px-4", mijn && EIGEN_REGEL)}>
        {state.snelsteRondeBeennummer && <Rugnummer nummer={state.snelsteRondeBeennummer} mijn={mijn} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">
            {state.snelsteRondeNaam ?? "Onbekende rijder"}
            {mijn && <span className="sr-only"> (jouw rijder)</span>}
          </span>
          {mijn && (
            <span className={cn(MONO, "block text-[10px] font-bold uppercase tracking-[0.1em]", HOT_TEKST)}>van jou</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-display text-[26px] font-bold leading-none tabular-nums">
            {rondeTijd(state.snelsteRondeTijd)}
          </span>
          {state.snelsteRondeSnelheid && (
            <span className={cn(MONO, "mt-1 block text-[11px] tabular-nums text-muted-foreground")}>
              {snelheid(state.snelsteRondeSnelheid)}
            </span>
          )}
        </span>
      </div>
      {state.gemRondeTijd && (
        <p className={cn(MONO, "border-t border-border px-3.5 py-2.5 text-[10.5px] tabular-nums text-muted-foreground @4xl/live:px-4")}>
          Gemiddelde ronde {rondeTijd(state.gemRondeTijd)}
          {state.gemRondeSnelheid && ` · ${snelheid(state.gemRondeSnelheid)}`}
        </p>
      )}
    </section>
  );
}

/**
 * Jouw rijders: waar ze zitten, op welke plek en wat dat nu oplevert. Wie niet
 * in de uitslag van de bron staat, staat onderaan als "niet gestart".
 *
 * Dichtgeklapt staat er een samenvatting (punten, hoeveel in koers, je beste
 * rijder); de lijst klap je open. Zo blijft de uitslag bovenaan in beeld.
 */
function MijnRijders({
  open,
  onToggle,
  totaal,
  aantal,
  eigen,
  nietGestart,
  schaal,
}: {
  open: boolean;
  onToggle: () => void;
  totaal: number;
  aantal: number;
  eigen: EigenRegel[];
  nietGestart: { id: string; naam: string }[];
  schaal: string | null;
}) {
  const lijstId = useId();
  const beste = eigen.reduce<EigenRegel | null>((b, r) => (!b || r.positie < b.positie ? r : b), null);
  return (
    <section aria-label="Mijn rijders" className="overflow-hidden rounded-[9px] border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={open ? lijstId : undefined}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-secondary @4xl/live:px-4",
          "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className={cn(KAART_LABEL, "block")}>Mijn rijders</span>
          <span className="mt-1 block truncate text-[13px] text-muted-foreground">
            {eigen.length} van {aantal} in koers
            {/* Plek vóór de naam: wordt de regel afgekapt, dan valt de naam weg, niet de plek. */}
            {beste && (
              <>
                {` · beste P${beste.positie} `}
                <span className="font-semibold text-foreground">{beste.naam}</span>
              </>
            )}
          </span>
        </span>
        <span className="shrink-0 text-right leading-none">
          <span className="text-[22px] font-bold tabular-nums">{totaal}</span>
          <span className={cn(MONO, "ml-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground")}>pt</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div id={lijstId} className="border-t border-border">
          <ul>
            {eigen.map((r) => (
              <li key={r.sleutel} className="flex min-h-[52px] items-center gap-3 border-b border-border px-3.5 py-1.5 last:border-b-0 @4xl/live:px-4">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-bold">{r.naam}</span>
                  </span>
                  <span className={cn(MONO, "flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]")}>
                    <span className="truncate">
                      {r.groep.kopje}
                      {r.groep.badge && ` ${r.groep.badge}`}
                    </span>
                    <Pijltje verschil={r.verschil} />
                  </span>
                </span>
                <span className="w-[38px] shrink-0 text-right text-[13px] font-semibold tabular-nums">P{r.positie}</span>
                <span className="w-9 shrink-0 text-right text-[15px] font-bold tabular-nums">{r.punten}</span>
              </li>
            ))}
            {nietGestart.map((r) => (
              <li key={r.id} className="flex min-h-[52px] items-center gap-3 border-b border-border px-3.5 py-1.5 last:border-b-0 @4xl/live:px-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{r.naam}</span>
                  <span className={cn(MONO, "block text-[10px] uppercase tracking-[0.1em]")}>Niet gestart</span>
                </span>
                <span className="w-[38px] shrink-0 text-right text-[13px] font-semibold">
                  <span aria-hidden>–</span>
                  <span className="sr-only">geen plek</span>
                </span>
                <span className="w-9 shrink-0 text-right text-[15px] font-bold tabular-nums">0</span>
              </li>
            ))}
          </ul>
          {eigen.length === 0 && nietGestart.length === 0 && (
            <p className="px-3.5 py-3 text-xs text-muted-foreground">
              Geen van jouw rijders is aan een deelnemer in deze koers gekoppeld.
            </p>
          )}
          {schaal && (
            <p className="border-t border-border px-3.5 py-3 text-xs leading-normal text-muted-foreground @4xl/live:px-4">
              {schaal} Loopt live mee met de rondestand.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Het hele veld op volgorde, dichtgeklapt: voor wie precies wil weten wie waar rijdt. */
function VolledigeStand({
  track,
  mine,
  open,
  onToggle,
}: {
  track: Baan;
  mine: Set<string>;
  open: boolean;
  onToggle: () => void;
}) {
  const lijstId = useId();
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={open ? lijstId : undefined}
        className={cn(
          MONO,
          "flex min-h-11 w-full items-center gap-2 rounded px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground",
          "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        Volledige stand · {track.riders.length}
        <ChevronDown className={cn("ml-auto size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ol id={lijstId} className="max-h-72 overflow-y-auto rounded-[9px] border border-border bg-card">
          {track.groups.flatMap((g) =>
            g.leden.map((l) => {
              const isMijn = mine.has(l.rider.beennummer);
              return (
                <li
                  key={l.rider.beennummer}
                  className={cn(
                    "flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0",
                    isMijn && EIGEN_REGEL,
                  )}
                >
                  <span className="w-6 text-center font-display text-sm font-bold tabular-nums">{l.positie}</span>
                  <Rugnummer nummer={l.rider.beennummer} mijn={isMijn} />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {l.rider.naam}
                    {isMijn && <span className="sr-only"> (jouw rijder)</span>}
                  </span>
                  <span className={cn(MONO, "shrink-0 text-right text-[10px] tabular-nums")}>
                    <span className="block">{l.rider.tijd ?? "—"}</span>
                    <span className={cn("block", l.tier > 0 ? "font-bold" : "text-muted-foreground")}>
                      {l.tier !== 0
                        ? tierLabel(l.tier)
                        : l.gapInGroup
                          ? `+${l.gapInGroup.toFixed(1).replace(".", ",")}`
                          : "—"}
                    </span>
                  </span>
                </li>
              );
            }),
          )}
        </ol>
      )}
    </section>
  );
}

/** Rugnummer als tegeltje: rood voor je eigen rijders, rustig voor de rest. */
function Rugnummer({ nummer, mijn }: { nummer: string; mijn: boolean }) {
  return (
    <span
      className={cn(
        MONO,
        "grid h-7 min-w-7 shrink-0 place-items-center rounded-lg px-1 text-[11px] font-semibold",
        mijn ? "bg-[var(--mm-hot)] text-white" : "bg-secondary text-secondary-foreground",
      )}
    >
      {nummer}
    </span>
  );
}

/**
 * Plekken gewonnen of verloren sinds de vorige ronde. Het pijltje draagt de
 * richting, dus geen groen of rood nodig. `vast` houdt in een lijst een lege
 * kolom vrij, zodat de namen onder elkaar blijven staan.
 */
function Pijltje({ verschil, vast }: { verschil: number | null | undefined; vast?: boolean }) {
  // undefined: nog geen vorige ronde bekend -- dan ook geen lege kolom.
  if (verschil === undefined) return null;
  if (!verschil) return vast ? <span className="w-6 shrink-0" aria-hidden /> : null;
  const op = verschil > 0;
  const n = Math.abs(verschil);
  const uitleg = `${n} plek${n > 1 ? "ken" : ""} ${op ? "gewonnen" : "verloren"} sinds de vorige ronde`;
  return (
    <span
      className={cn(MONO, "shrink-0 text-[9px] font-bold tabular-nums tracking-normal text-muted-foreground", vast && "w-6")}
      title={uitleg}
    >
      <span aria-hidden>
        {op ? "▲" : "▼"}
        {n}
      </span>
      <span className="sr-only">{uitleg}</span>
    </span>
  );
}

function LiveLeeg() {
  return (
    <div className="rounded-[9px] border border-dashed border-border bg-card px-4 py-8 text-center">
      <Radio className="mx-auto size-6 text-primary" aria-hidden />
      <p className="mt-2.5 font-display text-base font-bold text-foreground">Nog geen wedstrijd live</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Zodra er gereden wordt zie je hier de baan, de groepen op het ijs en wat jouw rijders op dat moment
        opleveren.
      </p>
    </div>
  );
}
