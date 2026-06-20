/**
 * Centrale game-status-logica. ÉÉN bron voor "wie ziet de game" en "wie mag
 * inschrijven" — zichtbaarheid en inschrijven zijn TWEE aparte assen.
 *
 * Statussen:
 *  - concept / draft : alleen admins zien de game (verborgen in de GameSwitcher
 *                      voor gewone gebruikers). Geen inschrijven.
 *  - open            : sneak preview — iedereen ziet alle tabs, maar GEEN renners
 *                      kiezen/indienen (team builder in preview).
 *  - open_inschrijving: iedereen; renners kiezen + indienen MAG.
 *  - live / locked   : iedereen; inschrijving dicht, niets meer aanpassen.
 *  - finished        : iedereen; alles + resultaten terug te kijken, dicht.
 *  - closed          : technisch nog in de DB; in de frontend als finished/dicht.
 */

const ADMIN_ONLY = ["concept", "draft"];
const REGISTRATION = "open_inschrijving";
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

/** Sneak preview ('open'): alles zien, niet inschrijven → preview-banner. */
export function isPreviewStatus(status?: string | null): boolean {
  return s(status) === "open";
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
  if (ADMIN_ONLY.includes(v)) return { label: "Concept · alleen admin", kind: "concept" };
  if (v === "open") return { label: "Sneak preview", kind: "preview" };
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
