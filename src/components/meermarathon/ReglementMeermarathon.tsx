/**
 * Het koersreglement bij de Meermarathon, helemaal in de opmaak van de
 * Instagram-posts: Oswald-koppen met een lijn (Kopregel), tegels in de
 * kaartkleur, en "De punten" (PuntenPoster) in het midden. De kleuren volgen
 * het thema van de pagina: overdag licht, in de nacht poolnacht met ijsblauw.
 *
 * De teksten komen uit i18n (common.rules, context "mm"); op de posts staan
 * geen emoji in de kopjes en geen "Stap 2 —" voor een stap met een groot cijfer,
 * dus die vallen hier weg.
 */
import { useTranslation, Trans } from "react-i18next";
import { cn } from "@/lib/utils";
import { STEUN_URL } from "@/components/SteunKopgroep";
import PuntenPoster, { Kopregel, MM_TEGEL } from "@/components/meermarathon/PuntenPoster";
import type { CategoryWithRiders } from "@/hooks/useCategories";
import type { WegingGroep } from "@/lib/wegingsfactor";

const GEEL = "#F5C518";
const NACHT = "#0C131D";

type Props = {
  /** "Meermarathon 2026-2027": één game, zonder peloton. */
  gameNaam: string | null;
  categories: CategoryWithRiders[];
  categoriesLoading: boolean;
  stagePoints: Array<{ position: number; points: number }>;
  schemaLoading: boolean;
  wegingGroepen: WegingGroep[];
  pronostiekPunten: number;
  /** "26/27" voor de voetregel. */
  seizoen?: string | null;
};

/** "📜 Het Reglement" → "Het Reglement". */
function zonderEmoji(tekst: string): string {
  return tekst.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, "");
}

/** "Stap 2 — Stel je ploeg samen" → "Stel je ploeg samen": het grote cijfer zegt het al. */
function zonderStap(tekst: string): string {
  return tekst.replace(/^(Stap|Step)\s*\d+\s*[—–-]\s*/i, "");
}

export default function ReglementMeermarathon({
  gameNaam,
  categories,
  categoriesLoading,
  stagePoints,
  schemaLoading,
  wegingGroepen,
  pronostiekPunten,
  seizoen,
}: Props) {
  const { t } = useTranslation();
  const r = (key: string, opts: Record<string, unknown> = {}) => t(`common.rules.${key}`, { context: "mm", ...opts });

  // "Speluitleg & Reglement": het laatste woord in de accentkleur, zoals "De punten".
  const titel = r("title").split(" ");
  const titelSlot = titel.pop();
  const regels = [1, 2, 3, 4, 5].map((n) => r(`rule${n}`));

  return (
    <div className="container mx-auto px-5 py-8 md:py-10">
      <div data-eigen-typografie className="@container mx-auto max-w-[960px] text-foreground">
        <div className="font-serif">
          {/* Kop */}
          <header className="text-center">
            {gameNaam && (
              <p className="m-0 font-oswald text-[13px] font-semibold uppercase leading-none tracking-[.26em] text-primary @2xl:text-[16px]">
                {gameNaam}
              </p>
            )}
            <h1 className="m-0 mt-3 font-oswald text-[44px] font-bold uppercase leading-[.95] @2xl:mt-4 @2xl:text-[92px]">
              {titel.join(" ")} <span className="text-primary">{titelSlot}</span>
            </h1>
            <p className="m-0 mx-auto mt-4 max-w-[36ch] text-[15px] italic leading-snug text-muted-foreground @2xl:mt-5 @2xl:text-[19px]">
              {r("quote")}
            </p>
          </header>

          {/* Het reglement */}
          <Kopregel className="mt-10 @2xl:mt-14">{zonderEmoji(r("reglementHeading"))}</Kopregel>
          <ol className="m-0 mt-2 list-none p-0 @2xl:mt-3">
            {regels.map((regel, i) => (
              <li key={i} className="flex items-baseline gap-4 border-b border-border py-3 last:border-b-0 @2xl:gap-6 @2xl:py-4">
                <span className="w-9 shrink-0 font-oswald text-[26px] font-bold leading-none text-primary @2xl:w-12 @2xl:text-[34px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] leading-snug @2xl:text-[18px]">{regel}</span>
              </li>
            ))}
          </ol>

          {/* Hoe speel je mee */}
          <Kopregel className="mt-10 @2xl:mt-14">{zonderEmoji(r("howToPlayHeading"))}</Kopregel>
          <ol className="m-0 mt-3 grid list-none gap-2.5 p-0 @2xl:mt-4 @2xl:grid-cols-2 @2xl:gap-3">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className={cn(MM_TEGEL, "flex gap-4 p-4 @2xl:gap-5 @2xl:p-5")}>
                <span className="w-7 shrink-0 font-oswald text-[40px] font-bold leading-none text-primary @2xl:w-9 @2xl:text-[52px]">{n}</span>
                <div className="min-w-0">
                  <h3 className="m-0 font-oswald text-[14px] font-semibold uppercase leading-tight tracking-[.14em] @2xl:text-[16px]">
                    {zonderStap(r(`step${n}Title`))}
                  </h3>
                  <p className="m-0 mt-1.5 text-[14px] leading-snug text-muted-foreground @2xl:text-[16px]">
                    {n !== 2 ? (
                      r(`step${n}Desc`)
                    ) : categoriesLoading ? (
                      r("step2Loading")
                    ) : categories.length > 0 ? (
                      <Trans
                        i18nKey="common.rules.step2Body"
                        context="mm"
                        values={{ n: categories.length }}
                        components={{ bold: <span className="font-semibold text-foreground" /> }}
                      />
                    ) : (
                      r("step2Empty")
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* De punten */}
          {schemaLoading ? (
            <p className="m-0 mt-14 text-center text-sm italic text-muted-foreground">{r("schemaLoading")}</p>
          ) : (
            <PuntenPoster className="mt-14 @2xl:mt-20" stagePoints={stagePoints} wegingGroepen={wegingGroepen} pronostiekPunten={pronostiekPunten} />
          )}

          {/* Categorieën */}
          <Kopregel
            className="mt-14 @2xl:mt-20"
            // Geen "6 × 1": een ×-getal is op deze pagina de weging.
            rechts={categories.length > 0 ? `${categories.length} categorieën` : undefined}
          >
            {zonderEmoji(r("categoriesHeading"))}
          </Kopregel>
          <p className="m-0 mt-3 text-[15px] leading-snug text-muted-foreground @2xl:text-[17px]">{r("categoriesIntro")}</p>
          {categoriesLoading ? (
            <p className="m-0 mt-3 text-sm italic text-muted-foreground">{r("categoriesLoading")}</p>
          ) : categories.length === 0 ? (
            <div className={cn(MM_TEGEL, "mt-3 p-6 text-center")}>
              <p className="m-0 text-sm text-muted-foreground">{r("categoriesEmpty")}</p>
              <p className="m-0 mt-1 text-xs italic text-muted-foreground">{r("categoriesEmptyNote")}</p>
            </div>
          ) : (
            <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2.5 p-0 @lg:grid-cols-2 @2xl:gap-3 @4xl:grid-cols-3">
              {categories.map((cat, idx) => (
                <li key={cat.id} className={cn(MM_TEGEL, "p-4")}>
                  <p className="m-0 flex items-baseline gap-2.5">
                    <span className="font-oswald text-[22px] font-bold leading-none text-primary">{idx + 1}</span>
                    <span className="font-oswald text-[15px] font-semibold uppercase leading-tight tracking-[.1em]">{cat.name}</span>
                  </p>
                  <p className="m-0 mt-2 text-[13.5px] leading-snug text-muted-foreground @2xl:text-[14.5px]">
                    {cat.category_riders.length === 0 ? (
                      <em>{r("noRiders")}</em>
                    ) : (
                      cat.category_riders
                        .map((cr) => cr.riders?.name)
                        .filter(Boolean)
                        .join(" · ")
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Tot slot */}
          <Kopregel className="mt-14 @2xl:mt-20">{zonderEmoji(r("finallyHeading"))}</Kopregel>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground @2xl:text-[17px]">
            <p className="m-0">{r("finallyP1")}</p>
            <p className="m-0">
              <Trans i18nKey="common.rules.finallyP2" components={{ supportBtn: <span className="font-semibold text-foreground" /> }} />
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            <a
              href={STEUN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 font-oswald text-[15px] font-semibold uppercase leading-none tracking-[.12em] no-underline shadow-md transition hover:opacity-90"
              style={{ background: GEEL, color: NACHT }}
            >
              {r("supportButton")}
            </a>
          </div>

          {/* Voet, zoals op de posts */}
          <footer className="mt-12 flex items-center gap-4 border-t border-border pt-5">
            <span className="px-3 py-1.5 font-oswald text-[14px] font-semibold leading-none tracking-[.12em]" style={{ background: GEEL, color: NACHT }}>
              REGLEMENT
            </span>
            <span className="ml-auto font-oswald text-[11px] font-medium uppercase tracking-[.3em] text-muted-foreground @2xl:text-[14px]">
              Koerspoule{seizoen ? ` · seizoen ${seizoen}` : ""}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
