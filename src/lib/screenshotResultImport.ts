export type ImportClassification = "stage" | "gc" | "points" | "mountain" | "youth";

export type ScreenshotResultRow = {
  position: number;
  bib: number | null;
  name: string;
  confidence: number;
};

export type ScreenshotExtraction = {
  classification: ImportClassification | "unknown";
  stage_number: number | null;
  source_title: string;
  rows: ScreenshotResultRow[];
  warnings: string[];
};

export type ImportRider = {
  id: string;
  name: string;
  start_number?: number | null;
};

type MatchedRow = {
  position: number;
  rider_id: string;
  rider_name: string;
  start_number: number | null;
  confidence: number;
};

type UnmatchedRow = ScreenshotResultRow;

const CLASSIFICATIONS: ImportClassification[] = ["stage", "gc", "points", "mountain", "youth"];
const MANUAL_REVIEW_CONFIDENCE = 0.82;

function emptyRecord<T>(): Record<ImportClassification, T[]> {
  return { stage: [], gc: [], points: [], mountain: [], youth: [] };
}

const LATIN_LETTER_FOLDS: Record<string, string> = {
  ł: "l",
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
  ħ: "h",
  ŧ: "t",
  ŋ: "n",
  ĸ: "k",
  ŀ: "l",
  ƒ: "f",
};

const EXPANDED_LATIN_FOLDS: Record<string, string> = {
  å: "aa",
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ø: "oe",
};

function foldLatinName(value: string, expanded = false): string {
  let lowered = (value || "").toLowerCase();
  if (expanded) {
    lowered = lowered.replace(/[åäöüø]/g, (letter) => EXPANDED_LATIN_FOLDS[letter] ?? letter);
  }
  return lowered
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łøæœßđðþıħŧŋĸŀƒ]/g, (letter) => LATIN_LETTER_FOLDS[letter] ?? letter);
}

function nameKeys(value: string): string[] {
  const foldedVariants = [foldLatinName(value), foldLatinName(value, true)];
  const keys = foldedVariants.flatMap((folded) => {
    const normalized = folded.replace(/[^a-z]/g, "");
    const sorted = folded
      .replace(/[^a-z\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.replace(/-/g, ""))
      .filter(Boolean)
      .sort()
      .join("");
    return [normalized, sorted];
  });
  return Array.from(new Set(keys.filter(Boolean)));
}

function namesAgree(left: string, right: string): boolean {
  const rightKeys = new Set(nameKeys(right));
  return nameKeys(left).some((key) => rightKeys.has(key));
}

function isClassification(value: string): value is ImportClassification {
  return CLASSIFICATIONS.includes(value as ImportClassification);
}

export function buildScreenshotImportPreview({
  extraction,
  riders,
  expectedClassification,
  expectedStageNumber,
  filename,
}: {
  extraction: ScreenshotExtraction;
  riders: ImportRider[];
  expectedClassification: ImportClassification;
  expectedStageNumber: number;
  filename: string;
}) {
  const matched = emptyRecord<MatchedRow>();
  const unmatched = emptyRecord<UnmatchedRow>();
  const warnings = [...(extraction.warnings ?? []).filter(Boolean)];
  const blockingWarnings: string[] = [];

  const detectedClassification = isClassification(extraction.classification)
    ? extraction.classification
    : expectedClassification;
  if (extraction.classification === "unknown") {
    warnings.push(`Klassement niet zeker herkend; ${expectedClassification} uit de selectie gebruikt.`);
  } else if (detectedClassification !== expectedClassification) {
    warnings.push(
      `Screenshot herkend als ${detectedClassification}, terwijl ${expectedClassification} geselecteerd was. ` +
      `De herkende soort wordt gebruikt.`,
    );
  }

  const isFinalClassificationAfterStage21 = expectedStageNumber === 22 &&
    detectedClassification !== "stage" && extraction.stage_number === 21;
  if (
    extraction.stage_number != null &&
    extraction.stage_number !== expectedStageNumber &&
    !isFinalClassificationAfterStage21
  ) {
    blockingWarnings.push(
      `Screenshot lijkt bij etappe ${extraction.stage_number} te horen, niet bij etappe ${expectedStageNumber}.`,
    );
  }

  const byBib = new Map<number, ImportRider>();
  const byName = new Map<string, ImportRider | null>();
  for (const rider of riders) {
    if (rider.start_number != null) byBib.set(Number(rider.start_number), rider);
    for (const key of nameKeys(rider.name)) {
      const existing = byName.get(key);
      if (existing && existing.id !== rider.id) byName.set(key, null);
      else if (!byName.has(key)) byName.set(key, rider);
    }
  }

  const seenPositions = new Set<number>();
  const cleanRows: ScreenshotResultRow[] = [];
  for (const rawRow of [...(extraction.rows ?? [])].sort((a, b) => a.position - b.position)) {
    const position = Number(rawRow.position);
    if (!Number.isInteger(position) || position < 1 || position > 20) continue;
    if (seenPositions.has(position)) {
      warnings.push(`Positie ${position} stond meerdere keren in de uitgelezen tabel.`);
      continue;
    }
    seenPositions.add(position);
    cleanRows.push({
      position,
      bib: rawRow.bib == null ? null : Number(rawRow.bib),
      name: String(rawRow.name || "").trim(),
      confidence: Math.max(0, Math.min(1, Number(rawRow.confidence) || 0)),
    });
  }

  const seenRiders = new Set<string>();
  let lowConfidenceCount = 0;
  for (const row of cleanRows) {
    let rider = row.bib != null ? byBib.get(row.bib) : undefined;
    if (rider && row.name && !namesAgree(rider.name, row.name)) rider = undefined;
    if (!rider && row.name) {
      for (const key of nameKeys(row.name)) {
        const candidate = byName.get(key);
        if (candidate) {
          rider = candidate;
          break;
        }
      }
    }

    if (row.confidence < MANUAL_REVIEW_CONFIDENCE) {
      lowConfidenceCount++;
      unmatched[detectedClassification].push(row);
      continue;
    }
    if (!rider || seenRiders.has(rider.id)) {
      if (rider && seenRiders.has(rider.id)) {
        warnings.push(`${rider.name} werd meerdere keren herkend; controleer positie ${row.position}.`);
      }
      unmatched[detectedClassification].push(row);
      continue;
    }
    seenRiders.add(rider.id);
    matched[detectedClassification].push({
      position: row.position,
      rider_id: rider.id,
      rider_name: rider.name,
      start_number: rider.start_number ?? row.bib ?? null,
      confidence: row.confidence,
    });
  }

  if (lowConfidenceCount > 0) {
    warnings.push(`${lowConfidenceCount} rij(en) hebben lage beeldzekerheid en moeten handmatig worden gekoppeld.`);
  }
  if (cleanRows.length < 10) {
    warnings.push(`Screenshot leverde slechts ${cleanRows.length} herkenbare top-20-rijen.`);
  }

  const counts = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [classification, {
      matched: matched[classification].length,
      unmatched: unmatched[classification].length,
      total: classification === detectedClassification ? cleanRows.length : 0,
    }]),
  ) as Record<ImportClassification, { matched: number; unmatched: number; total: number }>;

  return {
    source_url: `Screenshot: ${filename}`,
    source_label: filename,
    source_kind: "screenshot" as const,
    source_title: extraction.source_title,
    detected_classification: detectedClassification,
    detected_stage_number: extraction.stage_number,
    matched,
    unmatched,
    counts,
    warnings,
    blocking_warnings: blockingWarnings,
  };
}
