import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trophy, Users, Zap, Mountain, Flag, Sparkles } from "lucide-react";

const PAGE_URL = "https://koerspoule.nl/tour-de-france-poule-2026";
const PAGE_TITLE = "Tour de France 2026 Wielerspel & Poule — Gratis | Koerspoule";
const PAGE_DESCRIPTION =
  "Gratis Tour de France wielerspel 2026 — een gratis alternatief voor Scorito. Speel tourspel met vrienden in eigen subpoules, kies vrij uit het peloton op koersintuïtie en strijd om de gele trui.";
const PAGE_IMAGE = "https://koerspoule.nl/og/koerspoule-tdf.jpg";
const PAGE_KEYWORDS =
  "tour de france wielerspel 2026, tour de france wielerspel, wielerspel 2026, gratis wielerspel, alternatief voor scorito, scorito alternatief, gratis alternatief scorito, tourspel met vrienden, tour de france poule 2026, tour de france poule, tourspel, tourspel 2026, wielerpoule tour de france, fantasy tour de france, gele trui poule, ad tourspel alternatief, scorito tour de france, koerspoule, manager game wielrennen";
const SITE_NAME = "Koerspoule";

// Structured data (@graph) — rendert in de HTML-bron via Helmet, dus ook
// zichtbaar zonder JS (prerender).
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
      about: { "@type": "Thing", name: "Tour de France 2026" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://koerspoule.nl/" },
        { "@type": "ListItem", position: 2, name: "Tour de France Poule 2026", item: PAGE_URL },
      ],
    },
    {
      "@type": "Game",
      name: "Koerspoule — Tour de France Wielerspel & Poule 2026",
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

// Eén bron voor de FAQ — gebruikt voor zowel de zichtbare sectie als de
// FAQPage-structured-data (Google verwacht dat de schema-FAQ ook op de pagina staat).
const FAQS: { q: string; a: string }[] = [
  {
    q: "Wat is het beste gratis Tour de France wielerspel 2026?",
    a: "Koerspoule is een gratis Tour de France wielerspel voor 2026. Je stelt je eigen ploeg samen, speelt in privé-poules met vrienden en strijdt om de gele, groene, bolletjes- en witte trui — zonder inschrijfgeld.",
  },
  {
    q: "Hoe maak ik een Tour de France poule 2026?",
    a: "Maak een gratis account op Koerspoule, start je eigen Tour de France poule en nodig vrienden uit met een unieke toegangscode. Binnen een paar minuten ben je klaar.",
  },
  {
    q: "Is de Tour de France poule gratis?",
    a: "Ja, Koerspoule is volledig gratis. Geen inschrijfgeld — gewoon spelen met je vrienden.",
  },
  {
    q: "Wanneer kan ik mijn Tourpoule aanmaken?",
    a: "Nu al. Je kunt vandaag je poule starten en je team alvast samenstellen; de punten tellen vanaf de eerste etappe van de Tour de France 2026.",
  },
  {
    q: "Wanneer start de Tour de France 2026?",
    a: "De Tour de France 2026 start begin juli. Je kunt nu al je team samenstellen en je poule starten zodat je klaar bent voor de Grand Départ.",
  },
  {
    q: "Wat is het alternatief voor AD Tourspel of Scorito?",
    a: "Koerspoule is een gratis alternatief voor het AD Tourspel en Scorito. Speel in eigen privé-poules met vrienden, familie of collega's.",
  },
  {
    q: "Hoe verdien je punten in de Tour de France poule?",
    a: "Je verdient punten voor etappe-overwinningen, het eindklassement (gele trui), bergklassement (bolletjestrui), puntenklassement (groene trui) en jongerenklassement (witte trui).",
  },
  {
    q: "Kan ik de Tourpoule op mijn telefoon spelen?",
    a: "Ja. Koerspoule werkt volledig in de browser op mobiel, tablet en desktop — geen app-download nodig.",
  },
  {
    q: "Is Koerspoule een gratis alternatief voor Scorito?",
    a: "Ja. Koerspoule is een volledig gratis Tour de France wielerspel — óók als je met meerdere vrienden in privé-poules speelt. Geen inschrijfgeld en geen betaalde vriendenpoules: je maakt onbeperkt subpoules aan zonder te betalen.",
  },
  {
    q: "Wat is het verschil met Scorito?",
    a: "Bij Koerspoule kies je vrij uit het hele peloton op koersintuïtie — geen budgetpuzzel of vaste rennerwaardes. Het is gratis, ook met vrienden, en je krijgt eigen features zoals Monkey IQ (versla de aap), de retro Salle de Course-volgwagen en Stijgers & Dalers per etappe.",
  },
  {
    q: "Kan ik gratis een poule met vrienden starten?",
    a: "Ja. Maak een gratis account, start je eigen subpoule en deel een persoonlijke link (koerspoule.nl/jouwnaam) of toegangscode. Je vrienden, familie of collega's sluiten gratis aan — onbeperkt.",
  },
  {
    q: "Hoe werkt een subpoule?",
    a: "Een subpoule is je eigen privé-ranglijst binnen de grote poule. Jij start 'm, nodigt mensen uit met een deelbare link of code, en jullie strijden onderling om de eerste plek — met daguitslagen, klassementsverloop en head-to-head-vergelijkingen.",
  },
];

export default function TourDeFrancePoule2026() {
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
        <meta property="og:image:alt" content="Koerspoule — gratis Tour de France poule 2026" />
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
              La Grande Boucle · 2026
            </span>
            <span className="vintage-ornament-symbol">✦</span>
          </div>
          <h1 className="vintage-heading text-3xl md:text-4xl font-bold mb-3">
            🟡 Gratis Tour de France Wielerspel &amp; Tourspel 2026 — speel met vrienden
          </h1>
          <p className="text-lg text-muted-foreground font-serif italic max-w-2xl mx-auto">
            Koerspoule is hét gratis <strong>Tour de France wielerspel 2026</strong>. Drie weken lang
            strijden de beste renners ter wereld om de gele trui — maak het nog spannender met je eigen
            Tour de France poule: gratis en samen met vrienden.
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="retro-border-primary font-bold">
              <Link to="/login">🚀 Start gratis je Tourpoule</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/regels">📖 Bekijk de regels</Link>
            </Button>
          </div>
        </header>

        {/* Hoe werkt het */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🚀 Hoe werkt de Tour de France poule?
          </h2>
          <ol className="space-y-2.5">
            {[
              "Maak een gratis Koerspoule-account aan",
              "Start je eigen Tour de France poule",
              "Nodig vrienden, familie of collega's uit met een toegangscode",
              "Stel je wielerteam samen uit de officiële Tour-startlijst",
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
            👉 Binnen een paar minuten ben je klaar voor de Grand Départ.
          </p>
        </section>

        {/* Stel je team samen */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🧠 Stel je Tour-team samen
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Kies slim uit verschillende typen renners — de juiste balans bepaalt of jij in het geel
            eindigt of in de bezemwagen:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Trophy, emoji: "💛", title: "Klassementsrenners", desc: "Voor de gele trui — de mannen die meedoen om de eindwinst in Parijs." },
              { icon: Zap, emoji: "💚", title: "Sprinters", desc: "Voor de groene trui en de massasprints op de Champs-Élysées." },
              { icon: Mountain, emoji: "🔴", title: "Klimmers", desc: "Voor de bolletjestrui — wie pakt de Tourmalet en de Alpe d'Huez?" },
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
            📊 Hoe verdien je punten in de Tourpoule?
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Tijdens de drie Tourweken sprokkel je punten met:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Flag, label: "Etappe-overwinningen" },
              { icon: Trophy, label: "Eindklassement (geel)" },
              { icon: Mountain, label: "Bergklassement (bolletjes)" },
              { icon: Zap, label: "Puntenklassement (groen)" },
              { icon: Sparkles, label: "Jongerenklassement (wit)" },
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
            🏁 Speel samen met vrienden — alternatief voor AD Tourspel
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Geen massapoule met duizenden onbekenden, maar een eigen privé-poule waar het écht om
            de bragging rights gaat. Koerspoule is een gratis alternatief voor het AD
            Tourspel, Scorito en Tubantia Tourspel.
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

        {/* Waarom */}
        <section className="ornate-frame retro-border p-4 md:p-6 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🎯 Waarom de Koerspoule Tour de France poule?
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

        {/* Gratis alternatief voor Scorito — eigen, originele invulling */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🆓 Gratis alternatief voor Scorito
          </h2>
          <p className="text-muted-foreground mb-4 font-serif">
            Op zoek naar een <strong>gratis wielerspel</strong> in plaats van een betaald
            spel? Koerspoule is een volwaardig, <strong>gratis alternatief voor Scorito</strong> —
            zonder inschrijfgeld, ook als je een <strong>tourspel met vrienden</strong> speelt in
            meerdere subpoules. Onze aanpak is bewust anders:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {[
              ["💸", "100% gratis — ook vriendenpoules", "Maak onbeperkt subpoules aan met vrienden, familie of collega's. Geen abonnement, geen betaalmuur."],
              ["🚴", "Koersintuïtie i.p.v. budget", "Kies vrij uit het hele peloton op gevoel en kennis — geen budgetpuzzel of vaste rennerwaardes."],
              ["🐒", "Unieke features", "Monkey IQ (versla de aap), de retro Salle de Course-volgwagen, Stijgers & Dalers, daguitslagen en heatmaps."],
              ["👥", "Subpoules met een deelbare link", "Start je eigen poule en deel koerspoule.nl/jouwnaam — je kopgroep sluit in één tik aan."],
              ["🟡", "Strijd om de échte truien", "Punten voor etappezeges en het algemeen-, punten-, berg- en jongerenklassement."],
              ["📊", "Diepe inzichten per etappe", "Volg klassementsverloop, head-to-head-vergelijkingen en je positie binnen elke subpoule."],
            ].map(([emoji, title, desc]) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden className="text-xl shrink-0">{emoji}</span>
                <span>
                  <span className="font-display font-bold block">{title}</span>
                  <span className="text-sm text-muted-foreground font-sans">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground font-serif">
            Klaar om te beginnen? <Link to="/team-samenstellen" className="underline font-bold text-primary">Stel je team samen</Link>,
            lees de <Link to="/regels" className="underline font-bold text-primary">spelregels</Link> of{" "}
            <Link to="/mijn-peloton?tab=subpoules" className="underline font-bold text-primary">start een gratis subpoule met vrienden</Link>.
          </p>
        </section>

        {/* Veelgestelde vragen — zichtbaar (matcht de FAQPage-structured-data) */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            ❓ Veelgestelde vragen over de Tour de France poule
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

        {/* Interne links — andere koersen + uitslagen */}
        <section className="text-sm text-muted-foreground font-serif">
          <p>
            Liever een andere ronde? Maak ook een{" "}
            <Link to="/giro-italia-poule-2026" className="underline font-bold text-primary">
              Giro d'Italia poule 2026
            </Link>{" "}
            of bekijk de{" "}
            <Link to="/uitslagen" className="underline font-bold text-primary">
              live uitslagen en klassementen
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
            👉 Start jouw Tour de France poule 2026
          </h2>
          <p className="text-muted-foreground font-serif italic max-w-xl mx-auto mb-4">
            De Tour de France komt eraan — wees er op tijd bij. Maak nu je gratis poule en daag je
            vrienden uit voor drie weken koersplezier.
          </p>
          <Button asChild size="lg" className="retro-border-primary font-bold animate-pulse">
            <Link to="/login">🚴‍♂️ Maak nu je gratis Tourpoule</Link>
          </Button>
        </section>
      </article>
    </div>
  );
}
