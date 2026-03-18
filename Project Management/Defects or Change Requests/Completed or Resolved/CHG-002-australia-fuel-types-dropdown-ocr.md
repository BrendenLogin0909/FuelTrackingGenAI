# CHG-002: Australia fuel types dropdown and OCR alignment

## Summary

Replace the free-text fuel type field with a dropdown of common Australian fuel types. OCR should search for these petrol types in receipt text to pre-fill the selection more accurately.

## Background

The current form uses a text input for fuel type. Users may enter inconsistent values (e.g. "U91", "Unleaded 91", "91 RON"). Australian receipts typically show fuel type near the fuel line item. OCR does not currently extract fuel type from receipt text.

## Current gaps

1. **Free-text input:** Inconsistent values, typos, no standardisation.
2. **No OCR extraction:** Fuel type is not parsed from receipt text.
3. **No dropdown:** Users must recall or type fuel type manually.

## Selected behaviour

### Dropdown options (common Australian fuel types)

| Value | Display label |
|-------|---------------|
| `U91` | Unleaded 91 (U91) |
| `P95` | Premium 95 (P95) |
| `P98` | Premium 98 (P98) |
| `E10` | E10 (Unleaded + 10% ethanol) |
| `E85` | E85 (Flex-fuel) |
| `Diesel` | Diesel |
| `Premium Diesel` | Premium Diesel |
| `LPG` | LPG (Autogas) |
| _(empty)_ | — Select fuel type — |

### OCR alignment

- OCR parser searches receipt text for these fuel type strings (and common variants).
- Variants to match: "Unleaded 91", "U91", "91 RON", "Premium 95", "P95", "98", "P98", "E10", "E85", "Diesel", "Premium Diesel", "LPG", "Autogas".
- When a match is found, pre-fill the dropdown with the corresponding option.
- User can override selection if OCR misidentifies.

## Acceptance criteria

1. Fuel type field is a dropdown (select) with the listed Australian fuel types.
2. Dropdown includes an empty/default option (e.g. "— Select fuel type —").
3. OCR parser extracts fuel type from receipt text using the known fuel type strings/variants.
4. Extracted fuel type pre-fills the dropdown when a match is found.
5. User can change the selection before saving.

## Severity / priority

**Medium** — Improves data consistency and reduces manual entry; aligns OCR with form.

## Related

- `src/components/forms/TransactionForm.tsx`
- `src/lib/ocr/parser.ts`
- `src/lib/types/transaction.ts`
- `src/app/add/page.tsx`
