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

/** Uitsparing rond het opgelichte vlak, in schermco\u00f6rdinaten. */
type Rechthoek = { top: number; left: number; width: number; height: number };

const RAND = 6;

function omlijst(el: HTMLElement): Rechthoek {
  const r = el.getBoundingClientRect();
  return {
    top: r.top - RAND,
    left: r.left - RAND,
    width: r.width + RAND * 2,
    height: r.height + RAND * 2,
  };
}

/* --- welke tab in de onderbalk oplicht ------------------------------------ */

let uitgelicht: string | null = null;
let uitgelichtSub: string | null = null;
const luisteraars = new Set<() => void>();

function abonneer(fn: () => void) {
  luisteraars.add(fn);
  return () => { luisteraars.delete(fn); };
}

function zetStand(actief: boolean, navKey: string | null, subKey: string | null) {
  const nieuweKey = actief ? navKey : null;
  const nieuweSub = actief ? subKey : null;
  if (uitgelicht === nieuweKey && uitgelichtSub === nieuweSub) return;
  uitgelicht = nieuweKey;
  uitgelichtSub = nieuweSub;
  luisteraars.forEach((fn) => fn());
}

/** De tab die de rondleiding nu bespreekt, of null. */
export function useUitgelichteNav(): string | null {
  return useSyncExternalStore(abonneer, () => uitgelicht, () => null);
}

/**
 * Welk subtabje de rondleiding bespreekt. De subbalk gebruikt dit om dat ene
 * tabje bóven de donkere laag te tillen — dan licht het op terwijl de rest
 * eronder blijft en dus donker wordt.
 */
export function useUitgelichtSubtab(): string | null {
  return useSyncExternalStore(abonneer, () => uitgelichtSub, () => null);
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
  /**
   * Welk vlak oplicht. Standaard de tab in de navigatiebalk; bij een subtabje
   * juist het hele inhoudsvlak, want dáár gaat de uitleg over. Alleen de
   * hoofdtab laten oplichten terwijl je het over de heatmap hebt, wijst naar
   * de verkeerde plek.
   */
  doel?: string;
  /**
   * Een losse pagina in plaats van een tabje. De rondleiding leeft op Mijn
   * Peloton, dus daarheen navigeren zou hem beëindigen; vandaar een knop die
   * de bezoeker zelf laat kiezen. De uitleg staat er sowieso bij.
   */
  link?: { pad: string; knop: string };
};

export default function Rondleiding({
  open,
  onClose,
  heeftStreekTab,
  heeftLiveTab,
  heeftSubpoule,
  onNavigeer,
}: {
  open: boolean;
  onClose: () => void;
  /** Streek bestaat alleen bij subpoules die om een woonplaats vragen. */
  heeftStreekTab?: boolean;
  /** Live bestaat alleen bij Meermarathon; elders is er niets live te volgen. */
  heeftLiveTab?: boolean;
  /** Zonder subpoule bestaan de subtabjes niet; dan blijft het bij de sectie. */
  heeftSubpoule?: boolean;
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
    // Het inhoudsvlak van de sectie, niet het tabje in de balk.
    doel: `${sectie}-inhoud`,
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
      ga: { sectie: "team", sub: "ploeg" },
    },
    sub("team", "ploeg", t("team.tabs.myTeam"), t("rondleiding.volgwagen.ploeg")),
    // Live hangt aan de schaatsgame; bij een wielerkoers bestaat het tabje niet
    // en zou een stap erover een belofte zijn die nergens uitkomt.
    ...(heeftLiveTab
      ? [sub("team", "live", t("team.tabs.live"), t("rondleiding.volgwagen.live"))]
      : []),
    sub("team", "prono", t("team.tabs.prono"), t("rondleiding.volgwagen.prono")),
    sub("team", "palmares", t("team.tabs.palmares"), t("rondleiding.volgwagen.palmares")),
    {
      navKey: "team",
      titel: t("rondleiding.ploegbouwer.titel"),
      tekst: t("rondleiding.ploegbouwer.tekst"),
      link: { pad: "/team-samenstellen", knop: t("rondleiding.ploegbouwer.knop") },
    },
    {
      navKey: "subpoules",
      titel: t("rondleiding.subpoule.titel"),
      tekst: heeftSubpoule ? t("rondleiding.subpoule.tekst") : t("rondleiding.subpoule.tekstZonder"),
      ga: { sectie: "subpoules", sub: heeftSubpoule ? "klassement" : undefined },
    },
    // Zonder subpoule is er niets om langs te lopen: dan zie je het overzicht
    // met "maak of word lid van een subpoule" en houdt het daar op.
    ...(heeftSubpoule
      ? [
          {
      navKey: "subpoules",
      titel: t("rondleiding.subpoule.meedoenTitel"),
      tekst: t("rondleiding.subpoule.meedoenTekst"),
      ga: { sectie: "subpoules" },
    },
    {
      navKey: "subpoules",
      titel: t("rondleiding.subpoule.startenTitel"),
      tekst: t("rondleiding.subpoule.startenTekst"),
      ga: { sectie: "subpoules" },
    },
    sub("subpoules", "klassement", t("subpoule.manager.tabRanking"), t("rondleiding.subpoule.ranking")),
          sub("subpoules", "verloop", t("subpoule.manager.tabRisersFallers"), t("rondleiding.subpoule.stijgers")),
          sub("subpoules", "daguitslag", t("subpoule.manager.tabDaguitslag"), t("rondleiding.subpoule.daguitslag")),
          sub("subpoules", "heatmap", t("subpoule.manager.tabHeatmap"), t("rondleiding.subpoule.heatmap")),
          sub("subpoules", "deelnemers", t("subpoule.manager.tabMembers"), t("rondleiding.subpoule.deelnemers")),
          ...(heeftStreekTab
            ? [sub("subpoules", "streek", t("subpoule.manager.tabStreek"), t("rondleiding.subpoule.streek"))]
            : []),
        ]
      : []),
    {
      navKey: "uitslagen",
      titel: t("rondleiding.uitslagen.titel"),
      tekst: t("rondleiding.uitslagen.tekst"),
      ga: { sectie: "uitslagen", sub: "klassement" },
    },
    sub("uitslagen", "klassement", t("results.view.klassementTab"), t("rondleiding.uitslagen.klassement")),
    sub("uitslagen", "etappes", t("results.view.etappesTab"), t("rondleiding.uitslagen.etappes")),
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
    {
      navKey: null,
      titel: t("rondleiding.prijzen.titel"),
      tekst: t("rondleiding.prijzen.tekst"),
      link: { pad: "/prijzen", knop: t("rondleiding.prijzen.knop") },
    },
    {
      navKey: null,
      titel: t("rondleiding.reglement.titel"),
      tekst: t("rondleiding.reglement.tekst"),
      link: { pad: "/regels", knop: t("rondleiding.reglement.knop") },
    },
    {
      navKey: null,
      titel: t("rondleiding.uitleg.titel"),
      tekst: t("rondleiding.uitleg.tekst"),
      link: { pad: "/uitleg", knop: t("rondleiding.uitleg.knop") },
    },
  ];

  const huidig = stappen[Math.min(stap, stappen.length - 1)];

  // Het vlak dat oplicht. We zoeken het element op via een data-attribuut in
  // plaats van via een ref, want de aangewezen tab zit in de shell (onderbalk)
  // of in de pagina (dossard-balk) en die delen geen boom met dit paneel.
  const [gat, setGat] = useState<Rechthoek | null>(null);
  const doel = huidig.doel ?? huidig.navKey;
  useEffect(() => {
    if (!actief || !doel) { setGat(null); return; }
    let stop = false;
    const meet = () => {
      if (stop) return;
      const el = document.querySelector<HTMLElement>(`[data-rondleiding-doel="${doel}"]`);
      setGat(el ? omlijst(el) : null);
    };
    // Tweemaal meten: de tab kan nog aan het verspringen zijn (de balk scrollt
    // de actieve tab in beeld) op het moment dat de stap wisselt.
    meet();
    const id = window.setTimeout(meet, 260);
    window.addEventListener("resize", meet);
    window.addEventListener("scroll", meet, true);
    return () => {
      stop = true;
      window.clearTimeout(id);
      window.removeEventListener("resize", meet);
      window.removeEventListener("scroll", meet, true);
    };
  }, [actief, doel, stap]);

  // De onderbalk licht de besproken tab op.
  useEffect(() => {
    zetStand(actief, huidig.navKey, huidig.ga?.sub ?? null);
    return () => zetStand(false, null, null);
  }, [actief, huidig.navKey, huidig.ga?.sub]);

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
    // Het besproken vlak in beeld brengen. Naar de top springen liet bij een
    // subtabje juist de bovenkant van de pagina zien terwijl de uitleg over
    // iets verderop ging; nu schuift het net zo ver dat het vlak én de balk
    // eromheen zichtbaar worden.
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-rondleiding-doel="${gaSectie}-inhoud"]`,
      );
      if (!el) { window.scrollTo({ top: 0 }); return; }
      const r = el.getBoundingClientRect();
      const marge = 120;
      const doelTop = r.top + window.scrollY - marge;
      window.scrollTo({ top: Math.max(0, doelTop), behavior: "smooth" });
    }, 60);
  }, [actief, gaSectie, gaSub]);

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
    /* Geen waas en geen scrollslot: de rondleiding gaat écht naar elk subtabje,
       dus het scherm eronder is het onderwerp en moet gewoon te zien en te
       scrollen zijn. Vandaar ook een aangemeerd paneel in plaats van een
       modaal — role="region" en niet aria-modal, want de rest van de pagina
       blijft bereikbaar. Alleen de besproken tab licht op.

       z-70 en niet z-60: de rondleiding is het enige dat over de hele pagina
       heen mag. Alles in de app zit op 50 of lager, en de enige uitzondering
       (de toast op 100) hoort er terecht wél overheen. */
    <div
      className="fixed inset-0 z-[70] pointer-events-none"
      role="region"
      aria-label={t("rondleiding.aria")}
    >
      {/* De uitsparing. Een schaduw van 9999px maakt alles buiten dit vlak
          donker, terwijl het vlak zelf op volle kleur blijft — geen waas
          eroverheen dus, maar een gat erin. Zo blijft leesbaar waar het over
          gaat. Zonder doel (de openingsstap) valt de laag weg; die stap gaat
          nergens specifiek over. */}
      {gat && (
        <div
          aria-hidden
          className="absolute rounded-lg ring-2 ring-[hsl(var(--vintage-gold))] transition-all duration-200 motion-reduce:transition-none"
          style={{
            top: gat.top,
            left: gat.left,
            width: gat.width,
            height: gat.height,
            boxShadow: "0 0 0 9999px rgba(12, 10, 8, 0.72)",
          }}
        />
      )}

      <div
        className={cn(
          "pointer-events-auto absolute rounded-xl border-2 border-foreground bg-card p-4 shadow-[4px_4px_0_hsl(var(--foreground))]",
          // Een venster van 600px hoog met zeventien stappen: het paneel mag
          // nooit buiten beeld groeien.
          "max-h-[calc(100vh-1.5rem)] overflow-y-auto",
          isMobiel
            // Net boven de onderbalk, zodat de aangewezen tab in beeld blijft.
            ? "inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
            // Rechtsonder aangemeerd: het scherm zelf blijft vrij.
            : "bottom-5 right-5 w-[min(24rem,92vw)]",
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

          {huidig.link && (
            <a
              href={huidig.link.pad}
              onClick={sluit}
              className="rounded-md border-2 border-foreground bg-card px-3 py-1.5 text-xs font-display font-bold shadow-[2px_2px_0_hsl(var(--foreground))] active:translate-y-px"
            >
              {huidig.link.knop}
            </a>
          )}
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
