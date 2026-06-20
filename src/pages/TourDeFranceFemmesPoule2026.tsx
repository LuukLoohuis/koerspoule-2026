import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trophy, Users, Zap, Mountain, Flag, Sparkles } from "lucide-react";

const PAGE_URL = "https://koerspoule.nl/tour-de-france-femmes-poule-2026";
const PAGE_TITLE = "Tour de France Femmes 2026 Wielerspel & Poule — Gratis | Koerspoule";
const PAGE_DESCRIPTION =
  "Gratis Tour de France Femmes 2026 wielerspel — een gratis alternatief voor Scorito. Speel de poule van de vrouwen-Tour met vrienden in eigen subpoules, kies vrij uit het peloton en strijd om de gele trui.";
const PAGE_IMAGE = "https://koerspoule.nl/og/koerspoule-tdf-v2.jpg";
const PAGE_KEYWORDS =
  "tour de france femmes wielerspel 2026, tour de france femmes poule, wielerspel dames tour 2026, vrouwen tour poule, tour femmes poule 2026, gratis wielerspel dames, tdf femmes poule, dames wielerspel 2026, scorito alternatief dames, koerspoule, fantasy tour femmes, gele trui poule dames, tour de france femmes met vrienden";
const SITE_NAME = "Koerspoule";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is het Tour de France Femmes wielerspel gratis?",
    a: "Ja, Koerspoule is volledig gratis. Je stelt je eigen ploeg samen voor de Tour de France Femmes 2026, speelt in privé-poules met vrienden en strijdt om de gele trui — zonder inschrijfgeld.",
  },
  {
    q: "Kan ik een poule met vrienden maken voor de Tour Femmes?",
    a: "Zeker. Maak een gratis account op Koerspoule, start je eigen Tour de France Femmes poule en nodig vrienden, familie of collega's uit met een unieke toegangscode. Binnen een paar minuten ben je klaar.",
  },
  {
    q: "Hoe werkt de puntentelling?",
    a: "Je verdient punten voor etappe-overwinningen, het eindklassement (gele trui), het bergklassement, het puntenklassement en speciale prestaties van de rensters in jouw ploeg.",
  },
  {
    q: "Wanneer start de Tour de France Femmes 2026?",
    a: "De Tour de France Femmes 2026 wordt in de zomer verreden. Je kunt nu al je ploeg samenstellen en je poule starten, zodat je klaar bent voor de eerste etappe.",
  },
  {
    q: "Wat is het alternatief voor Scorito bij de Tour Femmes?",
    a: "Koerspoule is een gratis alternatief voor Scorito, ook voor de vrouwen-Tour. Speel de Tour de France Femmes in eigen privé-poules met je eigen vriendengroep — gratis en zonder budgetpuzzel.",
  },
  {
    q: "Voor wie is het dames-wielerspel bedoeld?",
    a: "Voor elke wielerfan — van beginner tot kenner. Of je nu elke koers volgt of vooral meedoet voor de gezelligheid: je stelt je ploeg samen op koersintuïtie en strijdt mee in je eigen poule.",
  },
];

// Structured data — rendert in de HTML-bron via Helmet (prerender, geen JS nodig).
const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://koerspoule.nl/#website", name: SITE_NAME, url: "https://koerspoule.nl/", inLanguage: "nl-NL" },
    { "@type": "Organization", "@id": "https://koerspoule.nl/#organization", name: SITE_NAME, url: "https://koerspoule.nl/", logo: "https://koerspoule.nl/favicon.png", email: "koerspoule@gmail.com" },
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      inLanguage: "nl-NL",
      isPartOf: { "@id": "https://koerspoule.nl/#website" },
      primaryImageOfPage: { "@type": "ImageObject", url: PAGE_IMAGE },
      about: { "@type": "Thing", name: "Tour de France Femmes 2026" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://koerspoule.nl/" },
        { "@type": "ListItem", position: 2, name: "Tour de France Femmes Poule 2026", item: PAGE_URL },
      ],
    },
    {
      "@type": "Game",
      name: "Koerspoule — Tour de France Femmes Wielerspel & Poule 2026",
      description: PAGE_DESCRIPTION,
      url: PAGE_URL,
      genre: "Fantasy Sports",
      gamePlatform: "Web",
      inLanguage: "nl-NL",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
      publisher: { "@id": "https://koerspoule.nl/#organization" },
    },
  ],
};

export default function TourDeFranceFemmesPoule2026() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="keywords" content={PAGE_KEYWORDS} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={PAGE_URL} />
        <link rel="alternate" hrefLang="nl-NL" href={PAGE_URL} />
        <link rel="alternate" hrefLang="nl-BE" href={PAGE_URL} />
        <link rel="alternate" hrefLang="x-default" href={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="nl_NL" />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:image" content={PAGE_IMAGE} />
        <meta property="og:image:alt" content="Koerspoule — gratis Tour de France Femmes poule 2026" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <meta name="twitter:image" content={PAGE_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(JSONLD)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <article className="max-w-4xl mx-auto space-y-7">
        {/* Hero */}
        <header className="text-center">
          <div className="vintage-ornament mb-3">
            <span className="vintage-ornament-symbol">✦</span>
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
              La Grande Boucle Féminine · 2026
            </span>
            <span className="vintage-ornament-symbol">✦</span>
          </div>
          <h1 className="vintage-heading text-3xl md:text-4xl font-bold mb-3">
            💛 Gratis Tour de France Femmes Wielerspel &amp; Poule 2026 — speel met vrienden
          </h1>
          <p className="text-lg text-muted-foreground font-serif italic max-w-2xl mx-auto">
            Koerspoule is hét gratis <strong>Tour de France Femmes wielerspel 2026</strong>. De beste
            rensters ter wereld strijden in de vrouweneditie van de Tour om de gele trui — maak het nog
            spannender met je eigen poule: gratis, retro en samen met vrienden.
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="retro-border-primary font-bold">
              <Link to="/login">🚀 Start gratis je Tour Femmes-poule</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/regels">📖 Bekijk de regels</Link>
            </Button>
          </div>
        </header>

        {/* Hoe werkt het */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🚀 Hoe werkt de Tour de France Femmes poule?
          </h2>
          <ol className="space-y-2.5">
            {[
              "Maak een gratis Koerspoule-account aan",
              "Start je eigen Tour de France Femmes poule",
              "Nodig vrienden, familie of collega's uit met een toegangscode",
              "Stel je ploeg samen uit de officiële startlijst van de vrouwen-Tour",
              "Verdien punten per etappe en klim in het klassement",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono font-bold text-sm">
                  {i + 1}
                </span>
                <span className="font-sans pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground font-serif italic">
            👉 Binnen een paar minuten ben je klaar voor de eerste etappe.
          </p>
        </section>

        {/* Stel je team samen */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🧠 Stel je Tour Femmes-ploeg samen
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Kies slim uit verschillende typen rensters — de juiste balans bepaalt of jij in het geel
            eindigt of in de bezemwagen:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Trophy, emoji: "💛", title: "Klassementsrensters", desc: "Voor de gele trui — de rensters die meedoen om de eindwinst in de Tour Femmes." },
              { icon: Zap, emoji: "💚", title: "Sprintsters", desc: "Voor de groene trui en de massasprints op de vlakke etappes." },
              { icon: Mountain, emoji: "⛰️", title: "Klimsters", desc: "Voor de bergtrui — wie pakt de zware cols en de bergetappes?" },
            ].map(({ icon: Icon, emoji, title, desc }) => (
              <Card key={title} className="ornate-frame retro-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{emoji}</span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-display text-base font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Punten */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            📊 Hoe verdien je punten in de Tour Femmes-poule?
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Gedurende de etappes van de vrouwen-Tour sprokkel je punten met:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Flag, label: "Etappe-overwinningen" },
              { icon: Trophy, label: "Eindklassement (geel)" },
              { icon: Mountain, label: "Bergklassement" },
              { icon: Zap, label: "Puntenklassement (groen)" },
              { icon: Sparkles, label: "Jongerenklassement" },
              { icon: Check, label: "Speciale prestaties & jokers" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 p-3 rounded-md border-2 border-border bg-secondary/30">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="font-sans font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vrienden */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🏁 Speel samen met vrienden — gratis alternatief voor Scorito
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Geen massapoule met duizenden onbekenden, maar een eigen privé-poule waar het écht om de
            bragging rights gaat. Koerspoule is een gratis alternatief voor Scorito — ook voor de Tour
            de France Femmes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: "🔒", title: "Eigen privé poule", desc: "Beveiligd met een unieke toegangscode." },
              { emoji: "📈", title: "Live tussenstanden", desc: "Volg na elke etappe wie er aan kop staat." },
              { emoji: "💬", title: "Koerscafé chat", desc: "Praat live mee tijdens de etappes." },
            ].map(({ emoji, title, desc }) => (
              <Card key={title} className="ornate-frame retro-border bg-card">
                <CardContent className="p-4">
                  <div className="text-xl mb-1.5">{emoji}</div>
                  <h3 className="font-display text-base font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Gratis alternatief voor Scorito */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🆓 Gratis alternatief voor Scorito
          </h2>
          <p className="text-muted-foreground font-serif">
            Op zoek naar een wielerspel voor de Tour de France Femmes zonder inschrijfgeld of
            budgetpuzzel? Koerspoule is een volwaardig, <strong>gratis alternatief voor Scorito</strong> —
            speciaal leuk voor de vrouwen-Tour. Je kiest vrij uit het peloton op koersintuïtie, speelt in
            je eigen subpoules en volgt live de stand. Geen verborgen kosten, geen ingewikkelde
            budgetregels: gewoon koersplezier met je eigen vriendengroep.
          </p>
        </section>

        {/* Waarom */}
        <section className="ornate-frame retro-border p-4 md:p-6 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🎯 Waarom de Koerspoule Tour Femmes-poule?
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "100% gratis",
              "Snel een poule starten",
              "Live updates per etappe",
              "Voor elke wielerfan — beginner of kenner",
              "Speel in eigen privé-poule",
              "Mooie statistieken & head-to-head",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <span className="font-sans">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Veelgestelde vragen — zichtbaar (matcht de FAQPage-structured-data) */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            ❓ Veelgestelde vragen over de Tour de France Femmes poule
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="ornate-frame retro-border bg-card p-4 group">
                <summary className="font-display font-bold cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>{f.q}</span>
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground font-sans">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Interne links */}
        <section className="text-sm text-muted-foreground font-serif">
          <p>
            Liever een andere ronde? Maak ook een{" "}
            <Link to="/tour-de-france-poule-2026" className="underline font-bold text-primary">
              Tour de France poule 2026
            </Link>
            , een{" "}
            <Link to="/giro-italia-poule-2026" className="underline font-bold text-primary">
              Giro d'Italia poule 2026
            </Link>{" "}
            of een{" "}
            <Link to="/vuelta-espana-poule-2026" className="underline font-bold text-primary">
              Vuelta a España poule 2026
            </Link>
            . Klaar om te beginnen? Ga naar{" "}
            <Link to="/team-samenstellen" className="underline font-bold text-primary">
              stel je team samen
            </Link>
            .
          </p>
        </section>

        {/* CTA */}
        <section className="text-center ornate-frame retro-border bg-card p-6">
          <Users className="h-8 w-8 mx-auto text-primary mb-2" />
          <h2 className="vintage-heading text-2xl font-bold mb-2">
            👉 Start jouw Tour de France Femmes poule 2026
          </h2>
          <p className="text-muted-foreground font-serif italic max-w-xl mx-auto mb-4">
            De Tour Femmes komt eraan — wees er op tijd bij. Maak nu je gratis poule en daag je vrienden
            uit voor de mooiste vrouwenkoers van het jaar.
          </p>
          <Button asChild size="lg" className="retro-border-primary font-bold animate-pulse">
            <Link to="/login">🚴‍♀️ Maak nu je gratis Tour Femmes-poule</Link>
          </Button>
        </section>
      </article>
    </div>
  );
}
