import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RetroTabs } from "@/components/RetroTabs";
import SubpouleKiezer from "@/components/karavaan/SubpouleKiezer";
import type { HorsTabKey } from "@/components/karavaan/MiniStrip";
import KrantVandaag from "@/components/krant/KrantVandaag";
import KrantMorgen from "@/components/krant/KrantMorgen";
import KrantPerszaal from "@/components/krant/KrantPerszaal";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useAllGames } from "@/hooks/useAllGames";
import { useSubpoules } from "@/hooks/useSubpoules";
import { useGekozenSubpoule } from "@/hooks/useGekozenSubpoule";
import { markKaravaanVisited, useKaravaanFeed } from "@/hooks/useKaravaanFeed";
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import { useEtappeVerslag } from "@/hooks/useEtappeVerslag";
import { useEtappeVoorbeschouwing } from "@/hooks/useEtappeVoorbeschouwing";
import { useStages } from "@/hooks/useResults";
import { useThema } from "@/contexts/ThemaContext";
import { bouwKop, kopUitVerslag } from "@/lib/krantKop";
import { krantNaam, stijging, volgendeRit } from "@/lib/krantC";
import { tourviewUrl } from "@/lib/tourview";

const MONO = "font-['JetBrains_Mono',monospace]";

type Editie = "vandaag" | "morgen" | "perszaal";

/** Eén cel in de donkere stand-balk. */
function Cel({
  label,
  aria,
  onClick,
  eerste,
  children,
}: {
  label: string;
  aria: string;
  onClick?: () => void;
  eerste?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={aria}
      className={cn(
        "flex min-w-0 flex-col items-start justify-center gap-1 px-2.5 text-left",
        !eerste && "border-l border-card/15",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--vintage-gold))]",
        "disabled:cursor-default",
      )}
    >
      <span className={cn(MONO, "max-w-full truncate text-[9.5px] uppercase tracking-[0.14em] text-card/75")}>{label} ›</span>
      {children}
    </button>
  );
}

function Stijging({ delta }: { delta: number | null | undefined }) {
  const s = stijging(delta);
  if (!s) return null;
  return (
    <span className={cn("text-[11px] font-bold tabular-nums", s.teken === "▲" ? "text-[hsl(var(--vintage-gold))]" : "text-card/60")}>
      {s.teken} {s.aantal}
    </span>
  );
}

/**
 * Krant C: de Koerskrant op een telefoon, uit docs/design/krant-ploeg-c.
 *
 * Vaste bovenkant: de krantkop in de woorden van de koers (La Gazzetta ·
 * Tappa 14) met rechts de Informatie-knop, en de donkere stand-balk met je
 * plaats in de subpoule, in het algemeen klassement en je dagscore. Daaronder
 * drie edities: Vandaag (artikel, daguitslag, Hors-truien), Morgen
 * (voorbeschouwing) en Perszaal (de commentatoren). Elke informatie heeft
 * hier één plek; de renners staan onder Ploeg.
 *
 * Zelfde bronnen als de webkrant: de karavaan-feed, de Hors-samenvatting en
 * het etappeverslag, dus dezelfde cijfers op beide.
 */
export default function KrantC({
  gameId,
  gameStatus,
  onOpenHors,
  onOpenSubpoule,
  onOpenUitslagen,
  onOpenDaguitslag,
  className,
}: {
  gameId?: string;
  gameStatus?: string;
  onOpenHors?: (tab: HorsTabKey) => void;
  onOpenSubpoule?: (subpouleId: string) => void;
  onOpenUitslagen?: () => void;
  onOpenDaguitslag?: (stageNumber: number) => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";
  const { user } = useAuth();
  const { thema } = useThema();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;
  const { data: alleGames } = useAllGames();
  const gameMeta = gameId ? alleGames?.find((g) => g.id === gameId) : curGame;

  const subpoulesQuery = useSubpoules(game?.id);
  const subpoules = subpoulesQuery.subpoules;
  const [selectedSubpouleId, setSelectedSubpouleId] = useGekozenSubpoule(subpoules);
  const subpouleNaam = subpoules.find((sp) => sp.id === selectedSubpouleId)?.name ?? null;

  const feed = useKaravaanFeed({ gameId: game?.id, subpouleId: selectedSubpouleId ?? undefined, userId: user?.id });
  const etappes = feed.data?.etappes ?? [];
  const laatste = etappes[0] ?? null;

  const horsSummary = useHorsCategorieSummary(gameId ? { id: gameId, status: gameStatus } : undefined);
  const { data: verslag } = useEtappeVerslag(laatste?.stage_id);
  const { data: stages = [] } = useStages(game?.id);
  const morgen = useMemo(() => volgendeRit(stages), [stages]);
  const { data: voorbeschouwing } = useEtappeVoorbeschouwing(morgen?.id);

  const [editie, setEditie] = useState<Editie>("vandaag");
  const [infoOpen, setInfoOpen] = useState(false);

  // Bezoek markeren zoals de webkrant doet, zodat "nieuw sinds je laatste
  // bezoek" op beide klopt.
  useEffect(() => {
    if (!user?.id) return;
    const id = setTimeout(() => void markKaravaanVisited(), 1500);
    return () => clearTimeout(id);
  }, [user?.id]);

  // De kop: uit de generator als die de winnaar noemt, anders het sjabloon;
  // zonder winnaar de eerste zin van het verslag.
  const kop = useMemo(() => {
    if (!laatste) return null;
    const gebouwd = bouwKop({
      gegenereerd: laatste.krant_kop,
      winnaar: laatste.ritwinnaar,
      etappeNaam: laatste.stage_name,
      etappeNummer: laatste.stage_number,
      poulenamen: [
        ...laatste.subpouleStandings.flatMap((r) => [r.team_name, r.display_name]),
        ...laatste.overallStandings.flatMap((r) => [r.team_name, r.display_name]),
      ],
    });
    if (gebouwd) return gebouwd;
    const tekst = verslag?.tekst?.trim();
    return tekst ? kopUitVerslag(tekst) ?? `${thema.etappe} ${laatste.stage_number}` : null;
  }, [laatste, verslag?.tekst, thema.etappe]);

  const mijSub = laatste?.subpouleStandings.find((r) => r.is_me) ?? null;
  const mijOver = laatste?.overallStandings.find((r) => r.is_me) ?? null;
  const dagpunten = laatste?.mijnDagpunten ?? null;
  const dagrang = laatste?.mijnDagrangOverall ?? null;

  const heeftHorsCijfers =
    horsSummary.monkeyBeatPct !== null || horsSummary.emiratesPct !== null || horsSummary.directorScore !== null;
  const geenSubpoule = subpoules.length === 0 && !subpoulesQuery.isLoading;
  const commentaarLaden = Boolean(laatste && !laatste.michel_tekst && !laatste.jose_tekst && laatste.subpouleStandings.length >= 2);
  const profielUrl = morgen ? tourviewUrl(gameMeta?.game_type, gameMeta?.year, morgen.stage_number) : null;

  const uitleg: Array<{ symbool: ReactNode; tekst: string }> = [
    { symbool: <span className={cn(MONO, "text-[16px] font-bold tabular-nums")}>#3</span>, tekst: t("krantC.uitlegPlaats") },
    { symbool: <span className="text-[14px] font-bold text-[var(--vintage-green)]">▲ 2</span>, tekst: t("krantC.uitlegStijging") },
    {
      symbool: (
        <span className={cn(MONO, "text-[16px] font-bold tabular-nums")}>
          48 <span className="text-[11px] font-normal">{t("ploegC.pt")}</span>
        </span>
      ),
      tekst: t("krantC.uitlegPunten"),
    },
    { symbool: <span className="sticker px-[7px] py-px text-[11px] not-italic">{t("krantC.jij")}</span>, tekst: t("krantC.uitlegJij") },
    {
      symbool: (
        <span className="flex gap-[3px]">
          {["var(--medal-gold)", "var(--medal-silver)", "var(--medal-bronze)"].map((k) => (
            <span key={k} className="h-4 w-4 rounded-full" style={{ background: k }} />
          ))}
        </span>
      ),
      tekst: t("krantC.uitlegPodium"),
    },
    { symbool: <span className="font-stamp text-[11px] uppercase tracking-[0.06em]">Hors</span>, tekst: t("krantC.uitlegHors") },
  ];

  return (
    <div data-eigen-typografie className={cn("font-inter flex flex-col gap-5", className)}>
      {/* ── Vaste bovenkant: krantkop + stand-balk ─────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex h-10 items-center justify-between gap-2 pt-1">
          <h1
            className="m-0 flex min-w-0 items-baseline gap-2 whitespace-nowrap"
            aria-label={laatste ? t("krantC.kopAria", { krant: krantNaam(thema), etappe: thema.etappe, nummer: laatste.stage_number }) : krantNaam(thema)}
          >
            <span className="truncate font-display text-[25px] font-black italic tracking-[-0.02em]">{krantNaam(thema)}</span>
            {laatste && (
              <>
                <span aria-hidden className="text-[20px] text-[hsl(var(--vintage-gold))]">·</span>
                <span className="font-oswald text-[19px] font-semibold uppercase tracking-[0.04em]">
                  {thema.etappe} {laatste.stage_number}
                </span>
              </>
            )}
          </h1>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label={t("krantC.informatieAria")}
            aria-expanded={infoOpen}
            className="-mr-1 flex h-9 shrink-0 items-center gap-[5px] px-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full border-[1.5px] border-current font-display text-[11px] font-bold italic leading-none">
              i
            </span>
            <span className={cn(MONO, "text-[9.5px] uppercase tracking-[0.12em]")}>{t("krantC.informatie")}</span>
          </button>
        </div>

        <section aria-label={t("krantC.standAria")} className="-mx-5 flex h-[82px] flex-col bg-foreground text-card">
          <div aria-hidden className="h-[3px] bg-linear-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
          <div className="grid grow grid-cols-3 px-1.5">
            <Cel
              eerste
              label={subpouleNaam ?? t("karavaan.ministrip.labelSubpoule")}
              aria={t("krantC.subpouleAria", { naam: subpouleNaam ?? "", rang: mijSub?.rank ?? "–", totaal: laatste?.subpouleStandings.length ?? "–" })}
              onClick={selectedSubpouleId && onOpenSubpoule ? () => onOpenSubpoule(selectedSubpouleId) : undefined}
            >
              <span className="flex items-baseline gap-[5px]">
                <span className={cn(MONO, "text-[24px] font-bold leading-none tabular-nums")}>{mijSub ? `#${mijSub.rank}` : "—"}</span>
                {laatste && <span className="text-[11px] text-card/75">/{laatste.subpouleStandings.length.toLocaleString(locale)}</span>}
              </span>
              <Stijging delta={mijSub?.delta_rank} />
            </Cel>
            <Cel
              label={t("krantC.celAlgemeen")}
              aria={t("krantC.algemeenAria", { rang: mijOver?.rank ?? "–", totaal: laatste?.overallStandings.length ?? "–" })}
              onClick={onOpenUitslagen}
            >
              <span className={cn(MONO, "text-[24px] font-bold leading-none tabular-nums")}>{mijOver ? `#${mijOver.rank}` : "—"}</span>
              <span className="flex items-baseline gap-1.5 text-[11px] text-card/75 tabular-nums">
                {laatste && <span>/{laatste.overallStandings.length.toLocaleString(locale)}</span>}
                <Stijging delta={mijOver?.delta_rank} />
              </span>
            </Cel>
            <Cel
              label={t("krantC.celVandaag")}
              aria={t("krantC.vandaagAria", { punten: dagpunten ?? "–", rang: dagrang ?? "–" })}
              onClick={laatste && onOpenDaguitslag ? () => onOpenDaguitslag(laatste.stage_number) : undefined}
            >
              <span className="flex items-baseline gap-1">
                <span
                  className={cn(MONO, "text-[24px] font-bold leading-none tabular-nums")}
                  style={{ color: "color-mix(in srgb, hsl(var(--primary)) 72%, white)" }}
                >
                  {dagpunten == null ? "—" : dagpunten.toLocaleString(locale)}
                </span>
                <span className="text-[11px] text-card/75">{t("ploegC.pt")}</span>
              </span>
              <span className="text-[11px] text-card/75 tabular-nums">
                {dagrang != null ? t("krantC.vdDag", { rang: dagrang.toLocaleString(locale) }) : laatste ? t("krantC.geenDagrang") : " "}
              </span>
            </Cel>
          </div>
        </section>

        {subpoules.length > 1 && (
          <div className="-mx-2 flex">
            <SubpouleKiezer subpoules={subpoules} selectedId={selectedSubpouleId} onSelect={setSelectedSubpouleId} />
          </div>
        )}
      </div>

      {/* ── Tabbalk ─────────────────────────────────────────────────────── */}
      <RetroTabs
        variant="segment"
        gelijkeBreedte
        className="h-11"
        aria-label={t("krantC.tabsAria")}
        active={editie}
        onChange={(k) => setEditie(k as Editie)}
        tabs={[
          { key: "vandaag", label: t("krantC.tabVandaag") },
          { key: "morgen", label: t("krantC.tabMorgen") },
          { key: "perszaal", label: t("krantC.tabPerszaal") },
        ]}
      />

      {editie === "vandaag" && (
        <KrantVandaag
          etappe={laatste}
          kop={kop}
          verslag={verslag ?? null}
          subpouleNaam={subpouleNaam}
          geenSubpoule={geenSubpoule}
          scores={horsSummary}
          heeftHorsCijfers={heeftHorsCijfers}
          onOpenHors={onOpenHors}
          onOpenDaguitslag={onOpenDaguitslag}
        />
      )}
      {editie === "morgen" && <KrantMorgen rit={morgen} tekst={voorbeschouwing ?? null} profielUrl={profielUrl} />}
      {editie === "perszaal" && <KrantPerszaal etappe={laatste} laden={commentaarLaden} />}

      {/* ── Informatie-overlay ──────────────────────────────────────────── */}
      <DialogPrimitive.Root open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/45 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            data-eigen-typografie
            className={cn(
              "font-inter fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-50 mx-auto max-h-[calc(100vh-24px)] max-w-[420px] overflow-y-auto",
              "rounded-[9px] border-2 border-foreground bg-card px-4 pb-4 pt-3.5 text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] outline-hidden",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            )}
          >
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="vintage-heading m-0 text-[20px] font-bold tracking-[0.07em]">
                {t("krantC.informatie")}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label={t("krantC.informatieSluiten")}
                className="-mr-2 grid h-9 w-9 place-items-center rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className={cn(MONO, "mb-2 mt-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground")}>
              {t("krantC.informatieEyebrow")}
            </DialogPrimitive.Description>
            <div className="flex flex-col">
              {uitleg.map((rij, i) => (
                <div key={i} className="flex min-h-[52px] items-center gap-3.5 border-b border-border py-1.5 last:border-b-0">
                  <span className="w-14 shrink-0">{rij.symbool}</span>
                  <span className="text-[13px] leading-[1.4]">{rij.tekst}</span>
                </div>
              ))}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
