import { Fragment, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, Gift, Lock, Shirt, Medal, ExternalLink } from "lucide-react";
import { useAllGames } from "@/hooks/useAllGames";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { usePrizes, type Prize } from "@/hooks/usePrizes";
import { cn } from "@/lib/utils";
import { logSponsorKlik, type KlikVeld } from "@/lib/sponsorKliks";

const GOLD = "hsl(var(--vintage-gold))";

/**
 * Compacte, chique "Bezoek website"-knop (donker met gouden rand/tekst) die naar
 * de sponsor doorlinkt in een nieuw tabblad. Geen url → niets (geen layout-sprong:
 * de knop hoort onderaan bij de overige kaartinhoud). Identiek op mobiel + web.
 */
function SponsorButton({ url, naam, prijsId, veld, kort, className }: { url?: string | null; naam?: string | null; prijsId?: string; veld?: KlikVeld; kort?: boolean; className?: string }) {
  if (!url) return null;
  // Op het podium past de volledige sponsornaam niet en werd hij afgekapt
  // ("Bekijk cyclinglifestyle…"). Daar dus een vast, kort label; de naam staat
  // toch al in de regel erboven. Bewust niet het woord "sponsor": dat zet de
  // aandacht op de adverteerder terwijl de prijs de hoofdrol hoort te spelen.
  const label = kort ? "Bekijk prijs" : naam ? `Bekijk ${naam}` : "Bezoek website";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      onClick={() => veld && logSponsorKlik("prijs", prijsId, veld, "prijzenpagina")}
      aria-label={`Bezoek de website van ${naam || "de sponsor"}`}
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

/** Eén of twee sponsorknoppen (2e sponsor optioneel). */
function SponsorButtons({ p, className, stack, kort }: { p: Prize; className?: string; stack?: boolean; kort?: boolean }) {
  if (!p.sponsor_url && !p.sponsor_url_2) return null;
  return (
    <div className={cn("flex gap-2", stack ? "flex-col" : "flex-col sm:flex-row sm:flex-wrap", className)}>
      <SponsorButton url={p.sponsor_url} naam={p.sponsor_naam} prijsId={p.id} veld="sponsor_url" kort={kort} />
      <SponsorButton url={p.sponsor_url_2} naam={p.sponsor_naam_2} prijsId={p.id} veld="sponsor_url_2" kort={kort} />
    </div>
  );
}

/** "Sponsor A & Sponsor B" — beide gevernamen samengevoegd. */
function sponsorNamen(p: Prize): string | null {
  return [p.sponsor_naam, p.sponsor_naam_2].map((s) => s?.trim()).filter(Boolean).join(" & ") || null;
}

// Sfeerachtergrond achter het podium (zelf geplaatst in public/img/).
const PODIUM_BG = "/img/prijzen-achtergrond.jpg";
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
  // Was 0.5/0.62/0.7. Mooi glaseffect, maar de omschrijving staat in gedempt
  // grijs en die las dwars door de Champs-Élysées heen slecht. Op 0.80 blijft
  // de foto voelbaar door de kaart zonder de tekst op te offeren; hij doet zijn
  // werk toch vooral in de randen eromheen.
  empty: 0.68,  // lege plekken mogen luchtiger: daar staat weinig tekst
  filled: 0.8,
  winner: 0.8,
  photo: 0.94,  // zone rond de sponsorfoto — vrijwel dekkend, geen rommel
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
      {sponsorNamen(p) && (
        // Vorige ronde te ver teruggedraaid: cursief grijs fluisterde te veel
        // voor een sponsorvermelding. Nu de display-letter, halfvet en in
        // inktkleur — opvallend zonder de kop van de prijs te overschreeuwen.
        <span className="font-display text-[11.5px] font-semibold tracking-tight text-foreground">
          aangeboden door {sponsorNamen(p)}
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
            <p className="mt-3 max-w-[90%] text-[15px] font-semibold leading-[1.5] text-[#626477] whitespace-pre-line">{p.omschrijving}</p>
          )}

          {sponsorNamen(p) && (
            <div className="mt-2 pt-4 border-t border-[rgba(145,115,55,0.25)]">
              <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#74758a]">Aangeboden door</span>
              <strong className="block text-sm font-extrabold uppercase tracking-[0.05em] text-[#22222c]">{sponsorNamen(p)}</strong>
            </div>
          )}

          {(p.sponsor_url || p.sponsor_url_2) && (
            <div className="mt-auto pt-4">
              <SponsorButtons p={p} />
            </div>
          )}
        </div>

        {/* Foto rechts (desktop) / boven (mobiel) — ongewijzigd, object-cover */}
        {p.afbeelding_url && (
          <div className={cn("aspect-[16/10] md:aspect-auto overflow-hidden bg-[#0d0d0d] shrink-0", CARD_PHOTO_W)}>
            <img src={p.afbeelding_url} alt={p.titel} className="w-full h-full object-contain" loading="lazy" />
          </div>
        )}
      </div>
    </article>
  );
}

const PODIUM_CFG = {
  // lift = bovenruimte, niet ondermarge. Met een ondermarge werd de kolom
  // korter dan zijn eigen inhoud terwijl de kaart meerekte, en knipte
  // overflow-hidden de sponsorknop onderaan eraf. Nu duwt de bovenruimte de
  // lagere plekken omlaag: dezelfde trap, maar niets valt weg.
  1: { accent: GOLD, Icon: Shirt, fallback: "Klassementstrui", lift: "md:pt-0", mdOrder: "md:order-2" },
  2: { accent: "#9aa3ad", Icon: Award, fallback: "Beker", lift: "md:pt-7", mdOrder: "md:order-1" },
  3: { accent: "#b87333", Icon: Award, fallback: "Beker", lift: "md:pt-12", mdOrder: "md:order-3" },
} as const;

function PodiumCard({ p, plek }: { p: Prize | undefined; plek: 1 | 2 | 3 }) {
  const isWinner = plek === 1;
  const { accent, Icon, fallback, lift, mdOrder } = PODIUM_CFG[plek];
  // Lege plekken het luchtigst; winnaar iets dekkender; gevuld ertussenin.
  const fill = !p ? GLASS.empty : isWinner ? GLASS.winner : GLASS.filled;
  return (
    // DOM-volgorde 1,2,3 (mobiel correct); op desktop herschikt md:order naar 2-1-3.
    // Kolommen zijn even hoog; de bovenruimte per plek geeft het trapeffect.
    <div className={`flex-1 min-w-0 flex flex-col ${mdOrder} ${lift} ${isWinner ? "md:max-w-[44%]" : "md:max-w-[32%]"}`}>
      <Card
        className="ornate-frame flex h-full flex-col rounded-xl overflow-hidden border transition-shadow"
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
        {/* Lint: plek links, waarde rechts. De waarde stond eerder als losse
            regel ín de omschrijving, waardoor de ene kaart drie tekstregels had
            en de andere één — en alles eronder mee zakte. */}
        <div
          className="flex items-center justify-between gap-2 border-b px-3 py-2"
          style={{ borderColor: `rgba(${CREME_RGB}, 0.9)` }}
        >
          <span className="flex items-center gap-1.5" style={{ color: accent }}>
            <Icon className={isWinner ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2} />
            <span className={`font-display font-black tabular-nums ${isWinner ? "text-xl" : "text-base"}`}>
              {plek}e
            </span>
          </span>
          {p?.prijs_label && (
            <span
              className="shrink-0 rounded-full border px-2 py-px font-mono text-[10px] font-bold"
              style={{ color: accent, borderColor: accent }}
            >
              {p.prijs_label}
            </span>
          )}
        </div>
        {/* Links uitgelijnd: een zin lees je vanaf een rechte kantlijn. Alles
            stond gecentreerd, wat bij twee regels aan béide kanten rafelt.
            flex-1 op de tekst duwt de knop naar de onderrand, zodat die per
            kolom op dezelfde hoogte staat. */}
        <CardContent className={`flex h-full flex-col text-left ${isWinner ? "p-3" : "p-3"}`}>
          {p ? (
            <>
              {p.afbeelding_url && (
                <div
                  className="w-full aspect-[16/10] rounded-lg border border-border overflow-hidden mb-2.5"
                  style={{ backgroundColor: `rgba(${CREME_RGB}, ${GLASS.photo})` }}
                >
                  {/* object-cover: contain liet witte balken naast de brede
                      sponsorbanners staan. De randen worden nu bijgesneden. */}
                  <img src={p.afbeelding_url} alt={p.titel} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <h3 className={`font-display font-bold leading-tight ${isWinner ? "text-base" : "text-sm"}`}>{p.titel || fallback}</h3>
              {p.omschrijving && (
                // Twee regels: één uitbundige sponsortekst mag de rij niet
                // scheeftrekken.
                <p className="mt-1 line-clamp-2 font-serif text-[13px] leading-snug text-foreground/70">
                  {p.omschrijving}
                </p>
              )}
              <div className="flex-1" />
              <SponsorLine p={p} />
              <SponsorButtons p={p} stack kort className="mt-2.5" />
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
  const { data: games = [], isLoading: gamesLoading } = useAllGames();
  const { selectedGame } = useSelectedGame();
  const [chosenPrizeGameId, setChosenPrizeGameId] = useState<string | null>(null);

  // De admin-vlag is hier de enige toegangspoort. Concept, inschrijving open,
  // live en afgerond mogen allemaal hun prijzen tonen zodra de vlag aanstaat.
  const visiblePrizeGames = games.filter((candidate) => candidate.prizes_visible);
  const chosenGame = chosenPrizeGameId
    ? visiblePrizeGames.find((candidate) => candidate.id === chosenPrizeGameId)
    : null;
  const selectedVisibleGame = selectedGame?.prizes_visible
    ? visiblePrizeGames.find((candidate) => candidate.id === selectedGame.id)
    : null;
  const upcomingVisibleGame = visiblePrizeGames.find(
    (candidate) => !["finished", "closed"].includes(String(candidate.status)),
  );
  const game = chosenGame ?? selectedVisibleGame ?? upcomingVisibleGame ?? visiblePrizeGames[0];
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

        {visiblePrizeGames.length > 1 && (
          <nav
            aria-label="Prijzen per koers"
            className="flex flex-wrap justify-center gap-2 rounded-xl border border-border bg-card/70 p-2"
          >
            {visiblePrizeGames.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setChosenPrizeGameId(candidate.id)}
                aria-pressed={candidate.id === game?.id}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-bold transition-colors",
                  candidate.id === game?.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/60 hover:bg-secondary",
                )}
              >
                {candidate.name}
              </button>
            ))}
          </nav>
        )}

        {gamesLoading || isLoading ? (
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
                  {/* items-stretch, niet items-end: dan zijn de kaarten even
                      hoog en lijnen titel, sponsorregel en knop per kolom uit.
                      De podiumtrap komt uit de ondermarge per plek (lift). */}
                  <div className="flex flex-col md:flex-row md:justify-center md:items-stretch gap-4 md:gap-3">
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
                    {(() => {
                      let ereKopGetoond = false;
                      return overige.map((p) => {
                        const k = kaartProps(p);
                        // "Ereplaatsen"-subkop één keer, vóór de eerste ereplaats-kaart.
                        const toonEreKop = p.soort === "ereplaats" && !ereKopGetoond;
                        if (toonEreKop) ereKopGetoond = true;
                        return (
                          <Fragment key={p.id}>
                            {toonEreKop && (
                              <h3 className="font-display text-lg font-bold flex items-center gap-2 mt-2">
                                <Medal className="h-5 w-5" style={{ color: GOLD }} /> Ereplaatsen
                              </h3>
                            )}
                            <PrijsKaart p={p} eyebrow={k.eyebrow} fallback={k.fallback} badge={k.badge} />
                          </Fragment>
                        );
                      });
                    })()}
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
