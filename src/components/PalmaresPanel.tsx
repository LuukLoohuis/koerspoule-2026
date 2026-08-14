import {
  Bike,
  ChevronDown,
  Crown,
  Medal,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import FlagIcon from "@/components/FlagIcon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePalmares,
  type PalmaresGame,
  type PalmaresSubpoule,
  type StageDagzege,
} from "@/hooks/usePalmares";
import { cn } from "@/lib/utils";

const LIVE_STATUSES = new Set(["active", "live", "open", "open_inschrijving", "locked"]);

function gameTypeToCountry(type: string | null): "IT" | "FR" | "ES" {
  const key = (type ?? "").toLowerCase();
  if (key === "tour" || key === "tdf" || key === "femmes") return "FR";
  if (key === "vuelta" || key === "vta") return "ES";
  return "IT";
}

function isLiveGame(game: PalmaresGame) {
  return LIVE_STATUSES.has(game.status);
}

function getBestGame(games: PalmaresGame[]) {
  const validGames = games.filter((game) => game.my_rank > 0 && game.total_participants > 0);
  const completedGames = validGames.filter((game) => !isLiveGame(game));
  const candidates = completedGames.length > 0 ? completedGames : validGames;

  return [...candidates].sort(
    (a, b) => a.my_rank - b.my_rank || b.total_participants - a.total_participants,
  )[0];
}

function groupGamesByYear(games: PalmaresGame[]) {
  const grouped = new Map<number | null, PalmaresGame[]>();
  for (const game of games) {
    const year = game.year ?? null;
    grouped.set(year, [...(grouped.get(year) ?? []), game]);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => (b ?? -1) - (a ?? -1))
    .map(([year, yearGames]) => ({
      year,
      games: [...yearGames].sort(
        (a, b) => Number(isLiveGame(b)) - Number(isLiveGame(a)) || a.game_name.localeCompare(b.game_name),
      ),
    }));
}

function rankTone(rank: number) {
  if (rank === 1) return "border-[var(--medal-gold)] bg-[#f2c955] text-[var(--ink-sepia)]";
  if (rank === 2) return "border-[var(--medal-silver)] bg-[#d8d6d0] text-[var(--ink-sepia)]";
  if (rank === 3) return "border-[var(--medal-bronze)] bg-[#ca8a4b] text-white";
  return "border-[#6b5640]/30 bg-[var(--paper-deep)] text-[var(--ink-sepia)]";
}

function AchievementStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-[#6b5640]/20 bg-[#fffdf7]/85 px-2 py-4 text-center shadow-sm md:min-h-36">
      <span className="mb-2 text-[var(--vintage-yellow)]">{icon}</span>
      <strong className="font-oswald text-3xl font-black leading-none text-[var(--ink-sepia)] md:text-4xl">
        {value}
      </strong>
      <span className="mt-2 text-xs font-medium leading-tight text-[var(--ink-faded)] md:text-sm">
        {label}
      </span>
    </div>
  );
}

function StageWinRow({ win }: { win: StageDagzege }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e8b923]/25 bg-[#e8b923]/10 px-3 py-2.5">
      <Trophy className="h-4 w-4 shrink-0 text-[#b97b17]" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="font-oswald text-sm font-bold text-[var(--ink-sepia)]">
          {t("common.palmares.stageLabel", { n: win.stage_number })}
        </span>
        {win.stage_name && (
          <span className="ml-1.5 text-xs text-[var(--ink-faded)]">· {win.stage_name}</span>
        )}
      </div>
      <span className="shrink-0 font-oswald text-sm font-bold text-[#b97b17]">
        {t("common.palmares.pt", { n: win.points })}
      </span>
    </div>
  );
}

function GameCard({ game, defaultOpen }: { game: PalmaresGame; defaultOpen: boolean }) {
  const { t, i18n } = useTranslation();
  const isLive = isLiveGame(game);
  const isTopThree = game.my_rank > 0 && game.my_rank <= 3;

  return (
    <Collapsible defaultOpen={defaultOpen} className="group">
      <div className="overflow-hidden rounded-2xl border border-[#6b5640]/25 bg-[#fffdf7] shadow-[0_6px_18px_rgba(58,42,26,0.08)]">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="grid w-full grid-cols-[42px_minmax(0,1fr)_auto_20px] items-center gap-3 px-3 py-4 text-left transition-colors hover:bg-[#ede3cc]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--vintage-yellow)] md:grid-cols-[48px_minmax(0,1fr)_auto_24px] md:px-5 md:py-5"
          >
            <FlagIcon
              country={gameTypeToCountry(game.game_type)}
              className="h-7 w-10 rounded-md border border-black/10 object-cover shadow-sm md:h-8 md:w-12"
            />

            <span className="min-w-0">
              <span className="block truncate font-oswald text-base font-black uppercase text-[var(--ink-sepia)] md:text-lg">
                {game.game_name}
              </span>
              <span
                className={cn(
                  "mt-1 block truncate text-xs text-[var(--ink-faded)] md:text-sm",
                  isLive && "font-bold text-[var(--vintage-green)]",
                )}
              >
                {isLive ? "● " : ""}
                {isLive
                  ? t("common.palmares.provisional")
                  : t("common.palmares.finalStanding")}
                {game.stages_count > 0
                  ? ` · ${t("common.palmares.stages", { count: game.stages_count })}`
                  : ""}
              </span>
            </span>

            <span className="flex items-center gap-2 text-right">
              {isTopThree && <Medal className="hidden h-5 w-5 text-[#b97b17] sm:block" aria-hidden />}
              <span>
                <strong
                  className={cn(
                    "block font-oswald text-xl font-black leading-none text-[var(--ink-sepia)] md:text-2xl",
                    isTopThree && "text-[#b97b17]",
                  )}
                >
                  #{game.my_rank || "—"}
                </strong>
                <span className="mt-1 block text-[11px] text-[var(--ink-faded)]">
                  {t("common.palmares.of", { total: game.total_participants })}
                </span>
              </span>
            </span>

            <ChevronDown
              className="h-5 w-5 text-[var(--ink-faded)] transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-[#6b5640]/15 px-3 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="rounded-xl bg-[#ede3cc]/70 px-2 py-3 md:px-4">
                <strong className="font-oswald text-xl font-black text-[#b97b17] md:text-2xl">
                  {game.stage_wins}
                </strong>
                <span className="mt-1 block text-[11px] leading-tight text-[var(--ink-faded)] md:text-xs">
                  {t("common.palmares.stageWins")}
                </span>
              </div>
              <div className="rounded-xl bg-[#ede3cc]/70 px-2 py-3 md:px-4">
                <strong className="font-oswald text-xl font-black text-[var(--ink-sepia)] md:text-2xl">
                  {game.stage_podiums}
                </strong>
                <span className="mt-1 block text-[11px] leading-tight text-[var(--ink-faded)] md:text-xs">
                  {t("common.palmares.stagePodiums")}
                </span>
              </div>
              <div className="rounded-xl bg-[#ede3cc]/70 px-2 py-3 md:px-4">
                <strong className="font-oswald text-xl font-black text-[var(--ink-sepia)] md:text-2xl">
                  {game.approved_points.toLocaleString(i18n.language)}
                </strong>
                <span className="mt-1 block text-[11px] leading-tight text-[var(--ink-faded)] md:text-xs">
                  {t("common.palmares.points")}
                </span>
              </div>
            </div>

            {game.dagzeges.length > 0 && (
              <div className="mt-3 space-y-2">
                {game.dagzeges.map((win) => (
                  <StageWinRow key={win.stage_id} win={win} />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SubpouleCard({ subpoule }: { subpoule: PalmaresSubpoule }) {
  const { t } = useTranslation();
  const topThree = subpoule.my_rank > 0 && subpoule.my_rank <= 3;

  return (
    <article className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#6b5640]/25 bg-[#fffdf7] p-4 shadow-[0_6px_18px_rgba(58,42,26,0.08)]">
      <div
        className={cn(
          "vintage-medal flex h-12 w-12 items-center justify-center rounded-full border-2 font-oswald text-lg font-black",
          rankTone(subpoule.my_rank),
        )}
      >
        #{subpoule.my_rank || "—"}
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-oswald text-base font-black uppercase text-[var(--ink-sepia)]">
          {subpoule.subpoule_name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--ink-faded)]">
          <FlagIcon
            country={gameTypeToCountry(subpoule.game_type)}
            className="h-3 w-4 rounded-sm object-cover"
          />
          <span className="truncate">{subpoule.game_name}</span>
        </p>
        <p className="mt-2 text-[11px] text-[var(--ink-faded)]">
          {subpoule.stage_wins} {t("common.palmares.stageWins").toLowerCase()} · {subpoule.stage_podiums}{" "}
          {t("common.palmares.stagePodiums").toLowerCase()}
        </p>
      </div>
      <div className="text-right">
        {topThree && <Medal className="mb-1 ml-auto h-4 w-4 text-[#b97b17]" aria-hidden />}
        <strong className={cn("font-oswald text-xl font-black", topThree ? "text-[#b97b17]" : "text-[var(--ink-sepia)]")}>
          #{subpoule.my_rank || "—"}
        </strong>
        <span className="block text-[11px] text-[var(--ink-faded)]">
          {t("common.palmares.of", { total: subpoule.total_members })}
        </span>
      </div>
    </article>
  );
}

function PalmaresSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-72 animate-pulse rounded-3xl bg-secondary/50" />
      <div className="h-40 animate-pulse rounded-2xl bg-secondary/50" />
    </div>
  );
}

export default function PalmaresPanel() {
  const { t } = useTranslation();
  const { data, isLoading } = usePalmares();
  const games = data?.games ?? [];
  const subpoules = data?.subpoules ?? [];

  const totalStageWins = games.reduce((sum, game) => sum + game.stage_wins, 0);
  const totalStagePodiums = games.reduce((sum, game) => sum + game.stage_podiums, 0);
  const subpouleWins = subpoules.filter((subpoule) => subpoule.is_winner).length;
  const bestGame = getBestGame(games);
  const seasons = groupGamesByYear(games);

  const sharePalmares = async () => {
    const title = t("common.palmares.shareTitle");
    const text = t("common.palmares.shareText", {
      rank: bestGame?.my_rank ?? "—",
      total: bestGame?.total_participants ?? 0,
      game: bestGame?.game_name ?? t("common.palmares.hero"),
      wins: totalStageWins,
    });

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast.success(t("common.palmares.shareCopied"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("common.palmares.shareFailed"));
    }
  };

  if (isLoading) return <PalmaresSkeleton />;

  if (games.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
        <Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
        <p className="mb-1 font-display font-bold text-muted-foreground">
          {t("common.palmares.empty")}
        </p>
        <p className="font-serif text-sm italic text-muted-foreground/70">
          {t("common.palmares.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <section className="vintage-paper relative overflow-hidden rounded-3xl border border-[#6b5640]/20 p-3 text-[var(--ink-sepia)] shadow-[0_14px_38px_rgba(58,42,26,0.12)] sm:p-5 md:p-7">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[28px] border-[#e8b923]/10"
        aria-hidden
      />

      <div className="relative">
        <header className="overflow-hidden rounded-[1.75rem] border border-[#e8b923]/60 bg-[#fffaf0]/80 p-5 shadow-[0_8px_24px_rgba(58,42,26,0.08)] sm:p-7 md:p-9">
          <div className="flex items-center gap-3 font-oswald text-[11px] font-bold uppercase tracking-[0.24em] text-[#b97b17] md:text-xs">
            <span className="h-px w-8 bg-current" aria-hidden />
            {t("common.palmares.personalHonours")}
            <span className="h-px w-8 bg-current" aria-hidden />
          </div>
          <h2 className="mt-3 font-oswald text-4xl font-black uppercase leading-none tracking-tight text-[var(--ink-sepia)] sm:text-5xl md:text-6xl">
            {t("common.palmares.hero")}
          </h2>
          <p className="mt-2 font-serif text-sm italic text-[var(--ink-faded)] sm:text-base">
            {t("common.palmares.heroSub")}
          </p>

          <div className="mt-7 grid gap-3 lg:grid-cols-[1.15fr_1.85fr]">
            <article className="grid min-h-36 grid-cols-[74px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-[#e8b923]/65 bg-[#e8b923]/10 p-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:p-5">
              <div
                className={cn(
                  "vintage-medal flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 font-oswald text-3xl font-black sm:h-[88px] sm:w-[88px] sm:text-4xl",
                  rankTone(bestGame?.my_rank ?? 0),
                )}
              >
                #{bestGame?.my_rank || "—"}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b97b17]">
                  {t("common.palmares.bestPerformance")}
                </p>
                <h3 className="mt-2 font-oswald text-xl font-black uppercase leading-tight text-[var(--ink-sepia)] sm:text-2xl">
                  {bestGame?.game_name ?? "—"}
                </h3>
                <p className="mt-2 text-xs text-[var(--ink-faded)] sm:text-sm">
                  {bestGame
                    ? t("common.palmares.rankOf", { rank: bestGame.my_rank, total: bestGame.total_participants })
                    : "—"}
                </p>
              </div>
            </article>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <AchievementStat
                icon={<Trophy className="h-5 w-5" aria-hidden />}
                value={totalStageWins}
                label={t("common.palmares.stageWins")}
              />
              <AchievementStat
                icon={<Medal className="h-5 w-5" aria-hidden />}
                value={totalStagePodiums}
                label={t("common.palmares.stagePodiums")}
              />
              <AchievementStat
                icon={<Crown className="h-5 w-5" aria-hidden />}
                value={subpouleWins}
                label={t("common.palmares.subpouleWins")}
              />
              <AchievementStat
                icon={<Bike className="h-5 w-5" aria-hidden />}
                value={games.length}
                label={t("common.palmares.racesPlayed")}
              />
            </div>
          </div>
        </header>

        <Tabs defaultValue="races" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <TabsList className="h-auto rounded-full border border-[#6b5640]/20 bg-[#fffdf7]/65 p-1">
              <TabsTrigger
                value="races"
                className="rounded-full px-4 py-2 font-sans text-sm font-bold text-[var(--ink-faded)] data-[state=active]:bg-[#fffdf7] data-[state=active]:text-[var(--ink-sepia)]"
              >
                {t("common.palmares.racesTab")}
              </TabsTrigger>
              <TabsTrigger
                value="subpoules"
                className="rounded-full px-4 py-2 font-sans text-sm font-bold text-[var(--ink-faded)] data-[state=active]:bg-[#fffdf7] data-[state=active]:text-[var(--ink-sepia)]"
              >
                {t("common.palmares.subpoules")}
              </TabsTrigger>
            </TabsList>

            <button
              type="button"
              onClick={sharePalmares}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#6b5640]/25 bg-[#fffdf7]/80 px-3 font-sans text-sm font-bold text-[var(--ink-sepia)] shadow-sm transition-colors hover:bg-[#fffdf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vintage-yellow)] sm:px-4"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("common.palmares.share")}</span>
              <span className="sr-only sm:hidden">{t("common.palmares.share")}</span>
            </button>
          </div>

          <TabsContent value="races" className="mt-5 space-y-6">
            {seasons.map(({ year, games: seasonGames }) => (
              <section key={year ?? "past"}>
                <div className="mb-3 flex items-center gap-4">
                  <h3 className="font-oswald text-lg font-black tracking-[0.12em] text-[var(--ink-sepia)]">
                    {year ?? t("common.palmares.earlier")}
                  </h3>
                  <span className="h-px flex-1 bg-[#6b5640]/25" aria-hidden />
                </div>
                <div className="space-y-3">
                  {seasonGames.map((game) => (
                    <GameCard
                      key={game.game_id}
                      game={game}
                      defaultOpen={game.game_id === bestGame?.game_id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </TabsContent>

          <TabsContent value="subpoules" className="mt-5">
            {subpoules.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {subpoules.map((subpoule) => (
                  <SubpouleCard key={subpoule.subpoule_id} subpoule={subpoule} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#6b5640]/20 bg-[#fffdf7]/70 p-8 text-center">
                <Users className="mx-auto mb-3 h-9 w-9 text-[#6b5640]/50" aria-hidden />
                <p className="font-serif text-sm italic text-[var(--ink-faded)]">
                  {t("common.palmares.noSubpoules")}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
