# CHG-030: Unrealistic refill timing alert dashboard report

## Summary

Add an exception report that flags fuel purchases occurring too close together in time to be plausible.

## Metrics

- Flagged transaction pairs
- Time gap between fill-ups
- Distance gap between fill-ups where available

## Visual / interaction

- Primary visual: exception table
- Filters: date range, vehicle, driver

## Acceptance criteria

1. Users can view transactions flagged for unrealistic refill timing based on configurable rules.
2. Each alert shows the two relevant transactions and their time gap.
3. Where odometer data exists, the report also shows distance between transactions.
4. Users can sort and filter the alert list by vehicle, driver, and severity.

## Severity / priority

**High**

## Related

- Dashboard page
- Transactions data
- Odometer data

