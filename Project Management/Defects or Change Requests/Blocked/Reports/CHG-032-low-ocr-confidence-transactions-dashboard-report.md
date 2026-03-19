# CHG-032: Low OCR confidence transactions dashboard report

## Summary

Add an exception report that surfaces transactions and documents with low OCR confidence for review.

## Metrics

- Low-confidence transaction count
- Average OCR confidence
- Confidence by extracted field

## Visual / interaction

- Primary visual: exception table
- Filters: date range, field type, station

## Acceptance criteria

1. Users can view transactions whose OCR confidence falls below a configurable threshold.
2. Each row identifies the low-confidence field or fields.
3. The report supports filtering by field type and source context.
4. Confidence scoring methodology is documented in implementation notes.

## Severity / priority

**High**

## Related

- Dashboard page
- OCR pipeline

