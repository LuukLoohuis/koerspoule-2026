/**
 * <Rondleiding> — eenmalige rondleiding langs de vijf secties op mobiel.
 *
 * Waarom dit bestaat: de namen in de onderbalk zijn wielerjargon (Volgwagen,
 * Hors Catégorie). Dat is de identiteit van de site en die blijft, maar een
 * nieuwe deelnemer weet daardoor niet wat er achter zit en komt alleen bij
 * Uitslagen uit. Een rondleiding lost precies dat op: één keer laten zien wat
 * waar zit, zonder de namen op te geven.
 *
 * Secties met eigen onderdelen (Volgwagen, Subpoule, Hors Catégorie) tonen die
 * in dezelfde stap met één regel uitleg. Eén stap per onderdeel zou een
 * rondleiding van twintig schermen worden; dan haakt iedereen af.
 *
 * Tijdens de rondleiding blijft de onderbalk boven het waas zichtbaar en licht
 * de besproken tab op, zodat je ziet waar je straks moet tikken. Welke tab dat
 * is loopt via een piepklein store'tje hieronder in plaats van door props: de
 * onderbalk hangt in de shell, de rondleiding in de pagina, en die twee delen
 * geen gemeenschappelijke ouder waar zo'n prop doorheen kan.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "kp_rondleiding_gezien_v1";

/* --- welke tab in de onderbalk oplicht ------------------------------------ */

let uitgelicht: string | null = null;
let loopt = false;
const luisteraars = new Set<() => void>();

function abonneer(fn: () => void) {
  luisteraars.add(fn);
  return () => { luisteraars.delete(fn); };
}

function zetStand(actief: boolean, navKey: string | null) {
  const nieuweKey = actief ? navKey : null;
  if (loopt === actief && uitgelicht === nieuweKey) return;
  loopt = actief;
  uitgelicht = nieuweKey;
  luisteraars.forEach((fn) => fn());
}

/** De tab die de rondleiding nu bespreekt, of null. */
export function useUitgelichteNav(): string | null {
  return useSyncExternalStore(abonneer, () => uitgelicht, () => null);
}

/**
 * Loopt er een rondleiding? De tabbalk gebruikt dit om zichzelf boven het waas
 * te tillen; op mobiel staat de onderbalk daar al hoog genoeg voor, op de
 * webversie staat de balk gewoon in de pagina.
 */
export function useRondleidingLoopt(): boolean {
  return useSyncExternalStore(abonneer, () => loopt, () => false);
}

export function rondleidingGezien(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function rondleidingHerstarten(): void {
  try { localStorage.removeItem(KEY); } catch { /* negeer */ }
}

/**
 * Eén stap van de rondleiding.
 *  - navKey  : welke tab in de navigatiebalk oplicht.
 *  - ga      : waar de app naartoe springt zodra de stap actief wordt. Bij de
 *              subpoule en Hors Categorie gaat dat tot op het subtabje, zodat
 *              je het scherm ziet waar het over gaat in plaats van een lijstje
 *              met namen.
 *  - onderdelen : alleen nog voor de Volgwagen, waar de subtabjes samen in één
 *              stap passen.
 */
type Stap = {
  navKey: string | null;
  titel: string;
  tekst: string;
  onderdelen?: [string, string][];
  ga?: { sectie: string; sub?: string };
};

export default function Rondleiding({
  open,
  onClose,
  heeftStreekTab,
  heeftLiveTab,
  onNavigeer,
}: {
  open: boolean;
  onClose: () => void;
  /** Streek bestaat alleen bij subpoules die om een woonplaats vragen. */
  heeftStreekTab?: boolean;
  /** Live bestaat alleen bij Meermarathon; elders is er niets live te volgen. */
  heeftLiveTab?: boolean;
  /** Brengt de app naar de sectie (en eventueel het subtabje) van deze stap. */
  onNavigeer?: (sectie: string, sub?: string) => void;
}) {
  const { t } = useTranslation();
  const [stap, setStap] = useState(0);
  // De rondleiding wijst een navigatiebalk aan, en dat is een andere balk per
  // formaat: onderaan op mobiel, bovenaan op de webversie. Alleen de plek van
  // het kaartje en één zinnetje verschillen; de stappen zijn dezelfde.
  const isMobiel = useIsMobile();
  const actief = open;

  /** Subtabje-stap: kort kaartje terwijl het echte scherm eronder openstaat. */
  const sub = (sectie: string, key: string, label: string, uitleg: string): Stap => ({
    navKey: sectie,
    titel: label,
    tekst: uitleg,
    ga: { sectie, sub: key },
  });

  const stappen: Stap[] = [
    {
      navKey: null,
      titel: t("rondleiding.start.titel"),
      tekst: isMobiel ? t("rondleiding.start.tekstMobiel") : t("rondleiding.start.tekstWeb"),
    },
    {
      navKey: "karavaan",
      titel: t("rondleiding.krant.titel"),
      tekst: t("rondleiding.krant.tekst"),
      ga: { sectie: "karavaan" },
    },
    {
      navKey: "team",
      titel: t("rondleiding.volgwagen.titel"),
      tekst: t("rondleiding.volgwagen.tekst"),
      ga: { sectie: "team" },
      onderdelen: [
        [t("team.tabs.myTeam"), t("rondleiding.volgwagen.ploeg")],
        // Live hangt aan de schaatsgame; bij een wielerkoers bestaat het tabje
        // niet en zou het noemen ervan een belofte zijn die nergens uitkomt.
        ...(heeftLiveTab
          ? ([[t("team.tabs.live"), t("rondleiding.volgwagen.live")]] as [string, string][])
          : []),
        [t("team.tabs.prono"), t("rondleiding.volgwagen.prono")],
        [t("team.tabs.palmares"), t("rondleiding.volgwagen.palmares")],
      ],
    },
    {
      navKey: "subpoules",
      titel: t("rondleiding.subpoule.titel"),
      tekst: t("rondleiding.subpoule.tekst"),
      ga: { sectie: "subpoules", sub: "klassement" },
    },
    sub("subpoules", "klassement", t("subpoule.manager.tabRanking"), t("rondleiding.subpoule.ranking")),
    sub("subpoules", "verloop", t("subpoule.manager.tabRisersFallers"), t("rondleiding.subpoule.stijgers")),
    sub("subpoules", "daguitslag", t("subpoule.manager.tabDaguitslag"), t("rondleiding.subpoule.daguitslag")),
    sub("subpoules", "heatmap", t("subpoule.manager.tabHeatmap"), t("rondleiding.subpoule.heatmap")),
    sub("subpoules", "deelnemers", t("subpoule.manager.tabMembers"), t("rondleiding.subpoule.deelnemers")),
    ...(heeftStreekTab
      ? [sub("subpoules", "streek", t("subpoule.manager.tabStreek"), t("rondleiding.subpoule.streek"))]
      : []),
    {
      navKey: "uitslagen",
      titel: t("rondleiding.uitslagen.titel"),
      tekst: t("rondleiding.uitslagen.tekst"),
      ga: { sectie: "uitslagen" },
    },
    {
      navKey: "hors",
      titel: t("rondleiding.hors.titel"),
      tekst: t("rondleiding.hors.tekst"),
      ga: { sectie: "hors", sub: "dartpijl" },
    },
    sub("hors", "dartpijl", t("hors.tabs.dartpijl"), t("rondleiding.hors.dartpijl")),
    sub("hors", "pelotonkeuzes", t("hors.tabs.pelotonkeuzes"), t("rondleiding.hors.pelotonkeuzes")),
    sub("hors", "wielerdirecteur", t("hors.tabs.wielerdirecteur"), t("rondleiding.hors.wielerdirecteur")),
    sub("hors", "superteam", t("hors.tabs.superteam"), t("rondleiding.hors.superteam")),
    sub("hors", "benchmark", t("hors.tabs.benchmark"), t("rondleiding.hors.benchmark")),
  ];

  const huidig = stappen[Math.min(stap, stappen.length - 1)];

  // De onderbalk licht de besproken tab op.
  useEffect(() => {
    zetStand(actief, huidig.navKey);
    return () => zetStand(false, null);
  }, [actief, huidig.navKey]);

  // De app springt mee naar het scherm dat deze stap bespreekt.
  //
  // Via een ref, niet via de afhankelijkheidslijst: onNavigeer komt binnen als
  // een verse pijlfunctie per render, en die in de lijst zetten zou het effect
  // elke render opnieuw laten vuren — inclusief het zetten van zoekparameters,
  // wat zichzelf voedt.
  const navRef = useRef(onNavigeer);
  navRef.current = onNavigeer;
  const gaSectie = huidig.ga?.sectie;
  const gaSub = huidig.ga?.sub;
  useEffect(() => {
    if (!actief || !gaSectie) return;
    navRef.current?.(gaSectie, gaSub);
    // Vanaf de vorige stap kan de pagina halverwege staan; dan zou je van het
    // nieuwe scherm het midden zien.
    window.scrollTo({ top: 0 });
  }, [actief, gaSectie, gaSub]);

  // Achtergrond niet mee laten scrollen tijdens de rondleiding.
  useEffect(() => {
    if (!actief) return;
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = vorige; };
  }, [actief]);

  useEffect(() => {
    if (!actief) return;
    const opToets = (e: KeyboardEvent) => { if (e.key === "Escape") sluit(); };
    window.addEventListener("keydown", opToets);
    return () => window.removeEventListener("keydown", opToets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actief]);

  if (!actief) return null;

  const sluit = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* negeer */ }
    setStap(0);
    onClose();
  };
  const verder = () => (stap >= stappen.length - 1 ? sluit() : setStap((n) => n + 1));

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label={t("rondleiding.aria")}
    >
      {/* Licht waas. Vanaf de subtabjes is het scherm eronder zélf de uitleg,
          dus het mag niet meer wegvallen; het dient nog om het kaartje eruit te
          laten springen. De besproken balk blijft er sowieso buiten: op mobiel
          staat de onderbalk al op z-50, op de webversie tilt de tabbalk
          zichzelf op zodra er een rondleiding loopt. */}
      <div className="absolute inset-0 bg-foreground/25" onClick={sluit} />

      <div
        className={cn(
          "absolute rounded-xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_hsl(var(--foreground))]",
          isMobiel
            // Net boven de onderbalk, zodat de aangewezen tab in beeld blijft.
            ? "inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
            // Midden in beeld; de opgelichte balk staat er ruim boven.
            : "left-1/2 top-1/2 w-[min(30rem,92vw)] -translate-x-1/2 -translate-y-1/2",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("rondleiding.stapVan", { stap: stap + 1, totaal: stappen.length })}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-black leading-tight">{huidig.titel}</h2>
          </div>
          <button
            type="button"
            onClick={sluit}
            aria-label={t("rondleiding.sluiten")}
            className="-mr-1 -mt-1 shrink-0 p-1 text-muted-foreground/70 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1.5 font-serif text-sm leading-relaxed text-muted-foreground">{huidig.tekst}</p>

        {huidig.onderdelen && (
          <ul className="mt-2.5 space-y-1 border-t border-border/70 pt-2.5">
            {huidig.onderdelen.map(([naam, uitleg]) => (
              <li key={naam} className="flex gap-2 text-xs leading-snug">
                <span className="shrink-0 font-bold">{naam}</span>
                <span className="text-muted-foreground">— {uitleg}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={sluit}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t("rondleiding.overslaan")}
          </button>
          {/* Een balkje in plaats van stippen: met de subtabjes erbij zijn het
              er te veel om nog als rij bolletjes te lezen. */}
          <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-foreground/15" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${((stap + 1) / stappen.length) * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={verder}
            className="rounded-md border-2 border-foreground bg-primary px-3.5 py-1.5 text-xs font-display font-bold text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))] active:translate-y-px"
          >
            {stap >= stappen.length - 1 ? t("rondleiding.klaar") : t("rondleiding.volgende")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
