import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Trophy, Users, Zap, Mountain, Flag, Sparkles } from "lucide-react";

const PAGE_URL_EN = "https://koerspoule.nl/en/vuelta-espana-fantasy-2026";
const PAGE_URL_NL = "https://koerspoule.nl/vuelta-espana-poule-2026";
const PAGE_TITLE = "Vuelta a España 2026 Fantasy Cycling Game & Pool — Free | Koerspoule";
const PAGE_DESCRIPTION =
  "Free Vuelta a España 2026 fantasy cycling game and private pool. Build your team, invite friends and compete for the red jersey.";
const PAGE_IMAGE = "https://koerspoule.nl/og/koerspoule-tdf-v2.jpg";
const PAGE_KEYWORDS =
  "vuelta a españa fantasy 2026, vuelta fantasy cycling, vuelta pool 2026, free cycling fantasy game, la vuelta fantasy league, spanish grand tour pool, red jersey fantasy, fantasy cycling with friends, koerspoule";
const APP_CTA = "/login?lang=en";

const FAQS = [
  {
    q: "What is the best free Vuelta a España fantasy cycling game for 2026?",
    a: "Koerspoule is a free Vuelta fantasy cycling game. Build your own team, play in a private pool with friends and compete for the red jersey — with no entry fee.",
  },
  {
    q: "How do I create a Vuelta pool for 2026?",
    a: "Create a free Koerspoule account, start your own Vuelta a España pool and invite friends with a unique access code. You will be ready within a few minutes.",
  },
  {
    q: "Is the Vuelta pool free?",
    a: "Yes. Koerspoule is completely free, with no entry fee. Simply create a team and play with your friends.",
  },
  {
    q: "When does the Vuelta a España 2026 start?",
    a: "The Vuelta a España 2026 starts in late August. You can build your team and create your private pool before the first stage.",
  },
  {
    q: "Is Koerspoule a free alternative to Scorito for the Vuelta?",
    a: "Yes. Koerspoule is a free alternative where you can play the Vuelta in private pools with friends, family or colleagues, without a budget puzzle.",
  },
  {
    q: "How do you score points in the Vuelta pool?",
    a: "Your riders earn points in stages and the general, mountains and points classifications, as well as for special performances and jokers.",
  },
];

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://koerspoule.nl/#website",
      name: "Koerspoule",
      url: "https://koerspoule.nl/",
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": "https://koerspoule.nl/#organization",
      name: "Koerspoule",
      url: "https://koerspoule.nl/",
      logo: "https://koerspoule.nl/favicon.png",
      email: "info@koerspoule.nl",
    },
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL_EN}#webpage`,
      name: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: PAGE_URL_EN,
      inLanguage: "en",
      isPartOf: { "@id": "https://koerspoule.nl/#website" },
      primaryImageOfPage: { "@type": "ImageObject", url: PAGE_IMAGE },
      about: { "@type": "Thing", name: "Vuelta a España 2026" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://koerspoule.nl/" },
        { "@type": "ListItem", position: 2, name: "Vuelta a España Fantasy 2026", item: PAGE_URL_EN },
      ],
    },
    {
      "@type": "Game",
      name: "Koerspoule — Vuelta a España Fantasy Cycling Game & Pool 2026",
      description: PAGE_DESCRIPTION,
      url: PAGE_URL_EN,
      genre: "Fantasy Sports",
      gamePlatform: "Web",
      inLanguage: "en",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
      publisher: { "@id": "https://koerspoule.nl/#organization" },
    },
  ],
};

export default function VueltaEspanaFantasy2026En() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "en",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
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
        <meta property="og:site_name" content="Koerspoule" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:url" content={PAGE_URL_EN} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:image" content={PAGE_IMAGE} />
        <meta property="og:image:alt" content="Koerspoule — free Vuelta a España 2026 fantasy pool" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <meta name="twitter:image" content={PAGE_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(JSONLD)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <article className="max-w-4xl mx-auto space-y-7">
        <header className="text-center">
          <div className="vintage-ornament mb-3">
            <span className="vintage-ornament-symbol">✦</span>
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
              La Vuelta · 2026
            </span>
            <span className="vintage-ornament-symbol">✦</span>
          </div>
          <h1 className="vintage-heading text-3xl md:text-4xl font-bold mb-3">
            🔴 Free Vuelta a España Fantasy Cycling Game &amp; Pool 2026
          </h1>
          <p className="text-lg text-muted-foreground font-serif italic max-w-2xl mx-auto">
            Koerspoule is the free <strong>Vuelta a España 2026 fantasy cycling game</strong>.
            Build your own team and make three weeks of racing through Spain even more exciting in
            a private pool with friends.
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="retro-border-primary font-bold">
              <Link to={APP_CTA}>🚀 Start your free Vuelta pool</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/regels?lang=en">📖 View the rules</Link>
            </Button>
          </div>
        </header>

        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3">🚀 How does the Vuelta pool work?</h2>
          <ol className="space-y-2.5">
            {[
              "Create a free Koerspoule account",
              "Start your own Vuelta a España pool",
              "Invite friends, family or colleagues with an access code",
              "Build your cycling team from the official Vuelta start list",
              "Score points in every stage and climb the standings",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono font-bold text-sm">
                  {index + 1}
                </span>
                <span className="font-sans pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground font-serif italic">
            👉 You will be ready for the first stage within a few minutes.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-3">🧠 Build your Vuelta team</h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Pick the right balance of riders. Smart choices decide whether you finish in red or in
            the broom wagon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Trophy, emoji: "🔴", title: "GC contenders", desc: "The riders fighting for the red jersey and overall victory." },
              { icon: Zap, emoji: "💚", title: "Sprinters", desc: "Fast finishers for the bunch sprints and points jersey." },
              { icon: Mountain, emoji: "🔵", title: "Climbers", desc: "The specialists for the steep Spanish climbs and mountain jersey." },
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

        <section className="ornate-frame retro-border bg-card p-4 md:p-6">
          <h2 className="font-display text-2xl font-bold mb-3">
            📊 How do you score points in the Vuelta pool?
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Your riders collect points throughout the three weeks for:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Flag, label: "Stage results" },
              { icon: Trophy, label: "General classification" },
              { icon: Mountain, label: "Mountains classification" },
              { icon: Zap, label: "Points classification" },
              { icon: Sparkles, label: "Special performances" },
              { icon: Check, label: "Your selected jokers" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 p-3 rounded-md border-2 border-border bg-secondary/30">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="font-sans font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-3">
            🏁 Play with friends — a free alternative to Scorito
          </h2>
          <p className="text-muted-foreground mb-3 font-serif">
            Create your own private pool instead of disappearing in a huge public league. Challenge
            friends, family or colleagues and race for the bragging rights.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: "🔒", title: "Private pool", desc: "Protected with a unique access code." },
              { emoji: "📈", title: "Live standings", desc: "See who leads after every stage." },
              { emoji: "📊", title: "Stats & head-to-head", desc: "Compare your team with your rivals category by category." },
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

        <section className="ornate-frame retro-border p-4 md:p-6 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
          <h2 className="font-display text-2xl font-bold mb-3">🎯 Why play the Koerspoule Vuelta pool?</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "100% free",
              "Create a pool in minutes",
              "Updates after every stage",
              "For beginners and cycling experts",
              "Play in your own private pool",
              "Detailed stats and head-to-head comparisons",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0" />
                <span className="font-sans">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-3">
            ❓ Frequently asked questions about the Vuelta pool
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="ornate-frame retro-border bg-card p-4 group">
                <summary className="font-display font-bold cursor-pointer list-none flex items-center justify-between gap-2">
                  <span>{faq.q}</span>
                  <span className="text-primary transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground font-sans">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="text-sm text-muted-foreground font-serif">
          <p>
            Prefer another race? Also play the{" "}
            <Link to="/tour-de-france-poule-2026" className="underline font-bold text-primary">
              Tour de France pool 2026
            </Link>
            , the{" "}
            <Link to="/giro-italia-poule-2026" className="underline font-bold text-primary">
              Giro d&apos;Italia pool 2026
            </Link>{" "}
            or the{" "}
            <Link to="/en/tour-de-france-femmes-fantasy-2026" className="underline font-bold text-primary">
              Tour de France Femmes pool 2026
            </Link>
            .
          </p>
        </section>

        <section className="text-center ornate-frame retro-border bg-card p-6">
          <Users className="h-8 w-8 mx-auto text-primary mb-2" />
          <h2 className="vintage-heading text-2xl font-bold mb-2">
            👉 Start your Vuelta a España pool 2026
          </h2>
          <p className="text-muted-foreground font-serif italic max-w-xl mx-auto mb-4">
            Create your free pool now and challenge your friends to three weeks of racing through Spain.
          </p>
          <Button asChild size="lg" className="retro-border-primary font-bold animate-pulse">
            <Link to={APP_CTA}>🚴 Create your free Vuelta pool</Link>
          </Button>
        </section>
      </article>
    </div>
  );
}
