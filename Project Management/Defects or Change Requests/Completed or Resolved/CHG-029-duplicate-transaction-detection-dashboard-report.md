# CHG-029: Duplicate transaction detection dashboard report

## Summary

Add an exception report that identifies likely duplicate or near-duplicate fuel transactions.

## Metrics

- Potential duplicate count
- Matched transaction pairs or groups
- Potential duplicated spend amount

## Visual / interaction

- Primary visual: exception table
- Filters: date range, vehicle, receipt source

## Acceptance criteria

1. Users can view transactions flagged as probable duplicates based on configurable matching rules.
2. Each result shows the matched records and the fields that triggered the match.
3. Users can filter and sort by severity or confidence.
4. The duplicate-detection rules are documented within the requirement implementation.

## Severity / priority

**High**

## Related

- Dashboard page
- Transactions data

