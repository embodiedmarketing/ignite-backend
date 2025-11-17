/**
 * Parse VTT (WebVTT) files and extract text content
 */
export function parseVTT(vttContent: string): string {
  const lines = vttContent.split("\n");
  const textLines: string[] = [];
  let inStyleBlock = false;
  let inRegionBlock = false;
  let inNoteBlock = false;
  let inCueText = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header
    if (line.startsWith("WEBVTT")) continue;

    // Handle STYLE blocks
    if (line.startsWith("STYLE")) {
      inStyleBlock = true;
      continue;
    }
    if (inStyleBlock) {
      if (line === "") {
        inStyleBlock = false;
      }
      continue;
    }

    // Handle REGION blocks
    if (line.startsWith("REGION")) {
      inRegionBlock = true;
      continue;
    }
    if (inRegionBlock) {
      if (line === "") {
        inRegionBlock = false;
      }
      continue;
    }

    // Handle NOTE blocks (skip entire block until blank line)
    // Only detect NOTE when not inside cue text to avoid skipping dialogue starting with "NOTE:"
    if (!inCueText && line.startsWith("NOTE")) {
      inNoteBlock = true;
      continue;
    }
    if (inNoteBlock) {
      if (line === "") {
        inNoteBlock = false;
      }
      continue;
    }

    // Detect timestamp lines (format: 00:00:00.000 --> 00:00:00.000)
    if (line.includes("-->")) {
      inCueText = true;
      continue;
    }

    // Handle empty lines - they separate cues
    if (!line) {
      inCueText = false;
      continue;
    }

    // Collect cue text (all lines after timestamp until blank line)
    if (inCueText) {
      // Remove inline WebVTT tags like <v Speaker>, <c>, <i>, etc.
      let cleanedLine = line.replace(/<[^>]+>/g, "");

      if (cleanedLine.trim()) {
        textLines.push(cleanedLine.trim());
      }
    }
  }

  return textLines.join(" ").trim();
}

