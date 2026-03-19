# CHG-028: High volume exceptions dashboard report

## Summary

Add an exception report that flags unusually large fuel purchases.

## Metrics

- Exception count
- Litres variance versus expected pattern
- Associated spend amount

## Visual / interaction

- Primary visual: exception table
- Filters: date range, vehicle, driver

## Acceptance criteria

1. Users can view transactions whose litres exceed a configurable rule or learned threshold.
2. Each exception includes litres purchased, related spend, and contextual vehicle or driver information.
3. Users can sort and filter the exception list.
4. The report documents the rule used to classify the exception.

## Severity / priority

**Medium**

## Related

- Dashboard page
- Transactions data

