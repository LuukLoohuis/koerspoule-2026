import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKoersThema } from "@/contexts/KoersThemaContext";
import { aankomstplaats } from "@/lib/krantKop";
import { bronregel, intro, splitsKoersEnPoule, splitsNadruk, veiligeUrl } from "@/lib/verslag";
import { podiumMetMij } from "@/lib/krantC";
import type { KaravaanEtappe } from "@/hooks/useKaravaanFeed";
import type { EtappeVerslag } from "@/hooks/useEtappeVerslag";
import type { HorsScores, HorsTabKey } from "@/components/karavaan/MiniStrip";
import HorsTruien from "@/components/krant/HorsTruien";

const MONO = "font-['JetBrains_Mono',monospace]";
const MEDAILLE = ["var(--medal-gold)", "var(--medal-silver)", "var(--medal-bronze)"];

/** Oswald-kop met de dubbele lijn, zoals elke rubriek in de krant. */
function Rubriekkop({ children, rechts, id }: { children: string; rechts?: React.ReactNode; id: string }) {
  return (
    <div className="double-rule flex items-center justify-between pb-1.5">
      <h3 id={id} className="m-0 font-oswald text-[20px] font-bold uppercase tracking-[0.02em] leading-none">
        {children}
      </h3>
      {rechts}
    </div>
  );
}

function Krantlink({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "self-start py-2 text-[13px] font-semibold underline decoration-primary decoration-2 underline-offset-[5px]",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Een alinea van het verslag; deelnemersnamen komen als **naam** binnen. */
function Alinea({ tekst, className }: { tekst: string; className?: string }) {
  return (
    <p className={cn("m-0 font-serif text-[15px] leading-[1.6]", className)}>
      {splitsNadruk(tekst).map((stuk, i) =>
        stuk.vet ? <strong key={i} className="font-bold text-primary">{stuk.tekst}</strong> : <span key={i}>{stuk.tekst}</span>,
      )}
    </p>
  );
}

/**
 * Tab Vandaag: het hoofdartikel over de laatste rit, de daguitslag (podium
 * van de rit en de top van je subpoule) en de Hors Catégorie als drie truien.
 */
export default function KrantVandaag({
  etappe,
  kop,
  verslag,
  subpouleNaam,
  geenSubpoule,
  scores,
  heeftHorsCijfers,
  onOpenHors,
  onOpenDaguitslag,
}: {
  etappe: KaravaanEtappe | null;
  kop: string | null;
  verslag: EtappeVerslag | null;
  subpouleNaam: string | null;
  geenSubpoule: boolean;
  scores: HorsScores;
  heeftHorsCijfers: boolean;
  onOpenHors?: (tab: HorsTabKey) => void;
  onOpenDaguitslag?: (stageNumber: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const thema = useKoersThema();
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";
  const [open, setOpen] = useState(false);

  const tekst = verslag?.tekst?.trim() || null;
  const plaats = etappe ? aankomstplaats(etappe.stage_name) : null;

  if (geenSubpoule) {
    return (
      <div className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center">
        <Newspaper className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="font-display text-lg font-bold">{t("karavaan.feed.noSubpouleTitle")}</p>
        <p className="mt-1 font-serif text-sm italic text-muted-foreground">
          {t("karavaan.feed.noSubpouleBody", { krant: thema.krant })}
        </p>
      </div>
    );
  }

  if (!etappe) {
    return (
      <div className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center">
        <Newspaper className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="font-display text-lg font-bold">{t("karavaan.empty.title", { krant: thema.krant })}</p>
        <p className="mt-1 font-serif text-sm italic text-muted-foreground">{t("karavaan.empty.body")}</p>
      </div>
    );
  }

  const bron = bronregel(verslag?.bron);
  const bronUrl = veiligeUrl(verslag?.bron_url);
  const { koers, poule } = tekst ? splitsKoersEnPoule(tekst) : { koers: [], poule: [] };
  const podiumRit = etappe.rituitslag.filter((r) => r.positie >= 1 && r.positie <= 3).slice(0, 3);
  const podiumSub = podiumMetMij(etappe.dagstand);

  return (
    <div role="tabpanel" className="flex flex-col gap-7">
      {/* ── Hoofdartikel ─────────────────────────────────────────────── */}
      {kop && (
        <article className="flex flex-col gap-2.5">
          <span className="editor-eyebrow">
            {thema.etappe} {etappe.stage_number}
            {plaats ? ` · ${plaats}` : ""}
          </span>
          <h2 className="kop-gold m-0 pb-2.5 font-display text-[34px] font-black leading-[1] tracking-[-0.03em]">{kop}</h2>

          {tekst && !open && (
            <>
              <p className="m-0 line-clamp-2 font-serif text-[16px] leading-[1.5]">
                {plaats && <span className="font-display text-[18px] font-black">{plaats.toUpperCase()} — </span>}
                {intro(tekst, 400)}
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 items-center self-start rounded-full border-[1.5px] border-foreground px-4 text-[13px] font-bold shadow-[1.5px_1.5px_0_hsl(var(--foreground))] transition-transform active:translate-x-px active:translate-y-px active:shadow-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("krantC.leesVerder")}
              </button>
            </>
          )}

          {tekst && open && (
            <div className="flex flex-col gap-2.5">
              {plaats && (
                <p className="m-0 font-oswald text-[10.5px] uppercase tracking-[0.14em]">
                  {plaats}
                  <span className="text-muted-foreground"> —</span>
                </p>
              )}
              {koers.map((p, i) => (
                <Alinea
                  key={i}
                  tekst={p}
                  className={cn(
                    i === 0 &&
                      "first-letter:float-left first-letter:pr-2 first-letter:pt-1 first-letter:font-display first-letter:text-[46px] first-letter:font-black first-letter:leading-[0.82]",
                  )}
                />
              ))}
              {poule.length > 0 && (
                <>
                  <div aria-hidden className="my-1 text-center text-[13px] tracking-[0.5em] text-[hsl(var(--vintage-gold))]">
                    ✦ ✦ ✦
                  </div>
                  <p className={cn(MONO, "m-0 text-center text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted-foreground")}>
                    {t("krantC.uitDePoule")}
                  </p>
                  {poule.map((p, i) => (
                    <Alinea key={i} tekst={p} className="text-center italic" />
                  ))}
                </>
              )}
              {bron && (
                <p className={cn(MONO, "m-0 border-t border-border pt-2 text-[9.5px] uppercase tracking-widest text-muted-foreground")}>
                  {bron}
                  {bronUrl && (
                    <>
                      {" · "}
                      <a
                        href={bronUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                      >
                        {t("krantC.leesOrigineel")}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </>
                  )}
                </p>
              )}
              <Krantlink onClick={() => setOpen(false)}>{t("krantC.inklappen")}</Krantlink>
            </div>
          )}
        </article>
      )}

      {/* ── Daguitslag ───────────────────────────────────────────────── */}
      {(podiumRit.length > 0 || podiumSub.length > 0) && (
        <section aria-labelledby="krantC-daguitslag" className="flex flex-col gap-3.5">
          <Rubriekkop id="krantC-daguitslag">{t("krantC.daguitslag")}</Rubriekkop>

          {podiumRit.length > 0 && (
            <div className="flex flex-col">
              <h4 className={cn(MONO, "mb-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground")}>
                {t("krantC.rit")}
              </h4>
              {podiumRit.map((r, i) => (
                <div
                  key={r.positie}
                  className={cn("flex h-9 items-center gap-2.5 text-[14px]", i < podiumRit.length - 1 && "border-b border-border")}
                >
                  <span
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full font-display text-[12px] font-black text-foreground"
                    style={{ background: MEDAILLE[i] }}
                  >
                    {r.positie}
                  </span>
                  <span className={cn("min-w-0 grow truncate", i === 0 && "font-semibold")}>{r.renner}</span>
                  {r.ploeg && <span className="max-w-[40%] truncate text-[12px] text-muted-foreground">{r.ploeg}</span>}
                </div>
              ))}
            </div>
          )}

          {podiumSub.length > 0 && (
            <div className="flex flex-col">
              <h4 className={cn(MONO, "mb-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground")}>
                {t("krantC.subpouleVandaag", { naam: subpouleNaam ?? "" })}
              </h4>
              {podiumSub.map((r, i) => (
                <div
                  key={`${r.rang}-${r.naam}`}
                  className={cn(
                    "flex h-9 items-center gap-2.5 text-[14px]",
                    i < podiumSub.length - 1 && !r.isMij && "border-b border-border",
                    r.isMij && "-mx-2 rounded px-2 bg-primary/12 font-bold",
                  )}
                >
                  <span className="w-[22px] shrink-0 text-center font-display font-black">{r.rang}</span>
                  <span className="flex min-w-0 grow items-center gap-2">
                    <span className="truncate">{r.naam}</span>
                    {r.isMij && <span className="sticker shrink-0 px-[7px] py-px text-[11px]">{t("krantC.jij")}</span>}
                  </span>
                  <span className={cn("shrink-0 text-[12px] tabular-nums", !r.isMij && "text-muted-foreground")}>
                    {t("krantC.ptKort", { punten: r.punten.toLocaleString(locale) })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {onOpenDaguitslag && (
            <Krantlink onClick={() => onOpenDaguitslag(etappe.stage_number)}>{t("krantC.heleUitslag")}</Krantlink>
          )}
        </section>
      )}

      {/* ── Hors Catégorie ───────────────────────────────────────────── */}
      {heeftHorsCijfers && (
        <section aria-labelledby="krantC-hors" className="flex flex-col gap-3.5">
          <Rubriekkop
            id="krantC-hors"
            rechts={
              onOpenHors && (
                <button
                  type="button"
                  onClick={() => onOpenHors("dartpijl")}
                  className="rounded text-[12px] font-semibold underline decoration-primary decoration-2 underline-offset-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("krantC.heleBijlage")}
                </button>
              )
            }
          >
            {t("krantC.hors")}
          </Rubriekkop>
          <HorsTruien scores={scores} onOpen={onOpenHors} />
        </section>
      )}
    </div>
  );
}
