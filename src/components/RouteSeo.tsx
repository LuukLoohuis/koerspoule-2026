import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const BASE = "https://koerspoule.nl";
const OG_IMAGE = "https://koerspoule.nl/og/koerspoule-winter-v1.jpg";

// ogTitle/ogDescription: tekst onder het linkplaatje (WhatsApp e.d.) als die
// afwijkt van de titel en omschrijving voor tabblad en zoekmachines.
type Meta = {
  title: string;
  description: string;
  noindex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
};

const META: Record<string, Meta> = {
  "/": {
    title: "Koerspoule — Gratis Tour, Giro & Vuelta poule 2026",
    description:
      "Gratis wielerspel voor de Tour de France, Giro d'Italia en Vuelta 2026. Stel je ploeg samen, daag vrienden uit en strijd om de trui.",
    ogTitle: "Koerspoule — Gratis Meermarathon poule 2026–2027",
    ogDescription:
      "Gratis schaatspoule met alle Topdivisies. Stel je ploeg samen en daag je vrienden uit.",
  },
  "/team-samenstellen": {
    title: "Stel je team samen | Koerspoule",
    description:
      "Bouw jouw Giro-ploeg: kies per categorie, voeg jokers toe en doe GC-voorspellingen voor extra punten.",
    noindex: true,
  },
  "/uitslagen": {
    title: "Uitslagen & puntenverdeling | Koerspoule",
    description:
      "Bekijk etappe-uitslagen, puntenverdeling per ploeg en de heatmap van populaire renners in de Koerspoule.",
    noindex: true,
  },
  "/mijn-peloton": {
    title: "Mijn Peloton — jouw team & subpoule | Koerspoule",
    description:
      "Persoonlijk dashboard met je team, palmares, subpoulestand en head-to-head vergelijking met vrienden.",
    noindex: true,
  },
  "/profiel": {
    title: "Mijn profiel — palmares & oude spellen | Koerspoule",
    description: "Je erelijst en de uitslagen van de koersen die je eerder speelde.",
    noindex: true,
  },
  "/karavaan": {
    title: "Karavaan — koersnieuws & sfeer | Koerspoule",
    description:
      "De Koerspoule-karavaan: koersnieuws, voorbeschouwingen en sfeer rond de Giro, Tour en Vuelta.",
    noindex: true,
  },
  "/regels": {
    title: "Koersreglement & puntentelling | Koerspoule",
    description:
      "Spelregels, deadlines en puntentelling van Koerspoule — hoe werken categorieën, jokers en klassementen?",
  },
  "/zakelijk": {
    title: "Zakelijk — een eigen bedrijfspoule | Koerspoule",
    description:
      "Een wielerpoule voor je bedrijf: eigen subpoule met eigen link, in jullie huisstijl, met klassement per afdeling en eigen prijzen. Voor collega's, klanten en relaties.",
  },
  "/login": {
    title: "Inloggen of account aanmaken | Koerspoule",
    description: "Log in met je ploegnaam of maak gratis een nieuw Koerspoule-account aan.",
    noindex: true,
  },
  "/reset-password": {
    title: "Wachtwoord herstellen | Koerspoule",
    description: "Stel een nieuw wachtwoord in voor je Koerspoule-account.",
    noindex: true,
  },
  "/juridisch": {
    title: "Juridisch, privacy & cookies | Koerspoule",
    description: "Privacyverklaring, cookieverklaring en gebruiksvoorwaarden van Koerspoule.",
  },
  "/uitschrijven": {
    title: "Uitschrijven voor e-mails | Koerspoule",
    description: "Schrijf je uit voor Koerspoule-notificaties en koersupdates per e-mail.",
    noindex: true,
  },
  "/admin": {
    title: "Beheer | Koerspoule",
    description: "Beheerpaneel voor Koerspoule-organisatoren.",
    noindex: true,
  },
  "/instagram-export": {
    title: "Instagram export | Koerspoule",
    description: "Interne tool voor het exporteren van koers-visuals.",
    noindex: true,
  },
  "/preview": {
    title: "Preview | Koerspoule",
    description: "Interne preview-omgeving van Koerspoule.",
    noindex: true,
  },
};

export default function RouteSeo() {
  const { pathname } = useLocation();
  // Skip routes that manage their own head (e.g. GiroPoule2026, Admin)
  const meta = META[pathname];
  if (!meta) return null;
  const url = `${BASE}${pathname === "/" ? "/" : pathname}`;
  const ogTitle = meta.ogTitle ?? meta.title;
  const ogDescription = meta.ogDescription ?? meta.description;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {meta.noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Koerspoule" />
      <meta property="og:locale" content="nl_NL" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: meta.title,
        description: meta.description,
        url,
        inLanguage: "nl-NL",
      })}</script>
    </Helmet>
  );
}
