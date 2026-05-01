import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export type ParsedStartlistTeam = {
  name: string;
  riders: Array<{
    name: string;
    start_number: number;
  }>;
};

export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const chunks: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join("\n");
    chunks.push(pageText);
  }

  return chunks.join("\n");
}

/**
 * Convert "LAST FIRST MIDDLE" → "First Middle Last".
 * Detects which tokens are uppercase (last name parts) vs Title Case (first/middle).
 */
function normalizeRiderName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ");
  if (tokens.length < 2) return cleaned;

  // PCS format: LASTNAME(S) in UPPER, then First Middle in Title Case.
  // A token counts as "last name" if it's all uppercase letters (allow ' - and accented).
  const isUpper = (t: string) =>
    t === t.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(t);

  let splitAt = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    if (isUpper(tokens[i])) splitAt = i + 1;
    else break;
  }
  if (splitAt === 0 || splitAt === tokens.length) return cleaned;

  const last = tokens.slice(0, splitAt).join(" ");
  const first = tokens.slice(splitAt).join(" ");
  // Title-case the last name
  const titleLast = last
    .split(" ")
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(" ");
  return `${first} ${titleLast}`.trim();
}

/**
 * Robust parser for ProCyclingStats startlist PDFs.
 *
 * The PDF text is extracted as many small fragments (often each token on its
 * own line, with stray spaces). We therefore:
 *   1. Join all whitespace into single spaces (one big string).
 *   2. Use regex to find every rider entry: `NN. NAME` until the next entry,
 *      team header, or `DS:` block.
 *   3. Group riders into teams by their start-number prefix (1-9, 11-19, ...).
 *      Team name = text between previous block end and the first rider of
 *      that team's number range.
 */
export function parseProCyclingStatsStartlist(rawText: string): ParsedStartlistTeam[] {
  // Collapse all whitespace to single spaces. Keeps everything on one line.
  const text = rawText.replace(/\s+/g, " ").trim();

  // Strip the DS: ... lines (they end before the next "<digit><digit>?<space><Capital>" team header
  // or before the next rider number). Easiest: remove "DS: ... " up to next " <num>." or " <num> <Capital>".
  // We'll process by splitting on rider-number pattern instead.

  // Find all rider entries. A rider number is 1-3 digits followed by a dot.
  // Capture: start_number, name (up to next rider number, or " DS:", or end).
  const riderRe = /(\d{1,3})\.\s+([A-ZÀ-ÖØ-Þ][^.]*?)(?=\s+\d{1,3}\.\s+[A-ZÀ-ÖØ-Þ]|\s+DS:|\s+\d{1,2}\s+[A-ZÀ-ÖØ-Þ][^.]*?\s+\d{1,3}\.|$)/g;

  type RiderHit = { num: number; name: string; index: number };
  const hits: RiderHit[] = [];
  let m: RegExpExecArray | null;
  while ((m = riderRe.exec(text)) !== null) {
    const num = Number(m[1]);
    if (!Number.isFinite(num) || num < 1 || num > 999) continue;
    const name = normalizeRiderName(m[2]);
    if (!name) continue;
    hits.push({ num, name, index: m.index });
  }

  if (hits.length === 0) return [];

  // Group riders by team based on their start number's "tens/hundreds prefix".
  // PCS uses team_index * 10 + position (1..8), e.g. team 1 -> 1..8, team 2 -> 11..18,
  // team 10 -> 91..98 (some races use 100s for team 11+ -> 101..108).
  // Simpler: group consecutive riders whose numbers are within +/- 10 of the previous one
  // and increasing. A new team starts when number jumps backwards or by > 10.
  const groups: RiderHit[][] = [];
  let current: RiderHit[] = [];
  for (const h of hits) {
    if (current.length === 0) {
      current.push(h);
      continue;
    }
    const prev = current[current.length - 1];
    const sameTeam = h.num > prev.num && h.num - prev.num <= 10;
    if (sameTeam) {
      current.push(h);
    } else {
      groups.push(current);
      current = [h];
    }
  }
  if (current.length) groups.push(current);

  // For each group, find the team name: it's the text immediately BEFORE the
  // first rider hit, after the previous group's last "DS:" or after the start.
  // We look backwards from `firstHit.index` for the team-header pattern:
  //   "<team_index> <Team Name>"
  // where <team_index> is 1-2 digits and Team Name continues until just before
  // the rider number. Use the substring from the end of previous block.
  const teams: ParsedStartlistTeam[] = [];
  let cursor = 0;
  for (let g = 0; g < groups.length; g += 1) {
    const group = groups[g];
    const firstHit = group[0];
    const segment = text.slice(cursor, firstHit.index);

    // Strip trailing " DS: ... " from previous team if present.
    const cleaned = segment.replace(/\s*DS:\s+[^]*$/i, " ").trim();

    // Team header: leading "<digits> " then the team name (rest of the segment).
    // Sometimes a leading bullet/number is missing → accept any trailing text.
    const headerMatch = cleaned.match(/(?:^|\s)(\d{1,2})\s+(.+)$/);
    let teamName = headerMatch ? headerMatch[2] : cleaned;

    teamName = teamName
      .replace(/\s+/g, " ")
      // Fix "Red Bull - BORA - hansgrohe" (already fine after whitespace collapse).
      .trim();

    // Skip junk team names (page header, dates, km etc.)
    if (!teamName || /procyclingstats|starting|^\d+\s*km/i.test(teamName)) {
      // Try fallback: use last 2-6 words.
      const fallback = cleaned.split(" ").slice(-6).join(" ").trim();
      teamName = fallback || `Team ${g + 1}`;
    }

    teams.push({
      name: teamName,
      riders: group.map((r) => ({ name: r.name, start_number: r.num })),
    });

    // Advance cursor to just past the last rider hit of this group.
    const lastHit = group[group.length - 1];
    cursor = lastHit.index + lastHit.name.length + String(lastHit.num).length + 2;
  }

  return teams.filter((t) => t.riders.length > 0);
}
