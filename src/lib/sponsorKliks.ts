/**
 * Melden dat er op een sponsorlink geklikt is.
 *
 * Bewust geen user_id: de vraag is hoe váák er geklikt wordt, niet door wie.
 * Daarmee legt dit niets over een bezoeker vast.
 *
 * Ontdubbelen gebeurt hier en niet op de server. Zonder user_id heeft de
 * server niets om op te ontdubbelen behalve het IP-adres, en dat zou juist
 * wél een persoonsgegeven zijn. Een sleutel in de browser is voor dit doel
 * genoeg: hij vangt de dubbeltik en de terugkeer-en-nog-eens-klikken op, en
 * meer hoeft het niet te vangen.
 */
import { supabase } from "@/lib/supabase";

/**
 * De gegenereerde Supabase-types kennen deze functie nog niet — die worden in
 * dit project met de hand ververst. Een smalle vorm in plaats van `any`, zodat
 * de aanroep gecontroleerd blijft op argumenten.
 */
type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
};

export type KlikBron = "sponsor" | "prijs";
export type KlikVeld = "link_url" | "sponsor_url" | "sponsor_url_2";
export type KlikPlek = "voorpagina" | "dagprijsbanner" | "prijzenpagina";

const VENSTER_MS = 60_000;
const SLEUTEL = "kp_sponsor_kliks";

type Recent = Record<string, number>;

function leesRecent(): Recent {
  try { return JSON.parse(localStorage.getItem(SLEUTEL) ?? "{}") as Recent; }
  catch { return {}; }
}

/** True als deze klik binnen het venster al geteld is. Schrijft 'm anders weg. */
function alGeteld(id: string): boolean {
  const nu = Date.now();
  const recent = leesRecent();
  if (typeof recent[id] === "number" && nu - recent[id] < VENSTER_MS) return true;

  // Meteen opruimen: zonder dit groeit de sleutel met elke sponsor die ooit
  // is aangeklikt.
  const schoon: Recent = { [id]: nu };
  for (const [k, t] of Object.entries(recent)) {
    if (k !== id && nu - t < VENSTER_MS) schoon[k] = t;
  }
  try { localStorage.setItem(SLEUTEL, JSON.stringify(schoon)); } catch { /* negeer */ }
  return false;
}

/**
 * Meld een klik. Faalt nooit zichtbaar: dit mag het openen van de link niet in
 * de weg zitten, dus fouten worden ingeslikt.
 */
export function logSponsorKlik(
  bron: KlikBron,
  bronId: string | null | undefined,
  veld: KlikVeld,
  plek: KlikPlek,
): void {
  if (!supabase || !bronId) return;
  if (alGeteld(`${bron}:${bronId}:${veld}:${plek}`)) return;

  void (supabase as unknown as RpcClient)
    .rpc("log_sponsor_klik", { p_bron: bron, p_bron_id: bronId, p_veld: veld, p_plek: plek })
    .then(() => undefined, () => undefined);
}

/** Alleen voor tests: het ontdubbelvenster leegmaken. */
export function _resetKlikVenster(): void {
  try { localStorage.removeItem(SLEUTEL); } catch { /* negeer */ }
}
