/**
 * Baangeometrie voor de live-weergave in de Volgwagen.
 *
 * De plaatsingslogica rekent in "fractie van een ronde langs een pad" en is
 * daarmee vormonafhankelijk: kunstijs en natuurijs verschillen alleen in het
 * SVG-pad. Ronde-voorsprong wordt een eigen baan (ring) naar buiten, zodat
 * rijders die het peloton op een ronde hebben gezet niet op de kop vallen —
 * fysiek rijden ze immers op dezelfde plek.
 */

import { pelotonIndex, type GroepsRol, type LiveGroup, type PointsSchema } from "@/lib/liveMarathon";
import { wegingUitleg } from "@/lib/wegingsfactor";

/** Kunstijs is altijd een 400 m-ovaal: rechte stukken met halve cirkels. */
export const PATH_KUNSTIJS =
  "M 92,46 H 248 A 63,63 0 0 1 248,172 H 92 A 63,63 0 0 1 92,46 Z";

/** Natuurijs krijgt één vaste standaardvorm: een langgerekte, vloeiende lus. */
export const PATH_NATUURIJS =
  "M 56,112 C 58,74 106,46 170,46 C 234,46 292,74 296,112 " +
  "C 292,150 234,178 170,178 C 106,178 58,150 56,112 Z";

export const RINK_CENTER = { x: 176, y: 112 };
/** Afstand tussen twee ronde-banen, in viewBox-eenheden. */
export const LANE_WIDTH = 14;
/** Minimale zichtbare tussenruimte binnen een groep, als fractie van de ronde. */
export const MIN_SEPARATION = 0.011;
/** Vaste plek van de finishlijn op het pad. */
export const FINISH_FRACTION = 0.75;
/** Waar de kopgroep staat; los van de finish zodat labels niet samenvallen. */
export const LEAD_FRACTION = 0.2;
/** Gat tussen groepen als de tijd ertussen niets zegt (een ronde verschil) of de rondetijd onbekend is. */
export const GROUP_SPREAD = 0.085;
/** Kleinste gat op de baan: ook 1,6 s moet je als gat zien. */
export const GAT_MIN = 0.045;
/** Grootste gat: daarboven past de rest van het veld niet meer rond. */
export const GAT_MAX = 0.3;
/** Zoveel van de ronde mag het veld beslaan; de rest blijft leeg tussen kop en staart. */
export const MAX_VELD = 0.9;

/**
 * Gat tussen twee groepen op de baan, als fractie van een ronde. Met een
 * rondetijd is het evenredig met de tijd: 4 s op een ronde van 32 s is een
 * achtste van de baan. Zo zie je op het ijs hoe ver een groep weg is.
 */
export function gatOpBaan(gapS: number | null | undefined, rondeTijdS: number | null): number {
  if (gapS == null || rondeTijdS == null || rondeTijdS <= 0) return GROUP_SPREAD;
  return Math.min(GAT_MAX, Math.max(GAT_MIN, gapS / rondeTijdS));
}

/** Rondetijd in seconden uit de bron: "32.730" of "1:05.719". Null als onleesbaar. */
export function rondeTijdSeconden(tekst: string | null | undefined): number | null {
  if (!tekst) return null;
  const delen = tekst.trim().replace(",", ".").split(":");
  const s = delen.reduce((acc, d) => acc * 60 + Number(d), 0);
  return Number.isFinite(s) && s > 0 ? s : null;
}

/* ── Baangeometrie volgens het ontwerp ────────────────────────────────────
 *
 * Een 400 m-ovaal in een genormaliseerd vak van 800×400: twee rechte stukken
 * van 400 en twee bochten met straal 150. De middellijn loopt over y=350
 * (onder) en y=50 (boven); de rechte stukken beginnen op x=200 en eindigen op
 * x=600.
 *
 * Schaatsers rijden LINKSOM. In dit vak betekent dat: over het onderste rechte
 * stuk naar rechts, de rechterbocht omhoog, over het bovenste stuk naar links,
 * en door de linkerbocht weer omlaag.
 *
 * De finish ligt aan het eind van een recht stuk, vlak vóór de bocht -- zoals
 * op een echte baan. Daarom start een ronde niet aan het begin van het rechte
 * stuk maar aan het eind ervan: fractie 0 valt op (600, 350).
 */
export const BAAN_B = 800;
export const BAAN_H = 400;
/** Lengte van één recht stuk. */
export const RECHT = 400;
/** Straal van een bocht, gemeten op de middellijn. */
export const BOCHT_R = 150;
export const OMTREK = 2 * RECHT + 2 * Math.PI * BOCHT_R;

/** Waar een ronde begint en eindigt: eind van het onderste rechte stuk. */
export const FINISH_PUNT = { x: 200 + RECHT, y: 350 };

/**
 * Positie op de baan voor een fractie van een ronde.
 *
 * `off` verschuift loodrecht op de rijrichting; positief is naar buiten, weg
 * van het middenterrein. Zo blijven rijders binnen de ijsband in plaats van
 * over het gras te schaatsen.
 */
export function baanPositie(fractie: number, off = 0): { x: number; y: number } {
  const f = ((fractie % 1) + 1) % 1;
  // Fractie 0 op de finish leggen: die ligt een recht stuk verderop in de
  // parametrisering hieronder.
  const d = (f * OMTREK + RECHT) % OMTREK;
  const bocht = Math.PI * BOCHT_R;

  if (d < RECHT) return { x: 200 + d, y: 350 + off };
  if (d < RECHT + bocht) {
    const t = (d - RECHT) / BOCHT_R;
    return { x: 600 + (BOCHT_R + off) * Math.sin(t), y: 200 + (BOCHT_R + off) * Math.cos(t) };
  }
  if (d < 2 * RECHT + bocht) return { x: 600 - (d - RECHT - bocht), y: 50 - off };
  const t = (d - 2 * RECHT - bocht) / BOCHT_R;
  return { x: 200 - (BOCHT_R + off) * Math.sin(t), y: 200 - (BOCHT_R + off) * Math.cos(t) };
}

/**
 * Baanoffsets binnen een groep. Een pak waaiert over de breedte van de baan
 * uit in plaats van op één lijn te stapelen -- anders vallen de schijfjes op
 * elkaar zodra er meer dan een paar rijders bij elkaar zitten.
 */
export const BAAN_OFFSETS = [-26, 0, 24];

/**
 * Stap tussen twee rijders in een pak. Ze waaieren over drie banen uit, dus
 * pas de vierde rijder ligt weer op dezelfde lijn als de eerste: die moet
 * MIN_SEPARATION verder liggen, de tussenliggende schuiven schuin op. Zo is een
 * peloton van zestig een blok en geen sliert die de halve baan rond ligt.
 */
export const STAP_IN_GROEP = MIN_SEPARATION / BAAN_OFFSETS.length;

export function rinkPath(ijsType: string | null | undefined): string {
  return ijsType === "natuurijs" ? PATH_NATUURIJS : PATH_KUNSTIJS;
}

export type RinkPlacement = {
  beennummer: string;
  /** Positie langs het pad, 0..1. */
  fraction: number;
  /** Ronden voor (+) of achter (−) het peloton. */
  tier: number;
  /** Plek van de groep in de stand; nodig om de rol (en dus de kleur) op te
   *  zoeken zonder die per rijder mee te slepen. */
  groupIndex: number;
  /** Best geplaatste rijder van zijn groep. Alleen die krijgt het
   *  ronde-badgetje: tien keer "−1" naast een gelost groepje is ruis. */
  eersteInGroep: boolean;
  /** Verschuiving loodrecht op het pad; positief is naar buiten. */
  offset: number;
};

/**
 * Geeft de bron een echte plek op het ijs? livemarathon.schaatsen.nl stuurt
 * `Meter` wel mee, maar vult hem niet: bij Haaksbergen (juli 2026) en Haarlem
 * (oktober 2026) stond hij voor élke rijder op 0. Dat als positie nemen zet het
 * hele veld op de finishlijn, zonder spreiding. Pas als minstens één rijder
 * ergens anders dan op 0 m zit, is het veld gevuld en tekenen we erop.
 */
export function heeftEchtePositie(
  groups: { leden: { rider: { meter?: number | null } }[] }[],
  rondeLengte: number | null,
): boolean {
  if (rondeLengte == null || rondeLengte <= 0) return false;
  let gevuld = false;
  for (const g of groups)
    for (const l of g.leden) {
      const m = l.rider.meter;
      if (m == null || !Number.isFinite(m)) return false;
      if (m > 0) gevuld = true;
    }
  return gevuld;
}

/**
 * Bepaal voor elke rijder een plek op de baan.
 *
 * Groepen worden in klassementsvolgorde over het pad verdeeld: de kop vooraan,
 * elke volgende groep een vast stuk erachter. Binnen een groep liggen rijders
 * in werkelijkheid tienden van seconden uit elkaar — dat zou op één stip
 * vallen, dus krijgen ze een leesbare minimumafstand. De volgorde blijft
 * kloppen, alleen de tussenruimte is uitvergroot tot een peloton.
 */
export function placeRiders(
  groups: {
    tier: number;
    gapToPrev?: number | null;
    leden: { rider: { beennummer: string; meter?: number | null } }[];
  }[],
  options: { rotation?: number; rondeLengte?: number | null; rondeTijd?: number | null } = {},
): RinkPlacement[] {
  const rotation = options.rotation ?? 0;
  const rondeLengte = options.rondeLengte ?? null;
  const out: RinkPlacement[] = [];
  const metPositie = heeftEchtePositie(groups, rondeLengte);

  // Elke groep begint achter de staart van de vorige, niet achter haar kop:
  // anders schuift een groot peloton over de groep erachter heen. Het gat zelf
  // volgt de tijd (gatOpBaan); past het veld dan niet meer rond, dan krimpen
  // de gaten naar verhouding mee.
  const lengtes = groups.map((g) => (g.leden.length - 1) * STAP_IN_GROEP);
  const gaten = groups.map((g, i) => (i === 0 ? 0 : gatOpBaan(g.gapToPrev, options.rondeTijd ?? null)));
  const somGaten = gaten.reduce((s, x) => s + x, 0);
  const ruimte = MAX_VELD - lengtes.reduce((s, x) => s + x, 0);
  const krimp = somGaten > ruimte && somGaten > 0 ? Math.max(0, ruimte) / somGaten : 1;

  let start = LEAD_FRACTION - rotation;
  groups.forEach((group, groupIndex) => {
    start -= gaten[groupIndex] * krimp;
    const base = start;
    start -= lengtes[groupIndex];
    group.leden.forEach((lid, i) => {
      // Echte positie als de bron die geeft: `meter` is het aantal meters in de
      // huidige ronde, dus meter/rondelengte is precies waar iemand op de baan
      // rijdt. Zonder die waarde vallen we terug op een nette spreiding per
      // groep -- dan klopt de volgorde nog wel, maar de plek op het ovaal niet.
      const meter = lid.rider.meter;
      const echt =
        metPositie && rondeLengte != null && meter != null && Number.isFinite(meter)
          ? meter / rondeLengte
          : null;
      const raw = echt !== null ? echt - rotation : base - i * STAP_IN_GROEP;
      // Positief modulo: fracties moeten binnen 0..1 blijven.
      const fraction = ((raw % 1) + 1) % 1;
      // Waaier het pak over de breedte van de baan uit. Ronde-voorsprong
      // krijgt géén eigen ring meer: met de echte positie uit `meter` rijden
      // die rijders al ergens anders op het ovaal, en een extra ring duwde ze
      // buiten het ijs.
      out.push({
        beennummer: lid.rider.beennummer,
        fraction,
        tier: group.tier,
        groupIndex,
        eersteInGroep: i === 0,
        offset: BAAN_OFFSETS[i % BAAN_OFFSETS.length],
      });
    });
  });

  return out;
}

/** Meer dan drie banen verschil wordt onleesbaar; knijp het af. */
export function clampTier(tier: number): number {
  return Math.max(-3, Math.min(3, tier));
}

/**
 * Verschuif een punt loodrecht op het pad, gemeten vanaf het middelpunt.
 * Positieve offset gaat naar buiten.
 */
export function offsetFromCenter(
  point: { x: number; y: number },
  offset: number,
  center = RINK_CENTER,
): { x: number; y: number } {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: point.x + (dx / len) * offset, y: point.y + (dy / len) * offset };
}

/** Welke ronde-banen zitten er in het veld, van voor naar achter. */
export function tiersPresent(groups: { tier: number }[]): number[] {
  return [...new Set(groups.map((g) => g.tier))].sort((a, b) => b - a);
}

export function tierLabel(tier: number): string {
  if (tier > 0) return `${tier} ronde${tier > 1 ? "n" : ""} voor`;
  if (tier < 0) return `${-tier} ronde${tier < -1 ? "n" : ""} achter`;
  return "peloton";
}

/* ── Kleuren ──────────────────────────────────────────────────────────────
 *
 * Vier kleuren, één per rol, uit de Meermarathon-tokens: zo kloppen ze in
 * Winter verfijnd én in Nachtijs zonder dat hier iets van de modus af hoeft te
 * weten. Het aantal ronden voorsprong krijgt geen eigen kleur: een uitloper op
 * twee ronden is nog steeds een uitloper. Dat verschil is een aparte badge.
 */

const ROL_KLEUR: Record<GroepsRol, string> = {
  uitloper: "var(--mm-g-u)",
  kop: "var(--mm-g-k)",
  peloton: "var(--mm-g-p)",
  achter: "var(--mm-g-a)",
};

/** Kleur van een groep: het schijfje op de baan en de stip op de groepskaart. */
export function rolColor(rol: GroepsRol): string {
  return ROL_KLEUR[rol];
}

export function rolLabel(rol: GroepsRol): string {
  if (rol === "uitloper") return "uitloper";
  if (rol === "kop") return "kopgroep";
  if (rol === "achter") return "achterblijvers";
  return "peloton";
}

/** Merkteken voor je eigen rijders: de "hot"-kleur, ook die van de LIVE-badge. */
export const EIGEN_KLEUR = "var(--mm-hot)";

/**
 * Ronde-verschil als tekst voor de badge naast een schijfje. Null bij geen
 * verschil, zodat een gewone koers helemaal zonder badges blijft.
 */
export function rondeBadge(tier: number): string | null {
  if (tier === 0) return null;
  return tier > 0 ? `+${tier}` : `\u2212${-tier}`;
}

/**
 * Pad langs de middellijn van de baan, van de achterste naar de voorste rijder
 * van een groep: de zachte band die een pak als één blok laat lezen. Groepen
 * die over de finish heen liggen (0,98 → 0,02) worden via de korte kant
 * verbonden, niet een hele ronde om. Null bij minder dan twee rijders, of als
 * de "groep" meer dan een halve ronde beslaat -- dan is het geen pak meer.
 */
export function groepsBand(fracties: number[]): string | null {
  if (fracties.length < 2) return null;
  // Het grootste gat tussen twee rijders op de cirkel: de groep ligt aan de
  // andere kant daarvan.
  const f = [...fracties].map((x) => ((x % 1) + 1) % 1).sort((a, b) => a - b);
  let grootsteGat = 1 - f[f.length - 1] + f[0];
  let start = f[0];
  for (let i = 1; i < f.length; i += 1) {
    const gat = f[i] - f[i - 1];
    if (gat > grootsteGat) {
      grootsteGat = gat;
      start = f[i];
    }
  }
  const lengte = 1 - grootsteGat;
  if (lengte > 0.5) return null;
  const stappen = Math.max(2, Math.ceil(lengte * 120));
  const punten = Array.from({ length: stappen + 1 }, (_, i) => baanPositie(start + (lengte * i) / stappen, 0));
  return punten.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/* ── Namen bij je eigen rijders ───────────────────────────────────────────
 *
 * De baan schaalt mee met het scherm, de letters niet: op een telefoon is het
 * ovaal 340 px breed en vallen twee namen in hetzelfde pak over elkaar. Daarom
 * rekenen we in schermpixels en zoeken we per naam een vrije plek. Eerst naar
 * het middenterrein toe -- daar staat nooit iemand --, dan de andere kant op,
 * dan opzij.
 */

/** Rechthoek in px: linksboven plus breedte en hoogte. */
export type Vak = { left: number; top: number; b: number; h: number };

/** Hoogte van een naamlabel (10 px vet, regelhoogte 15). */
export const LABEL_H = 15;
/** Afstand van het midden van het schijfje tot de rand van het label. */
export const LABEL_AFSTAND = 13;

/** Breedte van een naamlabel; 10 px vet is zo'n 6,3 px per letter plus de rand. */
export function labelBreedte(naam: string): number {
  return Math.ceil(naam.length * 6.3) + 10;
}

function overlap(a: Vak, b: Vak): number {
  const x = Math.min(a.left + a.b, b.left + b.b) - Math.max(a.left, b.left);
  const y = Math.min(a.top + a.h, b.top + b.h) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? x * y : 0;
}

/**
 * Plek per naam. `items` staan in volgorde van belang (de kop eerst): wie
 * eerder komt kiest eerst. Een plek die buiten de baan valt of iets raakt
 * slaan we over; past er nergens iets, dan de plek met de minste overlap.
 */
export function plaatsLabels(
  items: { sleutel: string; x: number; y: number; b: number }[],
  vak: { b: number; h: number },
  obstakels: Vak[] = [],
): Map<string, Vak> {
  const uit = new Map<string, Vak>();
  const bezet = [...obstakels];
  const midden = { x: vak.b / 2, y: vak.h / 2 };
  for (const it of items) {
    const h = LABEL_H;
    const boven: Vak = { left: it.x - it.b / 2, top: it.y - LABEL_AFSTAND - h, b: it.b, h };
    const onder: Vak = { left: it.x - it.b / 2, top: it.y + LABEL_AFSTAND, b: it.b, h };
    const rechts: Vak = { left: it.x + LABEL_AFSTAND + 2, top: it.y - h / 2, b: it.b, h };
    const links: Vak = { left: it.x - LABEL_AFSTAND - 2 - it.b, top: it.y - h / 2, b: it.b, h };
    const naarBinnenV = it.y > midden.y ? boven : onder;
    const naarBuitenV = it.y > midden.y ? onder : boven;
    const naarBinnenH = it.x > midden.x ? links : rechts;
    const naarBuitenH = it.x > midden.x ? rechts : links;
    // Zit het pak vol, dan een rij verder of opzij een halve regel verschoven:
    // nog steeds naast het eigen schijfje, maar vrij van de buren.
    const verder = (k: Vak, dy: number): Vak => ({ ...k, top: k.top + dy });
    const binnenwaarts = it.y > midden.y ? -(h + 2) : h + 2;
    const kandidaten = [
      naarBinnenV,
      naarBuitenV,
      naarBinnenH,
      naarBuitenH,
      verder(naarBinnenV, binnenwaarts),
      verder(naarBinnenH, -(h / 2 + 1)),
      verder(naarBinnenH, h / 2 + 1),
      verder(naarBuitenH, -(h / 2 + 1)),
      verder(naarBuitenH, h / 2 + 1),
      verder(naarBinnenV, 2 * binnenwaarts),
      verder(naarBinnenH, -(h + 2)),
      verder(naarBinnenH, h + 2),
      verder(naarBinnenV, 3 * binnenwaarts),
    ];

    const binnen = (k: Vak) => k.left >= 2 && k.top >= 2 && k.left + k.b <= vak.b - 2 && k.top + k.h <= vak.h - 2;
    const kosten = (k: Vak) => bezet.reduce((s, o) => s + overlap(k, o), 0) + (binnen(k) ? 0 : 1e6);
    const keuze =
      kandidaten.find((k) => kosten(k) === 0) ??
      kandidaten.reduce((best, k) => (kosten(k) < kosten(best) ? k : best));
    uit.set(it.sleutel, keuze);
    bezet.push(keuze);
  }
  return uit;
}

/* ── Doorrijden tussen twee metingen ──────────────────────────────────────
 *
 * De feed ververst elke twintig seconden; in die tijd rijdt een schaatser een
 * halve ronde. Zonder hulp springen de schijfjes over het ijs. We schatten per
 * rijder de snelheid uit de laatste twee metingen en rijden daarmee door. Komt
 * er een nieuwe meting, dan schuift de schatting in een halve seconde naar de
 * echte plek.
 *
 * Alles in afgelegde ronden (ronden + fractie), niet in x/y: zo loopt een
 * correctie altijd over de baan en nooit dwars over het middenterrein.
 */

/** Stand van één rijder zoals we hem laatst gemeten hebben. */
export type Meting = {
  /** Afgelegde ronden bij de meting, inclusief de fractie van de lopende. */
  abs: number;
  /** Tijdstip van de meting in ms (performance.now). */
  t: number;
  /** Geschatte snelheid in ronden per seconde. */
  v: number;
  /** Verschil tussen oude schatting en nieuwe meting; ebt weg. */
  corr: number;
};

/** Hoe lang we na de laatste meting blijven doorrijden als er niets nieuws komt. */
export const MAX_DOORRIJDEN_MS = 25_000;
/** Hoe snel een verschil tussen geschatte en gemeten plek wordt weggewerkt. */
export const CORRECTIE_MS = 600;
/** Een ronde per tien seconden (≈ 144 km/u): alles daarboven is een haperende feed. */
export const MAX_SNELHEID = 0.1;
/** Verder dan dit van de schatting af: niet schuiven maar verspringen. */
const MAX_CORRECTIE = 0.3;

/** Afgelegde ronden op tijdstip `t`, geschat vanuit een meting. */
export function schatAfstand(m: Meting, t: number): number {
  const dt = Math.max(0, Math.min(t - m.t, MAX_DOORRIJDEN_MS));
  return m.abs + (m.v * dt) / 1000 + m.corr * Math.exp(-dt / CORRECTIE_MS);
}

/** Nieuwe meting verwerken tot de stand waarmee we verder rijden. */
export function verwerkMeting(vorig: Meting | undefined, abs: number, t: number): Meting {
  if (!vorig) return { abs, t, v: 0, corr: 0 };
  // Zelfde plek als de vorige keer: een her-render, geen meting. Doortellen
  // zou de snelheid op nul zetten.
  if (abs === vorig.abs) return vorig;
  const dt = (t - vorig.t) / 1000;
  const gemeten = dt > 0.2 ? (abs - vorig.abs) / dt : vorig.v;
  const v = gemeten >= 0 && gemeten < MAX_SNELHEID ? gemeten : vorig.v;
  const corr = schatAfstand(vorig, t) - abs;
  return { abs, t, v, corr: Math.abs(corr) > MAX_CORRECTIE ? 0 : corr };
}

/* ── Teksten bij de groepen ───────────────────────────────────────────────── */

/** Seconden als "6,4 s"; vanaf tien seconden zonder decimaal, zoals "11 s". */
export function seconden(s: number): string {
  const abs = Math.abs(s);
  return abs < 10 ? `${abs.toFixed(1).replace(".", ",")} s` : `${Math.round(abs)} s`;
}

/**
 * Hoe ver een groep van het peloton af rijdt, voor de groepskaart: "+1 ronde",
 * "+6,4 s", "−11 s", of "referentie" voor het peloton zelf. Plus is vóór het
 * peloton.
 *
 * Gemeten van kop tot kop, niet van groep tot groep: met vier kaarten naast
 * elkaar lees je "hoe ver is dit pak weg", niet "hoeveel zit er tussen dit en
 * het vorige". Tijd alleen op dezelfde ronde; daarbuiten zegt de doorkomsttijd
 * niets. Null als er niets te vergelijken valt (één groep, tijd onbekend).
 */
export function groepsGat(groups: LiveGroup[], index: number): string | null {
  const g = groups[index];
  if (!g || groups.length < 2 || g.soort === "uitKoers") return null;
  const pi = pelotonIndex(groups);
  if (index === pi) return "referentie";
  const pel = groups[pi];
  const ronden = g.tier - pel.tier;
  if (ronden !== 0) {
    const n = Math.abs(ronden);
    return `${ronden > 0 ? "+" : "\u2212"}${n} ronde${n > 1 ? "n" : ""}`;
  }
  const eigen = g.leden[0]?.rider.tijdSort;
  const ref = pel.leden[0]?.rider.tijdSort;
  if (eigen == null || ref == null) return null;
  // Wie eerder over de streep kwam, rijdt vóór: een kleinere tijd is plus.
  const s = (ref - eigen) / 1000;
  return `${s >= 0 ? "+" : "\u2212"}${seconden(s)}`;
}

/**
 * De puntenschaal in één regel, uit het schema van de game zelf: "Punten
 * volgens de schaal 50-40-32-26-22-20…1 voor plek 1 t/m 20." Zo kan de uitleg
 * niet afwijken van wat er echt geteld wordt.
 *
 * `maxPlek` is dezelfde grens als in projectPoints: verder dan plek 20 scoort
 * niemand, ook als het schema doorloopt. Null zonder scorende plekken.
 *
 * Telt de wedstrijd zwaarder (`weging`, zie lib/wegingsfactor), dan blijft de
 * schaal die van de game en komt de factor erachter: zo zie je waarom plek 1
 * ineens 100 oplevert.
 */
export function puntenSchaal(schema: PointsSchema, maxPlek = 20, weging = 1): string | null {
  const plekken = [...schema.entries()]
    .filter(([plek, punten]) => plek >= 1 && plek <= maxPlek && punten > 0)
    .sort((a, b) => a[0] - b[0]);
  if (plekken.length === 0) return null;
  const waarden = plekken.map(([, punten]) => punten);
  // Meer dan zeven getallen leest niet meer als schaal; dan de kop en de staart.
  const reeks = waarden.length > 7 ? `${waarden.slice(0, 6).join("-")}\u2026${waarden[waarden.length - 1]}` : waarden.join("-");
  const laatste = plekken[plekken.length - 1][0];
  const uitleg = wegingUitleg(weging);
  return `Punten volgens de schaal ${reeks} voor plek 1 t/m ${laatste}.${uitleg ? ` Deze wedstrijd ${uitleg}.` : ""}`;
}
