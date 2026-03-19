# CHG-031: Fuel vs receipt total mismatch dashboard report

## Summary

Add an exception report that highlights transactions where the fuel amount does not reconcile with the total receipt amount.

## Metrics

- Mismatch count
- Absolute mismatch amount
- Mismatch percentage

## Visual / interaction

- Primary visual: exception table
- Supporting visual: KPI card
- Filters: date range, station, document source

## Acceptance criteria

1. Users can view transactions where fuel amount and receipt total differ beyond an allowed tolerance.
2. Each exception shows the extracted values, final saved values, and the mismatch amount.
3. The report supports sorting by largest mismatch.
4. The mismatch rule and tolerance are documented and consistently applied.

## Severity / priority

**High**

## Related

- Dashboard page
- DEF-001
- Transactions data

