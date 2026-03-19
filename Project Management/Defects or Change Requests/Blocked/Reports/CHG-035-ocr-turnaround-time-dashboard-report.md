# CHG-035: OCR turnaround time dashboard report

## Summary

Add a dashboard report that measures how long OCR-based transactions take to move from upload to verified or finalized state.

## Metrics

- Average turnaround time
- Median turnaround time
- Turnaround time trend by period

## Visual / interaction

- Primary visual: KPI card with line chart
- Filters: date range, user, document source

## Acceptance criteria

1. Users can view the elapsed time from document upload to verified or completed transaction state.
2. The report supports average and median views.
3. The report shows trend movement over time.
4. Records missing required timestamps are excluded or clearly identified.

## Severity / priority

**Medium**

## Related

- Dashboard page
- OCR pipeline
- Transaction workflow data

