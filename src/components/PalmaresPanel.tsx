import {
  Bike,
  ChevronDown,
  Crown,
  Medal,
  Share2,
  Trophy,
  Users,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
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

type RaceTheme = {
  key: "tour" | "giro" | "vuelta" | "neutral";
  accent: string;
  accentStrong: string;
  accentSoft: string;
  profile: string;
};

type PalmaresThemeStyle = CSSProperties & {
  "--palmares-accent": string;
  "--palmares-accent-strong": string;
  "--palmares-accent-soft": string;
};

const RACE_THEMES: Record<RaceTheme["key"], RaceTheme> = {
  tour: {
    key: "tour",
    accent: "#d4a514",
    accentStrong: "#946508",
    accentSoft: "#f8efd0",
    profile: "M0 42 14 31 25 37 42 18 55 34 69 25 82 39 100 22 118 42",
  },
  giro: {
    key: "giro",
    accent: "#ce6288",
    accentStrong: "#963655",
    accentSoft: "#f8e4eb",
    profile: "M0 42 12 34 24 39 38 17 48 32 61 13 75 36 88 23 101 42 118 33",
  },
  vuelta: {
    key: "vuelta",
    accent: "#c64d45",
    accentStrong: "#872d2c",
    accentSoft: "#f7e1de",
    profile: "M0 42 14 27 29 36 42 22 56 39 72 17 87 31 99 24 118 42",
  },
  neutral: {
    key: "neutral",
    accent: "#b48643",
    accentStrong: "#76522d",
    accentSoft: "#f1e7d5",
    profile: "M0 42 18 30 34 36 52 21 68 37 85 28 101 36 118 42",
  },
};

function getRaceTheme(type: string | null): RaceTheme {
  const key = (type ?? "").toLowerCase();
  if (key === "tour" || key === "tdf" || key === "femmes") return RACE_THEMES.tour;
  if (key === "giro") return RACE_THEMES.giro;
  if (key === "vuelta" || key === "vta") return RACE_THEMES.vuelta;
  return RACE_THEMES.neutral;
}

function raceThemeStyle(theme: RaceTheme): PalmaresThemeStyle {
  return {
    "--palmares-accent": theme.accent,
    "--palmares-accent-strong": theme.accentStrong,
    "--palmares-accent-soft": theme.accentSoft,
  };
}

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

function RaceProfileMark({ theme, className }: { theme: RaceTheme; className?: string }) {
  return (
    <svg
      viewBox="0 0 118 48"
      className={cn("overflow-visible", className)}
      fill="none"
      aria-hidden
    >
      <path d={theme.profile} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0 42H118" stroke="currentColor" strokeWidth="1" opacity=".28" />
      <circle cx="118" cy="42" r="3" fill="currentColor" />
    </svg>
  );
}

function RankingDossard({ rank, theme }: { rank: number; theme: RaceTheme }) {
  return (
    <div className="relative flex min-h-[118px] min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--palmares-accent)] bg-[#fffdf7] px-3 shadow-[inset_0_0_0_4px_var(--palmares-accent-soft)] sm:min-h-[132px]">
      <span className="absolute left-3 top-2 font-oswald text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--palmares-accent-strong)]">
        Classement
      </span>
      <RaceProfileMark
        theme={theme}
        className="pointer-events-none absolute -bottom-1 left-2 right-2 h-12 w-[calc(100%-1rem)] text-[var(--palmares-accent)] opacity-25"
      />
      <span className="relative font-oswald text-[clamp(2.65rem,5.5vw,4.8rem)] font-black leading-none tracking-[-0.04em] text-[var(--ink-sepia)]">
        #{rank || "—"}
      </span>
      <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[var(--palmares-accent)] shadow-[0_0_0_4px_var(--palmares-accent-soft)]" aria-hidden />
    </div>
  );
}

function AchievementStat({
  icon,
  value,
  label,
  className,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  className?: string;
}) {
  const achieved = value > 0;

  return (
    <div className={cn("relative flex min-h-[92px] flex-col items-center justify-center px-2 py-3 text-center sm:min-h-[108px]", className)}>
      <span className={cn("mb-1.5", achieved ? "text-[var(--palmares-accent-strong)]" : "text-[#6b5640]/45")}>
        {icon}
      </span>
      <strong className={cn("font-oswald text-3xl font-black leading-none", achieved ? "text-[var(--palmares-accent-strong)]" : "text-[#3a2a1a]/70")}>
        {value}
      </strong>
      <span className="mt-1.5 text-[11px] font-medium leading-tight text-[var(--ink-faded)] sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function StageWinRow({ win }: { win: StageDagzege }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--palmares-accent)] bg-[var(--palmares-accent-soft)] px-3 py-2.5">
      <Trophy className="h-4 w-4 shrink-0 text-[var(--palmares-accent-strong)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="font-oswald text-sm font-bold text-[var(--ink-sepia)]">
          {t("common.palmares.stageLabel", { n: win.stage_number })}
        </span>
        {win.stage_name && (
          <span className="ml-1.5 text-xs text-[var(--ink-faded)]">· {win.stage_name}</span>
        )}
      </div>
      <span className="shrink-0 font-oswald text-sm font-bold text-[var(--palmares-accent-strong)]">
        {t("common.palmares.pt", { n: win.points })}
      </span>
    </div>
  );
}

function GameCard({ game, defaultOpen }: { game: PalmaresGame; defaultOpen: boolean }) {
  const { t, i18n } = useTranslation();
  const isLive = isLiveGame(game);
  const isTopThree = game.my_rank > 0 && game.my_rank <= 3;
  const theme = getRaceTheme(game.game_type);

  return (
    <Collapsible defaultOpen={defaultOpen} className="group" style={raceThemeStyle(theme)}>
      <div className="relative overflow-hidden rounded-2xl border border-[#6b5640]/20 bg-[#fffdf7] shadow-[0_4px_14px_rgba(58,42,26,0.06)]">
        <span className="absolute inset-y-0 left-0 z-10 w-1 bg-[var(--palmares-accent)]" aria-hidden />
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="grid w-full grid-cols-[54px_minmax(0,1fr)_auto_20px] items-center gap-3 py-3.5 pl-4 pr-3 text-left transition-colors hover:bg-[#ede3cc]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--palmares-accent)] md:grid-cols-[62px_minmax(0,1fr)_auto_24px] md:py-4 md:pl-5 md:pr-5"
          >
            <span className="relative flex h-11 w-[54px] items-end overflow-hidden rounded-lg bg-[var(--palmares-accent-soft)] px-1.5 pb-1 md:h-12 md:w-[62px]">
              <RaceProfileMark theme={theme} className="h-8 w-full text-[var(--palmares-accent-strong)]" />
              <FlagIcon
                country={gameTypeToCountry(game.game_type)}
                className="absolute right-1.5 top-1.5 h-3 w-[18px] rounded-sm border border-black/10 object-cover shadow-sm"
              />
            </span>

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
              {isTopThree && <Medal className="hidden h-5 w-5 text-[var(--palmares-accent-strong)] sm:block" aria-hidden />}
              <span>
                <strong
                  className={cn(
                    "block font-oswald text-xl font-black leading-none text-[var(--ink-sepia)] md:text-2xl",
                    isTopThree && "text-[var(--palmares-accent-strong)]",
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
                <strong className="font-oswald text-xl font-black text-[var(--palmares-accent-strong)] md:text-2xl">
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
  const theme = getRaceTheme(subpoule.game_type);

  return (
    <article
      className="relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border border-[#6b5640]/20 bg-[#fffdf7] p-4 shadow-[0_4px_14px_rgba(58,42,26,0.06)]"
      style={raceThemeStyle(theme)}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-[var(--palmares-accent)]" aria-hidden />
      <RaceProfileMark
        theme={theme}
        className="pointer-events-none absolute bottom-0 right-16 h-12 w-32 text-[var(--palmares-accent)] opacity-[0.08]"
      />
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
        {topThree && <Medal className="mb-1 ml-auto h-4 w-4 text-[var(--palmares-accent-strong)]" aria-hidden />}
        <strong className={cn("font-oswald text-xl font-black", topThree ? "text-[var(--palmares-accent-strong)]" : "text-[var(--ink-sepia)]")}>
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
  const bestTheme = getRaceTheme(bestGame?.game_type ?? null);
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
    <section
      className="vintage-paper relative overflow-hidden rounded-3xl border border-[#6b5640]/20 p-3 text-[var(--ink-sepia)] shadow-[0_10px_30px_rgba(58,42,26,0.1)] sm:p-5 md:p-6"
      style={raceThemeStyle(bestTheme)}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[24px] border-[var(--palmares-accent-soft)]"
        aria-hidden
      />

      <div className="relative">
        <header className="overflow-hidden rounded-[1.5rem] border border-[#6b5640]/18 bg-[#fffaf0]/82 p-5 shadow-[0_4px_16px_rgba(58,42,26,0.055)] sm:p-6 md:p-7">
          <div className="flex items-center gap-3 font-oswald text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--palmares-accent-strong)] md:text-[11px]">
            <span className="h-px w-8 bg-current" aria-hidden />
            {t("common.palmares.personalHonours")}
            <span className="hidden h-px w-8 bg-current sm:block" aria-hidden />
          </div>
          <h2 className="mt-2.5 font-oswald text-4xl font-black uppercase leading-none tracking-tight text-[var(--ink-sepia)] sm:text-5xl md:text-[3.5rem]">
            {t("common.palmares.hero")}
          </h2>
          <p className="mt-1.5 font-serif text-sm italic text-[var(--ink-faded)] sm:text-[15px]">
            {t("common.palmares.heroSub")}
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-[44fr_56fr]">
            <article className="relative grid min-h-[154px] grid-cols-[minmax(120px,0.82fr)_minmax(0,1.18fr)] items-center gap-4 overflow-hidden rounded-2xl border border-[var(--palmares-accent)] bg-[var(--palmares-accent-soft)] p-3.5 sm:grid-cols-[minmax(145px,0.85fr)_minmax(0,1.15fr)] sm:p-4">
              <RaceProfileMark
                theme={bestTheme}
                className="pointer-events-none absolute -right-5 -top-3 h-20 w-48 text-[var(--palmares-accent)] opacity-10"
              />
              <RankingDossard rank={bestGame?.my_rank ?? 0} theme={bestTheme} />
              <div className="relative min-w-0 pr-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--palmares-accent-strong)] sm:text-[11px]">
                  {t("common.palmares.bestPerformance")}
                </p>
                <h3 className="mt-2 font-oswald text-xl font-black uppercase leading-[1.08] text-[var(--ink-sepia)] sm:text-[1.65rem]">
                  {bestGame?.game_name ?? "—"}
                </h3>
                <p className="mt-2.5 text-xs text-[var(--ink-faded)] sm:text-sm">
                  {bestGame
                    ? t("common.palmares.rankOf", { rank: bestGame.my_rank, total: bestGame.total_participants })
                    : "—"}
                </p>
              </div>
            </article>

            <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#6b5640]/18 bg-[#fffdf7]/82 md:grid-cols-2 lg:grid-cols-4">
              <AchievementStat
                icon={<Trophy className="h-5 w-5" aria-hidden />}
                value={totalStageWins}
                label={t("common.palmares.stageWins")}
                className="border-b border-r border-[#6b5640]/15 lg:border-b-0"
              />
              <AchievementStat
                icon={<Medal className="h-5 w-5" aria-hidden />}
                value={totalStagePodiums}
                label={t("common.palmares.stagePodiums")}
                className="border-b border-[#6b5640]/15 lg:border-b-0 lg:border-r"
              />
              <AchievementStat
                icon={<Crown className="h-5 w-5" aria-hidden />}
                value={subpouleWins}
                label={t("common.palmares.subpouleWins")}
                className="border-r border-[#6b5640]/15"
              />
              <AchievementStat
                icon={<Bike className="h-5 w-5" aria-hidden />}
                value={games.length}
                label={t("common.palmares.racesPlayed")}
              />
            </div>
          </div>
        </header>

        <Tabs defaultValue="races" className="mt-4">
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
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#6b5640]/25 bg-[#fffdf7]/80 px-3 font-sans text-sm font-bold text-[var(--ink-sepia)] shadow-sm transition-colors hover:bg-[#fffdf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palmares-accent)] sm:px-4"
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
