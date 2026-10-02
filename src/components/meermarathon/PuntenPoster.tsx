/**
 * "De punten" voor het koersreglement van de Meermarathon, in de opmaak van de
 * Instagram-post (instagram-posts/07-de-punten): Oswald-koppen met een lijn,
 * de top 20 als staafjes op de mistfoto, de weging als tegels per factor en
 * de pronostiek als kaart. Anders dan de post komt alles uit de database (het
 * puntenschema, de weging per wedstrijd, de pronostiekpunten) en volgen de
 * kleuren het thema van de pagina: licht overdag, in de nacht poolnacht met
 * ijsblauw, zoals de post. Alleen de grafiek op de foto houdt zijn eigen kleuren.
 *
 * Schakelt op zijn eigen breedte (@container): smal twee tegels naast elkaar,
 * breed alles op één rij zoals op de post.
 */
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import FotoCredit from "@/components/meermarathon/FotoCredit";
import { BALK_FOTO } from "@/lib/meermarathonFotos";
import { gewogenPunten, wegingGetal, wegingWoord, type WegingGroep } from "@/lib/wegingsfactor";

/** Tegels en kaarten: de kaartkleur van het thema met een dunne rand. */
export const MM_TEGEL = "rounded-xl bg-card shadow-[inset_0_0_0_1px_hsl(var(--border))]";

/** Wie scoort er: de plekken met punten, hooguit twintig (dezelfde grens als de telling). */
const MAX_PLEK = 20;

type Props = {
  /** Punten per plek (classification "stage"), op volgorde. */
  stagePoints: Array<{ position: number; points: number }>;
  wegingGroepen: WegingGroep[];
  pronostiekPunten: number;
  className?: string;
};

export default function PuntenPoster({ stagePoints, wegingGroepen, pronostiekPunten, className }: Props) {
  const titelId = useId();
  const plekken = stagePoints
    .filter((p) => p.position >= 1 && p.position <= MAX_PLEK && p.points > 0)
    .sort((a, b) => a.position - b.position);
  const top = plekken.length;
  const eerste = plekken.find((p) => p.position === 1)?.points ?? plekken[0]?.points ?? 0;

  return (
    <section data-eigen-typografie aria-labelledby={titelId} className={cn("@container text-foreground", className)}>
      {/* font-serif hier en niet op de sectie: de pagina zet Inter op het element
          met data-eigen-typografie zelf, alleen wat erbinnen ligt is vrij. */}
      <div className="font-serif">
        {/* Kop */}
        <h2 id={titelId} className="m-0 text-center font-oswald text-[60px] font-bold uppercase leading-none @2xl:text-[112px]">
          De <span className="text-primary">punten</span>
        </h2>
        <p className="m-0 mt-3 text-center font-oswald text-[13px] font-medium uppercase leading-none tracking-[.24em] @2xl:mt-5 @2xl:text-[20px]">
          Zo wordt er geteld
        </p>

        {/* Per wedstrijd: de top 20 op de foto */}
        <Kopregel className="mt-8 @2xl:mt-12" rechts={top > 0 ? `De top ${top} scoort` : undefined}>
          Per wedstrijd
        </Kopregel>
        {top > 0 ? (
          <>
            <Grafiek plekken={plekken} />
            <p className="m-0 mt-3 text-center text-[13px] italic leading-snug text-muted-foreground @2xl:mt-4 @2xl:text-[18px]">
              Buiten de top {top}, niet gestart of uitgestapt: 0 punten
            </p>
          </>
        ) : (
          <p className="m-0 mt-4 text-center text-[14px] italic text-muted-foreground @2xl:text-[18px]">Het puntenschema volgt.</p>
        )}

        {/* Weging: tegels per factor */}
        <Kopregel className="mt-8 @2xl:mt-12" rechts="Punten × factor">
          Weging
        </Kopregel>
        {wegingGroepen.length > 0 ? (
          <>
            {/* Vijf op een rij zoals op de post vraagt ±900 px; smaller drie of twee per rij. */}
            <ul
              className="m-0 mt-3 grid list-none grid-cols-2 gap-2.5 p-0 @2xl:mt-4 @2xl:grid-cols-3 @2xl:gap-3 @4xl:flex"
              aria-label="Weging per wedstrijd"
            >
              {wegingGroepen.map((g) => (
                <Tegel key={g.weging} groep={g} zwaarste={wegingGroepen[0].weging} />
              ))}
            </ul>
            <Voorbeeld groep={wegingGroepen[0]} eerste={eerste} />
          </>
        ) : (
          <p className="m-0 mt-4 text-center text-[14px] italic text-muted-foreground @2xl:text-[18px]">
            De weging volgt zodra de wedstrijden bekend zijn.
          </p>
        )}

        {/* Pronostiek */}
        <div className={cn(MM_TEGEL, "mt-5 flex items-center gap-4 px-4 py-4 @2xl:mt-6 @2xl:gap-6 @2xl:px-7 @2xl:py-5")}>
          <p className="m-0 shrink-0 font-oswald text-[46px] font-bold leading-none text-primary @2xl:text-[68px]">
            +{pronostiekPunten}
            <small className="ml-1 text-[.42em] font-semibold tracking-[.04em] text-foreground">PT</small>
          </p>
          <span aria-hidden className="w-px self-stretch bg-border" />
          <div className="min-w-0">
            <h3 className="m-0 font-oswald text-[13px] font-semibold uppercase leading-none tracking-[.14em] @2xl:text-[18px] @2xl:tracking-[.24em]">
              Pronostiek · per peloton
            </h3>
            <p className="m-0 mt-2 text-[14px] leading-snug text-muted-foreground @2xl:text-[18px]">
              Per goed voorspelde eindwinnaar van het{" "}
              <strong className="whitespace-nowrap font-semibold text-foreground">Cup-klassement</strong> en het{" "}
              <strong className="whitespace-nowrap font-semibold text-foreground">Grand Prix-klassement</strong>. Zonder weging.
            </p>
          </div>
        </div>

        {/* Wat er verder telt: geen jokers, en het totaal */}
        <div className="mt-2.5 grid gap-2.5 @2xl:mt-3 @2xl:grid-cols-2 @2xl:gap-3">
          <Kaartje titel="Jokers">Geen. Alleen de schaatsers uit de categorieën scoren.</Kaartje>
          <Kaartje titel="Totaal">
            Wedstrijdpunten met weging, plus de pronostiek. Doe je bij de vrouwen én de mannen mee, dan sta je ook in het
            totaalklassement.
          </Kaartje>
        </div>
      </div>
    </section>
  );
}

/** "PER WEDSTRIJD ——— DE TOP 20 SCOORT", zoals op de posts. */
export function Kopregel({ children, rechts, className }: { children: ReactNode; rechts?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-3 font-oswald text-[13px] font-semibold uppercase leading-none tracking-[.26em] text-primary @2xl:gap-[18px] @2xl:text-[19px]",
        className,
      )}
    >
      <h3 className="m-0 shrink-0 font-oswald text-[length:inherit] font-semibold">{children}</h3>
      <span aria-hidden className="h-px min-w-4 flex-1 -translate-y-1 bg-border" />
      {rechts && <span className="shrink-0 font-medium tracking-[.2em] text-muted-foreground">{rechts}</span>}
    </div>
  );
}

/** De top 20 als staafjes op de mistfoto: de schaatsers rijden achter de balken. */
function Grafiek({ plekken }: { plekken: Array<{ position: number; points: number }> }) {
  const max = Math.max(...plekken.map((p) => p.points));
  return (
    <div
      className="relative mt-3 h-[200px] overflow-hidden rounded-[14px] @2xl:mt-4 @2xl:h-[330px] @2xl:rounded-[18px]"
      style={{
        backgroundImage: `url(${BALK_FOTO.src})`,
        backgroundSize: "cover",
        backgroundPosition: BALK_FOTO.positie ?? "center bottom",
        boxShadow: "0 0 0 1px hsl(var(--border)), 0 18px 44px rgba(0,0,0,.18)",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,.38) 0%, rgba(255,255,255,.12) 40%, rgba(255,255,255,0) 62%, rgba(255,255,255,0) 82%, rgba(255,255,255,.45) 100%)",
        }}
      />
      <ol aria-label="Punten per plek" className="absolute inset-x-1.5 inset-y-0 m-0 flex list-none items-end gap-[3px] p-0 @2xl:inset-x-5 @2xl:gap-2.5">
        {plekken.map((p) => {
          const podium = p.position <= 3;
          return (
            <li key={p.position} aria-label={`Plek ${p.position}: ${p.points} punten`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span
                aria-hidden
                className={cn(
                  "mb-1 w-full rounded-[4px] text-center font-oswald font-semibold leading-none @2xl:mb-1.5 @2xl:rounded-[6px]",
                  podium ? "py-[3px] text-[12px] @2xl:py-1.5 @2xl:text-[27px]" : "py-[3px] text-[10px] @2xl:py-1 @2xl:text-[18px]",
                )}
                style={{ background: "rgba(12,19,29,.9)", color: podium ? "#93D4F2" : "#EEF3F7", boxShadow: "0 2px 6px rgba(12,19,29,.25)" }}
              >
                {p.points}
              </span>
              <span
                aria-hidden
                className="block w-full rounded-t-[5px] rounded-b-[2px] @2xl:rounded-t-[7px]"
                style={{
                  height: `${Math.max(1.5, (p.points / max) * 62)}%`,
                  background: podium ? "linear-gradient(180deg, #93D4F2 0%, #3F86B8 100%)" : "linear-gradient(180deg, #24476E 0%, #152030 100%)",
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,${podium ? 0.5 : 0.18})`,
                }}
              />
              <span
                aria-hidden
                className={cn(
                  "flex h-7 items-center justify-center font-oswald font-semibold leading-none @2xl:h-10",
                  podium ? "text-[12px] @2xl:text-[21px]" : "text-[10px] @2xl:text-[18px]",
                )}
                style={{ color: podium ? "#0C131D" : "#2A3646" }}
              >
                {p.position}
              </span>
            </li>
          );
        })}
      </ol>
      {BALK_FOTO.fotograaf && <FotoCredit fotograaf={BALK_FOTO.fotograaf} className="bottom-auto right-2 top-2 @2xl:right-3.5 @2xl:top-3" />}
    </div>
  );
}

/** Eén factor: "×2 DUBBEL", een meter naar verhouding en de wedstrijden. */
function Tegel({ groep, zwaarste }: { groep: WegingGroep; zwaarste: number }) {
  const kleur = groep.weging > 1 ? "text-primary" : groep.weging === 1 ? "text-foreground" : "text-muted-foreground";
  return (
    <li className={cn(MM_TEGEL, "min-w-0 p-3.5 @2xl:p-4 @4xl:flex-1")} aria-label={`×${wegingGetal(groep.weging)}: ${groep.wedstrijden.join(", ")}`}>
      <p className={cn("m-0 font-oswald text-[38px] font-bold leading-none tracking-[-.01em] @2xl:text-[52px]", kleur)}>
        <small className="mr-px text-[.62em] font-semibold">×</small>
        {wegingGetal(groep.weging)}
      </p>
      <p className="m-0 mt-1.5 font-oswald text-[12px] font-semibold uppercase leading-none tracking-[.16em] text-muted-foreground @2xl:mt-2 @2xl:text-[14px]">
        {wegingWoord(groep.weging)}
      </p>
      <span aria-hidden className={cn("my-2.5 block h-[5px] overflow-hidden rounded-[3px] bg-foreground/10 @2xl:my-3 @2xl:h-1.5", kleur)}>
        <i className="block h-full rounded-[3px] bg-current" style={{ width: `${(groep.weging / Math.max(zwaarste, 1)) * 100}%` }} />
      </span>
      <ul className="m-0 list-none p-0 text-[13.5px] leading-[1.3] @2xl:text-[16px]">
        {groep.wedstrijden.map((w) => (
          <li key={w} className="mb-0.5 last:mb-0">
            {aanEen(w)}
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * Houd een nummer bij zijn woord en een reeks bij elkaar: "Cup 1 t/m 12" breekt
 * niet als "Cup 1 t/m" + "12", "Grand Prix 1" niet als "Grand Prix" + "1".
 */
function aanEen(label: string): string {
  return label.replace(/ t\/m /g, " t/m ").replace(/ (?=\d)/g, " ").replace(/^Grand Prix/, "Grand Prix");
}

/** "ONK gewonnen? 50 × 2 = 100 punten": de zwaarste weging als som. */
function Voorbeeld({ groep, eerste }: { groep: WegingGroep; eerste: number }) {
  if (!eerste) return null;
  const zwaar = groep.weging !== 1;
  return (
    <p className="m-0 mt-4 text-center text-[14px] italic leading-snug text-muted-foreground @2xl:mt-5 @2xl:text-[20px]">
      {zwaar ? `${groep.voorbeeld} gewonnen?` : "Winst in een wedstrijd?"}{" "}
      <b className="whitespace-nowrap font-oswald text-[16px] font-semibold not-italic tracking-[.02em] text-primary @2xl:text-[22px]">
        {zwaar ? `${eerste} × ${wegingGetal(groep.weging)} = ${gewogenPunten(eerste, groep.weging)} punten` : `${eerste} punten`}
      </b>
    </p>
  );
}

/** Kleine kaart: "JOKERS — Geen." */
function Kaartje({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className={cn(MM_TEGEL, "px-4 py-3.5 @2xl:px-5 @2xl:py-4")}>
      <h3 className="m-0 font-oswald text-[13px] font-semibold uppercase leading-none tracking-[.24em] text-primary @2xl:text-[16px]">
        {titel}
      </h3>
      <p className="m-0 mt-2 text-[14px] leading-snug text-muted-foreground @2xl:text-[17px]">{children}</p>
    </div>
  );
}
