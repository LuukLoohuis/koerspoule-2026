/**
 * Baangeometrie voor de live-weergave in de Volgwagen.
 *
 * De plaatsingslogica rekent in "fractie van een ronde langs een pad" en is
 * daarmee vormonafhankelijk: kunstijs en natuurijs verschillen alleen in het
 * SVG-pad. Ronde-voorsprong wordt een eigen baan (ring) naar buiten, zodat
 * rijders die het peloton op een ronde hebben gezet niet op de kop vallen —
 * fysiek rijden ze immers op dezelfde plek.
 */

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

export function rinkPath(ijsType: string | null | undefined): string {
  return ijsType === "natuurijs" ? PATH_NATUURIJS : PATH_KUNSTIJS;
}

export type RinkPlacement = {
  beennummer: string;
  /** Positie langs het pad, 0..1. */
  fraction: number;
  /** Ronden voor (+) of achter (−) het peloton. */
  tier: number;
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
  groups: { tier: number; leden: { rider: { beennummer: string } }[] }[],
  options: { rotation?: number } = {},
): RinkPlacement[] {
  const rotation = options.rotation ?? 0;
  const out: RinkPlacement[] = [];

  groups.forEach((group, groupIndex) => {
    const base = LEAD_FRACTION - rotation - groupIndex * GROUP_SPREAD;
    group.leden.forEach((lid, i) => {
      // Positief modulo: fracties moeten binnen 0..1 blijven.
      const raw = base - i * MIN_SEPARATION;
      const fraction = ((raw % 1) + 1) % 1;
      // Hoger tier ligt verder naar buiten; binnen de groep licht zigzaggen
      // zodat een dichte kopgroep niet één klont wordt.
      const zigzag = i % 2 === 0 ? -3.5 : 3.5;
      out.push({
        beennummer: lid.rider.beennummer,
        fraction,
        tier: group.tier,
        offset: clampTier(group.tier) * LANE_WIDTH + zigzag,
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

/** Kleur per ronde-baan: voorsprong warm, peloton blauw, achterstand rood. */
export function tierColor(tier: number): string {
  if (tier >= 2) return "#c9861a";
  if (tier === 1) return "#f5761a";
  if (tier === 0) return "#1268a8";
  return "#b3352a";
}

export function tierSoftColor(tier: number): string {
  if (tier >= 2) return "rgba(201,134,26,.75)";
  if (tier === 1) return "rgba(245,118,26,.72)";
  if (tier === 0) return "rgba(11,76,145,.3)";
  return "rgba(179,53,42,.5)";
}
