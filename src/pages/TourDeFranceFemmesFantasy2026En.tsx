import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trophy, Users, Zap, Mountain, Flag, Sparkles, CalendarDays } from "lucide-react";

// Engelse zusterpagina van /tour-de-france-femmes-poule-2026. Eigen geïndexeerde
// URL + wederzijdse hreflang. Zelfde feiten (geverifieerd in de officiële
// press kit / Wikipedia), geschreven in natuurlijke Engelse wielertermen.
const PAGE_URL_EN = "https://koerspoule.nl/en/tour-de-france-femmes-fantasy-2026";
const PAGE_URL_NL = "https://koerspoule.nl/tour-de-france-femmes-poule-2026";
const PAGE_TITLE = "Tour de France Femmes 2026 Fantasy Cycling Game & Pool — Free | Koerspoule";
const PAGE_DESCRIPTION =
  "Free Tour de France Femmes 2026 fantasy cycling game & pool. Aug 1–9, Lausanne to Nice. Build your team and play a private pool with friends.";
const PAGE_IMAGE = "https://koerspoule.nl/og/koerspoule-tdf-v2.jpg";
const PAGE_KEYWORDS =
  "tour de france femmes fantasy 2026, tour de france femmes pool, women's tour de france fantasy game, tour femmes fantasy cycling, free fantasy cycling game, tour de france femmes 2026, women's cycling pool, yellow jersey fantasy, fantasy cycling with friends, koerspoule";
const SITE_NAME = "Koerspoule";

// App-CTA met ?lang=en → de i18n-detector selecteert Engels voor (De app zelf is
// Nederlands tot de i18n-migratie live is; ?lang=en zet de voorkeur alvast).
const APP_CTA = "/login?lang=en";

const FAQS: { q: string; a: string }[] = [
  {
    q: "When does the Tour de France Femmes 2026 start?",
    a: "The Tour de France Femmes 2026 runs from 1 to 9 August 2026. It is the fifth edition, with the Grand Départ in Switzerland: stage 1 starts in Lausanne on 1 August. You can build your team and start your pool now, ready for the first stage.",
  },
  {
    q: "How many stages does the Tour de France Femmes 2026 have?",
    a: "Nine stages over 1,175 kilometres with 18,795 metres of climbing — a record-breaking course. Stage 4 is a 21 km individual time trial from Gevrey-Chambertin to Dijon, and stage 7 finishes on the summit of Mont Ventoux (1,910 m).",
  },
  {
    q: "Where does the Tour de France Femmes 2026 start?",
    a: "In Switzerland. The Grand Départ has stage starts in Lausanne, Aigle and Geneva, with stage 1 setting off from Lausanne on 1 August 2026. The race finishes with a circuit around Nice on 9 August.",
  },
  {
    q: "Is the Tour de France Femmes fantasy game free?",
    a: "Yes, Koerspoule is completely free. You build your own team for the Tour de France Femmes 2026, play in private pools with friends and compete for the yellow jersey — no entry fee.",
  },
  {
    q: "Can I create a pool with friends for the women's Tour?",
    a: "Absolutely. Create a free Koerspoule account, start your own Tour de France Femmes pool and invite friends, family or colleagues with a unique access code. You are ready in a couple of minutes.",
  },
  {
    q: "How does scoring work?",
    a: "You earn points for stage wins, the general classification (yellow jersey), the mountains classification, the points classification and special performances by the riders in your team.",
  },
  {
    q: "What is the free alternative to Scorito for the women's Tour?",
    a: "Koerspoule is a free alternative to Scorito, for the women's Tour too. Play the Tour de France Femmes in your own private pools with your own group of friends — free and without a budget puzzle.",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://koerspoule.nl/#website", name: SITE_NAME, url: "https://koerspoule.nl/", inLanguage: "en" },
    { "@type": "Organization", "@id": "https://koerspoule.nl/#organization", name: SITE_NAME, url: "https://koerspoule.nl/", logo: "https://koerspoule.nl/favicon.png", email: "koerspoule@gmail.com" },
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL_EN}#webpage`,
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL_EN,
      inLanguage: "en",
      isPartOf: { "@id": "https://koerspoule.nl/#website" },
      primaryImageOfPage: { "@type": "ImageObject", url: PAGE_IMAGE },
      about: { "@type": "Thing", name: "Tour de France Femmes 2026" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://koerspoule.nl/" },
        { "@type": "ListItem", position: 2, name: "Tour de France Femmes Fantasy 2026", item: PAGE_URL_EN },
      ],
    },
    {
      "@type": "Event",
      name: "Tour de France Femmes 2026",
      description: "The fifth edition of the Tour de France Femmes avec Zwift: nine stages from 1 to 9 August 2026, Grand Départ in Lausanne (Switzerland), summit finish on Mont Ventoux, final circuit in Nice.",
      startDate: "2026-08-01",
      endDate: "2026-08-09",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
      inLanguage: "en",
      url: PAGE_URL_EN,
      location: [
        { "@type": "Place", name: "Lausanne", address: { "@type": "PostalAddress", addressLocality: "Lausanne", addressCountry: "CH" } },
        { "@type": "Place", name: "Nice", address: { "@type": "PostalAddress", addressLocality: "Nice", addressCountry: "FR" } },
      ],
      organizer: { "@type": "Organization", name: "Amaury Sport Organisation (ASO)" },
    },
    {
      "@type": "Game",
      name: "Koerspoule — Tour de France Femmes Fantasy Cycling Game & Pool 2026",
      description: PAGE_DESCRIPTION,
      url: PAGE_URL_EN,
      genre: "Fantasy Sports",
      gamePlatform: "Web",
      inLanguage: "en",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
      publisher: { "@id": "https://koerspoule.nl/#organization" },
    },
  ],
};

export default function TourDeFranceFemmesFantasy2026En() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "en",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <Helmet>
        <html lang="en" />
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="keywords" content={PAGE_KEYWORDS} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={PAGE_URL_EN} />
        <link rel="alternate" hrefLang="nl" href={PAGE_URL_NL} />
        <link rel="alternate" hrefLang="en" href={PAGE_URL_EN} />
        <link rel="alternate" hrefLang="x-default" href={PAGE_URL_NL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:url" content={PAGE_URL_EN} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:image" content={PAGE_IMAGE} />
        <meta property="og:image:alt" content="Koerspoule — free Tour de France Femmes 2026 fantasy pool" />
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
        {/* Language link → NL */}
        <p className="text-center text-sm text-muted-foreground font-serif">
          <Link to="/tour-de-france-femmes-poule-2026" className="underline font-bold text-primary" hrefLang="nl">
            Lees deze pagina in het Nederlands
          </Link>
        </p>

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
            💛 Free Tour de France Femmes 2026 Fantasy Cycling Game &amp; Pool — play with friends
          </h1>
          <p className="text-lg text-muted-foreground font-serif italic max-w-2xl mx-auto">
            Koerspoule is the free <strong>Tour de France Femmes 2026 fantasy cycling game</strong>. The best
            riders in the world battle for the yellow jersey in the women's Tour — make it even more exciting
            with your own pool: free, retro and together with friends.
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="retro-border-primary font-bold">
              <Link to={APP_CTA}>🚀 Start your free Tour Femmes pool</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/regels">📖 Read the rules</Link>
            </Button>
          </div>
        </header>

        {/* De 2026-editie — feiten */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> The Tour de France Femmes 2026
          </h2>
          <ul className="space-y-2 font-sans">
            {[
              "1 to 9 August 2026 — the fifth edition of the Tour de France Femmes avec Zwift (ASO).",
              "Grand Départ in Switzerland: stage 1 starts in Lausanne on 1 August, with further stage starts in Aigle and Geneva.",
              "Nine stages over 1,175 kilometres with 18,795 metres of climbing — a record-breaking route.",
              "Stage 4 is a 21 km individual time trial from Gevrey-Chambertin to Dijon.",
              "Stage 7 finishes on the summit of Mont Ventoux (1,910 m), the highest point of the race.",
              "21 teams (14 UCI Women's WorldTeams + 7 ProTeams) of seven riders each — 147 riders in total.",
              "The race finishes with a circuit around Nice on 9 August.",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground font-serif">
            Defending champion: Pauline Ferrand-Prévot. Previous winners: Annemiek van Vleuten (2022),
            Demi Vollering (2023) and Kasia Niewiadoma (2024).
          </p>
        </section>

        {/* How it works */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🚀 How does the Tour de France Femmes pool work?
          </h2>
          <ol className="space-y-2.5">
            {[
              "Create a free Koerspoule account",
              "Start your own Tour de France Femmes pool",
              "Invite friends, family or colleagues with an access code",
              "Build your team from the official startlist of the women's Tour",
              "Earn points every stage and climb the standings",
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
            👉 You are ready for the first stage in a couple of minutes.
          </p>
        </section>

        {/* Build your team */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🧠 Build your Tour Femmes team
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Pick smartly from different types of riders — the right balance decides whether you finish in
            yellow or in the broom wagon:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Trophy, emoji: "💛", title: "General classification riders", desc: "For the yellow jersey — the riders going for the overall win in the Tour Femmes." },
              { icon: Zap, emoji: "💚", title: "Sprinters", desc: "For the green jersey and the bunch sprints on the flat stages." },
              { icon: Mountain, emoji: "⛰️", title: "Climbers", desc: "For the mountains jersey — who conquers the hard cols and the mountain stages?" },
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

        {/* Points */}
        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            📊 How do you earn points in the Tour Femmes pool?
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Throughout the stages of the women's Tour you collect points with:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Flag, label: "Stage wins" },
              { icon: Trophy, label: "General classification (yellow)" },
              { icon: Mountain, label: "Mountains classification" },
              { icon: Zap, label: "Points classification (green)" },
              { icon: Sparkles, label: "Youth classification" },
              { icon: Check, label: "Special performances & jokers" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 p-3 rounded-md border-2 border-border bg-secondary/30">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="font-sans font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Friends */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🏁 Play with friends — a free alternative to Scorito
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            No mass pool with thousands of strangers, but your own private pool where it is really about the
            bragging rights. Koerspoule is a free alternative to Scorito — for the Tour de France Femmes too.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: "🔒", title: "Your own private pool", desc: "Secured with a unique access code." },
              { emoji: "📈", title: "Live standings", desc: "See who leads after every stage." },
              { emoji: "💬", title: "Race café chat", desc: "Chat live during the stages." },
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

        {/* Why */}
        <section className="ornate-frame retro-border p-4 md:p-6 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            🎯 Why the Koerspoule Tour Femmes pool?
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "100% free",
              "Start a pool in minutes",
              "Live updates every stage",
              "For every cycling fan — beginner or expert",
              "Play in your own private pool",
              "Great stats & head-to-head",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <span className="font-sans">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ — visible, matches the FAQPage structured data */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
            ❓ Frequently asked questions about the Tour de France Femmes pool
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

        {/* Internal links */}
        <section className="text-sm text-muted-foreground font-serif">
          <p>
            Prefer another race? Also play the{" "}
            <Link to="/tour-de-france-poule-2026" className="underline font-bold text-primary">
              Tour de France pool 2026
            </Link>
            , the{" "}
            <Link to="/giro-italia-poule-2026" className="underline font-bold text-primary">
              Giro d'Italia pool 2026
            </Link>{" "}
            or the{" "}
            <Link to="/vuelta-espana-poule-2026" className="underline font-bold text-primary">
              Vuelta a España pool 2026
            </Link>
            .
          </p>
        </section>

        {/* CTA */}
        <section className="text-center ornate-frame retro-border bg-card p-6">
          <Users className="h-8 w-8 mx-auto text-primary mb-2" />
          <h2 className="vintage-heading text-2xl font-bold mb-2">
            👉 Start your Tour de France Femmes pool 2026
          </h2>
          <p className="text-muted-foreground font-serif italic max-w-xl mx-auto mb-4">
            The Tour Femmes is coming — be there in time. Create your free pool now and challenge your friends
            to the finest women's race of the year.
          </p>
          <Button asChild size="lg" className="retro-border-primary font-bold animate-pulse">
            <Link to={APP_CTA}>🚴‍♀️ Create your free Tour Femmes pool</Link>
          </Button>
        </section>
      </article>
    </div>
  );
}
