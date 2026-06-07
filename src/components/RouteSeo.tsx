import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const BASE = "https://koerspoule.nl";

type Meta = { title: string; description: string; noindex?: boolean };

const META: Record<string, Meta> = {
  "/": {
    title: "Koerspoule — Gratis Tour, Giro & Vuelta poule 2026",
    description:
      "Gratis wielerspel voor de Tour de France, Giro d'Italia en Vuelta 2026. Stel je ploeg samen, daag vrienden uit en strijd om de trui.",
  },
  "/team-samenstellen": {
    title: "Stel je team samen | Koerspoule",
    description:
      "Bouw jouw Giro-ploeg: kies per categorie, voeg jokers toe en doe GC-voorspellingen voor extra punten.",
  },
  "/uitslagen": {
    title: "Uitslagen & puntenverdeling | Koerspoule",
    description:
      "Bekijk etappe-uitslagen, puntenverdeling per ploeg en de heatmap van populaire renners in de Koerspoule.",
  },
  "/mijn-peloton": {
    title: "Mijn Peloton — jouw team & subpoule | Koerspoule",
    description:
      "Persoonlijk dashboard met je team, palmares, subpoulestand en head-to-head vergelijking met vrienden.",
  },
  "/karavaan": {
    title: "Karavaan — koersnieuws & sfeer | Koerspoule",
    description:
      "De Koerspoule-karavaan: koersnieuws, voorbeschouwingen en sfeer rond de Giro, Tour en Vuelta.",
  },
  "/regels": {
    title: "Koersreglement & puntentelling | Koerspoule",
    description:
      "Spelregels, deadlines en puntentelling van Koerspoule — hoe werken categorieën, jokers en klassementen?",
  },
  "/login": {
    title: "Inloggen of account aanmaken | Koerspoule",
    description: "Log in met je ploegnaam of maak gratis een nieuw Koerspoule-account aan.",
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
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {meta.noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
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
