# CHG-027: High unit price exceptions dashboard report

## Summary

Add an exception report that flags transactions with unusually high price per litre.

## Metrics

- Exception count
- Price per litre deviation from average or threshold
- Impacted spend amount

## Visual / interaction

- Primary visual: exception table
- Supporting visual: KPI card
- Filters: date range, station, region, fuel type

## Acceptance criteria

1. Users can view transactions whose price per litre exceeds a configurable rule or calculated threshold.
2. Each exception shows the observed price, expected benchmark, and variance.
3. Users can filter and sort the exception list.
4. The report documents the rule used to classify a transaction as an exception.

## Severity / priority

**High**

## Related

- Dashboard page
- Transactions data

