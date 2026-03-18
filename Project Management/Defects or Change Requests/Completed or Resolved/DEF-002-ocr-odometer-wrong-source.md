# DEF-002: OCR selects wrong numbers as odometer when receipt has no odometer

## Summary

The OCR parser assigns random 5–7 digit numbers from receipts (e.g. receipt IDs, pump numbers, postal codes) as the odometer reading when no explicit odometer value exists. Receipts typically do not contain odometer readings.

## Description

When a user uploads only a fuel receipt (no odometer photo), the parser falls back to any 5–7 digit number in the text:

```82:95:src/lib/ocr/parser.ts
  // Odometer - 5-7 digit number, often "odo 123456" or "km 123456"
  const odoMatch = normalized.match(
    /(?:odo(?:meter)?|km|mileage)\s*[:\s]*(\d{5,7})\b/i
  );
  if (odoMatch) {
    result.odometer = parseInt(odoMatch[1], 10);
  }
  if (!result.odometer) {
    const sixDigit = normalized.match(/\b(\d{5,7})\b/);
    if (sixDigit) {
      const n = parseInt(sixDigit[1], 10);
      if (n >= 10000 && n <= 999999) result.odometer = n;
    }
  }
```

This fallback matches the first 5–7 digit number found, which may be a receipt number, pump ID, or other non-odometer value.

## Expected behaviour

- **Explicit label:** Only extract odometer when text contains labels like "odo", "odometer", "km", "mileage" near the number.
- **No fallback:** Do not infer odometer from arbitrary numbers on receipts.
- **Odometer from odometer image:** When a separate odometer/dashboard image is provided, extract odometer only from that image (see CHG-001).
- **User correction:** If extraction is uncertain, leave odometer blank and let the user enter it manually.

## Acceptance criteria

1. Remove or disable the fallback that assigns any 5–7 digit number as odometer.
2. Extract odometer only when an explicit label (odo/odometer/km/mileage) is present.
3. When multiple images are provided, extract odometer only from images designated as odometer/dashboard (CHG-001).
4. Odometer field remains empty when no valid odometer value can be confidently extracted.

## Severity

**High** — Incorrect odometer values corrupt fuel efficiency and distance calculations.

## Related

- Parser: `src/lib/ocr/parser.ts`
- CHG-001: Multi-document transaction flow (receipt vs odometer images)
