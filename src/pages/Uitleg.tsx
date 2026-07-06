import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Newspaper, Car, Users, Flag, Bike, ArrowRight, HelpCircle, type LucideIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Card = { title: string; intro: string; to: string; bullets?: string[] };
type Group = { heading: string; Icon: LucideIcon; cards: Card[] };

const GROUPS: Group[] = [
  {
    heading: "Volgwagen — Mijn Ploeg",
    Icon: Car,
    cards: [
      {
        title: "Mijn Ploeg",
        intro: "Je volledige ploeg als programma, gegroepeerd zoals je 'm koos.",
        to: "/mijn-peloton?tab=team&sub=ploeg",
        bullets: [
          "Bovenaan de gouden strip \"Jacht op geel\" met je klassementsrenners.",
          "Daaronder je overige categorieën, elk met je gekozen renner(s); je jokers staan in een eigen categorie (✨).",
          "Achter elke renner zie je zijn punten.",
          "Een uitgevallen renner is doorgestreept met ☠.",
          "Klik op een renner voor zijn resultaten per etappe, inclusief een eventuele jokerbonus.",
        ],
      },
      { title: "Pronostiek", intro: "Je voorspellingen voor de eindklassementen en truien.", to: "/mijn-peloton?tab=team&sub=prono" },
      { title: "Palmares", intro: "Je erelijst en behaalde resultaten in deze poule.", to: "/mijn-peloton?tab=team&sub=palmares" },
    ],
  },
  {
    heading: "Subpoule",
    Icon: Users,
    cards: [
      { title: "Klassement", intro: "De stand binnen je subpoule, met duel om teams te vergelijken.", to: "/mijn-peloton?tab=subpoules&sub=klassement" },
      { title: "Stijgers & Dalers", intro: "Wie klimt en wie zakt over de etappes heen.", to: "/mijn-peloton?tab=subpoules&sub=verloop" },
      { title: "Daguitslag", intro: "De daguitslag per deelnemer van de laatste etappe. Filteren op woonplaats kan, mits je die hebt ingevuld.", to: "/mijn-peloton?tab=subpoules&sub=daguitslag" },
      { title: "Heatmap", intro: "Per categorie wie populair koos en wie een buitenbeentje pakte.", to: "/mijn-peloton?tab=subpoules&sub=heatmap" },
      { title: "Streek", intro: "In subpoules met woonplaatsen strijden plaatsen onderling. Alleen zichtbaar als er een streekklassement is — dus wanneer je je woonplaats hebt ingevuld.", to: "/mijn-peloton?tab=subpoules&sub=streek" },
    ],
  },
  {
    heading: "Uitslagen",
    Icon: Flag,
    cards: [
      { title: "Klassement", intro: "Het eindklassement van alle deelnemers, niet alleen je subpoule.", to: "/mijn-peloton?tab=uitslagen&view=klassement" },
      { title: "Etappes", intro: "De daguitslag per etappe van alle deelnemers.", to: "/mijn-peloton?tab=uitslagen&view=etappes" },
    ],
  },
  {
    heading: "Hors Catégorie",
    Icon: Bike,
    cards: [
      { title: "Dartpijl", intro: "Toeval telt: 5.000 apen prikken een team, jouw score wordt daartegen afgezet. Lees de volledige uitleg via de infoknop daar.", to: "/mijn-peloton?tab=hors&sub=dartpijl" },
      { title: "Pelotonkeuzes", intro: "Zie per categorie wie populair is en wie durfde af te wijken.", to: "/mijn-peloton?tab=hors&sub=pelotonkeuzes" },
      { title: "De Wielerdirecteur", intro: "Een directeur sportif beoordeelt je ploeg in een kort rapport.", to: "/mijn-peloton?tab=hors&sub=wielerdirecteur" },
      { title: "The Emirates", intro: "De droomploeg achteraf: de best mogelijke selectie van de dag.", to: "/mijn-peloton?tab=hors&sub=superteam" },
      { title: "Benchmark", intro: "Vergelijk twee ploegen categorie voor categorie.", to: "/mijn-peloton?tab=hors&sub=benchmark" },
    ],
  },
];

type Faq = { q: string; a: string; to?: string };

const FAQS: Faq[] = [
  {
    q: "Hoe maak ik een subpoule aan?",
    a: "Ga naar de Subpoule-tab en klik op Subpoule aanmaken. Kies een naam en deel daarna de uitnodigingscode met je vrienden. Aanmaken kan zolang de koers niet is afgerond.",
    to: "/mijn-peloton?tab=subpoules",
  },
  {
    q: "Hoe join ik een subpoule?",
    a: "Vraag de uitnodigingscode aan de maker van de subpoule. Ga naar de Subpoule-tab, kies Joinen en vul de code in. Heb je een uitnodigingslink gekregen, dan staat de code al voor je klaar.",
    to: "/mijn-peloton?tab=subpoules",
  },
  {
    q: "Kan ik in meerdere subpoules tegelijk zitten?",
    a: "Ja. Je hebt één ploeg, en die telt automatisch mee in elke subpoule waar je lid van bent.",
    to: "/mijn-peloton?tab=subpoules",
  },
  {
    q: "Hoe verander ik mijn teamnaam?",
    a: "In de Volgwagen, op het tabblad Mijn Ploeg: klik op het potloodje ✏️ naast je ploegnaam. De naam wordt direct opgeslagen en is zichtbaar in alle klassementen.",
    to: "/mijn-peloton?tab=team&sub=ploeg&edit=naam",
  },
  {
    q: "Tot wanneer kan ik mijn ploeg indienen?",
    a: "Tot de start van de eerste etappe. Heb je wijzigingen niet opnieuw ingediend, dan telt op dat moment automatisch je huidige selectie.",
    to: "/team-samenstellen",
  },
  {
    q: "Kan ik mijn team nog wijzigen na indienen?",
    a: "Ja, tot de start van de eerste etappe. Pas je ploeg aan en dien opnieuw in om te bevestigen.",
    to: "/team-samenstellen",
  },
  {
    q: "Waarom zie ik nog geen commentaar in mijn subpoule?",
    a: "Het commentaar verschijnt zodra de uitslag van de etappe is ingevoerd, en wordt geschreven vanaf 2 deelnemers per subpoule.",
    to: "/mijn-peloton?tab=karavaan",
  },
  {
    q: "Wat gebeurt er als een renner uitvalt?",
    a: "Uitvallers blijven doorgestreept in je ploeg staan. De punten die ze al pakten, behoud je.",
    to: "/mijn-peloton?tab=team&sub=ploeg",
  },
  {
    q: "Waar zie ik de uitslagen van alle deelnemers?",
    a: "In Uitslagen: het klassement en de daguitslag per etappe, van alle deelnemers en niet alleen je subpoule.",
    to: "/mijn-peloton?tab=uitslagen&view=klassement",
  },
];

function GoLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
    >
      Ga ernaartoe <ArrowRight className="h-4 w-4" />
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
  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <Helmet>
        <title>Uitleg · Koerspoule</title>
        <meta name="description" content="Ontdek wat je allemaal kunt in Koerspoule: L'Équipe, Volgwagen, Subpoule, Uitslagen en Hors Catégorie — kort uitgelegd, met directe links." />
      </Helmet>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Uitleg</h1>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto">
            Alles wat je in Koerspoule kunt doen, kort uitgelegd. Klik een kaart om er direct naartoe te gaan.
          </p>
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* L'Équipe — uitgebreide kaart met puntenlijst */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">L'Équipe</h2>
          </div>
          <div className="retro-border bg-card p-4">
            <h3 className="font-display font-bold text-base">L'Équipe — je dagelijkse voorpagina</h3>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              Alles over de laatste etappe op één plek, elke dag ververst.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm font-sans list-disc pl-5">
              <li>Het commentaar van Michel Wuyts en José De Cauwer over de uitslag in jouw subpoule.</li>
              <li>Het rapport van je Wielerdirecteur (Patrick Lefevère) over jouw ploeg.</li>
              <li>De daguitslag van je subpoule, met de opbrengst per deelnemer.</li>
              <li>De voorbeschouwing van de volgende etappe: profiel, route, type en afstand.</li>
              <li>Een snelkoppeling naar het klassement met de uitslagen van alle deelnemers.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground/80 italic">
              Het commentaar en het rapport verschijnen zodra de uitslag van de etappe is ingevoerd. Tot die tijd zie je hier de voorbeschouwing van de komende etappe.
            </p>
            <GoLink to="/mijn-peloton?tab=karavaan" />
          </div>
        </section>

        {/* Overige groepen — kaartraster */}
        {GROUPS.map((g) => (
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
            <h2 className="font-display text-xl font-bold">Veelgestelde vragen</h2>
          </div>
          <div className="retro-border no-hover-lift bg-card px-4">
            <Accordion type="single" collapsible>
              {FAQS.map((f) => (
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
      </div>
    </div>
  );
}
