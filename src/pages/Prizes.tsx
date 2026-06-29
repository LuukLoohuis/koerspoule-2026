import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, Gift, Lock, Shirt, ExternalLink } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { usePrizes, type Prize } from "@/hooks/usePrizes";
import { cn } from "@/lib/utils";

const GOLD = "hsl(var(--vintage-gold))";

/**
 * Compacte, chique "Bezoek website"-knop (donker met gouden rand/tekst) die naar
 * de sponsor doorlinkt in een nieuw tabblad. Geen url → niets (geen layout-sprong:
 * de knop hoort onderaan bij de overige kaartinhoud). Identiek op mobiel + web.
 */
function SponsorButton({ p, className }: { p?: Prize; className?: string }) {
  if (!p?.sponsor_url) return null;
  const label = p.sponsor_naam ? `Bekijk ${p.sponsor_naam}` : "Bezoek website";
  return (
    <a
      href={p.sponsor_url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      aria-label={`Bezoek de website van ${p.sponsor_naam || "de sponsor"}`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 rounded-md border text-xs font-black uppercase tracking-wider",
        "bg-[#111] hover:bg-[#1d1710] text-[#f5b51b] hover:text-[#ffc94a] border-[#f5b51b]/60",
        "shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.22)] hover:-translate-y-px",
        "transition-[transform,background-color,box-shadow,color] duration-200 motion-reduce:transition-none motion-reduce:transform-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))] focus-visible:ring-offset-1",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </a>
  );
}

// Sfeerachtergrond achter het podium (zelf geplaatst in public/img/).
const PODIUM_BG = "/img/prijzen-achtergrond.png";
// Nieuwe achtergrond is al goed gecomponeerd (tafereel laag, lege lucht boven) →
// neutraal: cover, gecentreerd, geen zoom. Hier bijstellen indien nodig.
const BG_ZOOM = 1;
const BG_ZOOM_MOBILE = 1;
const BG_POSITION = "center center";
const BG_POSITION_MOBILE = "center center";
// Leesbaarheidslaag: crème/parchment-waas (#F5EDD8) over de achtergrond.
// Hoger = meer dimmen (beter contrast), lager = meer sfeer zichtbaar.
const OVERLAY_OPACITY = 0.4;
const CREME_RGB = "245, 237, 216"; // #F5EDD8

// Glas-effect podiumkaarten: crème-vulling op opacity + backdrop-blur, zodat de
// sfeerachtergrond zacht doorschijnt. Hoger = dekkender (beter leesbaar).
const GLASS = {
  empty: 0.5,   // lege/ereplekken (2e, 3e, "nog niet bekend") — luchtigst
  filled: 0.62, // gevulde niet-winnaar
  winner: 0.7,  // 1e-plaats — tekstzone iets dekkender
  photo: 0.92,  // zone rond de sponsorfoto — vrijwel dekkend, geen rommel
  blur: "6px",
};
const podiumOverlay =
  // Zachte vignette (iets meer waas aan de randen + midden) + onderrand-fade
  // naar de paginakleur zodat er geen harde naad ontstaat met de sectie eronder.
  `radial-gradient(125% 100% at 50% 30%, rgba(${CREME_RGB}, ${OVERLAY_OPACITY}) 0%, rgba(${CREME_RGB}, ${OVERLAY_OPACITY + 0.06}) 60%, rgba(${CREME_RGB}, ${OVERLAY_OPACITY + 0.18}) 100%), ` +
  `linear-gradient(to bottom, transparent 84%, hsl(var(--background) / 0.55) 100%)`;

function SponsorLine({ p }: { p: Prize }) {
  if (!p.sponsor_naam && !p.sponsor_logo_url) return null;
  return (
    <div className="flex items-center gap-2 mt-2">
      {p.sponsor_logo_url && (
        <img src={p.sponsor_logo_url} alt={p.sponsor_naam ?? "sponsor"} className="h-6 w-auto max-w-[88px] object-contain rounded-sm" loading="lazy" />
      )}
      {p.sponsor_naam && (
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          aangeboden door {p.sponsor_naam}
        </span>
      )}
    </div>
  );
}

// Verhouding tekstvak (links) vs foto (rechts) op desktop — makkelijk aanpasbaar.
const CARD_TEXT_W = "md:w-[42%]";
const CARD_PHOTO_W = "md:w-[58%]";

/**
 * Niet-podium-prijskaart: premium tekstvlak LINKS (crème-gradient, gouden top-rand,
 * ronde zwart/gouden badge rechtsboven, sterke titel + zwart/gouden knop), grotere
 * foto RECHTS (ongewijzigd). Mobiel onder elkaar (foto boven, tekst eronder).
 * Beide kanten even hoog (md:items-stretch). Tekst blijft datagedreven/aanpasbaar.
 */
function PrijsKaart({
  p,
  eyebrow,
  fallback,
  badge,
}: {
  p: Prize;
  eyebrow: string;
  fallback: string;
  badge?: { top: string; bottom: string };
}) {
  // Badge-tekst is admin-bewerkbaar; valt terug op de sectie-default.
  const badgeTop = p.badge_top ?? badge?.top;
  const badgeBottom = p.badge_bottom ?? badge?.bottom;
  const hasBadge = Boolean(badgeTop || badgeBottom);
  return (
    <article className="prijs-kaart overflow-hidden rounded-xl border border-foreground/15 bg-card shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col-reverse md:flex-row md:items-stretch">
        {/* Tekstvlak links — premium crème-paneel met gouden top-rand */}
        <div
          className={cn(
            "relative flex flex-col p-5 md:p-6 md:min-h-[200px] border-t-4 border-[#d99a00]",
            "bg-gradient-to-br from-[#fffaf0] to-[#f4efe4]",
            CARD_TEXT_W,
          )}
        >
          {/* Ronde zwart/gouden badge rechtsboven (groter) */}
          {hasBadge && (
            <div
              className="absolute top-4 right-4 flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full border-2 border-[#f5b51b] bg-[#111] text-center text-[#f5b51b] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
              aria-hidden
            >
              {badgeTop && <span className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] leading-tight">{badgeTop}</span>}
              {badgeBottom && <span className="mt-0.5 px-1 text-[18px] font-black uppercase leading-tight">{badgeBottom}</span>}
            </div>
          )}

          <div className="card-eyebrow text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b87800]">
            {eyebrow}
          </div>

          <h3 className={cn("mt-2 font-display font-black text-2xl leading-[1.15] text-[#1f1f28]", hasBadge ? "max-w-[66%]" : "max-w-[82%]")}>
            {p.titel || fallback}
          </h3>

          {p.prijs_label && (
            <div
              className="mt-1.5 font-display font-black leading-[0.95] tracking-[-0.04em] text-[#d99a00] text-[52px] md:text-[58px]"
              style={{ textShadow: "0 2px 0 rgba(255,255,255,0.5)" }}
            >
              {p.prijs_label}
            </div>
          )}

          {p.omschrijving && (
            <p className="mt-3 max-w-[90%] text-[15px] font-semibold leading-[1.5] text-[#626477]">{p.omschrijving}</p>
          )}

          {p.sponsor_naam && (
            <div className="mt-2 pt-4 border-t border-[rgba(145,115,55,0.25)]">
              <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#74758a]">Aangeboden door</span>
              <strong className="block text-sm font-extrabold uppercase tracking-[0.05em] text-[#22222c]">{p.sponsor_naam}</strong>
            </div>
          )}

          {p.sponsor_url && (
            <div className="mt-auto pt-4">
              <SponsorButton p={p} />
            </div>
          )}
        </div>

        {/* Foto rechts (desktop) / boven (mobiel) — ongewijzigd, object-cover */}
        {p.afbeelding_url && (
          <div className={cn("aspect-[3/2] md:aspect-auto overflow-hidden bg-secondary/30 shrink-0", CARD_PHOTO_W)}>
            <img src={p.afbeelding_url} alt={p.titel} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
      </div>
    </article>
  );
}

const PODIUM_CFG = {
  // lift = getrapte ondermarge; met items-end stijgt 1e het hoogst, dan 2e, dan 3e
  // → schone podium-trappen zonder losse balkjes die met de foto botsen.
  1: { accent: GOLD, Icon: Shirt, fallback: "Klassementstrui", lift: "md:mb-12", mdOrder: "md:order-2" },
  2: { accent: "#9aa3ad", Icon: Award, fallback: "Beker", lift: "md:mb-5", mdOrder: "md:order-1" },
  3: { accent: "#b87333", Icon: Award, fallback: "Beker", lift: "md:mb-0", mdOrder: "md:order-3" },
} as const;

function PodiumCard({ p, plek }: { p: Prize | undefined; plek: 1 | 2 | 3 }) {
  const isWinner = plek === 1;
  const { accent, Icon, fallback, lift, mdOrder } = PODIUM_CFG[plek];
  // Lege plekken het luchtigst; winnaar iets dekkender; gevuld ertussenin.
  const fill = !p ? GLASS.empty : isWinner ? GLASS.winner : GLASS.filled;
  return (
    // DOM-volgorde 1,2,3 (mobiel correct); op desktop herschikt md:order naar 2-1-3.
    // Kolommen lijnen onderaan uit; getrapte ondermarge geeft het podium-trapeffect.
    <div className={`flex-1 min-w-0 flex flex-col ${mdOrder} ${lift} ${isWinner ? "md:max-w-[44%]" : "md:max-w-[32%]"}`}>
      <Card
        className="ornate-frame rounded-xl overflow-hidden border transition-shadow"
        style={{
          backgroundColor: `rgba(${CREME_RGB}, ${fill})`,
          backdropFilter: `blur(${GLASS.blur})`,
          WebkitBackdropFilter: `blur(${GLASS.blur})`,
          borderColor: isWinner ? accent : `rgba(${CREME_RGB}, 0.9)`,
          borderWidth: isWinner ? 2 : 1,
          boxShadow: isWinner
            ? `0 10px 30px -10px ${accent}, 0 0 0 1px ${accent}33`
            : "0 6px 18px -12px rgba(0,0,0,0.4)",
        }}
      >
        {/* Rang-kop met accent */}
        <div className="flex items-center justify-center gap-2 pt-3 pb-1">
          <Icon className={isWinner ? "h-9 w-9" : "h-7 w-7"} style={{ color: accent }} strokeWidth={2} />
          <span className={`font-display font-black tabular-nums ${isWinner ? "text-4xl" : "text-2xl"}`} style={{ color: accent }}>
            {plek}e
          </span>
        </div>
        <CardContent className={`text-center ${isWinner ? "p-4 pt-1" : "p-3 pt-1"}`}>
          {p ? (
            <>
              {p.afbeelding_url && (
                <div
                  className={`w-full ${isWinner ? "aspect-[4/3]" : "aspect-[3/2]"} rounded-lg border border-border overflow-hidden mb-2`}
                  style={{ backgroundColor: `rgba(${CREME_RGB}, ${GLASS.photo})` }}
                >
                  <img src={p.afbeelding_url} alt={p.titel} className="w-full h-full object-contain" loading="lazy" />
                </div>
              )}
              <h3 className={`font-display font-bold leading-tight ${isWinner ? "text-lg" : "text-sm"}`}>{p.titel || fallback}</h3>
              {p.omschrijving && <p className="text-sm text-muted-foreground font-serif mt-1 leading-snug">{p.omschrijving}</p>}
              <div className="flex justify-center"><SponsorLine p={p} /></div>
              <SponsorButton p={p} className="w-full mt-3" />
            </>
          ) : (
            <div className="py-4 flex flex-col items-center gap-1.5 text-muted-foreground">
              <Icon className="h-6 w-6 opacity-40" style={{ color: accent }} />
              <p className="text-sm italic">Nog niet bekend</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Eyebrow/fallback/badge per prijssoort — zodat één gemengde lijst toch per
// kaart de juiste context toont (plek, dagprijs, subpoule).
function kaartProps(p: Prize): { eyebrow: string; fallback: string; badge: { top: string; bottom: string } } {
  if (p.soort === "ereplaats") {
    return { eyebrow: `${p.rang}e plek`, fallback: `${p.rang}e plek`, badge: { top: `${p.rang}e`, bottom: "Plek" } };
  }
  if (p.soort === "dagprijs") {
    return { eyebrow: "Dagprijs", fallback: "Dagprijs", badge: { top: "Vandaag", bottom: "Prijs" } };
  }
  return { eyebrow: "Grootste subpoule", fallback: "Grootste subpoule", badge: { top: "Win", bottom: "Samen" } };
}

function GeslotenKast() {
  return (
    <Card className="ornate-frame retro-border bg-card">
      <CardContent className="p-8 text-center space-y-3">
        <Lock className="h-10 w-10 text-muted-foreground/50 mx-auto" />
        <p className="font-display font-bold text-xl">Prijzenkast gesloten</p>
        <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
          De prijzen voor deze koers zijn nog niet onthuld. Kom snel terug — er valt wat te winnen.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Prizes() {
  const { data: game } = useCurrentGame();
  const { data: prizes = [], isLoading } = usePrizes(game?.prizes_visible ? game?.id : undefined);

  // Niet-podium-secties volgen het admin-veld "Volgorde" (sort_order), niet de
  // rang. Podium staat altijd los bovenaan (vaste plek 1/2/3). created_at als
  // tiebreaker bij gelijke volgorde.
  const bySort = (a: Prize, b: Prize) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at < b.created_at ? -1 : 1);

  const podium1 = prizes.find((p) => p.soort === "podium_1");
  const podium2 = prizes.find((p) => p.soort === "podium_2");
  const podium3 = prizes.find((p) => p.soort === "podium_3");
  // Alle niet-podium-prijzen (ereplaats, dagprijs, grootste subpoule) in ÉÉN
  // gezamenlijke lijst, globaal op Volgorde (sort_order) gesorteerd ongeacht soort.
  const overige = prizes
    .filter((p) =>
      p.soort === "ereplaats" ? p.rang != null : p.soort === "dagprijs" || p.soort === "grootste_subpoule",
    )
    .sort(bySort);
  const hasPodium = Boolean(podium1 || podium2 || podium3);
  const hasAny = prizes.length > 0;

  const open = Boolean(game?.prizes_visible) && hasAny;

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <Helmet><title>Prijzen — Koerspoule</title><meta name="robots" content="noindex" /></Helmet>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <div className="vintage-ornament mb-2">
            <span className="vintage-ornament-symbol">✦</span>
            <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">De Prijzenkast</span>
            <span className="vintage-ornament-symbol">✦</span>
          </div>
          <h1 className="vintage-heading text-3xl md:text-4xl font-bold">Prijzen{game?.name ? ` · ${game.name}` : ""}</h1>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse motion-reduce:animate-none">
            {[0, 1, 2].map((i) => <div key={i} className="h-48 rounded-xl bg-secondary/60" />)}
          </div>
        ) : !open ? (
          <GeslotenKast />
        ) : (
          <>
            {/* Podium — DOM 1,2,3 (mobiel onder elkaar); desktop herschikt naar 2-1-3 */}
            {(podium1 || podium2 || podium3) && (
              <section className="relative overflow-hidden rounded-xl" style={{ backgroundColor: `rgb(${CREME_RGB})` }}>
                {/* Sfeerachtergrond (Champs-Élysées). Inzoomen vanaf de bovenrand
                    duwt de Arc onder de kaart-bovenrand; mobiel iets minder zoom. */}
                <style>{`.podium-bg{object-position:${BG_POSITION_MOBILE};transform:scale(${BG_ZOOM_MOBILE});transform-origin:center center}@media(min-width:768px){.podium-bg{object-position:${BG_POSITION};transform:scale(${BG_ZOOM})}}`}</style>
                <img
                  src={PODIUM_BG}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="podium-bg absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                />
                {/* Leesbaarheidslaag tussen achtergrond en kaarten. */}
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: podiumOverlay }} />
                {/* Inhoud bovenop */}
                <div className="relative z-10 p-4 md:p-6">
                  <h2
                    className="font-display text-2xl md:text-3xl font-bold mb-4 flex items-center gap-2 text-white"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)" }}
                  >
                    <Trophy className="h-7 w-7 md:h-8 md:w-8" style={{ color: "#FFD400", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))" }} /> Het podium
                  </h2>
                  <div className="flex flex-col md:flex-row md:justify-center md:items-end gap-4 md:gap-3">
                    <PodiumCard p={podium1} plek={1} />
                    <PodiumCard p={podium2} plek={2} />
                    <PodiumCard p={podium3} plek={3} />
                  </div>
                  {/* Vloer onder het podium */}
                  <div className="hidden md:block h-1 rounded-full mt-3" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}66, transparent)` }} aria-hidden />
                </div>
              </section>
            )}

            {/* Overige prijzen — één gezamenlijke lijst, globaal op Volgorde */}
            {overige.length > 0 && (
              <>
                {hasPodium && <div className="vintage-divider" aria-hidden />}
                <section>
                  <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" /> Meer te winnen
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {overige.map((p) => {
                      const k = kaartProps(p);
                      return <PrijsKaart key={p.id} p={p} eyebrow={k.eyebrow} fallback={k.fallback} badge={k.badge} />;
                    })}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
