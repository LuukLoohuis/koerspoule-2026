import { useEffect, useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { STEUN_URL } from "@/components/SteunKopgroep";

export default function Rules() {
  const { t } = useTranslation();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const { data: categories = [], isLoading: catsLoading } = useCategories(game?.id);
  const { data: schema = [], isLoading: schemaLoading } = usePointsSchema(game?.id);

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("common.rules.jsonldQ1"),
        acceptedAnswer: { "@type": "Answer", text: t("common.rules.jsonldA1") },
      },
      {
        "@type": "Question",
        name: t("common.rules.jsonldQ2"),
        acceptedAnswer: { "@type": "Answer", text: t("common.rules.jsonldA2") },
      },
      {
        "@type": "Question",
        name: t("common.rules.jsonldQ3"),
        acceptedAnswer: { "@type": "Answer", text: t("common.rules.jsonldA3") },
      },
      {
        "@type": "Question",
        name: t("common.rules.jsonldQ4"),
        acceptedAnswer: { "@type": "Answer", text: t("common.rules.jsonldA4") },
      },
    ],
  }), [t]);

  const stagePoints = useMemo(
    () => schema.filter((s) => s.classification === "stage").sort((a, b) => a.position - b.position),
    [schema],
  );

  // (jerseyPoints schema is niet meer relevant — truien lopen via voorspellingen, niet via points_schema.)

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.sort_order - b.sort_order), [categories]);

  const rules = [
    t("common.rules.rule1"),
    t("common.rules.rule2"),
    t("common.rules.rule3"),
    t("common.rules.rule4"),
    t("common.rules.rule5"),
  ];

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("common.rules.title")}</h1>
          <p className="text-muted-foreground font-serif italic">
            {t("common.rules.quote")}
          </p>
          {game && (
            <p className="text-xs text-muted-foreground mt-2 font-sans uppercase tracking-wider">
              {t("common.rules.activeRace")} <span className="font-bold">{game.name}</span>
            </p>
          )}
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* Rules */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">{t("common.rules.reglementHeading")}</h2>
          <ol className="space-y-3 font-sans text-sm">
            {rules.map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* How to play */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">{t("common.rules.howToPlayHeading")}</h2>
          <div className="space-y-4 font-sans text-sm">
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{t("common.rules.step1Title")}</h3>
              <p className="text-muted-foreground">{t("common.rules.step1Desc")}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{t("common.rules.step2Title")}</h3>
              <p className="text-muted-foreground">
                {catsLoading || gameLoading ? (
                  t("common.rules.step2Loading")
                ) : sortedCategories.length > 0 ? (
                  <Trans
                    i18nKey="common.rules.step2Body"
                    values={{ n: sortedCategories.length }}
                    components={{ bold: <span className="font-bold" /> }}
                  />
                ) : (
                  t("common.rules.step2Empty")
                )}
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{t("common.rules.step3Title")}</h3>
              <p className="text-muted-foreground">
                {t("common.rules.step3Desc")}
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">{t("common.rules.step4Title")}</h3>
              <p className="text-muted-foreground">
                {t("common.rules.step4Desc")}
              </p>
            </div>
          </div>
        </section>

        {/* Points */}
        <section className="retro-border bg-card p-4 mb-4">
          <h2 className="font-display text-2xl font-bold mb-3">{t("common.rules.pointsHeading")}</h2>

          <h3 className="font-display text-lg font-bold mb-2">{t("common.rules.perStageHeading")}</h3>
          <p className="text-sm text-muted-foreground mb-3 font-sans">
            {t("common.rules.perStageDesc")}
          </p>
          {schemaLoading ? (
            <p className="text-sm text-muted-foreground italic mb-6">{t("common.rules.schemaLoading")}</p>
          ) : stagePoints.length === 0 ? (
            <p className="text-sm text-muted-foreground italic mb-6">{t("common.rules.schemaEmpty")}</p>
          ) : (
            <div className="retro-border bg-background p-4 mb-6">
              <div className="grid grid-cols-4 md:grid-cols-5 gap-2 text-sm font-sans">
                {stagePoints.map((row) => (
                  <div key={row.position} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-xs w-5 text-right">{row.position}.</span>
                    <span className="font-bold text-accent">{row.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-display text-lg font-bold mb-2">{t("common.rules.podiumHeading")}</h3>
          <div className="space-y-2 font-sans text-sm mb-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>{t("common.rules.podiumRow1")}</span>
              <span className="font-bold text-accent">{t("common.rules.pts", { points: 50 })}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>{t("common.rules.podiumRow2")}</span>
              <span className="font-bold text-accent">{t("common.rules.pts", { points: 25 })}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>{t("common.rules.podiumRow3")}</span>
              <span className="font-bold text-muted-foreground">{t("common.rules.pts", { points: 0 })}</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {t("common.rules.podiumNote")}
            </p>
          </div>

          <h3 className="font-display text-lg font-bold mb-2">{t("common.rules.jerseysHeading")}</h3>
          <div className="space-y-2 font-sans text-sm mb-3">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>{t("common.rules.jerseyGreen")}</span>
              <span className="font-bold text-accent">{t("common.rules.pts", { points: 25 })}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>{t("common.rules.jerseyMountain")}</span>
              <span className="font-bold text-accent">{t("common.rules.pts", { points: 25 })}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>{t("common.rules.jerseyYoung")}</span>
              <span className="font-bold text-accent">{t("common.rules.pts", { points: 25 })}</span>
            </div>
          </div>

          <h3 className="font-display text-lg font-bold mb-2">{t("common.rules.jokersHeading")}</h3>
          <p className="text-sm text-muted-foreground mb-3 font-sans">
            {t("common.rules.jokersDesc")}
          </p>

          <h3 className="font-display text-lg font-bold mb-2">{t("common.rules.totalHeading")}</h3>
          <p className="text-sm text-muted-foreground font-sans">
            {t("common.rules.totalDesc")}
          </p>

          <h3 className="font-display text-lg font-bold mb-2 mt-3">{t("common.rules.tttHeading")}</h3>
          <p className="text-sm text-muted-foreground mb-3 font-sans">
            {t("common.rules.tttDesc")}
          </p>

          <h3 className="font-display text-lg font-bold mb-2">{t("common.rules.dayPrizeHeading")}</h3>
          <p className="text-sm text-muted-foreground font-sans">
            {t("common.rules.dayPrizeDesc")}
          </p>
        </section>

        {/* Categories overview */}
        <section className="retro-border bg-card p-4">
          <h2 className="font-display text-2xl font-bold mb-3">{t("common.rules.categoriesHeading")}</h2>
          <p className="text-sm text-muted-foreground mb-4 font-sans">{t("common.rules.categoriesIntro")}</p>

          {catsLoading || gameLoading ? (
            <p className="text-sm text-muted-foreground italic">{t("common.rules.categoriesLoading")}</p>
          ) : sortedCategories.length === 0 ? (
            <div className="p-6 text-center bg-secondary/30 rounded-md">
              <p className="text-sm text-muted-foreground">{t("common.rules.categoriesEmpty")}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                {t("common.rules.categoriesEmptyNote")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedCategories.map((cat, idx) => (
                <div key={cat.id} className="p-3 bg-secondary/30 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="jersey-badge bg-primary text-primary-foreground text-xs">#{idx + 1}</span>
                    <span className="font-bold text-sm font-sans">{cat.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cat.category_riders.length === 0 ? (
                      <em>{t("common.rules.noRiders")}</em>
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
          <h2 className="font-display text-2xl font-bold mb-3">{t("common.rules.finallyHeading")}</h2>
          <div className="space-y-3 font-sans text-sm text-muted-foreground">
            <p>
              {t("common.rules.finallyP1")}
            </p>
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
              <span>🚴</span>
              <span>{t("common.rules.supportButton")}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
