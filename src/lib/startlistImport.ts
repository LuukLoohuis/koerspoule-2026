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

export function parseProCyclingStatsStartlist(rawText: string): ParsedStartlistTeam[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const teams: ParsedStartlistTeam[] = [];
  let currentTeam: ParsedStartlistTeam | null = null;
  let pendingSplitTeamName: string | null = null;

  for (const line of lines) {
    if (/^DS:/i.test(line) || /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line)) {
      continue;
    }

    const teamMatch = line.match(/^(\d{1,2})\s+(.+)$/);
    const riderMatch = line.match(/^(\d{1,3})\.\s+(.+)$/);

    if (teamMatch && !riderMatch) {
      const maybeName = teamMatch[2].trim();
      // Handle wrapped team names like:
      // "8 Red Bull - BORA -" + "hansgrohe"
      if (maybeName.endsWith("-")) {
        pendingSplitTeamName = maybeName;
        continue;
      }
      const finalName = pendingSplitTeamName
        ? `${pendingSplitTeamName} ${maybeName}`.replace(/\s+/g, " ").trim()
        : maybeName;
      pendingSplitTeamName = null;

      currentTeam = { name: finalName, riders: [] };
      teams.push(currentTeam);
      continue;
    }

    if (pendingSplitTeamName && !currentTeam) {
      currentTeam = {
        name: `${pendingSplitTeamName} ${line}`.replace(/\s+/g, " ").trim(),
        riders: [],
      };
      pendingSplitTeamName = null;
      teams.push(currentTeam);
      continue;
    }

    if (riderMatch && currentTeam) {
      const startNumber = Number(riderMatch[1]);
      const rawName = riderMatch[2].trim();
      // Convert "LAST FIRST" to "First Last" when possible.
      const parts = rawName.split(/\s+/);
      const normalizedName =
        parts.length >= 2
          ? `${parts.slice(1).join(" ")} ${parts[0]}`.trim()
          : rawName;

      currentTeam.riders.push({
        name: normalizedName,
        start_number: startNumber,
      });
    }
  }

  return teams.filter((team) => team.riders.length > 0);
}
