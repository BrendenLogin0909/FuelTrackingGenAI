/**
 * Optional OCR text cleanup before parseOcrText.
 * Receipt vs odometer use different failure modes (paper vs seven-segment / glare).
 */

export type OcrPostProcessMode = "none" | "receipt" | "odometer";

export function applyOcrPostProcess(
  text: string,
  mode: OcrPostProcessMode
): string {
  if (mode === "none") return text;

  if (mode === "receipt") {
    let t = text.replace(/\r\n/g, "\n");
    // Pipe often misread as 1 in currency and litre amounts
    t = t.replace(/(\$\s*)([\d,|]+)/gi, (_, dollar: string, digits: string) =>
      dollar + digits.replace(/\|/g, "1")
    );
    t = t.replace(/\b([\d,|]+)(?=\s*(?:l|litres?)\b)/gi, (m) =>
      m.replace(/\|/g, "1")
    );
    return t;
  }

  if (mode === "odometer") {
    let t = text;
    let prev = "";
    while (prev !== t) {
      prev = t;
      t = t.replace(/(\d)[Oo](\d)/g, "$10$2");
    }
    return t;
  }

  return text;
}
