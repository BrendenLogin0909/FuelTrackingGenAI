# CHG-003: Capture price per litre

## Summary

Add an explicit "Price per litre ($/L)" field to the transaction form. Pre-fill from OCR when present on the receipt; otherwise derive from total cost ÷ litres when both are available. Allow user to view and edit the value.

## Background

The data model already supports `price_per_litre` and the OCR parser can extract it (e.g. "$2.099/L", "PPR 2.15"). The form currently derives it only at save time (`total_cost / litres`) and does not display or allow editing. Receipts often show price per litre explicitly; capturing it improves accuracy when the displayed rate differs from a simple division (e.g. rounding, discounts).

## Current gaps

1. **No form field:** Price per litre is not visible or editable in the UI.
2. **Derived only:** Stored only when both litres and total cost exist, computed at save.
3. **OCR value unused:** OCR may extract price per litre from receipt but it is not passed to the form or shown.

## Selected behaviour

1. Add "Price per litre ($/L)" input to the transaction form (optional, number, step 0.001).
2. **Pre-fill order:** Use OCR-extracted value if present; else use `total_cost / litres` when both are entered.
3. **User override:** User can edit the field. If user changes litres or total cost, optionally recalculate price per litre (or leave as-is if user has edited it).
4. **Persistence:** Save `price_per_litre` to the transaction when provided or derived.

## Acceptance criteria

1. Form includes a "Price per litre ($/L)" field.
2. OCR-extracted price per litre pre-fills the field when available.
3. When litres and total cost are entered and price per litre is empty, it is derived and shown (e.g. on blur or live).
4. User can manually enter or edit price per litre.
5. `price_per_litre` is persisted in the transaction when valid.

## Severity / priority

**Medium** — Improves accuracy when receipts show explicit rate; supports auditing and comparison.

## Related

- `src/components/forms/TransactionForm.tsx`
- `src/lib/ocr/parser.ts` (already extracts price per litre)
- `src/lib/types/transaction.ts`
- `src/app/add/page.tsx`
