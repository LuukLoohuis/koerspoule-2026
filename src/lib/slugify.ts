/**
 * URL-safe slug uit een vrije naam — spiegelt public.slugify() in de DB.
 * Accenten strippen (NFD), lowercase, niet-alfanumeriek → '-', samenvouwen,
 * trimmen. Lege uitkomst → 'subpoule'. Matchen is case-insensitive, dus
 * /subpoule/XYZ en /subpoule/xyz leveren dezelfde slug op.
 */
export function slugify(input: string): string {
  const s = (input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacrieten (combining marks) weg
    .toLowerCase()
    .replace(/ß/g, "ss") // ß → ss
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "subpoule";
}
