# Fuel Tracking MVP — Test Plan

## 1. Test Strategy

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | Calculations, OCR parser, validation | Jest |
| Integration | Storage adapter, OCR service | Jest (mocked IndexedDB) |
| E2E | Add transaction, dashboard, edit flow | Playwright |

## 2. Traceability to PRD

| PRD Feature | Test Coverage |
|-------------|---------------|
| 5.1 Add Fuel Transaction (photo/upload) | E2E: add flow, unit: OCR parser |
| 5.2 Automatic Data Extraction | Unit: parser, integration: extractFromImages |
| 5.3 Manual Entry | E2E: manual form submit |
| 5.4 Automatic Saving | E2E: verify after photo upload |
| 6 Calculations (L/100km, etc.) | Unit: calculations module |
| 7 Incomplete data handling | Unit: enrichTransactionsWithMetrics |
| 11 Dashboard | E2E: metrics display, empty state |

## 3. Priority

1. **P0:** Add transaction (photo + manual), calculations, storage
2. **P1:** Edit flow, dashboard metrics
3. **P2:** Validation, error states

## 4. Acceptance Criteria

- User can add transaction via photo or manual entry
- OCR extracts and parses receipt text
- Metrics calculated when sufficient data exists
- N/A shown when data insufficient
- Edit flow updates existing transaction
