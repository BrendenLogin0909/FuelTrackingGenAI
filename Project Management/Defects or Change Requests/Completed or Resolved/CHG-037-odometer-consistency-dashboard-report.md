# CHG-037: Odometer consistency dashboard report

## Summary

Add an exception report that identifies missing, decreasing, or implausibly large odometer changes.

## Metrics

- Missing odometer count
- Negative odometer jump count
- Large jump count

## Visual / interaction

- Primary visual: exception table with optional trend view
- Filters: vehicle, date range

## Acceptance criteria

1. Users can view odometer records flagged as inconsistent according to configurable rules.
2. Each exception identifies the relevant transaction sequence and problematic readings.
3. Users can filter and sort by vehicle and exception type.
4. The report documents the rule set used to classify odometer anomalies.

## Severity / priority

**High**

## Related

- Dashboard page
- Odometer data
- DEF-002

