/**
 * Uitslagenbalk van de Meermarathon: één balk per wedstrijd, met het embleem
 * van zijn soort (Cup, Grand Prix, ONK, NK) erboven en je punten eronder.
 * De tegenhanger van de etappebalk bij de wielerkoersen, maar zonder
 * kilometers of terrein: die kent het schaatsen niet.
 *
 * Achter de balken staat een schaatsfoto (lib/meermarathonFotos): het peloton
 * in de mist. Een lichte foto krijgt een witte waas (.mm-balk-waas-licht in
 * styles/meermarathon-thema.css, in de nacht donker) en de inhoud houdt de
 * kleuren van het thema. Een donkere foto krijgt een dimlaag en de
 * nachtkleuren (.mm-balk-foto). Met foto={null} blijft het de lichte kaart met
 * de ijsbaan als watermerk.
 *
 * Alleen weergave; bouwWedstrijdBalk (lib/meermarathonBalk) maakt de rijen.
 * Schakelt op zijn eigen breedte: smal schuift de rij opzij, breed past alles.
 */
import { useEffect, useRef } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import FotoCredit from "@/components/meermarathon/FotoCredit";
import { SoortEmbleem, SoortLabel, WEDSTRIJD_SOORT } from "@/components/meermarathon/WedstrijdSoort";
import { soortenInBalk, type BalkWedstrijd } from "@/lib/meermarathonBalk";
import { BALK_FOTO, type BalkFoto } from "@/lib/meermarathonFotos";
import { mmGetal } from "@/lib/meermarathonKlassement";
import { mmDag } from "@/lib/meermarathonSeizoen";
import { wegingUitleg } from "@/lib/wegingsfactor";

const MAX_H = 128;
/** Ook nul punten krijgt een stompje: de wedstrijd is wél gereden. */
const MIN_H = 22;
const LEEG_H = 46;
const EMBLEEM = 30;
/** De ruimte van een kolom: de hoogste balk plus het halve embleem erboven. */
const VAK_H = MAX_H + EMBLEEM / 2 + 4;

const GLANS = "shadow-[0_0_0_3px_hsl(var(--vintage-gold)/0.6),0_0_18px_hsl(var(--vintage-gold)/0.45)]";

/**
 * Dimlaag over een donkere foto: bovenaan (kop en legenda) en onderaan
 * (nummers en punten, op het witte ijs) het donkerst; in het midden, bij de
 * lichtjes en de schaatsers, laat hij de foto het meest zien.
 */
const DIM =
  "linear-gradient(180deg, rgb(9 17 31 / 0.86) 0%, rgb(9 17 31 / 0.64) 45%, rgb(9 17 31 / 0.78) 72%, rgb(9 17 31 / 0.9) 100%)";

function capsule(kleur: string) {
  return {
    background: `linear-gradient(90deg, color-mix(in srgb, ${kleur} 80%, white) 0%, ${kleur} 42%, color-mix(in srgb, ${kleur} 84%, black) 100%)`,
    borderColor: `color-mix(in srgb, ${kleur} 62%, black)`,
  };
}

function puntenTekst(w: BalkWedstrijd): string {
  if (!w.gereden) return "nog te rijden";
  if (w.punten == null) return "uitslag binnen";
  return `${w.punten > 0 ? "+" : ""}${mmGetal(w.punten)} pnt`;
}

/** Schaatsbaan als watermerk, zoals de landkaart achter de etappebalk. */
function IJsbaan() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 150"
      className="pointer-events-none absolute -right-12 -top-10 w-[300px] max-w-[62%] text-[var(--mm-rink-track)] opacity-70"
    >
      <rect x="6" y="6" width="308" height="138" rx="69" fill="none" stroke="currentColor" strokeWidth="12" />
      <rect x="42" y="42" width="236" height="66" rx="33" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
    </svg>
  );
}

/** De schaatsfoto met de waas (licht) of de dimlaag (donker) erover. */
function Foto({ foto }: { foto: BalkFoto }) {
  return (
    <>
      <img
        src={foto.src}
        alt=""
        aria-hidden
        decoding="async"
        className="pointer-events-none absolute inset-0 size-full object-cover"
        style={{ objectPosition: foto.positie ?? "50% 62%" }}
      />
      <span
        aria-hidden
        className={cn("pointer-events-none absolute inset-0", foto.licht && "mm-balk-waas-licht")}
        style={foto.licht ? undefined : { background: DIM }}
      />
    </>
  );
}

function Kolom({
  w,
  gekozen,
  kiesbaar,
  opFoto,
  onKies,
}: {
  w: BalkWedstrijd;
  gekozen: boolean;
  kiesbaar: boolean;
  /** Staat de balk op een foto? Dan krijgen de lege balken een vulling. */
  opFoto: boolean;
  onKies: (id: string) => void;
}) {
  const hoogte = w.fractie == null ? LEEG_H : Math.max(MIN_H, Math.round(w.fractie * MAX_H));
  return (
    <button
      type="button"
      data-wedstrijd={w.id}
      aria-pressed={gekozen}
      aria-disabled={kiesbaar ? undefined : true}
      aria-label={[w.label, w.date ? mmDag(w.date) : "datum volgt", wegingUitleg(w.weging), puntenTekst(w)].filter(Boolean).join(", ")}
      onClick={kiesbaar ? () => onKies(w.id) : undefined}
      className={cn(
        "group flex w-10 shrink-0 snap-center flex-col items-center rounded-md outline-hidden",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "@2xl:w-auto @2xl:min-w-0 @2xl:max-w-[76px] @2xl:flex-1",
        !kiesbaar && "cursor-default",
      )}
    >
      <span className="flex w-full items-end justify-center" style={{ height: VAK_H }}>
        <span
          className={cn("relative w-full max-w-[40px] rounded-full transition-shadow", gekozen && GLANS)}
          style={{ height: hoogte }}
        >
          <SoortEmbleem
            soort={w.soort}
            maat={EMBLEEM}
            gedempt={!w.gereden}
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2"
          />
          {w.fractie == null ? (
            <span
              className={cn(
                "block h-full w-full rounded-full border-[1.5px] border-dashed",
                // Op de foto een vulling in de kaartkleur, anders verdwijnt de stippellijn tussen de schaatsers.
                opFoto ? "border-foreground/55 bg-card/50" : "border-foreground/30 bg-foreground/[0.03]",
                kiesbaar && (opFoto ? "group-hover:border-foreground/80" : "group-hover:border-foreground/50"),
              )}
            />
          ) : (
            <span className="block h-full w-full rounded-full border-[1.5px]" style={capsule(WEDSTRIJD_SOORT[w.soort].kleur)} />
          )}
        </span>
      </span>
      <span className="mt-1.5 border-b border-border px-1.5 pb-px text-[11px] leading-[18px] text-muted-foreground">
        {w.kort}
      </span>
      <span className={cn("text-[15px] font-extrabold leading-5 tabular-nums", w.punten == null && "font-semibold text-muted-foreground")}>
        {w.punten == null ? "–" : mmGetal(w.punten)}
      </span>
    </button>
  );
}

function Totaal({ totaal, onKies }: { totaal: number | null; onKies?: () => void }) {
  const inhoud = (
    <>
      <span className="flex w-full items-end justify-center" style={{ height: VAK_H }}>
        <span className="relative w-full max-w-[44px] rounded-full" style={{ height: MAX_H }}>
          <span
            aria-hidden
            className="absolute left-1/2 top-0 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card text-[var(--mm-s-totaal)]"
            style={{
              width: EMBLEEM + 2,
              height: EMBLEEM + 2,
              boxShadow: "inset 0 0 0 2px var(--mm-s-totaal), 0 0 0 2px hsl(var(--card)), 0 2px 4px rgb(10 20 40 / 0.22)",
            }}
          >
            <Crown className="size-4" strokeWidth={2.2} />
          </span>
          <span className="block h-full w-full rounded-full border-[1.5px]" style={capsule("var(--mm-s-totaal)")} />
        </span>
      </span>
      <span className="mt-1.5 border-b border-border px-1.5 pb-px text-[11px] font-semibold leading-[18px] text-[var(--mm-s-totaal)]">
        Totaal
      </span>
      <span className="text-[17px] font-extrabold leading-5 tabular-nums text-[var(--mm-s-totaal)]">
        {totaal == null ? "–" : mmGetal(totaal)}
      </span>
    </>
  );
  const klas = "flex w-[52px] shrink-0 flex-col items-center @2xl:ml-2";
  if (!onKies) {
    return (
      <div className={klas} role="group" aria-label={totaal == null ? "Totaal: geen ploeg" : `Totaal: ${mmGetal(totaal)} punten`}>
        {inhoud}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onKies}
      aria-label={totaal == null ? "Naar het klassement" : `Totaal: ${mmGetal(totaal)} punten. Naar het klassement`}
      className={cn(klas, "rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card")}
    >
      {inhoud}
    </button>
  );
}

export default function WedstrijdBalk({
  wedstrijden,
  totaal,
  gekozenId,
  onKies,
  kiesbaar,
  onKiesTotaal,
  titel = "Uitslag per wedstrijd",
  ondertitel,
  foto = BALK_FOTO,
  className,
}: {
  wedstrijden: BalkWedstrijd[];
  /** Jouw puntentotaal; null als je geen ploeg hebt. */
  totaal: number | null;
  gekozenId: string | null;
  onKies: (id: string) => void;
  /**
   * Welke wedstrijden je kunt kiezen; zonder zijn het ze allemaal. Het
   * klassement kiest alleen gereden wedstrijden: na een wedstrijd die nog
   * komt, is er nog geen tussenstand.
   */
  kiesbaar?: (w: BalkWedstrijd) => boolean;
  /** Tik op "Totaal": naar het klassement. Zonder is het alleen een getal. */
  onKiesTotaal?: () => void;
  titel?: string;
  /** "Meermarathon Vrouwen 2026-2027" */
  ondertitel?: string | null;
  /** Een andere foto dan de mist; null = geen foto (de lichte kaart). */
  foto?: BalkFoto | null;
  className?: string;
}) {
  const baan = useRef<HTMLDivElement>(null);
  const gekozen = wedstrijden.find((w) => w.id === gekozenId) ?? null;
  const soorten = soortenInBalk(wedstrijden);

  // Smal schuift de rij opzij: houd de gekozen wedstrijd in beeld. Alleen de
  // rij zelf schuift, nooit de pagina.
  useEffect(() => {
    const rij = baan.current;
    const doel = gekozenId ? rij?.querySelector<HTMLElement>(`[data-wedstrijd="${CSS.escape(gekozenId)}"]`) : null;
    if (!rij || !doel || rij.scrollWidth <= rij.clientWidth + 4) return;
    rij.scrollTo({ left: doel.offsetLeft - rij.clientWidth / 2 + doel.clientWidth / 2, behavior: "smooth" });
  }, [gekozenId, wedstrijden.length]);

  return (
    <section data-eigen-typografie aria-label={titel} className={cn("@container font-inter", className)}>
      {/* De rand en de schaduw volgen het sitethema; alleen de inhoud op een
          donkere foto krijgt de nachtkleuren. */}
      <div className="retro-border no-hover-lift relative overflow-hidden bg-card">
        {foto ? <Foto foto={foto} /> : <IJsbaan />}

        <div
          className={cn(
            "relative px-3.5 pb-3.5 pt-3 text-card-foreground @2xl:px-5 @2xl:pb-4 @2xl:pt-4",
            foto && !foto.licht && "mm-balk-foto",
            // Onder de punten blijft een regel vrij voor de naam van de fotograaf.
            foto?.fotograaf && "pb-6 @2xl:pb-6",
          )}
        >
          <header className="relative flex flex-col gap-2.5 @2xl:flex-row @2xl:items-start @2xl:justify-between @2xl:gap-6">
            <div className="min-w-0">
              <h3 className="heading-oswald m-0 text-lg @2xl:text-xl">{titel}</h3>
              {ondertitel && <p className="m-0 text-[13px] text-muted-foreground @2xl:text-sm">{ondertitel}</p>}
            </div>
            <ul aria-label="Soorten wedstrijden" className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0">
              {soorten.map((s) => (
                <li key={s.soort}>
                  <SoortLabel soort={s.soort} aantal={s.aantal} />
                </li>
              ))}
            </ul>
          </header>

          {gekozen && (
            <p
              role="status"
              className="relative m-0 mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-secondary px-3 py-2 text-sm leading-snug"
            >
              <SoortEmbleem soort={gekozen.soort} maat={22} />
              <strong className="font-bold">{gekozen.label}</strong>
              <span className="text-muted-foreground">
                {gekozen.date ? mmDag(gekozen.date) : "datum volgt"} · {WEDSTRIJD_SOORT[gekozen.soort].ondergrond}
              </span>
              {/* Telt de wedstrijd zwaarder, dan zegt dat waarom de punten hoger zijn. */}
              {wegingUitleg(gekozen.weging) && (
                <span
                  className="rounded-full border-[1.5px] px-2 text-[11px] font-bold uppercase leading-[18px] tracking-[0.08em]"
                  style={{ borderColor: WEDSTRIJD_SOORT[gekozen.soort].kleur }}
                >
                  {wegingUitleg(gekozen.weging)}
                </span>
              )}
              <span className={cn("ml-auto tabular-nums", gekozen.punten != null ? "font-bold" : "text-muted-foreground")}>
                {puntenTekst(gekozen)}
              </span>
            </p>
          )}

          <div className="relative mt-2 flex items-end gap-2 @2xl:gap-3.5">
            <div aria-hidden className="hidden shrink-0 flex-col justify-end pb-px text-right @2xl:flex">
              <span className="text-[10px] font-bold uppercase leading-[19px] tracking-[0.14em] text-muted-foreground">Wedstrijd</span>
              <span className="mt-1.5 text-[10px] font-bold uppercase leading-5 tracking-[0.14em] text-muted-foreground">Punten</span>
            </div>

            <div
              ref={baan}
              role="group"
              aria-label="Kies een wedstrijd"
              className={cn(
                "flex min-w-0 flex-1 snap-x snap-mandatory items-end gap-2 overflow-x-auto pb-1 pl-1.5 pr-6",
                "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                // Smal: de rij loopt rechts uit beeld; de vervaging zegt dat er meer komt.
                "[mask-image:linear-gradient(to_right,black_calc(100%-22px),transparent)]",
                "@2xl:snap-none @2xl:justify-center @2xl:gap-1 @2xl:overflow-visible @2xl:px-1.5 @2xl:[mask-image:none]",
              )}
            >
              {wedstrijden.map((w) => (
                <Kolom
                  key={w.id}
                  w={w}
                  gekozen={w.id === gekozenId}
                  kiesbaar={kiesbaar ? kiesbaar(w) : true}
                  opFoto={Boolean(foto)}
                  onKies={onKies}
                />
              ))}
            </div>

            <div className="pb-1">
              <Totaal totaal={totaal} onKies={onKiesTotaal} />
            </div>
          </div>
        </div>
        {foto?.fotograaf && <FotoCredit fotograaf={foto.fotograaf} />}
      </div>
    </section>
  );
}
