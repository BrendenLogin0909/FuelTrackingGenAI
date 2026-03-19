# CHG-024: Time-of-day fueling pattern dashboard report

## Summary

Add a dashboard report that shows what times of day fueling activity occurs most often.

## Metrics

- Transaction count by hour
- Spend by hour
- Average litres by hour

## Visual / interaction

- Primary visual: heatmap
- Filters: date range, driver, vehicle, station

## Acceptance criteria

1. Users can view fueling activity grouped by hour of day.
2. The report supports transaction count and spend-based interpretation.
3. Time grouping uses the stored local transaction timestamp.
4. Filters update the heatmap consistently.

## Severity / priority

**Low**

## Related

- Dashboard page
- Transactions data

