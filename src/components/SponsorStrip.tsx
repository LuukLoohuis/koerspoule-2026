import { useTranslation } from "react-i18next";
import { useVisibleSponsors, type Sponsor } from "@/hooks/useSponsors";

/**
 * Subtiele sponsorstrook boven de footerbalk (Layout): decoratieve stippellijn +
 * ornament, links het kopje, daarnaast de zichtbare sponsoren elk in een net wit
 * kaderkaartje (logo OF label + weergavenaam). Geen zichtbare sponsoren → niets
 * tonen. Sponsor met link_url → kaartje linkt extern.
 */
export default function SponsorStrip() {
  const { t } = useTranslation();
  const { data: sponsors = [] } = useVisibleSponsors();
  if (sponsors.length === 0) return null;

  return (
    <section className="border-t border-border/60 bg-card/40" aria-label={t("shell.sponsors.sectionAria")}>
      <div className="container mx-auto px-5 py-6">
        <div className="bolletjes-rule max-w-xs mx-auto mb-3" aria-hidden />
        <div className="vintage-ornament max-w-sm mx-auto mb-4" aria-hidden>
          <span className="vintage-ornament-symbol">✦</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-6">
          <div className="text-center md:text-left shrink-0">
            <p className="font-sans text-[12px] font-medium uppercase tracking-[0.16em] text-foreground/55 mb-1">{t("shell.sponsors.madePossible")}</p>
            <h2 className="font-sans text-2xl font-semibold leading-tight text-foreground">{t("shell.sponsors.heading")}</h2>
          </div>
          <ul className="flex flex-wrap items-stretch justify-center gap-3 list-none p-0 m-0">
            {sponsors.map((s) => (
              <li key={s.id}>
                <SponsorKaart s={s} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SponsorKaart({ s }: { s: Sponsor }) {
  const { t } = useTranslation();
  const inner = (
    <div className="flex h-full min-h-[76px] min-w-[132px] items-center justify-center gap-2 rounded-lg border border-border/70 bg-white px-5 py-3 shadow-sm transition-shadow hover:shadow-md">
      {s.logo_url ? (
        // Logo-maat: makkelijk aanpasbaar via de hoogte/breedte hieronder.
        <img src={s.logo_url} alt={s.naam} loading="lazy" className="h-14 w-auto max-w-[180px] object-contain" />
      ) : (
        <span className="text-center leading-tight">
          {s.label && <span className="block text-[9px] font-sans uppercase tracking-[0.16em] text-muted-foreground">{s.label}</span>}
          <span className="block font-display font-black uppercase tracking-tight text-foreground text-lg">{s.weergavenaam || s.naam}</span>
        </span>
      )}
    </div>
  );

  return s.link_url ? (
    <a
      href={s.link_url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      aria-label={t("shell.sponsors.visitAria", { name: s.naam })}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))] rounded-lg transition-transform hover:-translate-y-px motion-reduce:transform-none"
    >
      {inner}
    </a>
  ) : (
    inner
  );
}
