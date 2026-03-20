# CHG-033: OCR correction rate dashboard report

## Summary

Add a dashboard report that measures how often OCR-extracted values are manually corrected.

## Metrics

- Correction rate over time
- Corrections per document
- Manual edit count by period

## Visual / interaction

- Primary visual: line chart
- Filters: date range, document source, station

## Acceptance criteria

1. Users can view OCR correction rate over time.
2. The report distinguishes between auto-accepted and manually adjusted extractions.
3. The report supports filtering by document source and station.
4. Correction logic is based on auditable before-and-after values where available.

## Severity / priority

**High**

## Related

- Dashboard page
- OCR pipeline
- Audit history

