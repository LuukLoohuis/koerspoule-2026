import { BarChart3, Bike, ChevronDown, Crown, Medal, Share2, Trophy, Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import palmaresCyclingScene from "@/assets/palmares-cycling-scene-v2.png";
import roundelGiro from "@/assets/palmares-roundel-giro.png";
import roundelTour from "@/assets/palmares-roundel-tour.png";
import roundelVuelta from "@/assets/palmares-roundel-vuelta.png";
import truiGiroAlgemeen from "@/assets/trui-giro-algemeen.png";
import truiTourAlgemeen from "@/assets/trui-tour-algemeen.png";
import truiVueltaAlgemeen from "@/assets/trui-vuelta-algemeen.png";
import FlagIcon from "@/components/FlagIcon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePalmares, type PalmaresGame, type PalmaresSubpoule, type StageDagzege } from "@/hooks/usePalmares";
import { cn } from "@/lib/utils";

const LIVE_STATUSES = new Set(["active", "live", "open", "open_inschrijving", "locked"]);

type RaceTheme = {
  key: "tour" | "giro" | "vuelta" | "neutral";
  accent: string;
  accentStrong: string;
  accentSoft: string;
  heroStart: string;
  heroEnd: string;
  roundel: string;
  roundelInk: string;
  wordmark: string;
  sceneFilter: string;
  profile: string;
};
type PalmaresThemeStyle = CSSProperties & {
  "--palmares-accent": string;
  "--palmares-accent-strong": string;
  "--palmares-accent-soft": string;
  "--palmares-hero-start": string;
  "--palmares-hero-end": string;
  "--palmares-roundel": string;
  "--palmares-roundel-ink": string;
  "--palmares-scene-filter": string;
};

const RACE_THEMES: Record<RaceTheme["key"], RaceTheme> = {
  tour: { key: "tour", accent: "#d8a514", accentStrong: "#9c6c05", accentSoft: "#fbf0c9", heroStart: "#fff7d8", heroEnd: "#ffd34f", roundel: "#ffd83f", roundelInk: "#21170c", wordmark: "TOUR", sceneFilter: "none", profile: "M0 42 14 31 25 37 42 18 55 34 69 25 82 39 100 22 118 42" },
  giro: { key: "giro", accent: "#e94f8b", accentStrong: "#b72f65", accentSoft: "#fce2ec", heroStart: "#fde9f0", heroEnd: "#ef79a6", roundel: "#f5b0ca", roundelInk: "#321421", wordmark: "GIRO", sceneFilter: "hue-rotate(295deg) saturate(1.15)", profile: "M0 42 12 34 24 39 38 17 48 32 61 13 75 36 88 23 101 42 118 33" },
  vuelta: { key: "vuelta", accent: "#df2c23", accentStrong: "#a81919", accentSoft: "#f9dfdc", heroStart: "#ffe2dd", heroEnd: "#df3026", roundel: "#d92b24", roundelInk: "#fffaf2", wordmark: "VUELTA", sceneFilter: "hue-rotate(320deg) saturate(1.25)", profile: "M0 42 14 27 29 36 42 22 56 39 72 17 87 31 99 24 118 42" },
  neutral: { key: "neutral", accent: "#b48643", accentStrong: "#76522d", accentSoft: "#f1e7d5", heroStart: "#f8eedc", heroEnd: "#d9b477", roundel: "#b48643", roundelInk: "#fffaf2", wordmark: "RONDE", sceneFilter: "sepia(.2)", profile: "M0 42 18 30 34 36 52 21 68 37 85 28 101 36 118 42" },
};
const JERSEY_BY_THEME: Record<RaceTheme["key"], string> = {
  tour: truiTourAlgemeen,
  giro: truiGiroAlgemeen,
  vuelta: truiVueltaAlgemeen,
  neutral: truiTourAlgemeen,
};
const ROUNDEL_BY_THEME: Partial<Record<RaceTheme["key"], string>> = {
  tour: roundelTour,
  giro: roundelGiro,
  vuelta: roundelVuelta,
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
    "--palmares-hero-start": theme.heroStart,
    "--palmares-hero-end": theme.heroEnd,
    "--palmares-roundel": theme.roundel,
    "--palmares-roundel-ink": theme.roundelInk,
    "--palmares-scene-filter": theme.sceneFilter,
  };
}
function gameTypeToCountry(type: string | null): "IT" | "FR" | "ES" {
  const key = (type ?? "").toLowerCase();
  if (key === "tour" || key === "tdf" || key === "femmes") return "FR";
  if (key === "vuelta" || key === "vta") return "ES";
  return "IT";
}
function isLiveGame(game: PalmaresGame) { return LIVE_STATUSES.has(game.status); }
function getBestGame(games: PalmaresGame[]) {
  const valid = games.filter((game) => game.my_rank > 0 && game.total_participants > 0);
  const completed = valid.filter((game) => !isLiveGame(game));
  return [...(completed.length > 0 ? completed : valid)].sort((a, b) => a.my_rank - b.my_rank || b.total_participants - a.total_participants)[0];
}
function groupGamesByYear(games: PalmaresGame[]) {
  const grouped = new Map<number | null, PalmaresGame[]>();
  for (const game of games) grouped.set(game.year ?? null, [...(grouped.get(game.year ?? null) ?? []), game]);
  return [...grouped.entries()].sort(([a], [b]) => (b ?? -1) - (a ?? -1)).map(([year, yearGames]) => ({
    year,
    games: [...yearGames].sort((a, b) => Number(isLiveGame(b)) - Number(isLiveGame(a)) || a.game_name.localeCompare(b.game_name)),
  }));
}
function rankTone(rank: number) {
  if (rank === 1) return "border-[var(--medal-gold)] bg-[#f2c955] text-[var(--ink-sepia)]";
  if (rank === 2) return "border-[var(--medal-silver)] bg-[#d8d6d0] text-[var(--ink-sepia)]";
  if (rank === 3) return "border-[var(--medal-bronze)] bg-[#ca8a4b] text-white";
  return "border-[#6b5640]/25 bg-[#fffdf7] text-[var(--ink-sepia)]";
}
function topPercentage(game?: PalmaresGame) {
  if (!game || game.my_rank <= 0 || game.total_participants <= 0) return null;
  return Math.min(100, (game.my_rank / game.total_participants) * 100);
}
function formatPercentage(value: number, language: string) {
  return value.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function raceHeading(game?: PalmaresGame) {
  if (!game) return "—";
  if (!game.year) return game.game_name;
  const nameWithoutYear = game.game_name.replace(new RegExp(`\\s*${game.year}$`), "");
  return `${nameWithoutYear} · ${game.year}`;
}

function RaceProfileMark({ theme, className }: { theme: RaceTheme; className?: string }) {
  return <svg viewBox="0 0 118 48" className={cn("overflow-visible", className)} fill="none" aria-hidden><path d={theme.profile} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M0 42H118" stroke="currentColor" strokeWidth="1" opacity=".28" /><circle cx="118" cy="42" r="3" fill="currentColor" /></svg>;
}
function HeaderCyclingScene() {
  return (
    <img
      src={palmaresCyclingScene}
      alt=""
      className="pointer-events-none absolute -bottom-8 right-0 hidden h-auto w-[62%] max-w-[760px] object-contain object-right-bottom opacity-[0.42] lg:block"
      style={{ filter: "var(--palmares-scene-filter)" }}
      aria-hidden
    />
  );
}
function LaurelWreath() {
  const leaves = [30, 50, 70, 90, 110, 130, 150];
  return (
    <svg viewBox="0 0 340 210" className="absolute inset-0 h-full w-full text-[var(--palmares-accent)]" aria-hidden>
      <path d="M86 185C38 149 24 80 67 28M254 185c48-36 62-105 19-157" stroke="currentColor" strokeWidth="3" fill="none" opacity=".45" />
      {leaves.map((y, index) => <g key={y} opacity={0.22 + index * 0.035}><ellipse cx={64 - index * 2} cy={y} rx="7" ry="15" transform={`rotate(${-48 + index * 4} ${64 - index * 2} ${y})`} fill="currentColor" /><ellipse cx={276 + index * 2} cy={y} rx="7" ry="15" transform={`rotate(${48 - index * 4} ${276 + index * 2} ${y})`} fill="currentColor" /></g>)}
    </svg>
  );
}
function RaceRoundel({ theme }: { theme: RaceTheme }) {
  const image = ROUNDEL_BY_THEME[theme.key];
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--palmares-accent)] bg-[var(--palmares-roundel)] text-[var(--palmares-roundel-ink)] shadow-[0_3px_8px_rgba(58,42,26,0.1)] sm:h-14 sm:w-14">
      {image ? <img src={image} alt="" className="h-full w-full rounded-full object-cover" /> : <><Bike className="h-4 w-4" strokeWidth={2.3} aria-hidden /><span className="ml-1 font-oswald text-[9px] font-black uppercase">{theme.wordmark}</span></>}
    </span>
  );
}

function MiniLaurel() {
  return (
    <svg viewBox="0 0 58 58" className="h-12 w-12 text-[var(--palmares-accent)]" fill="none" aria-hidden>
      <path d="M23 48C11 40 7 26 14 11M35 48c12-8 16-22 9-37" stroke="currentColor" strokeWidth="2" />
      {[16, 25, 34, 42].map((y, index) => <g key={y} fill="currentColor" opacity={0.48 + index * 0.1}><ellipse cx={13 - index} cy={y} rx="3" ry="7" transform={`rotate(-38 ${13 - index} ${y})`} /><ellipse cx={45 + index} cy={y} rx="3" ry="7" transform={`rotate(38 ${45 + index} ${y})`} /></g>)}
    </svg>
  );
}
function AchievementStat({ icon, value, label, className }: { icon: ReactNode; value: number; label: string; className?: string }) {
  const achieved = value > 0;
  return (
    <div className={cn("flex min-h-[88px] items-center gap-3 px-4 py-3.5 sm:min-h-[98px] sm:justify-center sm:px-5", className)}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-[#fffdf8] shadow-[0_3px_9px_rgba(58,42,26,0.07)] sm:h-12 sm:w-12", achieved ? "border-[var(--palmares-accent)] text-[var(--palmares-accent-strong)]" : "border-[#6b5640]/15 text-[#6b5640]/55")}>{icon}</span>
      <span><strong className={cn("block font-oswald text-3xl font-black leading-none", achieved ? "text-[var(--palmares-accent-strong)]" : "text-[var(--ink-sepia)]")}>{value}</strong><span className="mt-1 block text-xs font-medium leading-tight text-[var(--ink-faded)]">{label}</span><span className={cn("mt-1.5 block h-px w-8", achieved ? "bg-[var(--palmares-accent)]" : "bg-[#6b5640]/18")} aria-hidden /></span>
    </div>
  );
}
function StageWinRow({ win }: { win: StageDagzege }) {
  const { t } = useTranslation();
  return <div className="flex items-center gap-3 rounded-xl border border-[var(--palmares-accent)]/60 bg-[var(--palmares-accent-soft)] px-3 py-2.5"><Trophy className="h-4 w-4 shrink-0 text-[var(--palmares-accent-strong)]" aria-hidden /><div className="min-w-0 flex-1"><span className="font-oswald text-sm font-bold text-[var(--ink-sepia)]">{t("common.palmares.stageLabel", { n: win.stage_number })}</span>{win.stage_name && <span className="ml-1.5 text-xs text-[var(--ink-faded)]">· {win.stage_name}</span>}</div><span className="shrink-0 font-oswald text-sm font-bold text-[var(--palmares-accent-strong)]">{t("common.palmares.pt", { n: win.points })}</span></div>;
}

function GameCard({ game, defaultOpen }: { game: PalmaresGame; defaultOpen: boolean }) {
  const { t, i18n } = useTranslation();
  const live = isLiveGame(game);
  const topThree = game.my_rank > 0 && game.my_rank <= 3;
  const percentage = topPercentage(game);
  const theme = getRaceTheme(game.game_type);
  return (
    <Collapsible defaultOpen={defaultOpen} className="group" style={raceThemeStyle(theme)}>
      <div className="overflow-hidden rounded-xl border border-[#6b5640]/16 bg-[#fffdf8]/92 shadow-[0_3px_9px_rgba(58,42,26,0.055)]">
        <CollapsibleTrigger asChild>
          <button type="button" className="grid w-full grid-cols-[48px_minmax(0,1fr)_auto_20px] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--palmares-accent-soft)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--palmares-accent)] sm:grid-cols-[56px_minmax(0,1fr)_auto_24px] sm:gap-4 sm:px-4 sm:py-3">
            <RaceRoundel theme={theme} />
            <span className="min-w-0"><span className="block truncate font-oswald text-sm font-black uppercase text-[var(--ink-sepia)] sm:text-base">{game.game_name}</span><span className={cn("mt-1 block truncate text-[11px] text-[var(--ink-faded)] sm:text-xs", live && "font-semibold text-[var(--vintage-green)]")}>{live ? "● " : ""}{live ? t("common.palmares.provisional") : t("common.palmares.finalStanding")}{game.stages_count > 0 ? ` · ${t("common.palmares.stages", { count: game.stages_count })}` : ""}</span></span>
            <span className="flex flex-col items-end text-right"><strong className={cn("block font-oswald text-xl font-black leading-none text-[var(--ink-sepia)] sm:text-2xl", topThree && "text-[var(--palmares-accent-strong)]")}>#{game.my_rank || "—"}</strong><span className="mt-1 block text-[11px] text-[var(--ink-faded)] sm:text-xs">{t("common.palmares.of", { total: game.total_participants.toLocaleString(i18n.language) })}</span>{percentage !== null && <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--palmares-accent)]/35 bg-[var(--palmares-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--palmares-accent-strong)] sm:text-[11px]"><BarChart3 className="h-3 w-3" aria-hidden />{t("common.palmares.topPercent", { percent: formatPercentage(percentage, i18n.language) })}</span>}</span>
            <ChevronDown className="h-5 w-5 text-[var(--ink-faded)] transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-[#6b5640]/12 px-3 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[[game.stage_wins, t("common.palmares.stageWins")], [game.stage_podiums, t("common.palmares.stagePodiums")], [game.approved_points.toLocaleString(i18n.language), t("common.palmares.points")]].map(([value, label], index) => <div key={String(label)} className="rounded-xl bg-[#ede3cc]/60 px-3 py-3 sm:px-4"><strong className={cn("font-oswald text-xl font-black sm:text-2xl", index === 0 ? "text-[var(--palmares-accent-strong)]" : "text-[var(--ink-sepia)]")}>{value}</strong><span className="mt-1 block text-[11px] leading-tight text-[var(--ink-faded)] sm:text-xs">{label}</span></div>)}
            </div>
            {game.dagzeges.length > 0 && <div className="mt-3 space-y-2">{game.dagzeges.map((win) => <StageWinRow key={win.stage_id} win={win} />)}</div>}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SubpouleCard({ subpoule }: { subpoule: PalmaresSubpoule }) {
  const { t, i18n } = useTranslation();
  const topThree = subpoule.my_rank > 0 && subpoule.my_rank <= 3;
  const theme = getRaceTheme(subpoule.game_type);
  return (
    <article className="relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border border-[#6b5640]/16 bg-[#fffdf8]/92 p-4 shadow-[0_4px_12px_rgba(58,42,26,0.065)]" style={raceThemeStyle(theme)}>
      <span className="absolute inset-y-0 left-0 w-1 bg-[var(--palmares-accent)]" aria-hidden /><div className={cn("vintage-medal flex h-12 w-12 items-center justify-center rounded-full border-2 font-oswald text-lg font-black", rankTone(subpoule.my_rank))}>#{subpoule.my_rank || "—"}</div>
      <div className="min-w-0"><h3 className="truncate font-oswald text-base font-black uppercase text-[var(--ink-sepia)]">{subpoule.subpoule_name}</h3><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--ink-faded)]"><FlagIcon country={gameTypeToCountry(subpoule.game_type)} className="h-3 w-4 rounded-sm object-cover" /><span className="truncate">{subpoule.game_name}</span></p><p className="mt-2 text-[11px] text-[var(--ink-faded)]">{subpoule.stage_wins} {t("common.palmares.stageWins").toLowerCase()} · {subpoule.stage_podiums} {t("common.palmares.stagePodiums").toLowerCase()}</p></div>
      <div className="text-right">{topThree && <Medal className="mb-1 ml-auto h-4 w-4 text-[var(--palmares-accent-strong)]" aria-hidden />}<strong className={cn("font-oswald text-xl font-black", topThree ? "text-[var(--palmares-accent-strong)]" : "text-[var(--ink-sepia)]")}>#{subpoule.my_rank || "—"}</strong><span className="block text-[11px] text-[var(--ink-faded)]">{t("common.palmares.of", { total: subpoule.total_members.toLocaleString(i18n.language) })}</span></div>
    </article>
  );
}

function PalmaresSkeleton() { return <div className="space-y-4"><div className="h-[32rem] animate-pulse rounded-3xl bg-secondary/50" /><div className="h-40 animate-pulse rounded-2xl bg-secondary/50" /></div>; }

export default function PalmaresPanel() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = usePalmares();
  const games = data?.games ?? [];
  const subpoules = data?.subpoules ?? [];
  const totalStageWins = games.reduce((sum, game) => sum + game.stage_wins, 0);
  const totalStagePodiums = games.reduce((sum, game) => sum + game.stage_podiums, 0);
  const subpouleWins = subpoules.filter((subpoule) => subpoule.is_winner).length;
  const bestGame = getBestGame(games);
  const bestTheme = getRaceTheme(bestGame?.game_type ?? null);
  const seasons = groupGamesByYear(games);
  const bestPercent = topPercentage(bestGame);
  const latestSeason = seasons[0];

  const sharePalmares = async () => {
    const title = t("common.palmares.shareTitle");
    const text = t("common.palmares.shareText", { rank: bestGame?.my_rank ?? "—", total: bestGame?.total_participants ?? 0, game: bestGame?.game_name ?? t("common.palmares.hero"), wins: totalStageWins });
    try {
      if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title, text, url: window.location.href }); return; }
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast.success(t("common.palmares.shareCopied"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("common.palmares.shareFailed"));
    }
  };

  if (isLoading) return <PalmaresSkeleton />;
  if (games.length === 0) return <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center"><Trophy className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" /><p className="mb-1 font-display font-bold text-muted-foreground">{t("common.palmares.empty")}</p><p className="font-serif text-sm italic text-muted-foreground/70">{t("common.palmares.emptyHint")}</p></div>;

  return (
    <section className="vintage-paper relative overflow-hidden rounded-[1.75rem] border border-[#6b5640]/18 p-4 text-[var(--ink-sepia)] shadow-[0_12px_34px_rgba(58,42,26,0.1)] sm:p-6 lg:p-8" style={raceThemeStyle(bestTheme)}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background:radial-gradient(circle_at_74%_7%,rgba(255,255,255,.9),transparent_31%),linear-gradient(120deg,transparent_0_68%,var(--palmares-accent-soft)_68%_70%,transparent_70%)]" aria-hidden />
      <div className="relative rounded-[1.4rem] border border-[#6b5640]/10 bg-[#fffaf0]/40 px-4 pb-5 pt-5 sm:px-6 sm:pb-7 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-7">
        <header className="relative min-h-[180px] overflow-hidden sm:min-h-[205px] lg:min-h-[220px]">
          <HeaderCyclingScene />
          <div className="relative z-10 flex items-center gap-3 font-oswald text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--palmares-accent-strong)] sm:text-xs"><span className="h-px w-8 bg-current sm:w-11" aria-hidden />{t("common.palmares.personalHonours")}<span className="hidden h-px w-8 bg-current sm:block sm:w-11" aria-hidden /><span className="text-lg leading-none" aria-hidden>❧</span></div>
          <h2 className="relative z-10 mt-4 font-oswald text-[clamp(3.2rem,6.4vw,5.8rem)] font-black uppercase leading-[0.88] tracking-[-0.035em] text-[#24180e] lg:whitespace-nowrap">{t("common.palmares.hero")}</h2>
          <p className="relative z-10 mt-4 font-serif text-base italic text-[var(--ink-faded)] sm:text-xl">{t("common.palmares.heroSub")}</p>
          <button type="button" onClick={sharePalmares} className="relative z-20 mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-[#4b3825]/70 bg-[#fffdf8]/80 px-4 font-sans text-sm font-bold text-[var(--ink-sepia)] shadow-[0_3px_8px_rgba(58,42,26,0.08)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--palmares-accent)] sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:h-12 sm:px-5 sm:text-base"><Share2 className="h-4 w-4" aria-hidden />{t("common.palmares.share")}</button>
        </header>

        <article className="relative grid overflow-hidden rounded-[1.4rem] border border-[var(--palmares-accent)] bg-[#fffdf8]/88 shadow-[0_8px_22px_rgba(58,42,26,0.085)] lg:grid-cols-[39fr_61fr]">
          <div className="relative flex min-h-[235px] items-center justify-center overflow-hidden [background:linear-gradient(145deg,var(--palmares-hero-start),var(--palmares-hero-end))] px-5 py-6 sm:min-h-[255px]">
            <div className="absolute inset-0 opacity-45 [background:radial-gradient(circle_at_50%_55%,rgba(255,255,255,.55),transparent_55%)]" aria-hidden /><LaurelWreath />
            <div className="relative z-10 text-center"><span className="inline-flex rounded-lg border border-[var(--palmares-accent)] bg-[#fffaf0]/88 px-4 py-1.5 font-oswald text-[10px] font-bold uppercase tracking-[0.17em] text-[var(--palmares-accent-strong)] shadow-sm sm:text-xs">{t("common.palmares.bestFinalRank")}</span><strong className="mt-3 block font-oswald text-[clamp(4.25rem,8vw,6rem)] font-black leading-none tracking-[-0.055em] text-[#2a190b]">#{bestGame?.my_rank || "—"}</strong><span className="mx-auto mt-1.5 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--palmares-accent)] bg-[#fffdf8] shadow-[0_3px_9px_rgba(58,42,26,.12)]"><img src={JERSEY_BY_THEME[bestTheme.key]} alt="" className="h-9 w-auto object-contain" /></span></div>
            <div className="pointer-events-none absolute -right-10 -top-4 hidden h-[calc(100%+2rem)] w-20 rounded-[50%] border-r-2 border-[var(--palmares-accent)] bg-[#fffdf8] lg:block" aria-hidden />
          </div>
          <div className="relative flex min-h-[235px] flex-col justify-center px-6 py-6 sm:min-h-[255px] sm:px-9 lg:pl-12 lg:pr-9">
            <p className="font-oswald text-xs font-bold uppercase tracking-[0.18em] text-[var(--palmares-accent-strong)] sm:text-sm">{raceHeading(bestGame)}</p><h3 className="mt-3 font-oswald text-3xl font-black uppercase leading-[1.02] tracking-[-0.02em] text-[#281a0e] sm:text-4xl lg:text-[2.65rem]">{t("common.palmares.strongestGrandTour")}</h3>
            <p className="mt-4 flex items-center gap-2 text-sm text-[var(--ink-faded)] sm:text-base"><Users className="h-5 w-5 text-[#8f7d62]/70" aria-hidden />{bestGame ? t("common.palmares.rankOf", { rank: bestGame.my_rank, total: bestGame.total_participants.toLocaleString(i18n.language) }) : "—"}</p>
            {bestPercent !== null && <div className="mt-4 flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#6b5640]/16 bg-[#fffdf8]/90 px-4 py-2.5 shadow-sm sm:w-fit"><BarChart3 className="h-5 w-5 shrink-0 text-[var(--palmares-accent)]" aria-hidden /><strong className="text-sm text-[var(--ink-sepia)] sm:text-base">{t("common.palmares.topPercent", { percent: formatPercentage(bestPercent, i18n.language) })}</strong><span className="text-xs text-[var(--ink-faded)] sm:text-sm">{t("common.palmares.ofField")}</span></div>}
          </div>
        </article>

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[1.35rem] border border-[#6b5640]/16 bg-[#fffdf8]/72 shadow-[0_4px_14px_rgba(58,42,26,0.055)] lg:grid-cols-4">
          <AchievementStat icon={<Trophy className="h-6 w-6" aria-hidden />} value={totalStageWins} label={t("common.palmares.stageWins")} className="border-b border-r border-[#6b5640]/14 lg:border-b-0" /><AchievementStat icon={<Medal className="h-6 w-6" aria-hidden />} value={totalStagePodiums} label={t("common.palmares.stagePodiums")} className="border-b border-[#6b5640]/14 lg:border-b-0 lg:border-r" /><AchievementStat icon={<Crown className="h-6 w-6" aria-hidden />} value={subpouleWins} label={t("common.palmares.subpouleWins")} className="border-r border-[#6b5640]/14" /><AchievementStat icon={<Bike className="h-6 w-6" aria-hidden />} value={games.length} label={t("common.palmares.racesPlayed")} />
        </div>

        <Tabs defaultValue="races" className="mt-7">
          <div className="flex items-end justify-between gap-4 border-b border-[#6b5640]/18"><TabsList className="h-auto gap-1 rounded-none bg-transparent p-0"><TabsTrigger value="races" className="rounded-t-xl rounded-b-none border border-transparent px-4 py-3 font-sans text-sm font-bold text-[var(--ink-faded)] data-[state=active]:border-[#6b5640]/18 data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--palmares-accent)] data-[state=active]:bg-[#fffdf8]/85 data-[state=active]:text-[var(--ink-sepia)] data-[state=active]:shadow-none sm:px-6">{t("common.palmares.racesTab")}</TabsTrigger><TabsTrigger value="subpoules" className="rounded-t-xl rounded-b-none border border-transparent px-4 py-3 font-sans text-sm font-bold text-[var(--ink-faded)] data-[state=active]:border-[#6b5640]/18 data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--palmares-accent)] data-[state=active]:bg-[#fffdf8]/85 data-[state=active]:text-[var(--ink-sepia)] data-[state=active]:shadow-none sm:px-6">{t("common.palmares.subpoules")}</TabsTrigger></TabsList>{latestSeason && <span className="hidden pb-3 font-oswald text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink-faded)] sm:block">{latestSeason.year ?? t("common.palmares.earlier")} · {t("common.palmares.chapters", { count: latestSeason.games.length })}</span>}</div>
          <TabsContent value="races" className="mt-5 space-y-7">
            {seasons.map(({ year, games: seasonGames }, seasonIndex) => <section key={year ?? "past"}>{(seasons.length > 1 || seasonIndex > 0) && <div className="mb-3 flex items-center gap-4"><h3 className="font-oswald text-sm font-black uppercase tracking-[0.16em] text-[var(--ink-faded)]">{year ?? t("common.palmares.earlier")}</h3><span className="h-px flex-1 bg-[#6b5640]/16" aria-hidden /></div>}<div className="relative ml-2 space-y-3 border-l border-[#6b5640]/22 pl-5 sm:ml-0 sm:pl-8">{seasonGames.map((game) => <div key={game.game_id} className="relative"><span className="absolute -left-[1.78rem] top-7 h-3 w-3 rounded-full border-2 border-[#fffaf0] bg-[var(--palmares-accent)] shadow-[0_0_0_1px_var(--palmares-accent)] sm:-left-[2.32rem]" style={raceThemeStyle(getRaceTheme(game.game_type))} aria-hidden /><GameCard game={game} defaultOpen={false} /></div>)}</div></section>)}
          </TabsContent>
          <TabsContent value="subpoules" className="mt-5">{subpoules.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{subpoules.map((subpoule) => <SubpouleCard key={subpoule.subpoule_id} subpoule={subpoule} />)}</div> : <div className="rounded-2xl border border-[#6b5640]/16 bg-[#fffdf8]/70 p-8 text-center"><Users className="mx-auto mb-3 h-9 w-9 text-[#6b5640]/50" aria-hidden /><p className="font-serif text-sm italic text-[var(--ink-faded)]">{t("common.palmares.noSubpoules")}</p></div>}</TabsContent>
        </Tabs>

        <footer className="mt-8 flex items-center gap-4 rounded-xl border border-[var(--palmares-accent)]/35 bg-[var(--palmares-accent-soft)]/55 px-5 py-4 sm:px-6">
          <MiniLaurel />
          <p className="min-w-0 text-sm leading-relaxed text-[var(--ink-faded)]">
            <strong className="block font-medium text-[var(--palmares-accent-strong)]">{t(`common.palmares.themeOutro.${bestTheme.key}.title`)}</strong>
            {t(`common.palmares.themeOutro.${bestTheme.key}.body`)}
          </p>
        </footer>
      </div>
    </section>
  );
}
