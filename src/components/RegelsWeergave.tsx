/**
 * Het koersreglement (/regels) als weergave: alles via props, zodat de pagina
 * met nepdata te bekijken en te testen is. De data haalt pages/Rules.tsx op.
 *
 * Bij de Meermarathon een eigen variant: schaatsers in plaats van renners,
 * geen jokers, geen podium, truien of ploegentijdrit, wél de pronostiek
 * (winnaars van het Cup- en het Grand Prix-klassement) en de weging per
 * wedstrijd uit het beheer. De teksten komen via i18next-context "mm".
 */
import { useTranslation, Trans } from "react-i18next";
import { STEUN_URL } from "@/components/SteunKopgroep";
import { SoortEmbleem, WEDSTRIJD_SOORT, WegingPil } from "@/components/meermarathon/WedstrijdSoort";
import type { CategoryWithRiders } from "@/hooks/useCategories";
import { gewogenPunten, wegingGetal, wegingLabel, type WegingGroep } from "@/lib/wegingsfactor";

export type RegelsWeergaveProps = {
  meermarathon: boolean;
  /** "Tour de France 2026", of bij de Meermarathon de game zonder peloton: "Meermarathon 2026-2027". */
  gameNaam: string | null;
  categories: CategoryWithRiders[];
  categoriesLoading: boolean;
  /** Punten per plek in een etappe of wedstrijd (classification "stage"), op volgorde. */
  stagePoints: Array<{ position: number; points: number }>;
  schemaLoading: boolean;
  /** Meermarathon: de weging per soort wedstrijd (lib/wegingsfactor). */
  wegingGroepen?: WegingGroep[];
  /** Meermarathon: punten per goed voorspelde klassementswinnaar. */
  pronostiekPunten?: number;
};

const H3 = "font-display text-lg font-bold mb-2";
const UITLEG = "text-sm text-muted-foreground mb-3 font-sans";
const REGEL = "flex items-center justify-between p-3 bg-secondary/50 rounded-md";

export default function RegelsWeergave({
  meermarathon,
  gameNaam,
  categories,
  categoriesLoading,
  stagePoints,
  schemaLoading,
  wegingGroepen = [],
  pronostiekPunten = 50,
}: RegelsWeergaveProps) {
  const { t } = useTranslation();
  // i18next-context: "rule3" wordt "rule3_mm" als die bestaat, anders blijft het "rule3".
  const ctx = meermarathon ? "mm" : undefined;
  const r = (key: string, opts: Record<string, unknown> = {}) => t(`common.rules.${key}`, { context: ctx, ...opts });
  // Het winterthema gebruikt --accent als lichte vlakkleur: text-accent is daar
  // onleesbaar. De punten krijgen bij de Meermarathon de primaire kleur.
  const nadruk = meermarathon ? "text-primary" : "text-accent";

  const rules = [r("rule1"), r("rule2"), r("rule3"), r("rule4"), r("rule5")];

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{r("title")}</h1>
          <p className="text-muted-foreground font-serif italic">{r("quote")}</p>
          {gameNaam && (
            <p className="text-xs text-muted-foreground mt-2 font-sans uppercase tracking-wider">
              {r("activeRace")} <span className="font-bold">{gameNaam}</span>
            </p>
          )}
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* Rules */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">{r("reglementHeading")}</h2>
          <ol className="space-y-3 font-sans text-sm">
            {rules.map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* How to play */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">{r("howToPlayHeading")}</h2>
          <div className="space-y-4 font-sans text-sm">
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{r("step1Title")}</h3>
              <p className="text-muted-foreground">{r("step1Desc")}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{r("step2Title")}</h3>
              <p className="text-muted-foreground">
                {categoriesLoading ? (
                  r("step2Loading")
                ) : categories.length > 0 ? (
                  <Trans
                    i18nKey="common.rules.step2Body"
                    context={ctx}
                    values={{ n: categories.length }}
                    components={{ bold: <span className="font-bold" /> }}
                  />
                ) : (
                  r("step2Empty")
                )}
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{r("step3Title")}</h3>
              <p className="text-muted-foreground">{r("step3Desc")}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{r("step4Title")}</h3>
              <p className="text-muted-foreground">{r("step4Desc")}</p>
            </div>
          </div>
        </section>

        {/* Points */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">{r("pointsHeading")}</h2>

          <h3 className={H3}>{r("perStageHeading")}</h3>
          <p className={UITLEG}>{r("perStageDesc")}</p>
          {schemaLoading ? (
            <p className="text-sm text-muted-foreground italic mb-6">{r("schemaLoading")}</p>
          ) : stagePoints.length === 0 ? (
            <p className="text-sm text-muted-foreground italic mb-6">{r("schemaEmpty")}</p>
          ) : (
            <div className="retro-border bg-background p-4 mb-6">
              <div className="grid grid-cols-4 md:grid-cols-5 gap-2 text-sm font-sans">
                {stagePoints.map((row) => (
                  <div key={row.position} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-xs w-5 text-right">{row.position}.</span>
                    <span className={`font-bold ${nadruk}`}>{row.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {meermarathon ? (
            <>
              <WegingBlok groepen={wegingGroepen} eerstePlek={stagePoints.find((p) => p.position === 1)?.points} />

              <h3 className={H3}>{r("pronostiekHeading")}</h3>
              <div className="space-y-2 font-sans text-sm mb-3">
                <div className={`${REGEL} gap-3`}>
                  <span>{r("pronostiekCup")}</span>
                  <span className={`shrink-0 whitespace-nowrap font-bold ${nadruk}`}>{r("pts", { points: pronostiekPunten })}</span>
                </div>
                <div className={`${REGEL} gap-3`}>
                  <span>{r("pronostiekGp")}</span>
                  <span className={`shrink-0 whitespace-nowrap font-bold ${nadruk}`}>{r("pts", { points: pronostiekPunten })}</span>
                </div>
                <p className="text-xs text-muted-foreground italic">{r("pronostiekNote")}</p>
              </div>

              <h3 className={H3}>{r("jokersHeading")}</h3>
              <p className={UITLEG}>{r("jokersDesc")}</p>

              <h3 className={H3}>{r("totalHeading")}</h3>
              <p className="text-sm text-muted-foreground font-sans">{r("totalDesc")}</p>
            </>
          ) : (
            <>
              <h3 className={H3}>{r("podiumHeading")}</h3>
              <div className="space-y-2 font-sans text-sm mb-3">
                <div className={REGEL}>
                  <span>{r("podiumRow1")}</span>
                  <span className="font-bold text-accent">{r("pts", { points: 50 })}</span>
                </div>
                <div className={REGEL}>
                  <span>{r("podiumRow2")}</span>
                  <span className="font-bold text-accent">{r("pts", { points: 25 })}</span>
                </div>
                <div className={REGEL}>
                  <span>{r("podiumRow3")}</span>
                  <span className="font-bold text-muted-foreground">{r("pts", { points: 0 })}</span>
                </div>
                <p className="text-xs text-muted-foreground italic">{r("podiumNote")}</p>
              </div>

              <h3 className={H3}>{r("jerseysHeading")}</h3>
              <div className="space-y-2 font-sans text-sm mb-3">
                <div className={REGEL}>
                  <span>{r("jerseyGreen")}</span>
                  <span className="font-bold text-accent">{r("pts", { points: 25 })}</span>
                </div>
                <div className={REGEL}>
                  <span>{r("jerseyMountain")}</span>
                  <span className="font-bold text-accent">{r("pts", { points: 25 })}</span>
                </div>
                <div className={REGEL}>
                  <span>{r("jerseyYoung")}</span>
                  <span className="font-bold text-accent">{r("pts", { points: 25 })}</span>
                </div>
              </div>

              <h3 className={H3}>{r("jokersHeading")}</h3>
              <p className={UITLEG}>{r("jokersDesc")}</p>

              <h3 className={H3}>{r("totalHeading")}</h3>
              <p className="text-sm text-muted-foreground font-sans">{r("totalDesc")}</p>

              <h3 className={`${H3} mt-3`}>{r("tttHeading")}</h3>
              <p className={UITLEG}>{r("tttDesc")}</p>

              <h3 className={H3}>{r("dayPrizeHeading")}</h3>
              <p className="text-sm text-muted-foreground font-sans">{r("dayPrizeDesc")}</p>
            </>
          )}
        </section>

        {/* Categories overview */}
        <section className="retro-border bg-card p-4">
          <h2 className="font-display text-2xl font-bold mb-3">{r("categoriesHeading")}</h2>
          <p className="text-sm text-muted-foreground mb-4 font-sans">{r("categoriesIntro")}</p>

          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground italic">{r("categoriesLoading")}</p>
          ) : categories.length === 0 ? (
            <div className="p-6 text-center bg-secondary/30 rounded-md">
              <p className="text-sm text-muted-foreground">{r("categoriesEmpty")}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">{r("categoriesEmptyNote")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat, idx) => (
                <div key={cat.id} className="p-3 bg-secondary/30 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="jersey-badge bg-primary text-primary-foreground text-xs">#{idx + 1}</span>
                    <span className="font-bold text-sm font-sans">{cat.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cat.category_riders.length === 0 ? (
                      <em>{r("noRiders")}</em>
                    ) : (
                      cat.category_riders
                        .map((cr) => cr.riders?.name)
                        .filter(Boolean)
                        .join(" • ")
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tot slot */}
        <section className="retro-border bg-card p-4 mt-4">
          <h2 className="font-display text-2xl font-bold mb-3">{r("finallyHeading")}</h2>
          <div className="space-y-3 font-sans text-sm text-muted-foreground">
            <p>{r("finallyP1")}</p>
            <p>
              <Trans
                i18nKey="common.rules.finallyP2"
                components={{ supportBtn: <span className="font-bold text-foreground" /> }}
              />
            </p>
          </div>
          <div className="vintage-divider max-w-xs mx-auto my-5" />
          <div className="flex justify-center">
            <a
              href={STEUN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md font-bold text-foreground shadow-md hover:opacity-90 transition"
              style={{ backgroundColor: "hsl(var(--vintage-gold))", fontFamily: "Arial, sans-serif", border: "1px solid hsl(var(--foreground))" }}
            >
              <span>{meermarathon ? "⛸️" : "🚴"}</span>
              <span>{r("supportButton")}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Meermarathon: hoe zwaar elke soort wedstrijd telt, uit het beheer. Met een
 * rekenvoorbeeld op de zwaarste weging, zodat "×2" meteen iets betekent.
 */
function WegingBlok({ groepen, eerstePlek }: { groepen: WegingGroep[]; eerstePlek?: number }) {
  const { t } = useTranslation();
  const zwaarste = groepen.reduce((max, g) => Math.max(max, g.weging), 1);
  return (
    <>
      <h3 className={H3}>{t("common.rules.wegingHeading")}</h3>
      <p className={UITLEG}>{t("common.rules.wegingDesc")}</p>
      {groepen.length === 0 ? (
        <p className="text-sm text-muted-foreground italic mb-6">{t("common.rules.wegingLeeg")}</p>
      ) : (
        <>
          <ul className="space-y-2 font-sans text-sm mb-2" aria-label={t("common.rules.wegingHeading")}>
            {groepen.map((g) => (
              <li key={`${g.soort}-${g.weging}`} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md">
                <SoortEmbleem soort={g.soort} maat={28} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{WEDSTRIJD_SOORT[g.soort].label}</span>
                  {/* Een titelwedstrijd heet als zijn soort ("NK"): dan niet nog eens. */}
                  {g.wedstrijden.join() !== WEDSTRIJD_SOORT[g.soort].label && (
                    <span className="block text-xs text-muted-foreground">{g.wedstrijden.join(" · ")}</span>
                  )}
                </span>
                {g.weging === 1 ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{t("common.rules.wegingGewoon")}</span>
                ) : (
                  <WegingPil soort={g.soort} weging={g.weging} className="shrink-0" />
                )}
                <span className="w-12 shrink-0 text-right font-bold text-primary tabular-nums">{wegingLabel(g.weging)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground italic mb-6">
            {zwaarste > 1 && eerstePlek
              ? t("common.rules.wegingVoorbeeld", {
                  factor: wegingGetal(zwaarste),
                  punten: eerstePlek,
                  totaal: gewogenPunten(eerstePlek, zwaarste),
                })
              : t("common.rules.wegingAllesGewoon")}
          </p>
        </>
      )}
    </>
  );
}
