import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, Gift, Lock, Shirt, Medal } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { usePrizes, type Prize } from "@/hooks/usePrizes";

const GOLD = "hsl(var(--vintage-gold))";

// Sfeerachtergrond achter het podium (zelf geplaatst in public/img/).
const PODIUM_BG = "/img/prijzen-achtergrond.png";
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
  `linear-gradient(to bottom, transparent 62%, hsl(var(--background)) 100%)`;

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

  const podium1 = prizes.find((p) => p.soort === "podium_1");
  const podium2 = prizes.find((p) => p.soort === "podium_2");
  const podium3 = prizes.find((p) => p.soort === "podium_3");
  const ereplaatsen = prizes
    .filter((p) => p.soort === "ereplaats" && p.rang != null)
    .sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0));
  const dagprijzen = prizes.filter((p) => p.soort === "dagprijs");
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
                {/* Sfeerachtergrond (Champs-Élysées), bovenaan uitgelijnd, lazy. */}
                <img
                  src={PODIUM_BG}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
                />
                {/* Leesbaarheidslaag tussen achtergrond en kaarten. */}
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: podiumOverlay }} />
                {/* Inhoud bovenop */}
                <div className="relative z-10 p-4 md:p-6">
                  <h2
                    className="font-display text-2xl md:text-3xl font-bold mb-4 flex items-center gap-2 text-white"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)" }}
                  >
                    <Trophy className="h-7 w-7 md:h-8 md:w-8" style={{ color: GOLD, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))" }} /> Het podium
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

            {/* Ereplaatsen 4 t/m 10 — compact, ondergeschikt aan het podium */}
            {ereplaatsen.length > 0 && (
              <>
                {hasPodium && <div className="vintage-divider" aria-hidden />}
                <section>
                  <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                    <Medal className="h-5 w-5" style={{ color: GOLD }} /> Ereplaatsen
                  </h2>
                  <ul className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                    {ereplaatsen.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="font-display font-black tabular-nums text-base w-9 shrink-0 text-center" style={{ color: GOLD }}>
                          {p.rang}e
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-display font-bold text-sm leading-tight">{p.titel || "Prijs"}</span>
                          {p.omschrijving && <span className="text-sm text-muted-foreground font-serif"> — {p.omschrijving}</span>}
                        </div>
                        {(p.sponsor_logo_url || p.sponsor_naam) && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.sponsor_logo_url && <img src={p.sponsor_logo_url} alt={p.sponsor_naam ?? "sponsor"} className="h-5 w-auto max-w-[60px] object-contain" loading="lazy" />}
                            {p.sponsor_naam && <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{p.sponsor_naam}</span>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            {/* Gouden scheidingslijn */}
            {(hasPodium || ereplaatsen.length > 0) && dagprijzen.length > 0 && (
              <div className="vintage-divider" aria-hidden />
            )}

            {/* Dagprijzen */}
            {dagprijzen.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" /> Dagprijzen
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dagprijzen.map((p) => (
                    <Card key={p.id} className="ornate-frame retro-border">
                      <CardContent className="p-4 flex gap-3">
                        {p.afbeelding_url && (
                          <img src={p.afbeelding_url} alt={p.titel} className="h-20 w-24 object-cover rounded-md border border-border shrink-0" loading="lazy" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display font-bold leading-tight">{p.titel || "Dagprijs"}</h3>
                          {p.omschrijving && <p className="text-sm text-muted-foreground font-serif mt-0.5 leading-snug">{p.omschrijving}</p>}
                          <SponsorLine p={p} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
