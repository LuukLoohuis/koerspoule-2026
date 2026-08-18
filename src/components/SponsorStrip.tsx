import { useTranslation } from "react-i18next";
import { useVisibleSponsors, type Sponsor } from "@/hooks/useSponsors";
import { logSponsorKlik } from "@/lib/sponsorKliks";

/**
 * <SponsorStrip> — het reclamebord langs de finishstraat, boven de footer.
 *
 * Eén doorlopend paneel met inktrand, harde slagschaduw en de gouden
 * leiderstruistreep erboven: dezelfde taal als het startbord in de
 * hoofdnavigatie. Hiervoor stonden hier losse kaartjes met een zachte schaduw
 * en een systeemletter — dat las als de footer van een willekeurige site.
 *
 * Twee dingen die de opmaak echt oplosten:
 *
 * 1. Elk logo krijgt een vast kader in plaats van een vaste hoogte. Bij 56px
 *    hoogte werden deze vier logo's 160, 292, 205 en 83px breed: een spreiding
 *    van 3,5x, waardoor het ene een balk werd en het andere een postzegel.
 * 2. Kleuren uit themavariabelen. De kaartjes stonden op `bg-white`, dus bij
 *    Meermarathon bleven ze wit terwijl de rest van de site ijsblauw werd.
 *
 * Logo's staan op het papier zelf, zonder vlak eronder. Dat vraagt wel om
 * transparante PNG's met donkere inkt; een licht logo valt weg op perkament.
 */
export default function SponsorStrip() {
  const { t } = useTranslation();
  const { data: sponsors = [] } = useVisibleSponsors();
  if (sponsors.length === 0) return null;

  return (
    <section className="border-t border-border/60 bg-card/40" aria-label={t("shell.sponsors.sectionAria")}>
      <div className="container mx-auto px-5 py-7">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-[4px_4px_0_hsl(var(--foreground))]">
          {/* Leiderstruistreep — zelfde markering als op het startbord. */}
          <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />

          <div className="flex flex-col sm:flex-row">
            {/* Gestempeld tabje: hoort bij het bord, niet ernaast. */}
            <div className="flex shrink-0 flex-col justify-center gap-0.5 border-b-2 border-foreground bg-foreground/[0.04] px-4 py-3 sm:border-b-0 sm:border-r-2 sm:px-5">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("shell.sponsors.madePossible")}
              </span>
              <h2 className="font-display text-base font-black leading-tight sm:text-lg">
                {t("shell.sponsors.heading")}
              </h2>
            </div>

            {/* Bij veel sponsoren schuift de rij, in plaats van naar een tweede
                regel te vallen en het bord scheef te trekken. */}
            <ul className="m-0 flex list-none overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sponsors.map((s) => (
                <li key={s.id} className="flex-1 shrink-0 border-r border-border/70 last:border-r-0">
                  <SponsorCel s={s} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function SponsorCel({ s }: { s: Sponsor }) {
  const { t } = useTranslation();

  const inhoud = s.logo_url ? (
    // Het kader is vast, het logo past erbinnen op hoogte én breedte.
    //
    // De hoogte is ruimer dan de breedte toelaat, en dat is met opzet: een
    // breed woordmerk loopt toch tegen de breedte aan en verandert hier niet
    // van, terwijl een compact schildje anders optisch veel kleiner uitvalt
    // dan de rest. Zo wegen ze even zwaar zonder per sponsor te hoeven
    // sleutelen.
    <img
      src={s.logo_url}
      alt={s.naam}
      loading="lazy"
      className="max-h-[54px] w-auto max-w-[132px] object-contain"
    />
  ) : (
    <span className="text-center leading-tight">
      {s.label && (
        <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
          {s.label}
        </span>
      )}
      <span className="block font-display text-base font-black uppercase tracking-tight">
        {s.weergavenaam || s.naam}
      </span>
    </span>
  );

  // 54px logo + 2x 12px lucht = 78; de 84 houdt ook de tekstvariant ruim.
  const cel = "flex h-full min-h-[84px] min-w-[152px] items-center justify-center px-5 py-3";

  return s.link_url ? (
    <a
      href={s.link_url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      onClick={() => logSponsorKlik("sponsor", s.id, "link_url", "voorpagina")}
      aria-label={t("shell.sponsors.visitAria", { name: s.naam })}
      className={`${cel} transition-colors hover:bg-foreground/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--vintage-gold))]`}
    >
      {inhoud}
    </a>
  ) : (
    <div className={cel}>{inhoud}</div>
  );
}
