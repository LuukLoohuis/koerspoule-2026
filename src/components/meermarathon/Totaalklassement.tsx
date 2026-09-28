/**
 * Totaalklassement van de Meermarathon: per speler de punten bij de vrouwen
 * en de mannen opgeteld. Staat op Uitslagen onder de knop Totaal van de
 * pelotonbalk. Links het klassement, rechts (mobiel bovenaan) jouw totaal en
 * hoe het telt.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Plus, Trophy } from "lucide-react";
import Podium from "@/components/Podium";
import { PouleLeiderTeken, StandingsList } from "@/components/ResultsView";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { useAuth } from "@/hooks/useAuth";
import { useMeermarathonTotaal, type TotaalPeloton } from "@/hooks/useMeermarathonTotaal";
import { meermarathonCategorieLabel, meermarathonSeason, type MeermarathonCategorie } from "@/lib/gameTypes";
import { rangtekst } from "@/lib/meermarathonSeizoen";
import type { PelotonDeel, TotaalRij } from "@/lib/meermarathonTotaal";
import { cn } from "@/lib/utils";

const AANTAL = new Intl.NumberFormat("nl-NL");

/** "Bijgewerkt t/m Cup 3", of per peloton als ze niet even ver zijn. */
function StandChip({ pelotons }: { pelotons: TotaalPeloton[] }) {
  const base = "inline-flex items-center gap-2 px-3 py-1.5 retro-border bg-card text-xs font-sans";
  const standen = pelotons.filter((p) => p.stand != null);
  if (standen.length === 0) {
    return (
      <div className={cn(base, "text-muted-foreground")}>
        <Clock className="w-3.5 h-3.5" />
        <span>Nog geen uitslagen bijgewerkt.</span>
      </div>
    );
  }
  const gelijk = standen.length === pelotons.length && standen.every((p) => p.stand === standen[0].stand);
  return (
    <div className={base}>
      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
      {gelijk ? (
        <span>
          Bijgewerkt t/m <strong>{standen[0].stand}</strong>
        </span>
      ) : (
        <span>
          {standen.map((p, i) => (
            <span key={p.categorie}>
              {i > 0 && " · "}
              {i === 0 ? meermarathonCategorieLabel(p.categorie) : meermarathonCategorieLabel(p.categorie)?.toLowerCase()} t/m{" "}
              <strong>{p.stand}</strong>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** Kleine kolom per peloton in een regel van het klassement: "V 211". */
function PelotonPunten({ categorie, deel }: { categorie: MeermarathonCategorie; deel: PelotonDeel | null }) {
  const label = meermarathonCategorieLabel(categorie) ?? categorie;
  return (
    <div className="w-9 shrink-0 text-right leading-none">
      <div aria-hidden className="mm-gametekst text-[9px] font-bold uppercase tracking-wider" data-categorie={categorie}>
        {label.charAt(0)}
      </div>
      <div className={cn("mt-0.5 text-xs tabular-nums", deel ? "text-foreground/80" : "text-muted-foreground/50")}>
        <span aria-hidden>{deel ? deel.punten : "—"}</span>
        <span className="sr-only">
          {label}: {deel ? `${deel.punten} punten` : "doet niet mee"}
        </span>
      </div>
    </div>
  );
}

function JouwTotaal({
  mij,
  pelotons,
  aantal,
  aantalPerPeloton,
}: {
  mij: TotaalRij | null;
  pelotons: TotaalPeloton[];
  aantal: number;
  aantalPerPeloton: Record<MeermarathonCategorie, number>;
}) {
  return (
    <div className="retro-border bg-card">
      <div className="h-1" style={{ background: "linear-gradient(90deg, var(--mm-v), var(--mm-m))" }} />
      <div className="p-4 border-b-2 border-foreground bg-secondary">
        <h2 className="heading-oswald text-xl flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[var(--mm-s-totaal)]" />
          Jouw totaal
        </h2>
      </div>
      <dl className="divide-y divide-border/60">
        {pelotons.map((p) => {
          const deel = mij?.[p.categorie] ?? null;
          const label = meermarathonCategorieLabel(p.categorie);
          return (
            <div key={p.categorie} className="flex items-center gap-3 px-4 py-3">
              <dt className="min-w-0 flex-1">
                <span className="mm-gametekst font-display font-bold" data-categorie={p.categorie}>
                  {label}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {deel
                    ? `${rangtekst(deel.rank)} van ${AANTAL.format(aantalPerPeloton[p.categorie])}`
                    : "Je doet hier niet mee"}
                </span>
              </dt>
              <dd className="shrink-0 text-right">
                {deel ? (
                  <>
                    <span className="font-display text-lg font-bold tabular-nums">{deel.punten}</span>
                    <span className="ml-0.5 font-mono text-[9px] text-muted-foreground">pt</span>
                  </>
                ) : p.inschrijfbaar ? (
                  <Link
                    to={`/team-samenstellen?game=${p.gameId}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <Plus aria-hidden className="size-3.5" strokeWidth={2.5} />
                    Doe ook mee
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          );
        })}
        <div className="flex items-center gap-3 bg-secondary/50 px-4 py-3">
          <dt className="min-w-0 flex-1">
            <span className="font-display font-bold">Totaal</span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {mij ? `${rangtekst(mij.rank)} van ${AANTAL.format(aantal)}` : "Je hebt nog geen ploeg"}
            </span>
          </dt>
          <dd className="shrink-0 text-right">
            <span className="font-display text-2xl font-bold tabular-nums">{mij?.totaal ?? "—"}</span>
            {mij && <span className="ml-0.5 font-mono text-[9px] text-muted-foreground">pt</span>}
          </dd>
        </div>
      </dl>
      <p className="border-t border-border/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Zo telt het:</strong> je punten bij de vrouwen plus je punten bij de mannen.
        Doe je in één peloton mee, dan telt alleen dat peloton.
      </p>
    </div>
  );
}

export function TotaalklassementWeergave({
  seizoen,
  rijen,
  pelotons,
  mijnUserId,
  isLoading = false,
}: {
  /** "2026-2027" */
  seizoen: string;
  rijen: TotaalRij[];
  pelotons: TotaalPeloton[];
  mijnUserId: string | null;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const mij = mijnUserId ? rijen.find((r) => r.user_id === mijnUserId) ?? null : null;
  const aantalPerPeloton = {
    vrouwen: rijen.filter((r) => r.vrouwen).length,
    mannen: rijen.filter((r) => r.mannen).length,
  };

  return (
    <div>
      <div className="relative mb-5 md:mb-6">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="overline-stamp">— Bulletin Officiel —</span>
          <h1 className="heading-oswald text-4xl md:text-5xl">{t("results.view.headerTitle")}</h1>
          <p className="text-muted-foreground font-serif italic">Meermarathon {seizoen} · vrouwen en mannen opgeteld</p>
          <div className="mt-2 flex justify-center">
            <StandChip pelotons={pelotons} />
          </div>
        </div>
        <div className="double-rule mt-3 mx-auto max-w-md" />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="retro-border bg-card">
          <div className="h-1" style={{ background: "linear-gradient(90deg, var(--mm-v), hsl(var(--vintage-gold)), var(--mm-m))" }} />
          <div className="sticky top-0 z-20 p-4 border-b-2 border-foreground bg-secondary backdrop-blur-xs flex items-center justify-between gap-3">
            <h2 className="heading-oswald text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
              Totaalklassement
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">
              {t("results.view.participantCount", { count: rijen.length })}
            </span>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-secondary/70" />
              ))}
            </div>
          ) : rijen.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nog geen stand. Na de eerste verwerkte wedstrijd staat hier het totaal van vrouwen en mannen.
            </p>
          ) : (
            <>
              <Podium
                entries={rijen.slice(0, 3).map((r) => ({
                  rank: r.rank,
                  name: r.naam ?? "—",
                  points: r.totaal,
                  isMe: r.user_id === mijnUserId,
                }))}
              />
              <StandingsList
                maxHeightClass="max-h-[600px]"
                placeholder={t("results.view.searchPlaceholder")}
                items={rijen.map((r) => {
                  const isMe = r.user_id === mijnUserId;
                  return {
                    key: r.user_id,
                    rank: r.rank,
                    isMe,
                    searchText: r.naam ?? "",
                    node: (
                      <div
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 border-b border-border/40",
                          r.rank === 1
                            ? "border-l-[3px] border-l-amber-400/70 bg-amber-500/4"
                            : r.rank === 2
                              ? "border-l-[3px] border-l-zinc-400/50 bg-zinc-500/3"
                              : r.rank === 3
                                ? "border-l-[3px] border-l-orange-400/50 bg-orange-500/3"
                                : "border-l-[3px] border-l-transparent",
                          isMe && "bg-primary/8 ring-1 ring-inset ring-primary/30",
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0 font-oswald font-bold tabular-nums leading-none text-center",
                            r.rank <= 3 ? "text-2xl w-9" : "text-sm w-7",
                            r.rank === 1
                              ? "text-amber-400"
                              : r.rank === 2
                                ? "text-zinc-400"
                                : r.rank === 3
                                  ? "text-orange-400"
                                  : "text-muted-foreground/40",
                          )}
                        >
                          {r.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {r.rank === 1 && <PouleLeiderTeken meermarathon />}
                            <span
                              className={cn(
                                "font-sans text-sm truncate",
                                isMe ? "font-bold text-primary" : r.rank <= 3 ? "font-semibold" : "font-medium",
                              )}
                            >
                              {r.naam ?? "—"}
                            </span>
                            {isMe && (
                              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">
                                {t("results.view.youBadge")}
                              </span>
                            )}
                          </div>
                        </div>
                        <PelotonPunten categorie="vrouwen" deel={r.vrouwen} />
                        <PelotonPunten categorie="mannen" deel={r.mannen} />
                        <div className="shrink-0 text-right min-w-12">
                          <span className={cn("font-display font-bold tabular-nums", r.rank === 1 ? "text-xl text-amber-500" : "text-base")}>
                            {r.totaal}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono ml-0.5">{t("results.view.ptUnit")}</span>
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            </>
          )}
        </div>

        {/* Mobiel eerst: je eigen stand, dan de lijst. */}
        <div className="order-first lg:order-none">
          <JouwTotaal mij={mij} pelotons={pelotons} aantal={rijen.length} aantalPerPeloton={aantalPerPeloton} />
        </div>
      </div>
    </div>
  );
}

/** Het totaalklassement met data, voor de pagina Uitslagen. */
export default function MeermarathonTotaalklassement() {
  const { user } = useAuth();
  const { selectedGame } = useSelectedGame();
  const { rijen, pelotons, isLoading } = useMeermarathonTotaal();
  return (
    <KoersThemaProvider themaKey="winter">
      <TotaalklassementWeergave
        seizoen={selectedGame ? meermarathonSeason(selectedGame.year) : ""}
        rijen={rijen}
        pelotons={pelotons}
        mijnUserId={user?.id ?? null}
        isLoading={isLoading}
      />
    </KoersThemaProvider>
  );
}
