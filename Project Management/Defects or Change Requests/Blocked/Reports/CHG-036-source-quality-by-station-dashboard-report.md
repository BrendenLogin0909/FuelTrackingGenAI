# CHG-036: Source quality by station dashboard report

## Summary

Add a dashboard report that shows receipt and OCR data quality by station or brand.

## Metrics

- OCR success rate by station
- Correction rate by station
- Manual review rate by station

## Visual / interaction

- Primary visual: bar chart
- Filters: date range, station, brand

## Acceptance criteria

1. Users can compare OCR-related data quality across stations and brands.
2. The report shows at least success rate, correction rate, and review rate.
3. Stations with low document volume are still handled sensibly in the display.
4. Filters update station quality scores consistently.

## Severity / priority

**Medium**

## Related

- Dashboard page
- OCR pipeline
- Transactions data

