# DEF-001: Capture fuel-only amount vs total receipt amount

## Summary

The app captures the total receipt amount instead of the fuel-only amount when receipts include non-fuel items (e.g. snacks, drinks). It should distinguish between fuel balance and total, and use the appropriate value depending on context.

## Description

When a receipt contains both fuel and other purchases (e.g. 7-ELEVEN fuel + water bottle), the app currently pre-fills "Total cost ($)" with the grand total. For fuel tracking, the cost should reflect only the fuel portion.

**Example (7-ELEVEN receipt):**
- E10 fuel: 44.03 L @ $2.099/L = **$92.42**
- 7-ELEVEN 600ML STILL W 1: **$14.00**
- **Total receipt: $106.42**

The form incorrectly shows $106.42 in "Total cost ($)" instead of $92.42.

## Expected behaviour

- **Fuel-only receipts:** Use total (no split needed).
- **Receipts with fuel + other items:** Use the fuel balance/line-item amount (e.g. $92.42), not the grand total ($106.42).
- **Receipts with post-fuel discounts:** Use the discounted fuel amount when applicable (e.g. loyalty discount applied to fuel).

## Acceptance criteria

1. OCR/extraction logic identifies fuel line items separately from non-fuel items.
2. When fuel and non-fuel items coexist, "Total cost ($)" is pre-filled with the fuel-only amount.
3. When only fuel is present, "Total cost ($)" equals the receipt total.
4. Discounts applied to fuel (e.g. after subtotal) are reflected in the fuel amount used.

## Severity

**Medium** — Affects accuracy of fuel cost tracking and derived metrics (cost/km, efficiency).

## Related

- OCR parser: `src/lib/ocr/`
- Transaction form: `src/components/forms/TransactionForm.tsx`
- Extracted fields: `src/lib/types/transaction.ts`
