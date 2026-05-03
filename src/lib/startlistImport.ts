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

/**
 * Extract text per line. PDF.js gives us positioned text items — we group
 * them by their `y` coordinate to reconstruct logical lines.
 */
export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const allLines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by y-coordinate (rounded) to reconstruct lines
    const lineMap = new Map<number, Array<{ x: number; str: string }>>();
    for (const item of content.items as any[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, str: item.str });
    }

    // Sort lines top-to-bottom (PDF y increases upward)
    const ys = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const parts = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const line = parts.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim();
      if (line) allLines.push(line);
    }
  }

  return allLines.join("\n");
}

/**
 * Convert "LASTNAME First Middle" → "First Middle Lastname".
 */
function normalizeRiderName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ");
  if (tokens.length < 2) return cleaned;

  const isUpper = (t: string) => t === t.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(t);

  let splitAt = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    if (isUpper(tokens[i])) splitAt = i + 1;
    else break;
  }
  if (splitAt === 0 || splitAt === tokens.length) return cleaned;

  const last = tokens.slice(0, splitAt).join(" ");
  const first = tokens.slice(splitAt).join(" ");
  const titleCase = (part: string) =>
    part
      .toLowerCase()
      .split(/([-'])/)
      .map((segment) => (segment === "-" || segment === "'" || !segment ? segment : segment.charAt(0).toUpperCase() + segment.slice(1)))
      .join("");
  const titleLast = last
    .split(" ")
    .map(titleCase)
    .join(" ");
  return `${first} ${titleLast}`.trim();
}

/**
 * Robust line-based parser for ProCyclingStats startlist PDFs.
 *
 * Expected structure (per line):
 *   "<team_index> <Team Name>"        e.g. "1 Lotto Intermarché"
 *   "<start_number>. <RIDER NAME>"    e.g. "81. DE LIE Arnaud"
 *   "0. NAME"                         (captain marker — skip)
 *   "DS: ..."                         (director sportif line — skip)
 *
 * Page header lines like "Giro d'Italia | 2026" or "184 starting" are ignored.
 */
export function parseProCyclingStatsStartlist(rawText: string): ParsedStartlistTeam[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const teams: ParsedStartlistTeam[] = [];
  let current: ParsedStartlistTeam | null = null;
  let pendingTeamIndex: number | null = null;

  const riderRe = /^(\d{1,3})\.\s+([A-ZÀ-ÖØ-Þ][^\d].*)$/;
  const teamHeaderRe = /^(\d{1,2})\s+([A-Za-zÀ-ÿ].+)$/;
  const standaloneTeamIndexRe = /^(\d{1,2})$/;

  const ignoreRe = /^(DS:|procyclingstats|giro|tour|vuelta|\d{1,4}\s+starting|\d{2}\/\d{2}\/\d{4}|\d+\s*km)/i;

  const finishCurrent = () => {
    if (current && current.riders.length > 0) teams.push(current);
  };

  const startTeam = (name: string) => {
    finishCurrent();
    current = { name: name.trim(), riders: [] };
    pendingTeamIndex = null;
  };

  const isTeamHeader = (line: string) => {
    const match = line.match(teamHeaderRe);
    if (!match) return false;
    const idx = Number(match[1]);
    return idx >= 1 && idx <= 30;
  };

  const isFollowedByRiderBeforeNextTeam = (fromIndex: number) => {
    for (let j = fromIndex + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (ignoreRe.test(next)) continue;
      if (riderRe.test(next)) return true;
      if (isTeamHeader(next) || standaloneTeamIndexRe.test(next)) return false;
      if (/,/.test(next)) return false;
    }
    return false;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (ignoreRe.test(line)) continue;

    const riderMatch = line.match(riderRe);
    if (riderMatch) {
      const num = Number(riderMatch[1]);
      if (num === 0) continue;
      if (!current) continue; // rider before any team header — skip
      const name = normalizeRiderName(riderMatch[2]);
      if (!name) continue;
      current.riders.push({ name, start_number: num });
      continue;
    }

    const standaloneTeamIndex = line.match(standaloneTeamIndexRe);
    if (standaloneTeamIndex) {
      const idx = Number(standaloneTeamIndex[1]);
      if (idx >= 1 && idx <= 30) {
        pendingTeamIndex = idx;
        continue;
      }
    }

    const teamMatch = line.match(teamHeaderRe);
    if (teamMatch) {
      const idx = Number(teamMatch[1]);
      if (idx < 1 || idx > 30) continue;
      const name = teamMatch[2].trim();
      startTeam(name);
      continue;
    }

    if (pendingTeamIndex !== null) {
      startTeam(line);
      continue;
    }

    // Some PCS PDFs split long team names over multiple visual columns, e.g.
    // "8" on one line and "Netcompany INEOS Cycling / Team" much later.
    if (current && current.riders.length === 0 && /[A-Za-zÀ-ÿ]/.test(line) && !/,/.test(line)) {
      current.name = `${current.name} ${line}`.replace(/\s+/g, " ").trim();
      continue;
    }

    if (/[A-Za-zÀ-ÿ]/.test(line) && !/,/.test(line) && isFollowedByRiderBeforeNextTeam(i)) {
      startTeam(line);
    }
  }

  finishCurrent();

  return teams;
}
