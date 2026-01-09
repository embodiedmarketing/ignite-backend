
export function parseVTT(vttContent: string): string {
  const lines = vttContent.split("\n");
  const textLines: string[] = [];
  let inStyleBlock = false;
  let inRegionBlock = false;
  let inNoteBlock = false;
  let inCueText = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("WEBVTT")) continue;

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

    if (line.includes("-->")) {
      inCueText = true;
      continue;
    }

    if (!line) {
      inCueText = false;
      continue;
    }

    if (inCueText) {
      let cleanedLine = line.replace(/<[^>]+>/g, "");

      if (cleanedLine.trim()) {
        textLines.push(cleanedLine.trim());
      }
    }
  }

  return textLines.join(" ").trim();
}

