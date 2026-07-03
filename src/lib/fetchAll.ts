/**
 * fetchAllRows — haalt een Supabase-resultset gepagineerd op (per 1000).
 *
 * PostgREST kapt elk antwoord af op de "Max rows"-serverlimiet (default 1000);
 * ook één grote .range() en set-returning RPC's zijn daaraan gebonden. Met
 * 1000+ deelnemers (entries, stage_points = deelnemers × etappes) missen
 * klassementen dan stilletjes rijen. Deze helper pagineert tot alles binnen is.
 *
 * Gebruik: fetchAllRows((from, to) => supabase.from("x").select("…").range(from, to))
 * Werkt ook op RPC's: fetchAllRows((from, to) => supabase.rpc("fn", args).range(from, to))
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  page = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build(from, from + page - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}
