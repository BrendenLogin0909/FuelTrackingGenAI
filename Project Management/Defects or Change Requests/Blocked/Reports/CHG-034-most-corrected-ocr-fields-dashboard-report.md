# CHG-034: Most corrected OCR fields dashboard report

## Summary

Add a dashboard report that shows which OCR-extracted fields are corrected most often.

## Metrics

- Correction count by field
- Correction percentage by field
- Trend of corrections by field over time

## Visual / interaction

- Primary visual: bar chart
- Filters: date range, document source

## Acceptance criteria

1. Users can rank extracted fields by how often they are corrected.
2. The report supports both count and percentage views.
3. The report can show at least the main transaction fields, including odometer, litres, total, and price per litre where available.
4. Filters update field rankings consistently.

## Severity / priority

**Medium**

## Related

- Dashboard page
- OCR pipeline
- Audit history

