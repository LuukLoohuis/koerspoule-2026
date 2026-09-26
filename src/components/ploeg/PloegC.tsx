import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Wielertrui, { TruiBorst } from "@/components/retro/Wielertrui";
import wielershirt from "@/assets/wielershirt.png";
import { usePloegRanglijst } from "@/hooks/usePloegRanglijst";
import { useToast } from "@/hooks/use-toast";
import { entryErrorMessage } from "@/hooks/useEntry";
import {
  ploegDagpunten,
  ploegTotaalTotRit,
  sorteerRenners,
  telPunten,
  topscorerId,
  type Sortering,
} from "@/lib/ploegRanglijst";

/** JetBrains Mono, zoals de eyebrows en stempels elders op de site. */
const MONO = "font-['JetBrains_Mono',monospace]";

/**
 * Ploeg C: Mijn ploeg op een telefoon, uit docs/design/krant-ploeg-c.
 *
 * Eén ranglijst van je eigen renners in plaats van de cockpit met meters en
 * wijzers. Bovenaan je ploegkaart met het totaal en de dagpunten, daaronder
 * de rit-kiezer en de schakelaar Punten/Vandaag, dan de rijen. Alles wat
 * over de poule gaat (standen, Hors-cijfers) staat op de Krant en niet hier.
 */
export default function PloegC({
  gameId,
  focusNameSignal,
  className,
}: {
  gameId?: string;
  /** Bump om de naam-editor te openen (deep-link ?edit=naam, de nudge-balk). */
  focusNameSignal?: number;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";
  const fmt = (n: number) => n.toLocaleString(locale);
  const { toast } = useToast();
  const data = usePloegRanglijst(gameId);

  const [sortering, setSortering] = useState<Sortering>("punten");
  const [gekozenRit, setGekozenRit] = useState<number | null>(null);
  const laatsteRit = data.ritten[data.ritten.length - 1] ?? null;
  const rit = (gekozenRit != null ? data.ritten.find((r) => r.nummer === gekozenRit) : undefined) ?? laatsteRit;
  const ritN = rit?.nummer ?? null;
  const teruggespoeld = Boolean(rit && laatsteRit && rit.nummer < laatsteRit.nummer);

  const rijen = useMemo(
    () => sorteerRenners(data.renners.map((r) => ({ ...r, ...telPunten(r.etappes, ritN) })), sortering),
    [data.renners, ritN, sortering],
  );
  const top = useMemo(() => topscorerId(rijen), [rijen]);
  const opgaves = rijen.filter((r) => r.opgave).length;

  const ritNummerVan = useMemo(() => new Map(data.ritten.map((r) => [r.id, r.nummer])), [data.ritten]);
  const dagPloeg = ploegDagpunten(data.ploegPunten, rit?.id ?? null);
  // Actuele stand: het officiële totaal (na de slotrit mét voorspelbonus, zoals
  // Uitslagen). Teruggespoeld: de tussenstand t/m die rit.
  const totaalPloeg =
    !teruggespoeld && data.officieelTotaal != null
      ? data.officieelTotaal
      : ploegTotaalTotRit(data.ploegPunten, ritNummerVan, ritN);

  // ── Ploegnaam ─────────────────────────────────────────────────────────────
  const [bewerkt, setBewerkt] = useState(false);
  const [concept, setConcept] = useState("");
  const invoerRef = useRef<HTMLInputElement>(null);
  const laatsteSignaal = useRef(0);
  useEffect(() => {
    if (!focusNameSignal || focusNameSignal === laatsteSignaal.current || !data.entry?.id) return;
    laatsteSignaal.current = focusNameSignal;
    setConcept(data.teamName ?? "");
    setBewerkt(true);
  }, [focusNameSignal, data.entry?.id, data.teamName]);
  useEffect(() => {
    if (!bewerkt) return;
    const id = requestAnimationFrame(() => invoerRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [bewerkt]);

  const naamOpslaan = async () => {
    const naam = concept.trim();
    if (!naam) return;
    try {
      await data.saveTeamName.mutateAsync({ entryId: data.entry?.id, teamName: naam });
      toast({ title: t("ploegC.naamOpgeslagen") });
      setBewerkt(false);
    } catch (err) {
      toast({ title: t("ploegC.naamMislukt"), description: entryErrorMessage(err), variant: "destructive" });
    }
  };

  if (data.laden) {
    return (
      <div data-eigen-typografie className={cn("font-inter", className)} aria-busy>
        <div className="retro-border bg-card flex items-center gap-3.5 px-3.5 py-3 animate-pulse">
          <div className="h-[63px] w-[56px] rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-7 w-1/3 rounded bg-muted" />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("ploegC.laden")}</p>
      </div>
    );
  }

  if (!data.heeftPloeg) {
    return (
      <div data-eigen-typografie className={cn("font-inter retro-border bg-card p-5 text-center", className)}>
        <div className="mb-2 text-4xl" aria-hidden>🚴‍♂️</div>
        <p className="font-display text-xl font-bold">{t("ploegC.geenPloegTitel")}</p>
        <p className="mt-1 font-serif text-sm italic text-muted-foreground">{t("ploegC.geenPloegTekst")}</p>
        <Link
          to="/team-samenstellen"
          className="mt-4 inline-flex h-10 items-center rounded-full border-[1.5px] border-foreground px-4 text-[13px] font-bold shadow-[1.5px_1.5px_0_hsl(var(--foreground))]"
        >
          {t("ploegC.naarPloegbouwer")}
        </Link>
      </div>
    );
  }

  const ploegnaam = data.teamName?.trim() || t("ploegC.naamFallback");

  return (
    <div data-eigen-typografie className={cn("font-inter flex flex-col gap-4", className)}>
      {/* ── Ploegkaart ──────────────────────────────────────────────────── */}
      <section aria-label={t("ploegC.ploegAria")} className="retro-border bg-card flex items-center gap-3.5 px-3.5 py-3">
        <Wielertrui breedte={56} hoogte={63} schaduw={1.5}>
          <TruiBorst>
            <span className="font-display text-[13px] font-black text-primary-foreground">{rijen.length}</span>
          </TruiBorst>
        </Wielertrui>

        <div className="flex min-w-0 grow flex-col gap-1">
          {bewerkt ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                void naamOpslaan();
              }}
            >
              <Input
                ref={invoerRef}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setBewerkt(false);
                }}
                placeholder={t("ploegC.naamPlaceholder")}
                maxLength={40}
                aria-label={t("ploegC.naamWijzigen")}
                className="h-9 min-w-0 flex-1 border border-border bg-background px-2 font-display text-[17px] font-bold shadow-none focus-visible:ring-1"
              />
              <button
                type="submit"
                disabled={!concept.trim() || data.saveTeamName.isPending}
                aria-label={t("ploegC.naamOpslaan")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-primary disabled:opacity-40"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setBewerkt(false)}
                aria-label={t("ploegC.naamAnnuleren")}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-0.5">
              <h2 className="min-w-0 truncate font-display text-[21px] font-bold leading-tight tracking-[-0.02em]">
                {ploegnaam}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setConcept(data.teamName ?? "");
                  setBewerkt(true);
                }}
                aria-label={t("ploegC.naamWijzigen")}
                className="grid h-9 w-9 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="flex items-baseline gap-1">
              <span className={cn(MONO, "text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums")}>
                {fmt(totaalPloeg)}
              </span>
              <span className="text-[12px] font-semibold text-muted-foreground">{t("ploegC.pt")}</span>
            </span>
            {rit && dagPloeg > 0 && (
              <span className="sticker sticker--gold whitespace-nowrap px-2 py-0.5 text-[12px] tabular-nums">
                {teruggespoeld
                  ? t("ploegC.ritSticker", { punten: fmt(dagPloeg), rit: rit.nummer })
                  : t("ploegC.vandaagSticker", { punten: fmt(dagPloeg) })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Rit-kiezer en sortering ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        {data.ritten.length > 0 && ritN != null ? (
          <Select value={String(ritN)} onValueChange={(v) => setGekozenRit(Number(v))}>
            <SelectTrigger
              aria-label={t("ploegC.ritKiezerAria")}
              className="h-10 w-auto gap-1.5 rounded-full border-[1.5px] border-foreground bg-transparent px-3 py-0 text-[13px] font-bold text-foreground shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring [&>svg]:h-4 [&>svg]:w-4 [&>svg]:opacity-100"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {[...data.ritten].reverse().map((r) => (
                <SelectItem key={r.id} value={String(r.nummer)}>
                  {t("ploegC.standTm", { rit: r.nummer })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="inline-flex h-10 items-center rounded-full border-[1.5px] border-dashed border-muted-foreground/60 px-3 text-[13px] font-semibold text-muted-foreground">
            {t("ploegC.geenUitslag")}
          </span>
        )}

        <div role="group" aria-label={t("ploegC.sorteerAria")} className="flex h-8 rounded-full bg-secondary p-0.5">
          {(["punten", "vandaag"] as const).map((k) => {
            const aan = sortering === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={aan}
                onClick={() => setSortering(k)}
                className={cn(
                  "rounded-full px-2.5 text-[11.5px] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  aan
                    ? "bg-card font-bold text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                    : "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "punten" ? t("ploegC.sorteerPunten") : t("ploegC.sorteerVandaag")}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Ranglijst ───────────────────────────────────────────────────── */}
      <section aria-label={t("ploegC.ranglijstAria")} className="flex flex-col">
        <div
          className={cn(
            MONO,
            "flex h-6 items-center gap-2.5 border-b border-foreground pb-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground",
          )}
          aria-hidden
        >
          <span className="w-[22px]">#</span>
          <span className="w-[30px]" />
          <span className="grow">{t("ploegC.kolomRenner")}</span>
          <span className="w-[48px] text-right">{ritN != null ? t("ploegC.kolomRit", { rit: ritN }) : "–"}</span>
          <span className="w-[52px] text-right">{t("ploegC.kolomTotaal")}</span>
        </div>

        <ol className="flex flex-col">
          {rijen.map((r, i) => {
            const isTop = r.id === top;
            return (
              <li
                key={r.id}
                className={cn(
                  "flex min-h-[54px] items-center gap-2.5 border-b border-border py-1.5",
                  isTop && "-mx-2 rounded-md border-b-transparent bg-primary/10 px-2",
                )}
              >
                <span className="w-[22px] shrink-0 font-display text-[13px] font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>

                <Wielertrui
                  src={r.truiUrl ?? wielershirt}
                  alt={r.ploeg ?? ""}
                  breedte={30}
                  hoogte={34}
                  className={cn(r.opgave && "opacity-45")}
                />

                <span className="flex min-w-0 grow flex-col gap-px">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "min-w-0 truncate text-[14px] leading-tight",
                        r.opgave
                          ? "font-medium text-muted-foreground line-through decoration-[1.5px]"
                          : "font-bold",
                      )}
                    >
                      {r.naam}
                    </span>
                    {r.joker && r.multiplier > 1 && (
                      <span
                        className={cn(MONO, "shrink-0 rounded-[3px] bg-foreground/8 px-1 text-[9px] font-bold text-muted-foreground")}
                        aria-label={t("ploegC.jokerAria", { multiplier: r.multiplier })}
                      >
                        ×{r.multiplier}
                      </span>
                    )}
                    {isTop && (
                      <span className="sticker shrink-0 px-1.5 py-0 text-[10px] leading-[18px]">{t("ploegC.top")}</span>
                    )}
                    {r.opgave && (
                      <span className="shrink-0 rounded-[3px] border-[1.5px] border-muted-foreground px-[5px] font-stamp text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
                        {t("ploegC.opgave")}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {[r.categorie === "Joker" ? t("ploegC.joker") : r.categorie, r.ploeg].filter(Boolean).join(" · ")}
                  </span>
                </span>

                <span
                  className={cn(
                    MONO,
                    "w-[48px] shrink-0 text-right text-[13px] tabular-nums",
                    r.dag > 0 ? "font-bold text-[var(--vintage-green)]" : "text-muted-foreground",
                  )}
                >
                  {r.dag > 0 ? `+${fmt(r.dag)}` : "–"}
                </span>
                <span
                  className={cn(
                    "w-[52px] shrink-0 text-right font-display text-[18px] font-black leading-none tabular-nums",
                    r.opgave && "text-muted-foreground",
                  )}
                >
                  {fmt(r.totaal)}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center justify-between pt-2.5 text-[12px] text-muted-foreground">
          <span>
            {t("ploegC.renners", { count: rijen.length })}
            {opgaves > 0 && ` · ${t("ploegC.opgaves", { count: opgaves })}`}
          </span>
          <span className="font-serif italic">{t("ploegC.truienBron")}</span>
        </div>
      </section>
    </div>
  );
}
