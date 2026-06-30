import { useVisibleSponsors, type Sponsor } from "@/hooks/useSponsors";

/**
 * Subtiele "mede mogelijk gemaakt door"-logo-strook onderaan landingspagina's.
 * Klein, rustig (grijswaarden → kleur op hover), ruime witruimte. Geen zichtbare
 * sponsoren → niets tonen (geen lege staat). Sponsors met link_url linken extern.
 */
export default function SponsorStrip() {
  const { data: sponsors = [] } = useVisibleSponsors();
  if (sponsors.length === 0) return null;

  return (
    <section className="text-center py-6" aria-label="Sponsoren">
      <p className="text-[11px] font-serif uppercase tracking-[0.22em] text-muted-foreground/80 mb-4">
        Mede mogelijk gemaakt door
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 list-none p-0 m-0">
        {sponsors.map((s) => (
          <li key={s.id}>
            <SponsorLogo s={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SponsorLogo({ s }: { s: Sponsor }) {
  if (!s.logo_url) {
    // Geen logo → nette tekstuele terugval (zelfde subtiele stijl).
    return s.link_url ? (
      <a
        href={s.link_url}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="text-sm font-semibold text-muted-foreground/80 hover:text-foreground transition-colors"
      >
        {s.naam}
      </a>
    ) : (
      <span className="text-sm font-semibold text-muted-foreground/70">{s.naam}</span>
    );
  }

  const img = (
    <img
      src={s.logo_url}
      alt={s.naam}
      loading="lazy"
      className="h-10 md:h-11 w-auto max-w-[140px] object-contain opacity-70 grayscale transition-[filter,opacity] duration-300 hover:opacity-100 hover:grayscale-0 motion-reduce:transition-none"
    />
  );

  return s.link_url ? (
    <a
      href={s.link_url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      aria-label={`Bezoek de website van ${s.naam}`}
      className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))] rounded"
    >
      {img}
    </a>
  ) : (
    img
  );
}
