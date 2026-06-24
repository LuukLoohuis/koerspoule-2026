import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Award, Gift, Lock } from "lucide-react";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { usePrizes, type Prize } from "@/hooks/usePrizes";

const GOLD = "hsl(var(--vintage-gold))";

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

function PodiumCard({ p, plek }: { p: Prize | undefined; plek: 1 | 2 | 3 }) {
  const isWinner = plek === 1;
  const Icon = isWinner ? Trophy : Award;
  const accent = isWinner ? GOLD : plek === 2 ? "#9ca3af" : "#c2702c";
  // Plek 1 in het midden + hoger; 2 links, 3 rechts (klassiek podium).
  const order = plek === 1 ? "order-2" : plek === 2 ? "order-1" : "order-3";
  const lift = isWinner ? "md:-mt-6" : "";
  return (
    <div className={`flex-1 min-w-0 ${order} ${lift}`}>
      <Card className={`ornate-frame retro-border h-full ${isWinner ? "border-2" : ""}`} style={isWinner ? { borderColor: accent } : undefined}>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <Icon className="h-7 w-7" style={{ color: accent }} strokeWidth={2} />
          </div>
          <div className="font-display font-black text-2xl tabular-nums" style={{ color: accent }}>{plek}e</div>
          {p ? (
            <>
              {p.afbeelding_url && (
                <img src={p.afbeelding_url} alt={p.titel} className="mt-2 w-full h-28 object-cover rounded-md border border-border" loading="lazy" />
              )}
              <h3 className="font-display font-bold text-base mt-2 leading-tight">{p.titel || (isWinner ? "Klassementstrui" : "Beker")}</h3>
              {p.omschrijving && <p className="text-sm text-muted-foreground font-serif mt-1 leading-snug">{p.omschrijving}</p>}
              <SponsorLine p={p} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic mt-2">Nog niet bekend</p>
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
  const dagprijzen = prizes.filter((p) => p.soort === "dagprijs");
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
            {/* Podium */}
            {(podium1 || podium2 || podium3) && (
              <section>
                <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: GOLD }} /> Het podium
                </h2>
                <div className="flex flex-col md:flex-row items-stretch gap-4 md:items-end">
                  <PodiumCard p={podium2} plek={2} />
                  <PodiumCard p={podium1} plek={1} />
                  <PodiumCard p={podium3} plek={3} />
                </div>
              </section>
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
