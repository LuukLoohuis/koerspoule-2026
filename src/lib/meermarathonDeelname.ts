import { canRegister } from "@/lib/gameStatus";
import { mmKorteDatum, type MeermarathonGameStatus } from "@/lib/meermarathonSeizoen";
import { telwoord } from "@/lib/mijnMeermarathon";

/**
 * Waar rijd je mee? De Meermarathon is één game met twee pelotons; de speler
 * rijdt mee bij de vrouwen, de mannen of allebei. Hier de regels zonder React
 * of database: wat er op de uitnodiging van een peloton staat en waar de
 * keuze bewaard wordt.
 *
 * De keuze zelf staat alleen in de browser. De database kent hem niet: daar
 * telt pas een ingediende ploeg.
 */

type Status = MeermarathonGameStatus;

export type DeelnameOptie = {
  /** Het id van de game van dit peloton. */
  id: string;
  /** "Vrouwen" of "Mannen". */
  label: string;
  categorie: "vrouwen" | "mannen" | null;
  /** "Ploeg van vijf rijders" */
  ploeg: string;
  /** "9 wedstrijden · vanaf 31 okt" */
  kalender: string;
  /** Je hebt hier al een ingediende ploeg: staat vast aan. */
  ingeschreven?: boolean;
  /** Instappen kan niet (meer). */
  gesloten?: boolean;
};

/** Mag je hier een ploeg samenstellen? De beheerder mag altijd, net als in de teambouwer. */
function open(s: Status, isAdmin: boolean): boolean {
  return isAdmin || canRegister(s.game.status);
}

function ploegTekst(s: Status): string {
  return s.vereist > 0 ? `Ploeg van ${telwoord(s.vereist)} rijder${s.vereist === 1 ? "" : "s"}` : "Eigen ploeg";
}

function kalenderTekst(s: Status): string {
  const n = s.wedstrijden.length;
  if (n === 0) return "De kalender volgt";
  const aantal = `${n} wedstrijd${n === 1 ? "" : "en"}`;
  const eerste = s.wedstrijden.map((w) => w.date).filter((d): d is string => Boolean(d)).sort()[0];
  return eerste ? `${aantal} · vanaf ${mmKorteDatum(eerste)}` : aantal;
}

export function deelnameOpties(statussen: Status[], isAdmin = false): DeelnameOptie[] {
  return statussen.map((s) => ({
    id: s.game.id,
    label: s.label,
    categorie: s.categorie,
    ploeg: ploegTekst(s),
    kalender: kalenderTekst(s),
    ingeschreven: s.fase === "ingeschreven",
    gesloten: !open(s, isAdmin),
  }));
}

// ── Opslag ────────────────────────────────────────────────────────────────

/** Eén keuze per speler per seizoen; een gast deelt de zijne met niemand. */
export function deelnameSleutel(userId: string | null | undefined, jaar: number): string {
  return `koerspoule_mm_deelname_${jaar}_${userId ?? "gast"}`;
}

export function leesDeelname(opslag: Pick<Storage, "getItem"> | null | undefined, sleutel: string): string[] | null {
  try {
    const ruw = opslag?.getItem(sleutel);
    if (!ruw) return null;
    const waarde: unknown = JSON.parse(ruw);
    if (!Array.isArray(waarde)) return null;
    const ids = waarde.filter((x): x is string => typeof x === "string" && x.length > 0);
    return ids.length > 0 ? ids : null;
  } catch {
    // Opslag geblokkeerd of onleesbaar: dan kiest de speler gewoon opnieuw.
    return null;
  }
}

export function bewaarDeelname(opslag: Pick<Storage, "setItem"> | null | undefined, sleutel: string, ids: string[]): void {
  try {
    opslag?.setItem(sleutel, JSON.stringify(ids));
  } catch {
    /* Opslag geblokkeerd: de keuze geldt dan alleen voor dit bezoek. */
  }
}
