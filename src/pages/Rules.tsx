import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useStages } from "@/hooks/useResults";
import { isMeermarathonGame, meermarathonSeason } from "@/lib/gameTypes";
import { KLASSEMENT_PUNTEN } from "@/lib/klassementVoorspelling";
import { wegingPerSoort } from "@/lib/wegingsfactor";
import RegelsWeergave from "@/components/RegelsWeergave";

export default function Rules() {
  const { t } = useTranslation();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const meermarathon = isMeermarathonGame(game?.game_type);
  const { data: categories = [], isLoading: catsLoading } = useCategories(game?.id);
  const { data: schema = [], isLoading: schemaLoading } = usePointsSchema(game?.id);
  // Alleen de Meermarathon kent een weging per wedstrijd.
  const { data: stages = [] } = useStages(meermarathon ? game?.id : undefined);

  // Bij de Meermarathon de schaatsteksten (i18next-context "mm").
  const ctx = meermarathon ? "mm" : undefined;
  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [1, 2, 3, 4].map((n) => ({
      "@type": "Question",
      name: t(`common.rules.jsonldQ${n}`, { context: ctx }),
      acceptedAnswer: { "@type": "Answer", text: t(`common.rules.jsonldA${n}`, { context: ctx }) },
    })),
  }), [t, ctx]);

  const stagePoints = useMemo(
    () => schema.filter((s) => s.classification === "stage").sort((a, b) => a.position - b.position),
    [schema],
  );

  // (jerseyPoints schema is niet meer relevant — truien lopen via voorspellingen, niet via points_schema.)

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.sort_order - b.sort_order), [categories]);

  // Meermarathon: de punten per goede klassementsvoorspelling kan het beheer
  // in het puntenschema overschrijven (pred_klassement, plek 1).
  const pronostiekPunten =
    schema.find((s) => (s.classification as string) === "pred_klassement" && s.position === 1)?.points ?? KLASSEMENT_PUNTEN;
  const wegingGroepen = useMemo(() => wegingPerSoort(stages), [stages]);

  // De Meermarathon is één game: geen "Mannen" of "Vrouwen" in de naam.
  const gameNaam = game ? (meermarathon ? `Meermarathon ${meermarathonSeason(game.year)}` : game.name) : null;

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>
      <RegelsWeergave
        meermarathon={meermarathon}
        gameNaam={gameNaam}
        categories={sortedCategories}
        categoriesLoading={catsLoading || gameLoading}
        stagePoints={stagePoints}
        schemaLoading={schemaLoading}
        wegingGroepen={wegingGroepen}
        pronostiekPunten={pronostiekPunten}
      />
    </>
  );
}
