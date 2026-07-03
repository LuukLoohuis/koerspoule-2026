/**
 * Centrale game-status-logica. ÉÉN bron voor "wie ziet de game" en "wie mag
 * inschrijven" — zichtbaarheid en inschrijven zijn TWEE aparte assen.
 *
 * Opgeschoond, kiesbaar model: open → open_inschrijving → live → afgerond(finished).
 *  - open            : sneak preview — iedereen ziet de game als preview-schil,
 *                      GEEN renners kiezen/indienen. Default voor een nieuwe game.
 *  - open_inschrijving: iedereen; renners kiezen + indienen MAG.
 *  - live / locked   : iedereen; inschrijving dicht, volledige inhoud.
 *  - finished        : iedereen; alles read-only terug te kijken.
 *
 * Legacy (niet meer kiesbaar in de admin, waarde blijft in de DB-enum):
 *  - draft / concept : behandeld als 'open' (zichtbare sneak preview) — er is GEEN
 *                      status meer die een game volledig verbergt.
 *  - locked          : behandeld als 'live'.
 *  - closed          : behandeld als 'finished'.
 */

// Geen enkele status verbergt nog een game (bewust): leeg.
const ADMIN_ONLY: string[] = [];
const REGISTRATION = "open_inschrijving";
// Sneak preview: 'open' + legacy draft/concept.
const PREVIEW = ["open", "draft", "concept"];
// Resultaten-inhoud (uitslagen/klassementen/commentaar) verborgen voor
// deelnemers: preview-statussen ÉN open_inschrijving — pas vanaf 'live' open.
const RESULTS_HIDDEN = [...PREVIEW, REGISTRATION];
const LOCKED = ["live", "locked", "finished", "closed"];

const s = (status?: string | null) => String(status ?? "");

/** Game alleen zichtbaar voor admins (concept/draft). */
export function isAdminOnlyStatus(status?: string | null): boolean {
  return ADMIN_ONLY.includes(s(status));
}

/** Mag deze viewer de game zien in de GameSwitcher/lijst? */
export function isVisibleToUser(status: string | null | undefined, isAdmin: boolean): boolean {
  return isAdmin || !isAdminOnlyStatus(status);
}

/** Renners kiezen + indienen toegestaan? Alleen bij 'open_inschrijving'. */
export function canRegister(status?: string | null): boolean {
  return s(status) === REGISTRATION;
}

/** Sneak preview ('open' + legacy draft/concept): preview-schil, niet inschrijven. */
export function isPreviewStatus(status?: string | null): boolean {
  return PREVIEW.includes(s(status));
}

/**
 * Mag de HUIDIGE viewer de ECHTE, gevulde game-inhoud zien (uitslagen, ranking,
 * klassementen, commentaar)?
 *
 * DEELNEMER-zicht hangt PUUR aan de status: resultaten-inhoud is verborgen tot
 * 'live'; tijdens 'open_inschrijving' is alleen het INSCHRIJVEN open. ADMIN-
 * volledig-zicht is LOSGEKOPPELD van de status en hangt aan de admin-only
 * TESTMODUS (games.admin_testmodus): staat die aan, dan ziet de admin alles
 * ongeacht de status (volledig proefdraaien: fiatteren, commentaar, intrekken);
 * staat 'ie uit, dan ziet de admin de game precies zoals een deelnemer.
 * Beheer/fiatteren staat hier los van (eigen admin-gating).
 *
 * Waarheidstabel (deelnemer = niet-admin):
 *   open                → deelnemer FALSE · admin alleen bij testmodus
 *   open_inschrijving   → deelnemer FALSE (wel inschrijven) · admin bij testmodus
 *   live/locked/finished → iedereen TRUE
 */
export function maySeeLiveContent(
  status: string | null | undefined,
  isAdmin: boolean,
  adminTestmodus = false,
): boolean {
  return !RESULTS_HIDDEN.includes(s(status)) || (isAdmin && adminTestmodus);
}

/** Is de resultaten-inhoud voor deelnemers (nog) verborgen bij deze status?
 *  Voor UI-copy ("verborgen tot Live") — los van de admin-testmodus. */
export function resultsHiddenForUsers(status?: string | null): boolean {
  return RESULTS_HIDDEN.includes(s(status));
}

/** Definitief op slot (na de deadline): live/locked/finished/closed. */
export function isGameLocked(status?: string | null): boolean {
  return LOCKED.includes(s(status));
}

/** Afgerond/teruggekeken (finished of het oude closed). */
export function isFinishedLike(status?: string | null): boolean {
  const v = s(status);
  return v === "finished" || v === "closed";
}

export type StatusBadgeKind = "concept" | "preview" | "registration" | "live" | "finished";
export type StatusBadge = { label: string; kind: StatusBadgeKind } | null;

/** Retro-badge voor de GameSwitcher/lijst. Null = geen badge. */
export function statusBadge(status?: string | null): StatusBadge {
  const v = s(status);
  if (isPreviewStatus(v)) return { label: "Sneak preview", kind: "preview" };
  if (v === REGISTRATION) return { label: "Inschrijving open", kind: "registration" };
  if (v === "live" || v === "locked") return { label: "Live", kind: "live" };
  if (v === "finished" || v === "closed") return { label: "Afgerond", kind: "finished" };
  return null;
}

/** Sorteervolgorde voor de GameSwitcher: actieve fases eerst, concept/afgerond achteraan. */
export function statusOrderRank(status?: string | null): number {
  const v = s(status);
  if (v === REGISTRATION) return 0;
  if (v === "open") return 1;
  if (v === "live" || v === "locked") return 2;
  if (ADMIN_ONLY.includes(v)) return 3;
  return 4; // finished/closed
}
