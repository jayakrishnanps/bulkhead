function matchSegment(pattern: string, text: string): boolean {
  let patternIndex = 0;
  let textIndex = 0;
  let lastStarIndex = -1;
  let matchTextIndex = 0;

  while (textIndex < text.length) {
    const patternCharacter = pattern[patternIndex];
    const textCharacter = text[textIndex];

    if (
      patternIndex < pattern.length &&
      (patternCharacter === "?" || patternCharacter === textCharacter)
    ) {
      patternIndex += 1;
      textIndex += 1;
      continue;
    }

    if (patternIndex < pattern.length && patternCharacter === "*") {
      lastStarIndex = patternIndex;
      matchTextIndex = textIndex;
      patternIndex += 1;
      continue;
    }

    if (lastStarIndex >= 0) {
      patternIndex = lastStarIndex + 1;
      matchTextIndex += 1;
      textIndex = matchTextIndex;
      continue;
    }

    return false;
  }

  while (patternIndex < pattern.length && pattern[patternIndex] === "*") {
    patternIndex += 1;
  }

  return patternIndex === pattern.length;
}

function buildMatchTable(
  patternSegments: string[],
  valueSegments: string[],
): boolean[][] {
  const table: boolean[][] = [];
  for (let i = 0; i <= patternSegments.length; i += 1) {
    const row: boolean[] = [];
    for (let j = 0; j <= valueSegments.length; j += 1) {
      row.push(false);
    }
    table.push(row);
  }
  return table;
}

function updateWildcardRow(
  table: boolean[][],
  rowIndex: number,
  valueLength: number,
): void {
  const previousRow = table[rowIndex - 1];
  const currentRow = table[rowIndex];
  if (previousRow === undefined || currentRow === undefined) {
    return;
  }
  currentRow[0] = Boolean(previousRow[0]);
  for (let j = 1; j <= valueLength; j += 1) {
    const fromAbove = Boolean(previousRow[j]);
    const fromLeft = Boolean(currentRow[j - 1]);
    currentRow[j] = fromAbove || fromLeft;
  }
}

function updateSegmentRow(
  table: boolean[][],
  rowIndex: number,
  segmentPattern: string,
  valueSegments: string[],
): void {
  const previousRow = table[rowIndex - 1];
  const currentRow = table[rowIndex];
  if (previousRow === undefined || currentRow === undefined) {
    return;
  }
  for (let j = 1; j <= valueSegments.length; j += 1) {
    const valueSegment = valueSegments[j - 1];
    if (valueSegment === undefined) {
      continue;
    }
    if (matchSegment(segmentPattern, valueSegment)) {
      currentRow[j] = Boolean(previousRow[j - 1]);
    }
  }
}

export function matchGlob(
  pattern: string,
  value: string,
  ignoreCase: boolean,
): boolean {
  const normalizedPattern = ignoreCase ? pattern.toLowerCase() : pattern;
  const normalizedValue = ignoreCase ? value.toLowerCase() : value;
  const patternSegments = normalizedPattern.split("/");
  const valueSegments = normalizedValue.split("/");

  const table = buildMatchTable(patternSegments, valueSegments);
  const firstRow = table[0];
  if (firstRow !== undefined) {
    firstRow[0] = true;
  }

  for (let i = 1; i <= patternSegments.length; i += 1) {
    const segment = patternSegments[i - 1];
    if (segment === undefined) {
      continue;
    }
    if (segment === "**") {
      updateWildcardRow(table, i, valueSegments.length);
    } else {
      updateSegmentRow(table, i, segment, valueSegments);
    }
  }

  const lastRow = table[patternSegments.length];
  if (lastRow === undefined) {
    return false;
  }
  return Boolean(lastRow[valueSegments.length]);
}
