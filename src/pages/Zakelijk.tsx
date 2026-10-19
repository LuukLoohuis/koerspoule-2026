import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  Link2,
  Palette,
  Network,
  Trophy,
  Share2,
  Handshake,
  Megaphone,
  CalendarRange,
  Mail,
  type LucideIcon,
} from "lucide-react";

// Zakelijk — wat Koerspoule voor bedrijven kan doen: een eigen bedrijfspoule
// op maat (subpoule met eigen link, huisstijl, afdelingen, prijzen). Publieke
// marketingpagina; SEO staat in RouteSeo, prerender in scripts/prerender.mjs.

const CONTACT_MAIL = "info@koerspoule.nl";

type Offer = { Icon: LucideIcon; title: string; body: string };
type Step = { title: string; body: string };

function OfferCard({ Icon, title, body }: Offer) {
  return (
    <div className="retro-border bg-card p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden />
        <h3 className="font-display font-bold text-base">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground font-sans">{body}</p>
    </div>
  );
}

export default function Zakelijk() {
  const { t } = useTranslation();

  const offers = useMemo<Offer[]>(() => [
    { Icon: Link2, title: t("common.zakelijk.offerPouleTitle"), body: t("common.zakelijk.offerPouleBody") },
    { Icon: Palette, title: t("common.zakelijk.offerHuisstijlTitle"), body: t("common.zakelijk.offerHuisstijlBody") },
    { Icon: Network, title: t("common.zakelijk.offerAfdelingTitle"), body: t("common.zakelijk.offerAfdelingBody") },
    { Icon: Trophy, title: t("common.zakelijk.offerPrijzenTitle"), body: t("common.zakelijk.offerPrijzenBody") },
    { Icon: Share2, title: t("common.zakelijk.offerUpdatesTitle"), body: t("common.zakelijk.offerUpdatesBody") },
    { Icon: Handshake, title: t("common.zakelijk.offerRelatiesTitle"), body: t("common.zakelijk.offerRelatiesBody") },
    { Icon: Megaphone, title: t("common.zakelijk.offerSponsorTitle"), body: t("common.zakelijk.offerSponsorBody") },
    { Icon: CalendarRange, title: t("common.zakelijk.offerSeizoenTitle"), body: t("common.zakelijk.offerSeizoenBody") },
  ], [t]);

  const steps = useMemo<Step[]>(() => [
    { title: t("common.zakelijk.step1Title"), body: t("common.zakelijk.step1Body") },
    { title: t("common.zakelijk.step2Title"), body: t("common.zakelijk.step2Body") },
    { title: t("common.zakelijk.step3Title"), body: t("common.zakelijk.step3Body") },
  ], [t]);

  const mailHref = `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent(t("common.zakelijk.mailSubject"))}`;

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{t("common.zakelijk.title")}</h1>
          <p className="text-muted-foreground font-sans max-w-2xl mx-auto">{t("common.zakelijk.intro")}</p>
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* Wat we kunnen doen — kaartraster */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-display text-xl font-bold">{t("common.zakelijk.offersHeading")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {offers.map((o) => (
              <OfferCard key={o.title} {...o} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground/80 italic font-sans">{t("common.zakelijk.freeNote")}</p>
        </section>

        {/* Zo werkt het — drie stappen */}
        <section className="mb-6">
          <h2 className="font-display text-xl font-bold mb-3">{t("common.zakelijk.stepsHeading")}</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map((s, i) => (
              <li key={s.title} className="retro-border bg-card p-4">
                <span className="font-display text-2xl font-bold text-primary tabular-nums" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="font-display font-bold text-base mt-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground font-sans mt-1">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Contact */}
        <section className="retro-border no-hover-lift bg-card p-5 md:p-6 text-center">
          <h2 className="font-display text-xl md:text-2xl font-bold">{t("common.zakelijk.ctaHeading")}</h2>
          <p className="text-sm text-muted-foreground font-sans max-w-xl mx-auto mt-1.5">{t("common.zakelijk.ctaBody")}</p>
          <a
            href={mailHref}
            className="mt-4 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {t("common.zakelijk.ctaButton")}
          </a>
          <p className="mt-2 text-xs text-muted-foreground font-sans">{CONTACT_MAIL}</p>
        </section>
      </div>
    </div>
  );
}
