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
/** Groepen staan in klassementsvolgorde een vast stuk uit elkaar. */
export const GROUP_SPREAD = 0.085;

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
 * Bepaal voor elke rijder een plek op de baan.
 *
 * Groepen worden in klassementsvolgorde over het pad verdeeld: de kop vooraan,
 * elke volgende groep een vast stuk erachter. Binnen een groep liggen rijders
 * in werkelijkheid tienden van seconden uit elkaar — dat zou op één stip
 * vallen, dus krijgen ze een leesbare minimumafstand. De volgorde blijft
 * kloppen, alleen de tussenruimte is uitvergroot tot een peloton.
 */
export function placeRiders(
  groups: { tier: number; leden: { rider: { beennummer: string; meter?: number | null } }[] }[],
  options: { rotation?: number; rondeLengte?: number | null } = {},
): RinkPlacement[] {
  const rotation = options.rotation ?? 0;
  const rondeLengte = options.rondeLengte ?? null;
  const out: RinkPlacement[] = [];

  groups.forEach((group, groupIndex) => {
    const base = LEAD_FRACTION - rotation - groupIndex * GROUP_SPREAD;
    group.leden.forEach((lid, i) => {
      // Echte positie als de bron die geeft: `meter` is het aantal meters in de
      // huidige ronde, dus meter/rondelengte is precies waar iemand op de baan
      // rijdt. Zonder die waarde vallen we terug op een nette spreiding per
      // groep -- dan klopt de volgorde nog wel, maar de plek op het ovaal niet.
      const meter = lid.rider.meter;
      const echt =
        rondeLengte != null && rondeLengte > 0 && meter != null && Number.isFinite(meter)
          ? meter / rondeLengte
          : null;
      const raw = echt !== null ? echt - rotation : base - i * MIN_SEPARATION;
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
function seconden(s: number): string {
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
  if (!g || groups.length < 2) return null;
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
 */
export function puntenSchaal(schema: PointsSchema, maxPlek = 20): string | null {
  const plekken = [...schema.entries()]
    .filter(([plek, punten]) => plek >= 1 && plek <= maxPlek && punten > 0)
    .sort((a, b) => a[0] - b[0]);
  if (plekken.length === 0) return null;
  const waarden = plekken.map(([, punten]) => punten);
  // Meer dan zeven getallen leest niet meer als schaal; dan de kop en de staart.
  const reeks = waarden.length > 7 ? `${waarden.slice(0, 6).join("-")}\u2026${waarden[waarden.length - 1]}` : waarden.join("-");
  const laatste = plekken[plekken.length - 1][0];
  return `Punten volgens de schaal ${reeks} voor plek 1 t/m ${laatste}.`;
}
