import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export type ParsedStartlistTeam = {
  name: string;
  riders: Array<{
    name: string;
    start_number: number;
    dnf?: boolean;
  }>;
};

/**
 * Detecteer doorgestreepte (DNF) renners in een PCS-startlijst-PDF.
 *
 * De doorstreping is geen tekst maar een getekend lijntje over de naam. We
 * renderen elke pagina naar een canvas, bepalen per regel (op rugnummer) de
 * pixel-bounding-box, en kijken of er door het verticale midden van die regel
 * een (vrijwel) doorlopende donkere horizontale lijn loopt. Normale tekst heeft
 * gaten tussen letters/woorden; een doorstreping is één lange streep.
 *
 * Best-effort: drempelwaarden zijn afgestemd op PCS-PDF's. De admin corrigeert
 * de detectie in de preview vóór opslaan, dus een misser is niet fataal.
 *
 * @returns Set van rugnummers die als doorgestreept zijn gedetecteerd.
 */
export async function detectStruckBibs(file: File): Promise<Set<number>> {
  const SCALE = 2;        // render-resolutie
  const DARK = 145;       // luminantie-grens (< = donker)
  const GAP = 4 * SCALE;  // toegestaan gaatje (px) binnen één streep
  const COVER = 0.55;     // streep moet ≥ 55% van de regelbreedte beslaan

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const struck = new Set<number>();

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    const { data: px, width: W, height: H } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const content = await page.getTextContent();
    type DItem = { x: number; y: number; w: number; h: number; str: string };
    const items: DItem[] = [];
    for (const it of content.items as any[]) {
      if (!("str" in it)) continue;
      const s = String(it.str);
      if (!s.trim()) continue;
      const m = pdfjsLib.Util.transform(viewport.transform, it.transform);
      items.push({
        x: m[4],
        y: m[5], // device baseline-y
        w: (it.width ?? 0) * SCALE,
        h: ((it.height ?? 8) * SCALE) || 16,
        str: s,
      });
    }
    if (items.length === 0) continue;

    // groepeer items op gedeelde baseline → logische regels
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    const Y_TOL = 4 * SCALE;
    const lines: DItem[][] = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= Y_TOL) last.push(it);
      else lines.push([it]);
    }

    for (const line of lines) {
      const text = line.map((l) => l.str).join(" ").replace(/\s+/g, " ").trim();
      const bibMatch = text.match(/(\d{1,3})\s*\./);
      if (!bibMatch) continue;
      const bib = Number(bibMatch[1]);
      if (bib < 1 || bib > 999) continue;

      const left = Math.min(...line.map((l) => l.x));
      const right = Math.max(...line.map((l) => l.x + l.w));
      const lineW = right - left;
      if (lineW < 10) continue;
      const baseline = line.reduce((s, l) => s + l.y, 0) / line.length;
      const h = Math.max(...line.map((l) => l.h));

      // streep-zone: net boven de baseline, rond het x-hoogte-midden
      const yTop = Math.round(baseline - h * 0.55);
      const yBot = Math.round(baseline - h * 0.20);
      const xFrom = Math.max(0, Math.round(left));
      const xTo = Math.min(W - 1, Math.round(right));

      let strike = false;
      for (let yy = yTop; yy <= yBot && !strike; yy += 1) {
        if (yy < 0 || yy >= H) continue;
        let bestRun = 0;
        let run = 0;
        let gapRun = 0;
        for (let xx = xFrom; xx <= xTo; xx += 1) {
          const idx = (yy * W + xx) * 4;
          const lum = 0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2];
          const alpha = px[idx + 3];
          const dark = alpha > 20 && lum < DARK;
          if (dark) {
            run += gapRun + 1;
            gapRun = 0;
            if (run > bestRun) bestRun = run;
          } else {
            gapRun += 1;
            if (gapRun > GAP) {
              run = 0;
              gapRun = 0;
            }
          }
        }
        if (bestRun >= lineW * COVER) strike = true;
      }
      if (strike) struck.add(bib);
    }
  }

  return struck;
}

/**
 * Extract text from a PCS startlist PDF.
 *
 * PCS startlists are laid out in 3–4 visual columns. Reading items in PDF
 * source order interleaves teams and produces phantom teams (e.g. 43 instead
 * of 23). We use each item's (x, y) position to:
 *   1) cluster items into vertical columns by x coordinate
 *   2) sort each column top-to-bottom (PDF y is bottom-up)
 *   3) group items on the same baseline into one logical line
 */
export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const content = await page.getTextContent();

    type Item = { x: number; y: number; str: string };
    const items: Item[] = [];
    for (const it of content.items as any[]) {
      if (!("str" in it)) continue;
      const str = String(it.str).replace(/\s+/g, " ").trim();
      if (!str) continue;
      const tr = it.transform as number[];
      items.push({ x: tr[4], y: tr[5], str });
    }
    if (items.length === 0) continue;

    // 1) cluster x positions into columns
    const xs = [...items.map((it) => it.x)].sort((a, b) => a - b);
    const colStarts: number[] = [];
    const COL_GAP = Math.max(40, pageWidth / 12);
    for (const x of xs) {
      if (colStarts.length === 0 || x - colStarts[colStarts.length - 1] > COL_GAP) {
        colStarts.push(x);
      }
    }
    const colOf = (x: number) => {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < colStarts.length; c += 1) {
        const d = Math.abs(x - colStarts[c]);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      return best;
    };

    // 2) bucket items per column, sort top-to-bottom
    const columns: Item[][] = colStarts.map(() => []);
    for (const it of items) columns[colOf(it.x)].push(it);
    for (const col of columns) col.sort((a, b) => b.y - a.y || a.x - b.x);

    // 3) within a column, group items on the same baseline into one line
    const Y_TOL = 3;
    for (const col of columns) {
      let buffer: Item[] = [];
      let currentY: number | null = null;
      const flush = () => {
        if (buffer.length === 0) return;
        const text = buffer
          .sort((a, b) => a.x - b.x)
          .map((b) => b.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) allLines.push(text);
        buffer = [];
      };
      for (const it of col) {
        if (currentY === null || Math.abs(it.y - currentY) <= Y_TOL) {
          buffer.push(it);
          currentY = currentY ?? it.y;
        } else {
          flush();
          buffer.push(it);
          currentY = it.y;
        }
      }
      flush();
    }
  }

  // Re-stitch "81." + "DE LIE Arnaud" if the bib ended up on its own line
  const stitched: string[] = [];
  for (let i = 0; i < allLines.length; i += 1) {
    const cur = allLines[i];
    const nxt = allLines[i + 1];
    if (/^\d{1,3}\.$/.test(cur) && nxt && /^[A-ZÀ-ÖØ-Þ]/.test(nxt)) {
      stitched.push(`${cur} ${nxt}`);
      i += 1;
    } else {
      stitched.push(cur);
    }
  }

  return stitched.join("\n");
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
