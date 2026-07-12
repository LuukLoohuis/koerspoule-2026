import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Newspaper, Car, Users, Flag, Bike, ArrowRight, HelpCircle, type LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Card = { title: string; intro: string; to: string; bullets?: string[] };
type Group = { heading: string; Icon: LucideIcon; cards: Card[] };

type Faq = { q: string; a: string; to?: string };

function GoLink({ to }: { to: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
    >
      {t("common.uitleg.goThere")} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function FeatureCard({ Icon, title, intro, to, bullets }: Card & { Icon: LucideIcon }) {
  return (
    <div className="retro-border bg-card p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-5 w-5 text-primary shrink-0" />
        <h3 className="font-display font-bold text-base">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground font-sans">{intro}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground font-sans list-disc pl-5 flex-1">
          {bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      <GoLink to={to} />
    </div>
  );
}

export default function Uitleg() {
  const { t } = useTranslation();

  const groups = useMemo<Group[]>(() => [
    {
      heading: t("common.uitleg.groupVolgwagenHeading"),
      Icon: Car,
      cards: [
        {
          title: t("common.uitleg.cardPloegTitle"),
          intro: t("common.uitleg.cardPloegIntro"),
          to: "/mijn-peloton?tab=team&sub=ploeg",
          bullets: [
            t("common.uitleg.cardPloegBullet1"),
            t("common.uitleg.cardPloegBullet2"),
            t("common.uitleg.cardPloegBullet3"),
            t("common.uitleg.cardPloegBullet4"),
            t("common.uitleg.cardPloegBullet5"),
          ],
        },
        { title: t("common.uitleg.cardPronoTitle"), intro: t("common.uitleg.cardPronoIntro"), to: "/mijn-peloton?tab=team&sub=prono" },
        { title: t("common.uitleg.cardPalmaresTitle"), intro: t("common.uitleg.cardPalmaresIntro"), to: "/mijn-peloton?tab=team&sub=palmares" },
      ],
    },
    {
      heading: t("common.uitleg.groupSubpouleHeading"),
      Icon: Users,
      cards: [
        { title: t("common.uitleg.cardSubKlassementTitle"), intro: t("common.uitleg.cardSubKlassementIntro"), to: "/mijn-peloton?tab=subpoules&sub=klassement" },
        { title: t("common.uitleg.cardVerloopTitle"), intro: t("common.uitleg.cardVerloopIntro"), to: "/mijn-peloton?tab=subpoules&sub=verloop" },
        { title: t("common.uitleg.cardDaguitslagTitle"), intro: t("common.uitleg.cardDaguitslagIntro"), to: "/mijn-peloton?tab=subpoules&sub=daguitslag" },
        { title: t("common.uitleg.cardHeatmapTitle"), intro: t("common.uitleg.cardHeatmapIntro"), to: "/mijn-peloton?tab=subpoules&sub=heatmap" },
        { title: t("common.uitleg.cardStreekTitle"), intro: t("common.uitleg.cardStreekIntro"), to: "/mijn-peloton?tab=subpoules&sub=streek" },
      ],
    },
    {
      heading: t("common.uitleg.groupUitslagenHeading"),
      Icon: Flag,
      cards: [
        { title: t("common.uitleg.cardUitKlassementTitle"), intro: t("common.uitleg.cardUitKlassementIntro"), to: "/mijn-peloton?tab=uitslagen&view=klassement" },
        { title: t("common.uitleg.cardEtappesTitle"), intro: t("common.uitleg.cardEtappesIntro"), to: "/mijn-peloton?tab=uitslagen&view=etappes" },
      ],
    },
    {
      heading: t("common.uitleg.groupHorsHeading"),
      Icon: Bike,
      cards: [
        { title: t("common.uitleg.cardDartpijlTitle"), intro: t("common.uitleg.cardDartpijlIntro"), to: "/mijn-peloton?tab=hors&sub=dartpijl" },
        { title: t("common.uitleg.cardPelotonkeuzesTitle"), intro: t("common.uitleg.cardPelotonkeuzesIntro"), to: "/mijn-peloton?tab=hors&sub=pelotonkeuzes" },
        { title: t("common.uitleg.cardWielerdirecteurTitle"), intro: t("common.uitleg.cardWielerdirecteurIntro"), to: "/mijn-peloton?tab=hors&sub=wielerdirecteur" },
        { title: t("common.uitleg.cardEmiratesTitle"), intro: t("common.uitleg.cardEmiratesIntro"), to: "/mijn-peloton?tab=hors&sub=superteam" },
        { title: t("common.uitleg.cardBenchmarkTitle"), intro: t("common.uitleg.cardBenchmarkIntro"), to: "/mijn-peloton?tab=hors&sub=benchmark" },
      ],
    },
  ], [t]);

  const faqs = useMemo<Faq[]>(() => [
    { q: t("common.uitleg.faq1Q"), a: t("common.uitleg.faq1A"), to: "/mijn-peloton?tab=subpoules" },
    { q: t("common.uitleg.faq2Q"), a: t("common.uitleg.faq2A"), to: "/mijn-peloton?tab=subpoules" },
    { q: t("common.uitleg.faq3Q"), a: t("common.uitleg.faq3A"), to: "/mijn-peloton?tab=subpoules" },
    { q: t("common.uitleg.faq4Q"), a: t("common.uitleg.faq4A"), to: "/mijn-peloton?tab=team&sub=ploeg&edit=naam" },
    { q: t("common.uitleg.faq5Q"), a: t("common.uitleg.faq5A"), to: "/team-samenstellen" },
    { q: t("common.uitleg.faq6Q"), a: t("common.uitleg.faq6A"), to: "/team-samenstellen" },
    { q: t("common.uitleg.faq7Q"), a: t("common.uitleg.faq7A"), to: "/mijn-peloton?tab=karavaan" },
    { q: t("common.uitleg.faq8Q"), a: t("common.uitleg.faq8A"), to: "/mijn-peloton?tab=team&sub=ploeg" },
    { q: t("common.uitleg.faq9Q"), a: t("common.uitleg.faq9A"), to: "/mijn-peloton?tab=uitslagen&view=klassement" },
  ], [t]);

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <Helmet>
        <title>{t("common.uitleg.metaTitle")}</title>
        <meta name="description" content={t("common.uitleg.metaDescription")} />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("common.uitleg.title")}</h1>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
            {t("common.uitleg.intro")}
          </p>
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* L'Équipe — uitgebreide kaart met puntenlijst */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">{t("common.uitleg.lequipeHeading")}</h2>
          </div>
          <div className="retro-border bg-card p-4">
            <h3 className="font-display font-bold text-base">{t("common.uitleg.lequipeTitle")}</h3>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              {t("common.uitleg.lequipeIntro")}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm font-sans list-disc pl-5">
              <li>{t("common.uitleg.lequipeBullet1")}</li>
              <li>{t("common.uitleg.lequipeBullet2")}</li>
              <li>{t("common.uitleg.lequipeBullet3")}</li>
              <li>{t("common.uitleg.lequipeBullet4")}</li>
              <li>{t("common.uitleg.lequipeBullet5")}</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground/80 italic">
              {t("common.uitleg.lequipeNote")}
            </p>
            <GoLink to="/mijn-peloton?tab=karavaan" />
          </div>
        </section>

        {/* Overige groepen — kaartraster */}
        {groups.map((g) => (
          <section key={g.heading} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <g.Icon className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">{g.heading}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {g.cards.map((c) => (
                <FeatureCard key={c.title} Icon={g.Icon} {...c} />
              ))}
            </div>
          </section>
        ))}

        {/* Veelgestelde vragen */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">{t("common.uitleg.faqHeading")}</h2>
          </div>
          <div className="retro-border no-hover-lift bg-card px-4">
            <Accordion type="single" collapsible>
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left font-display font-bold text-sm hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground font-sans">{f.a}</p>
                    {f.to && <GoLink to={f.to} />}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Interne verwijzing naar een seizoenspoule (merknaam-ankertekst) */}
        <p className="text-center text-sm text-muted-foreground font-sans mt-6">
          <Link to="/tour-de-france-femmes-poule-2026" className="underline font-semibold text-primary hover:no-underline">
            Tour de France Femmes poule 2026
          </Link>
        </p>
      </div>
    </div>
  );
}
