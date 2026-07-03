import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, Lock, Sparkles } from "lucide-react";
import TruiBadge from "@/components/retro/TruiBadge";
import SwipeCarousel from "@/components/SwipeCarousel";
import SwipeHintBar from "@/components/SwipeHintBar";
import { useSwipeHint } from "@/hooks/useSwipeHint";
import { useToast } from "@/hooks/use-toast";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useEntry, entryErrorMessage } from "@/hooks/useEntry";
import { useStartlist } from "@/hooks/useStartlist";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { canRegister, isGameLocked, isPreviewStatus, isVisibleToUser } from "@/lib/gameStatus";
import RiderSearchSelect from "@/components/RiderSearchSelect";
import { SteunMoment } from "@/components/SteunKopgroep";
import FlagIcon from "@/components/FlagIcon";
import type { ReactNode } from "react";

// Pick a thematic icon for each category based on its name/short_name
function getCategoryIcon(name: string): ReactNode {
  const n = name.toLowerCase();
  if (/(gc\s*alien|alien)/.test(n)) return "👽";
  if (/(baby\s*giro|baby)/.test(n)) return "👶";
  if (/\boud\b|veteraan|oldie/.test(n)) return "👴";
  if (/\bnl\b|nederland|dutch/.test(n)) return <FlagIcon country="NL" className="w-6 h-5" />;
  if (/belg|belgië|belgie|belgium/.test(n)) return <FlagIcon country="BE" className="w-6 h-5" />;
  if (/(klim|berg|grimp|mountain)/.test(n)) return "🏔️";
  if (/(sprint|spurt)/.test(n)) return "⚡";
  if (/(punch|aanval|attack|baroud)/.test(n)) return "🎯";
  if (/(tijd|chrono|time)/.test(n)) return "🏁";
  if (/(klassiek|classic|cobble|kassei)/.test(n)) return "🪨";
  if (/(kop|leider|leader|gc|algemeen)/.test(n)) return "⭐";
  return "🚴";
}

export default function TeamBuilder() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAuthed = Boolean(user);
  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const { data: profile } = useProfile();
  const isAdmin = role === "admin";
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(game?.id);
  const { entry, isLoading: entryLoading, picksByCategory, jokerIds, predictions, togglePick, saveJoker, savePredictions, submitEntry, revertEntry } = useEntry(game?.id);

  const requireAuth = (action: string) => {
    toast({
      title: "Maak een account aan",
      description: `Je moet ingelogd zijn om ${action}.`,
    });
    navigate("/login");
  };

  const [startlistSearch, setStartlistSearch] = useState("");
  const [startlistTeamFilter, setStartlistTeamFilter] = useState("all");
  const { data: startlist = [], isLoading: startlistLoading } = useStartlist(
    game?.id,
    startlistSearch,
    startlistTeamFilter === "all" ? "" : startlistTeamFilter
  );

  const categoryRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const category of categories) {
      for (const relation of category.category_riders ?? []) {
        if (relation.riders) set.add(relation.riders.id);
      }
    }
    return set;
  }, [categories]);

  const { data: fullStartlist = [] } = useStartlist(game?.id, "", "");

  const allStartlistRiders = useMemo(() => {
    const list: Array<{ id: string; name: string; start_number: number | null; teamName: string; is_youth_eligible: boolean }> = [];
    for (const team of fullStartlist) {
      for (const rider of team.riders) {
        list.push({ ...rider, teamName: team.name });
      }
    }
    return list.sort((a, b) => (a.start_number ?? 9999) - (b.start_number ?? 9999));
  }, [fullStartlist]);

  const youthEligibleRiders = useMemo(
    () => allStartlistRiders.filter((r) => r.is_youth_eligible),
    [allStartlistRiders]
  );

  const jokerPool = useMemo(
    () => allStartlistRiders.filter((r) => !categoryRiderIds.has(r.id)),
    [allStartlistRiders, categoryRiderIds]
  );

  const allTeams = useMemo(
    () => fullStartlist.map((t) => ({ id: t.id, name: t.name })),
    [fullStartlist]
  );

  const [jokerDraft1, setJokerDraft1] = useState("");
  const [jokerDraft2, setJokerDraft2] = useState("");
  const [gcPodium, setGcPodium] = useState<string[]>(["", "", ""]);
  const [pointsJersey, setPointsJersey] = useState("");
  const [mountainJersey, setMountainJersey] = useState("");
  const [youthJersey, setYouthJersey] = useState("");

  const isSubmitted = entry?.status === "submitted";
  const status = game?.status ?? "";
  // Inschrijven (renners kiezen + indienen) mag ALLEEN tijdens 'open_inschrijving'
  // (admin altijd). 'open' = sneak preview: alles zien, nog niet inschrijven.
  const canEnroll = isAdmin || canRegister(status);
  // "Echt op slot" na de deadline — voor de bestaande gesloten-melding + submitted/revert.
  const gameLocked = isGameLocked(status);
  // Picks/indienen disabled wanneer inschrijven (nog) niet mag.
  const isLocked = !canEnroll;
  // Sneak preview-banner: status 'open' (ook voor admin zichtbaar, zodat je ziet
  // wat gebruikers zien; admin kan de builder zelf nog wél gebruiken).
  const isPreview = isPreviewStatus(status);
  // Builder zichtbaar voor iedereen behalve concept/draft (alleen admin).
  const builderVisible = isVisibleToUser(status, isAdmin);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !entry) return;
    if (!predictions) return;
    const podium = ["", "", ""];
    let pts = "", kom = "", youth = "";
    for (const p of predictions) {
      if (p.classification === "gc" && p.position >= 1 && p.position <= 3) podium[p.position - 1] = p.rider_id;
      if (p.classification === "points" && p.position === 1) pts = p.rider_id;
      if (p.classification === "kom" && p.position === 1) kom = p.rider_id;
      if (p.classification === "youth" && p.position === 1) youth = p.rider_id;
    }
    setGcPodium(podium);
    setPointsJersey(pts);
    setMountainJersey(kom);
    setYouthJersey(youth);
    if (jokerIds[0]) setJokerDraft1(jokerIds[0]);
    if (jokerIds[1]) setJokerDraft2(jokerIds[1]);
    hydratedRef.current = true;
  }, [entry, predictions, jokerIds]);

  useEffect(() => {
    if (!entry || !hydratedRef.current || isSubmitted) return;
    const timer = setTimeout(() => {
      const list: Array<{ classification: "gc" | "points" | "kom" | "youth"; position: number; rider_id: string }> = [];
      gcPodium.forEach((rid, i) => { if (rid) list.push({ classification: "gc", position: i + 1, rider_id: rid }); });
      if (pointsJersey) list.push({ classification: "points", position: 1, rider_id: pointsJersey });
      if (mountainJersey) list.push({ classification: "kom", position: 1, rider_id: mountainJersey });
      if (youthJersey) list.push({ classification: "youth", position: 1, rider_id: youthJersey });
      savePredictions.mutate({ entryId: entry.id, predictions: list });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcPodium, pointsJersey, mountainJersey, youthJersey]);

  // Auto-save jokers — ook één losse joker wordt direct bewaard (voorheen pas
  // zodra beide gekozen waren, waardoor een halve keuze verloren kon gaan).
  useEffect(() => {
    if (!entry || !hydratedRef.current || isSubmitted) return;
    const drafts = [jokerDraft1, jokerDraft2].filter(Boolean);
    if (drafts.length === 0) return;
    if (drafts.length === 2 && jokerDraft1 === jokerDraft2) return;
    if (drafts.some((d) => selectedPickRiderIds.has(d))) return;
    // Skip if already saved identically
    const current = [...jokerIds].sort().join(",");
    const next = [...drafts].sort().join(",");
    if (current === next) return;
    const timer = setTimeout(() => {
      saveJoker.mutate({ entryId: entry.id, riderIds: drafts });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jokerDraft1, jokerDraft2]);

  const validPicksByCategory = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const category of categories) {
      const allowed = new Set(category.category_riders.map((row) => row.rider_id));
      const valid = (picksByCategory.get(category.id) ?? []).filter((riderId, index, arr) =>
        allowed.has(riderId) && arr.indexOf(riderId) === index
      );
      map.set(category.id, valid.slice(0, category.max_picks ?? 1));
    }
    return map;
  }, [categories, picksByCategory]);

  const selectedPickRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of validPicksByCategory.values()) for (const id of arr) s.add(id);
    return s;
  }, [validPicksByCategory]);

  const handlePickToggle = async (categoryId: string, riderId: string) => {
    if (!isAuthed) return requireAuth("een renner te kiezen");
    if (!entry) return;
    try {
      // Eén-knops wijzigflow: op een ingediend team eerst automatisch terug naar
      // concept (anders weigert de pick-RPC), daarna gewoon de pick uitvoeren.
      if (isSubmitted) {
        await revertEntry.mutateAsync({ entryId: entry.id });
        toast({ title: "Team weer bewerkbaar — dien opnieuw in als je klaar bent" });
      }
      await togglePick.mutateAsync({ entryId: entry.id, categoryId, riderId });
    } catch (error) {
      toast({
        title: "Opslaan mislukt",
        description: entryErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleSaveJokers = async () => {
    if (!entry) return;
    if (!jokerDraft1 || !jokerDraft2) {
      toast({ title: "Kies twee jokers", variant: "destructive" });
      return;
    }
    if (jokerDraft1 === jokerDraft2) {
      toast({ title: "Jokers moeten uniek zijn", variant: "destructive" });
      return;
    }
    if (selectedPickRiderIds.has(jokerDraft1) || selectedPickRiderIds.has(jokerDraft2)) {
      toast({
        title: "Joker overlap",
        description: "Jokers mogen niet in categorie-picks zitten.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveJoker.mutateAsync({ entryId: entry.id, riderIds: [jokerDraft1, jokerDraft2] });
      toast({ title: "Jokers opgeslagen" });
    } catch (error) {
      toast({
        title: "Jokers opslaan mislukt",
        description: entryErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  // Tussentijds opslaan: picks worden al direct opgeslagen; deze knop flusht
  // bovendien de voorspellingen + jokers en bevestigt dat alles bewaard is.
  const handleSaveDraft = async () => {
    if (!isAuthed) return requireAuth("je team op te slaan");
    if (!entry) return;
    try {
      const list: Array<{ classification: "gc" | "points" | "kom" | "youth"; position: number; rider_id: string }> = [];
      gcPodium.forEach((rid, i) => { if (rid) list.push({ classification: "gc", position: i + 1, rider_id: rid }); });
      if (pointsJersey) list.push({ classification: "points", position: 1, rider_id: pointsJersey });
      if (mountainJersey) list.push({ classification: "kom", position: 1, rider_id: mountainJersey });
      if (youthJersey) list.push({ classification: "youth", position: 1, rider_id: youthJersey });
      await savePredictions.mutateAsync({ entryId: entry.id, predictions: list });
      if (
        jokerDraft1 && jokerDraft2 && jokerDraft1 !== jokerDraft2 &&
        !selectedPickRiderIds.has(jokerDraft1) && !selectedPickRiderIds.has(jokerDraft2)
      ) {
        await saveJoker.mutateAsync({ entryId: entry.id, riderIds: [jokerDraft1, jokerDraft2] });
      }
      toast({ title: "Tussentijds opgeslagen ✓", description: "Je kunt later verder waar je gebleven was." });
    } catch (error) {
      toast({ title: "Opslaan mislukt", description: entryErrorMessage(error), variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!isAuthed) return requireAuth("je team in te dienen");
    if (!entry) return;
    try {
      // Een al-ingediende ploeg is server-side vergrendeld (save-RPC's weigeren
      // met "Entry already submitted"). Zet 'm daarom eerst terug naar concept,
      // bewaar de wijziging (predictions + jokers) en dien opnieuw in.
      if (isSubmitted) {
        await revertEntry.mutateAsync({ entryId: entry.id });
      }
      const list: Array<{ classification: "gc" | "points" | "kom" | "youth"; position: number; rider_id: string }> = [];
      gcPodium.forEach((rid, i) => { if (rid) list.push({ classification: "gc", position: i + 1, rider_id: rid }); });
      if (pointsJersey) list.push({ classification: "points", position: 1, rider_id: pointsJersey });
      if (mountainJersey) list.push({ classification: "kom", position: 1, rider_id: mountainJersey });
      if (youthJersey) list.push({ classification: "youth", position: 1, rider_id: youthJersey });
      await savePredictions.mutateAsync({ entryId: entry.id, predictions: list });
      if (
        jokerDraft1 && jokerDraft2 && jokerDraft1 !== jokerDraft2 &&
        !selectedPickRiderIds.has(jokerDraft1) && !selectedPickRiderIds.has(jokerDraft2)
      ) {
        await saveJoker.mutateAsync({ entryId: entry.id, riderIds: [jokerDraft1, jokerDraft2] });
      }
      await submitEntry.mutateAsync({ entryId: entry.id });
      toast({ title: isSubmitted ? "Wijziging ingediend ✓" : "Team definitief ingediend" });
    } catch (error) {
      toast({
        title: "Indienen mislukt",
        description: entryErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const totalRequired = useMemo(
    () => categories.reduce((sum, c) => sum + (c.max_picks ?? 1), 0),
    [categories]
  );
  const completedPicks = useMemo(() => {
    let n = 0;
    for (const arr of validPicksByCategory.values()) n += arr.length;
    return n;
  }, [validPicksByCategory]);
  const gameReady = !gameLoading && !categoriesLoading && !entryLoading;

  const progressPct = totalRequired > 0 ? Math.round((completedPicks / totalRequired) * 100) : 0;
  const podiumFilled = gcPodium.filter(Boolean).length;
  const jerseysFilled = [pointsJersey, mountainJersey, youthJersey].filter(Boolean).length;
  // "Nog te doen"-items zijn klikbaar: target bepaalt waar de klik heen springt
  // (desktop: scroll naar sectie; mobiel: pager-stap).
  type MissingTarget = "categories" | "jokers" | "predictions";
  const missing: Array<{ label: string; target: MissingTarget }> = [];
  if (completedPicks < totalRequired) {
    missing.push({ label: `Nog ${totalRequired - completedPicks} renner${totalRequired - completedPicks === 1 ? "" : "s"} kiezen in je categorieën`, target: "categories" });
  }
  if (jokerIds.length < 2) {
    missing.push({ label: `Nog ${2 - jokerIds.length} joker${2 - jokerIds.length === 1 ? "" : "s"} aanduiden`, target: "jokers" });
  }
  if (podiumFilled < 3) {
    missing.push({ label: `Eindpodium voorspellen (${podiumFilled}/3)`, target: "predictions" });
  }
  if (jerseysFilled < 3) {
    missing.push({ label: `Truitjes voorspellen — punten, berg & jongeren (${jerseysFilled}/3)`, target: "predictions" });
  }
  const teamComplete = missing.length === 0;

  // Eerste categorie die nog niet vol zit (voor "Ga verder" + missing-kliks).
  const firstIncompleteCatId =
    categories.find((c) => (validPicksByCategory.get(c.id) ?? []).length < (c.max_picks ?? 1))?.id ?? null;

  // Mobiel: spring naar de plek waar dit item in te vullen is.
  const gotoMissingMobile = (target: MissingTarget) => {
    if (target === "categories" && firstIncompleteCatId) jumpToCat(firstIncompleteCatId);
    else jumpToCat("overview"); // jokers + voorspellingen staan op het overzicht
  };

  // Desktop: scroll naar de betreffende sectie (respecteert reduced motion).
  const scrollToSectie = (target: MissingTarget) => {
    const id = target === "categories" ? "sectie-categorieen" : target === "jokers" ? "sectie-jokers" : "sectie-voorspellingen";
    const el = document.getElementById(id);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  // ── Wijzigingsdetectie op een AL INGEDIENDE ploeg ──────────────────────────
  // Auto-save is uit zodra de ploeg is ingediend; een trui-/joker-/podiumwijziging
  // blijft dan lokaal staan. Vergelijk de huidige selectie met de ingediende
  // (persisted) staat → is er verschil dan is de ploeg "dirty" en mag opnieuw
  // ingediend worden.
  const currentPredList = [
    ...gcPodium.map((rid, i) => (rid ? { classification: "gc", position: i + 1, rider_id: rid } : null)),
    pointsJersey ? { classification: "points", position: 1, rider_id: pointsJersey } : null,
    mountainJersey ? { classification: "kom", position: 1, rider_id: mountainJersey } : null,
    youthJersey ? { classification: "youth", position: 1, rider_id: youthJersey } : null,
  ].filter(Boolean) as Array<{ classification: string; position: number; rider_id: string }>;
  const predKey = (l: Array<{ classification: string; position: number; rider_id: string }>) =>
    l.map((p) => `${p.classification}:${p.position}:${p.rider_id}`).sort().join("|");
  const jokerKey = (a: string[]) => [...a].filter(Boolean).sort().join("|");
  const currentJokers = [jokerDraft1, jokerDraft2].filter(Boolean);
  const isDirty =
    isSubmitted &&
    (predKey(currentPredList) !== predKey(predictions) || jokerKey(currentJokers) !== jokerKey(jokerIds));

  const submitBusy = submitEntry.isPending || savePredictions.isPending || saveJoker.isPending;
  const submitLabel = !isSubmitted
    ? "✅ Team definitief indienen"
    : isDirty
      ? (teamComplete ? "✅ Wijziging indienen" : "Vul je ploeg eerst compleet")
      : "✅ Reeds ingediend";
  // Niet-ingediend: indienen mag zodra niet vergrendeld. Ingediend: alleen als er
  // een (geldige, complete) wijziging is.
  const submitDisabled = Boolean(isLocked || submitBusy || (isSubmitted ? !isDirty || !teamComplete : false));
  const submitActive = !isLocked && teamComplete && (!isSubmitted || isDirty);

  // Lookup map for rider name preview (jokers/podium)
  const riderById = useMemo(() => {
    const m = new Map<string, { name: string; start_number: number | null }>();
    for (const r of allStartlistRiders) m.set(r.id, { name: r.name, start_number: r.start_number });
    return m;
  }, [allStartlistRiders]);

  // ── Mobiele flow: categorie-voor-categorie pager (md:hidden) ───────────────
  const [activeCatRaw, setActiveCatRaw] = useState<string | null>(null);
  const mobileHint = useSwipeHint();
  const pagerRef = useRef<HTMLDivElement>(null);

  const mobileKeys = useMemo(() => [...categories.map((c) => c.id), "overview"], [categories]);
  const activeCat =
    activeCatRaw && mobileKeys.includes(activeCatRaw) ? activeCatRaw : categories[0]?.id ?? "overview";

  const riderTeam = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of allStartlistRiders) m.set(r.id, r.teamName);
    return m;
  }, [allStartlistRiders]);

  const scrollPagerTop = () => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = pagerRef.current;
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
      }),
    );
  };
  const jumpToCat = (key: string) => {
    setActiveCatRaw(key);
    mobileHint.dismiss();
    scrollPagerTop();
  };

  // Gedeeld tussen desktop-layout en het mobiele overzicht-scherm.
  const jokersBlock = (
    <div id="sectie-jokers" className="ornate-frame retro-border p-4 relative bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] scroll-mt-24">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--vintage-gold))] via-primary to-[hsl(var(--vintage-gold))]" />
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl">🃏</span>
        <h2 className="font-display text-xl font-bold">Jokers</h2>
      </div>
      <p className="text-sm opacity-80 mb-3 font-serif italic">
        Twee outsiders uit de overige renners. Niet uit een categorie. {jokerPool.length} beschikbaar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {[
          { draft: jokerDraft1, set: setJokerDraft1, exclude: jokerDraft2, label: "Joker 1" },
          { draft: jokerDraft2, set: setJokerDraft2, exclude: jokerDraft1, label: "Joker 2" },
        ].map((slot, i) => {
          const picked = slot.draft ? riderById.get(slot.draft) : null;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border-2 p-3 transition-all",
                picked
                  ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.1]"
                  : "border-dashed border-white/30 bg-white/5"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">
                  {slot.label}
                </span>
                {picked && (
                  <span className="text-[10px] font-mono opacity-70">
                    #{picked.start_number ?? "—"}
                  </span>
                )}
              </div>
              {picked ? (
                <div className="font-display text-lg font-bold mb-2">{picked.name}</div>
              ) : (
                <div className="font-display text-base italic opacity-50 mb-2">Geen keuze</div>
              )}
              <RiderSearchSelect
                riders={jokerPool}
                value={slot.draft}
                onChange={slot.set}
                excludeIds={slot.exclude ? [slot.exclude] : []}
                placeholder="Zoek renner..."
                disabled={Boolean(isLocked)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 text-xs opacity-70">
        <span>Opgeslagen jokers: <strong>{jokerIds.length}/2</strong></span>
        <span className="italic font-serif">Auto-opslaan tijdens kiezen</span>
      </div>
    </div>
  );

  const predictionsSection = (
    <section id="sectie-voorspellingen" className="vintage-paper vintage-frame p-4 md:p-6 relative overflow-hidden scroll-mt-24">
      {/* Affiche-koptekst */}
      <div className="text-center mb-4 md:mb-5 relative">
        <div className="vintage-stamp text-[10px] md:text-[11px] mb-1.5">
          ✦ Pronostiek · Le palmarès final ✦
        </div>
        <h2 className="vintage-numeral text-2xl md:text-4xl mb-1" style={{ letterSpacing: "0.04em" }}>
          KLASSEMENTSVOORSPELLINGEN
        </h2>
        <p className="text-xs md:text-sm font-serif italic" style={{ color: "var(--ink-faded)" }}>
          Voorspel de eindstand — auto-opslaan tijdens typen.
        </p>
        {/* Dubbele inktstreep onder de kop */}
        <div className="mx-auto mt-3 w-44 md:w-56 h-[2px]" style={{ background: "var(--ink-sepia)" }} />
        <div className="mx-auto mt-[2px] w-32 md:w-40 h-[1px]" style={{ background: "var(--ink-sepia)", opacity: 0.5 }} />
      </div>

      {/* ── Podium ─────────────────────────────────────────────── */}
      <div className="mb-7 md:mb-8 relative">
        <div className="vintage-stamp text-center text-[10px] md:text-[11px] mb-4">
          — Eindklassement Podium —
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4 items-end relative">
          {[
            { idx: 1, rank: "2", sokkel: "vintage-sokkel--silver", height: "h-14 md:h-16", order: "order-1", medalVar: { "--medal-rim": "var(--medal-silver)", "--medal-fill": "linear-gradient(180deg,#EAE7E0,#9C9890)" } },
            { idx: 0, rank: "1", sokkel: "vintage-sokkel--winner", height: "h-20 md:h-24", order: "order-2", medalVar: null },
            { idx: 2, rank: "3", sokkel: "vintage-sokkel--bronze", height: "h-12 md:h-14", order: "order-3", medalVar: { "--medal-rim": "var(--medal-bronze)", "--medal-fill": "linear-gradient(180deg,#D69862,#8C5A2A)" } },
          ].map(({ idx, rank, sokkel, height, order, medalVar }) => {
            const otherPodium = gcPodium.filter((_, j) => j !== idx && Boolean(_));
            const picked = gcPodium[idx] ? riderById.get(gcPodium[idx]) : null;
            const isWinner = idx === 0;
            return (
              <div key={idx} className={cn("flex flex-col items-center", order)}>
                {/* Eredecoratie boven het podium */}
                <div className="mb-2 md:mb-3 relative flex items-center justify-center min-h-[64px] md:min-h-[88px]">
                  {isWinner ? (
                    <>
                      {/* Sunburst achter de winnaar */}
                      <div
                        aria-hidden
                        className="absolute inset-0 -m-4 md:-m-6 vintage-sunburst pointer-events-none"
                      />
                      {/* Gele trui — alleen voor de eindwinnaar */}
                      <div className={cn("relative z-10", picked ? "opacity-100" : "opacity-60")}>
                        <TruiBadge type="algemeen" formaat="groot" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      {/* Cocarde-lint */}
                      <div
                        className="vintage-ribbon w-9 md:w-11 h-3.5 md:h-4 -mb-1.5 rounded-t-[2px]"
                        style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)" }}
                      />
                      {/* Emaille-medaillon */}
                      <div
                        className="vintage-medal relative z-10 h-12 w-12 md:h-14 md:w-14 rounded-full flex items-center justify-center"
                        style={medalVar as React.CSSProperties}
                      >
                        <span className="vintage-numeral text-lg md:text-2xl" style={{ color: "var(--ink-sepia)" }}>
                          {rank}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sokkel met emaille/hout-uitstraling */}
                <div
                  className={cn(
                    "vintage-sokkel relative w-full flex flex-col items-center justify-center text-center px-2 py-2 mb-2 rounded-t-md",
                    height,
                    sokkel
                  )}
                >
                  {/* Hoeknieten */}
                  <span aria-hidden className="absolute top-1 left-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--ink-sepia)", opacity: 0.5 }} />
                  <span aria-hidden className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--ink-sepia)", opacity: 0.5 }} />
                  {/* Affiche-cijfer */}
                  <span
                    className={cn(
                      "vintage-numeral leading-none mb-1",
                      isWinner ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"
                    )}
                    style={{
                      color: isWinner ? "var(--ink-sepia)" : "var(--ink-faded)",
                      textShadow: isWinner ? "2px 2px 0 rgba(255,255,255,0.55), 4px 4px 0 rgba(58,42,26,0.18)" : undefined,
                    }}
                    aria-hidden
                  >
                    {rank}
                  </span>
                  {/* Rennernaam of vintage placeholder */}
                  {picked ? (
                    <span
                      className={cn(
                        "font-display font-bold leading-tight line-clamp-2",
                        isWinner ? "text-[12px] md:text-sm" : "text-[11px] md:text-xs"
                      )}
                      style={{ color: "var(--ink-sepia)" }}
                    >
                      {picked.name}
                    </span>
                  ) : (
                    <span className="text-[10px] md:text-xs italic" style={{ color: "var(--ink-sepia)", opacity: 0.7, fontFamily: "'Special Elite','Courier Prime',serif" }}>
                      nog in te vullen
                    </span>
                  )}
                </div>

                {/* Vintage formulier-veld */}
                <div className="w-full">
                  <RiderSearchSelect
                    riders={allStartlistRiders}
                    value={gcPodium[idx]}
                    onChange={(v) => {
                      const next = [...gcPodium];
                      next[idx] = v;
                      setGcPodium(next);
                    }}
                    excludeIds={otherPodium}
                    placeholder="Zoek…"
                    disabled={Boolean(isLocked)}
                    compact
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sectie-scheiding affichestijl */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-[1.5px]" style={{ background: "var(--ink-sepia)" }} />
        <span className="vintage-stamp text-[10px]">Trui-winnaars</span>
        <div className="flex-1 h-[1.5px]" style={{ background: "var(--ink-sepia)" }} />
      </div>

      {/* ── Trui-kaarten (emaille-bordjes) ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          { label: "Maillot à pois",  sub: "Bergtrui",     trui: "berg"     as const, accent: "berg",     value: mountainJersey, setter: setMountainJersey, riders: allStartlistRiders, hint: undefined as string | undefined },
          { label: "Maillot vert",    sub: "Puntentrui",   trui: "punten"   as const, accent: "punten",   value: pointsJersey,   setter: setPointsJersey,   riders: allStartlistRiders, hint: undefined },
          { label: "Maillot blanc",   sub: "Jongerentrui", trui: "jongeren" as const, accent: "jongeren", value: youthJersey,    setter: setYouthJersey,    riders: youthEligibleRiders, hint: `Alleen jongerenklassement-renners (${youthEligibleRiders.length})` },
        ]).map(({ label, sub, trui, accent, value, setter, riders: jerseyRiders, hint }) => {
          const picked = value ? riderById.get(value) : null;
          return (
            <div
              key={label}
              data-accent={accent}
              className={cn("vintage-board p-3 md:p-4 flex flex-col gap-2 relative")}
            >
              {/* Hoeknieten */}
              <span aria-hidden className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
              <span aria-hidden className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
              <span aria-hidden className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />
              <span aria-hidden className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--ink-sepia)", opacity: 0.4 }} />

              {/* Kop: trui + label */}
              <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--ink-sepia)", borderBottomStyle: "dashed", opacity: 1 }}>
                <div className={cn("shrink-0 transition-opacity", picked ? "opacity-100" : "opacity-70")} style={{ filter: "drop-shadow(1px 1px 0 rgba(58,42,26,0.18))" }}>
                  <TruiBadge type={trui} formaat="medium" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="vintage-stamp text-[9px] md:text-[10px]">{sub}</div>
                  <div className="vintage-numeral text-lg md:text-xl leading-tight" style={{ color: "var(--ink-sepia)", letterSpacing: "0.02em" }}>
                    {label}
                  </div>
                </div>
              </div>

              {/* Gekozen renner of vintage placeholder */}
              {picked ? (
                <div className="font-display font-bold text-base truncate" style={{ color: "var(--ink-sepia)" }}>
                  {picked.name}
                </div>
              ) : (
                <div className="vintage-empty rounded-md px-2 py-1.5 text-xs text-center">
                  nog in te vullen
                </div>
              )}

              {/* Vintage formulier-veld */}
              <RiderSearchSelect
                riders={jerseyRiders}
                value={value}
                onChange={setter}
                placeholder="Zoek renner…"
                disabled={Boolean(isLocked)}
                compact
              />
              {hint && (
                <p className="text-[10px] italic" style={{ color: "var(--ink-faded)", fontFamily: "'Special Elite','Courier Prime',serif" }}>
                  {hint}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  // ── Mobiel: één categorie per scherm ──
  const renderCategoryScreen = (category: (typeof categories)[number], idx: number) => {
    const max = category.max_picks ?? 1;
    const selected = validPicksByCategory.get(category.id) ?? [];
    const reached = selected.length >= max;
    const complete = selected.length === max;
    const isLast = idx === categories.length - 1;
    const next = categories[idx + 1];
    const nextLabel = isLast ? "Naar overzicht" : `Volgende: ${next.name}`;
    return (
      <div className="space-y-3">
        {/* Slanke voortgangskop */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Categorie {idx + 1} / {categories.length}
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">{category.name}</h2>
            {category.short_name && category.short_name !== category.name && (
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/80 leading-tight">{category.short_name}</p>
            )}
            <p className="text-xs text-muted-foreground">{max > 1 ? `Kies ${max} renners` : "Kies 1 renner"}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-sm font-bold">
              {completedPicks}<span className="text-muted-foreground">/{totalRequired}</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">renners</div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-mono px-2 py-0.5 rounded-full border",
              complete
                ? "border-[hsl(var(--vintage-gold))/0.5] text-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.1]"
                : "border-border text-muted-foreground"
            )}
          >
            {selected.length}/{max} gekozen
          </span>
          {complete && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--vintage-gold))]">
              <Check className="h-3.5 w-3.5" /> Compleet
            </span>
          )}
        </div>

        {/* Renner-lijst */}
        <div className="space-y-2">
          {category.category_riders.map((row) => {
            if (!row.riders) return null;
            const rid = row.riders.id;
            const isSel = selected.includes(rid);
            const disabled = Boolean(isLocked) || (!isSel && reached && max > 1);
            const team = riderTeam.get(rid);
            return (
              <button
                key={row.rider_id}
                type="button"
                disabled={disabled}
                onClick={() => handlePickToggle(category.id, rid)}
                aria-pressed={isSel}
                aria-label={`${isSel ? "Deselecteer" : "Kies"} ${row.riders.name}`}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border-2 p-3 transition-all text-left",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
                  isSel
                    ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.12] shadow-[inset_3px_0_0_hsl(var(--vintage-gold))]"
                    : "border-border bg-card",
                  disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-mono font-bold border-2",
                    isSel
                      ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))] text-foreground"
                      : "border-border bg-secondary text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {row.riders.start_number ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold leading-tight truncate">{row.riders.name}</span>
                  {team && <span className="block text-xs text-muted-foreground truncate">{team}</span>}
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                    isSel ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))] text-foreground" : "border-border"
                  )}
                  aria-hidden
                >
                  {isSel && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Volgende-knop — kleurt goud zodra de categorie vol is (bevestiging,
            geen auto-doorschuiven: de gebruiker houdt de controle). */}
        <Button
          onClick={() => jumpToCat(isLast ? "overview" : next.id)}
          variant={complete ? "outline" : "default"}
          className={cn(
            "w-full font-bold justify-center gap-1.5",
            complete
              ? "border-2 border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.15] text-[hsl(var(--vintage-gold))] hover:bg-[hsl(var(--vintage-gold))/0.25] hover:text-[hsl(var(--vintage-gold))]"
              : "retro-border-primary",
          )}
        >
          {complete ? `✓ ${nextLabel}` : nextLabel} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // ── Mobiel: overzicht & inzenden (laatste pager-stap) ──
  const renderOverview = () => (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Laatste stap</div>
          <h2 className="font-display text-2xl font-bold leading-tight">Overzicht &amp; inzenden</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-bold">
            {completedPicks}<span className="text-muted-foreground">/{totalRequired}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">renners</div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Ploeg per categorie */}
      <div className="space-y-2">
        {categories.map((cat, idx) => {
          const sel = validPicksByCategory.get(cat.id) ?? [];
          const max = cat.max_picks ?? 1;
          const complete = sel.length === max;
          const names = sel.map((id) => riderById.get(id)?.name ?? "—");
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => jumpToCat(cat.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors",
                complete
                  ? "border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.08]"
                  : "border-amber-500/50 bg-amber-500/10"
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary text-lg">
                {getCategoryIcon(`${cat.name} ${cat.short_name ?? ""}`)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Cat. {idx + 1}</span>
                <span className="block font-display font-bold leading-tight truncate">{cat.short_name ?? cat.name}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {names.length ? names.join(", ") : "Nog niemand gekozen"}
                </span>
              </span>
              {complete ? (
                <Check className="h-5 w-5 shrink-0 text-[hsl(var(--vintage-gold))]" />
              ) : (
                <span className="shrink-0 text-[11px] font-bold text-amber-600">{sel.length}/{max} →</span>
              )}
            </button>
          );
        })}
      </div>

      {jokersBlock}

      {predictionsSection}

      {/* Status + inzenden */}
      {gameLocked ? (
        <div className="retro-border bg-secondary/50 p-3 text-sm">
          🔒 De koers staat op <strong>{game?.status}</strong> — wijzigen niet meer mogelijk.
          {!isSubmitted && " Ploegen met minstens 11 gekozen renners doen automatisch mee."}
        </div>
      ) : !isAuthed ? (
        <div className="ornate-frame retro-border bg-primary/10 border-primary/40 p-4 space-y-3 text-center">
          <p className="text-sm">
            👀 Je bent aan het rondkijken. <strong>Maak een account aan</strong> om je ploeg in te dienen.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full retro-border-primary font-bold">
            Account aanmaken
          </Button>
        </div>
      ) : isSubmitted ? (
        <div className="retro-border bg-emerald-500/10 border-emerald-500/40 p-3 text-sm space-y-2">
          <p>
            {isDirty
              ? <>✏️ <strong>Niet-opgeslagen wijziging.</strong> Klik op "Wijziging indienen" om je nieuwe keuze te bewaren.</>
              : <>✅ <strong>Team ingediend.</strong> Wil je nog iets aanpassen? Pas het aan en dien opnieuw in.</>}
          </p>
          {isDirty && !teamComplete && (
            <p className="text-xs text-amber-700">Je ploeg is nog niet compleet — vul eerst alles in voordat je opnieuw indient.</p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={cn("w-full retro-border-primary font-bold", submitActive && "animate-pulse")}
          >
            {submitLabel}
          </Button>
          <SteunMoment storageKey="kp_steun_ingezonden" text="Steun Koerspoule met een koffie" />
        </div>
      ) : (
        <>
          {!teamComplete && (
            <div className="retro-border bg-amber-500/10 border-amber-500/40 p-3 text-sm">
              <p className="font-display font-bold mb-1">Nog niet voltallig</p>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                {missing.map((m) => (
                  <li key={m.label}>
                    <button type="button" onClick={() => gotoMissingMobile(m.target)} className="text-left hover:underline hover:text-foreground">
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={cn("w-full retro-border-primary font-bold", submitActive && "animate-pulse")}
          >
            {submitLabel}
          </Button>
        </>
      )}
    </div>
  );

  const renderMobileTab = (key: string) => {
    if (key === "overview") return renderOverview();
    const idx = categories.findIndex((c) => c.id === key);
    const cat = categories[idx];
    return cat ? renderCategoryScreen(cat, idx) : null;
  };

  return (
    <div className="container mx-auto px-5 py-4 md:py-6 pb-32 md:pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Vintage Hero */}
          <div className="text-center mb-6">
            <div className="vintage-ornament mb-3">
              <span className="vintage-ornament-symbol">✦</span>
              <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-serif">
                {game?.name ?? "Koerspoule"}
              </span>
              <span className="vintage-ornament-symbol">✦</span>
            </div>
            <h1 className="vintage-heading text-3xl md:text-5xl font-bold mb-2">
              De Ploegleiderswagen
            </h1>
            <p className="text-muted-foreground font-serif italic">
              Kies wijs — één keer per Grand Tour
          </p>
          <div className="vintage-divider mt-4 max-w-md mx-auto" />
        </div>

        {!gameReady && <div className="ornate-frame retro-border bg-card p-6 text-center">Laden...</div>}
        {gameReady && !game && (
          <div className="ornate-frame retro-border bg-card p-6 text-center text-muted-foreground">
            Geen actieve game gevonden.
          </div>
        )}
        {gameReady && game && (
          <Tabs defaultValue="builder" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="builder" className="flex-1">Ploeg samenstellen</TabsTrigger>
              <TabsTrigger value="startlist" className="flex-1">Startlijst</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-5">
              {!builderVisible ? (
                <div className="ornate-frame retro-border bg-card p-6 text-center space-y-3">
                  <div className="text-4xl">🚧</div>
                  <p className="text-muted-foreground font-serif italic max-w-md mx-auto">
                    Inschrijving voorlopig gesloten. Opent zodra de officiële startlijst beschikbaar is.
                  </p>
                </div>
              ) : (
              <>
              {/* Sneak preview (status 'open'): alles zichtbaar, maar inschrijven kan nog niet. */}
              {isPreview && (
                <div className="ornate-frame retro-border bg-[hsl(var(--vintage-gold))/0.12] border-[hsl(var(--vintage-gold))/0.5] p-4 flex items-start gap-3">
                  <Lock className="h-5 w-5 shrink-0 text-[hsl(var(--vintage-gold))] mt-0.5" />
                  <div className="text-sm">
                    <p className="font-display font-bold mb-0.5">Inschrijving nog gesloten</p>
                    <p className="text-muted-foreground font-serif italic">
                      Tot nader order is de inschrijving gesloten. Zodra de officiële startlijst
                      definitief is, kun je je ploeg samenstellen. Je kunt nu al een ploegnaam kiezen,
                      een subpoule starten en vrienden uitnodigen.
                    </p>
                  </div>
                </div>
              )}

              {/* ── MOBIEL: gefocuste categorie-voor-categorie pager (md:hidden) ── */}
              <div className="md:hidden" ref={pagerRef}>
                {gameLocked && (
                  <div className="retro-border bg-secondary/50 p-2.5 text-xs mb-2">
                    🔒 De koers staat op <strong>{game.status}</strong> — wijzigen niet meer mogelijk.
                  </div>
                )}
                {!isAuthed && !gameLocked && (
                  <div className="retro-border bg-primary/10 border-primary/40 p-2.5 text-xs mb-2 flex items-center justify-between gap-2">
                    <span>👀 Rondkijken — account nodig om in te dienen.</span>
                    <Button size="sm" onClick={() => navigate("/login")} className="shrink-0 h-7 px-2 text-xs">Account</Button>
                  </div>
                )}
                <SwipeHintBar visible={mobileHint.visible} onClose={mobileHint.dismiss} className="mx-auto w-fit mb-2" />
                {/* Tikbare stippen — vrij springen naar elke categorie of het overzicht */}
                <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
                  {mobileKeys.map((k) => {
                    const isOverview = k === "overview";
                    const cat = isOverview ? null : categories.find((c) => c.id === k);
                    const sel = cat ? validPicksByCategory.get(cat.id) ?? [] : [];
                    const max = cat?.max_picks ?? 1;
                    const complete = cat ? sel.length === max : teamComplete;
                    const isActive = activeCat === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => jumpToCat(k)}
                        aria-label={isOverview ? "Overzicht" : cat?.short_name ?? cat?.name ?? "Categorie"}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          isActive
                            ? "w-5 bg-primary"
                            : complete
                              ? "w-2.5 bg-[hsl(var(--vintage-gold))]"
                              : "w-2.5 bg-foreground/25",
                          isOverview && !isActive && "w-3.5 bg-foreground/40"
                        )}
                      />
                    );
                  })}
                </div>
                <SwipeCarousel
                  keys={mobileKeys}
                  activeKey={activeCat}
                  onChange={setActiveCatRaw}
                  onSwiped={mobileHint.dismiss}
                  renderTab={renderMobileTab}
                />
              </div>

              {/* ── DESKTOP: bestaande layout (ongewijzigd) ── */}
              <div className="hidden md:block space-y-5">
              {/* Sticky progress bar */}
              <div className="sticky top-2 z-30">
                <div className="ornate-frame retro-border bg-card/95 backdrop-blur p-3 md:p-4">
                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-serif">
                          Renners
                        </span>
                        <span className="text-sm font-mono font-bold">
                          {completedPicks}<span className="text-muted-foreground">/{totalRequired}</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))] transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-base">🃏</span>
                      <span className="font-mono font-bold">
                        {jokerIds.length}<span className="text-muted-foreground">/2</span>
                      </span>
                      <span className="text-xs text-muted-foreground hidden md:inline">Jokers</span>
                    </div>
                    <div>
                      {gameLocked ? (
                        <span className="jersey-badge bg-muted text-muted-foreground border border-border">
                          <Lock className="h-3 w-3" /> Vergrendeld
                        </span>
                      ) : isSubmitted ? (
                        <span className="jersey-badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40">
                          <Check className="h-3 w-3" /> Ingediend
                        </span>
                      ) : teamComplete ? (
                        <span className="jersey-badge bg-[hsl(var(--vintage-gold))/0.15] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold))/0.5]">
                          <Sparkles className="h-3 w-3" /> Klaar om in te dienen
                        </span>
                      ) : (
                        <span className="jersey-badge bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                          🚴‍♂️ Team incompleet
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Nog te doen — concrete nudges naar voltooien (verbergt
                      zichzelf zodra alles klopt, dus ondersteunt zonder te storen). */}
                  {!gameLocked && !isSubmitted && missing.length > 0 && (
                    <ul className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
                      {missing.map((m) => (
                        <li key={m.label}>
                          <button type="button" onClick={() => scrollToSectie(m.target)} className="flex items-center gap-1.5 hover:underline hover:text-foreground">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500/70 shrink-0" />
                            {m.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {gameLocked && (
                <div className="retro-border bg-secondary/50 p-3 text-sm">
                  🔒 De koers staat op <strong>{game.status}</strong> — wijzigen niet meer mogelijk.
                  {!isSubmitted && " Ploegen met minstens 11 gekozen renners doen automatisch mee."}
                </div>
              )}
              {!isAuthed && !gameLocked && (
                <div className="ornate-frame retro-border bg-primary/10 border-primary/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="text-sm">
                    👀 Je bent aan het rondkijken. <strong>Maak een account aan</strong> om je ploeg samen te stellen en officieel in te dienen.
                  </div>
                  <Button onClick={() => navigate("/login")} className="retro-border-primary font-bold">
                    Account aanmaken
                  </Button>
                </div>
              )}
              {!gameLocked && isSubmitted && (
                <div className="space-y-2">
                  <div className="retro-border bg-emerald-500/10 border-emerald-500/40 p-3 text-sm">
                    ✅ <strong>Team ingediend.</strong> Wil je nog iets aanpassen? Pas het aan en dien opnieuw in.
                  </div>
                  <SteunMoment storageKey="kp_steun_ingezonden" text="Steun Koerspoule met een koffie" />
                </div>
              )}


              {/* Categories */}
              <div id="sectie-categorieen" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-24">
                {categories.map((category, idx) => {
                  const selected = validPicksByCategory.get(category.id) ?? [];
                  const max = category.max_picks ?? 1;
                  const reached = selected.length >= max;
                  const complete = selected.length === max;
                  const icon = getCategoryIcon(`${category.name} ${category.short_name ?? ""}`);
                  return (
                    <div
                      id={`cat-${category.id}`}
                      key={category.id}
                      className={cn(
                        "ornate-frame retro-border bg-card p-4 transition-all relative overflow-hidden scroll-mt-32",
                        complete && "ring-2 ring-emerald-500/40 shadow-[0_0_25px_-8px_hsl(var(--primary)/0.4)]"
                      )}
                    >
                      {/* Top gradient strip */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary opacity-70" />
                      {complete && (
                        <span className="absolute top-2 right-2 jersey-badge bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/50">
                          <Check className="h-3 w-3" /> Compleet
                        </span>
                      )}

                      <div className="flex items-center gap-3 mb-1 mt-1">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xl relative transition-colors",
                            complete
                              ? "border-emerald-500 bg-emerald-500/10"
                              : "border-primary/40 bg-primary/10"
                          )}
                        >
                          {icon}
                          {complete && (
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-card shadow-sm">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                              Cat. {idx + 1}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                                complete
                                  ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                  : "border-border text-muted-foreground"
                              )}
                            >
                              {selected.length}/{max}
                            </span>
                          </div>
                          <h2 className="font-display text-lg font-bold leading-tight truncate">
                            {category.short_name ?? category.name}
                          </h2>
                          {category.short_name && (
                            <p className="text-xs text-muted-foreground truncate">{category.name}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mt-3">
                        {category.category_riders.map((row) => {
                          if (!row.riders) return null;
                          const isSelected = selected.includes(row.riders.id);
                          const disabled = Boolean(isLocked) || (!isSelected && reached && max > 1);
                          return (
                            <button
                              key={row.rider_id}
                              type="button"
                              disabled={disabled}
                              onClick={() => handlePickToggle(category.id, row.riders!.id)}
                              aria-pressed={isSelected}
                              aria-label={`${isSelected ? "Deselecteer" : "Kies"} ${row.riders.name}`}
                              className={cn(
                                "group w-full flex items-center justify-between p-2.5 rounded-md border-2 transition-all text-left relative overflow-hidden",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]"
                                  : "border-border hover:border-primary/50 hover:bg-secondary hover:-translate-y-px",
                                disabled ? "opacity-50 cursor-not-allowed hover:translate-y-0" : "cursor-pointer"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-mono font-bold border-2 transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-secondary text-muted-foreground group-hover:border-primary/40"
                                  )}
                                >
                                  {row.riders.start_number ?? "—"}
                                </span>
                                <span className="font-medium font-sans truncate">{row.riders.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isSelected && <Check className="h-5 w-5 text-primary" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Jokers (gedeeld met mobiel overzicht) */}
              {jokersBlock}

              {/* Klassementsvoorspellingen (gedeeld met mobiel overzicht) */}
              {predictionsSection}

              {!gameLocked && !teamComplete && (
                <div className="ornate-frame retro-border bg-amber-500/10 border-amber-500/40 p-4 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🚴‍♂️💨</span>
                    <strong className="font-display text-base">Je Team is nog niet voltallig</strong>
                  </div>
                  <p className="text-muted-foreground mb-2 font-serif italic">
                    Een paar renners hangen nog achter de bezemwagen — vul de gaten op vóór de flamme rouge:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {missing.map((m) => (
                      <li key={m.label}>
                        <button type="button" onClick={() => scrollToSectie(m.target)} className="text-left hover:underline hover:text-foreground">
                          {m.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!gameLocked && !isSubmitted && teamComplete && (
                <div className="retro-border bg-amber-500/10 border-amber-500/40 p-4 text-sm">
                  ⚠️ <strong>Let op:</strong> je ploeg is compleet maar nog <strong>niet ingediend</strong>. Druk op <em>"Team definitief indienen"</em> om je inzending te bevestigen.
                  Ploegen met minstens <strong>11 gekozen renners</strong> doen bij de start automatisch mee, ook als je niet indient — maar zelf indienen blijft de zekerste weg.
                </div>
              )}

              {/* Desktop action row */}
              <div className="hidden md:flex flex-col sm:flex-row gap-2 justify-end items-stretch sm:items-center">
                {!isLocked && !isSubmitted && (
                  <Button variant="outline" onClick={handleSaveDraft} disabled={savePredictions.isPending || saveJoker.isPending}>
                    💾 Tussentijds opslaan
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  className={cn("retro-border-primary font-bold", submitActive && "animate-pulse")}
                  title={isSubmitted && isDirty && !teamComplete ? "Vul eerst je hele ploeg in" : undefined}
                >
                  {submitLabel}
                </Button>
              </div>
              </div>

              {/* ── MOBIEL: sticky onderbalk — voortgang + slimme CTA. Boven de
                  BottomNav geplaatst (die is fixed bottom-0 z-50, anders valt
                  deze balk erachter). Container heeft pb-32 → geen overlap. ── */}
              {!gameLocked && (
                <div
                  className="fixed inset-x-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur px-3 pt-2 pb-2"
                  style={{ bottom: "calc(3.65rem + env(safe-area-inset-bottom))" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono tabular-nums text-muted-foreground truncate">
                        Renners {completedPicks}/{totalRequired} · 🃏 {jokerIds.length}/2
                      </p>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[hsl(var(--vintage-gold))] transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                    {!isAuthed ? (
                      <Button size="sm" onClick={() => navigate("/login")} className="shrink-0 retro-border-primary font-bold">
                        Account
                      </Button>
                    ) : !teamComplete ? (
                      <Button
                        size="sm"
                        onClick={() => (firstIncompleteCatId ? jumpToCat(firstIncompleteCatId) : jumpToCat("overview"))}
                        className="shrink-0 retro-border-primary font-bold"
                      >
                        Ga verder
                      </Button>
                    ) : !isSubmitted || isDirty ? (
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={submitDisabled}
                        className={cn("shrink-0 retro-border-primary font-bold", submitActive && "animate-pulse")}
                      >
                        {submitLabel}
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => jumpToCat("overview")}
                        className="shrink-0 jersey-badge bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                      >
                        ✅ Ingediend
                      </button>
                    )}
                  </div>
                </div>
              )}
              </>
              )}
            </TabsContent>

            <TabsContent value="startlist" className="space-y-4">
              <div className="retro-border bg-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={startlistSearch}
                    onChange={(e) => setStartlistSearch(e.target.value)}
                    placeholder="Zoek op renner..."
                  />
                  <Select value={startlistTeamFilter} onValueChange={setStartlistTeamFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter op team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle teams</SelectItem>
                      {allTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {startlistLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="retro-border bg-card p-4">
                    <Skeleton className="h-6 w-44 mb-3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Array.from({ length: 4 }).map((__, j) => (
                        <div key={j} className="flex items-center gap-2 border rounded-md p-2 bg-secondary/20">
                          <Skeleton className="h-6 w-7 rounded-full shrink-0" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {!startlistLoading &&
                startlist.map((team) => (
                  <div key={team.id} className="ornate-frame retro-border bg-card p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-primary to-[hsl(var(--vintage-gold))]" />
                    <div className="flex items-center gap-3 mb-2 pl-2">
                      {team.jersey_url && (
                        <img
                          src={team.jersey_url}
                          alt={team.name}
                          className="h-[75px] w-[56px] object-contain shrink-0"
                          loading="lazy"
                        />
                      )}
                      <h3 className="font-display text-lg font-bold">{team.name}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {team.riders.map((rider) => (
                        <div key={rider.id} className="border rounded-md p-2 bg-secondary/20 flex items-center gap-2">
                          <span className="inline-flex h-6 min-w-[1.75rem] px-1.5 items-center justify-center rounded-full bg-primary/15 border border-primary/30 font-mono text-xs">
                            {rider.start_number ?? "—"}
                          </span>
                          <span className="font-medium truncate text-slate-800">{rider.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
