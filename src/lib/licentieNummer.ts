/**
 * Licentienummer op de rennerslicentie: geen eigen veld, maar afgeleid van
 * naam en lidmaatschap, zodat het voor dezelfde deelnemer altijd hetzelfde
 * is. Het jaar van aanmelden plus vier cijfers uit een simpele hash.
 */
export function licentieNummer(naam: string, lidSinds?: string | null): string {
  const jaar = lidSinds ? new Date(lidSinds).getFullYear() : new Date().getFullYear();
  let h = 7;
  for (const teken of `${naam}|${lidSinds ?? ""}`) h = (h * 31 + teken.charCodeAt(0)) % 10007;
  return `${jaar}-${String(h % 10000).padStart(4, "0")}`;
}
