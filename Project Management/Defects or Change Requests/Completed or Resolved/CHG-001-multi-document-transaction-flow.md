# CHG-001: Multi-document transaction flow (receipt + odometer separately)

## Summary

The PRD specifies capturing both a fuel receipt and an odometer/dashboard photo per transaction. The current flow only supports a single photo when using the camera, and OCR treats all images as one blob instead of extracting fields from the appropriate image type.

## Background (PRD Section 5.1)

> Typical transaction photos:
> - Fuel receipt
> - Odometer
> - Vehicle dashboard (optional)

The data model already supports `receipt_image`, `odometer_image`, and `extra_images`. File upload accepts multiple files, but the UX does not guide users to provide both receipt and odometer.

## Current gaps

1. **Camera flow:** "Take photo" captures only one image. Users cannot capture receipt then odometer in sequence.
2. **Upload flow:** "Upload photos" accepts multiple files but does not indicate which is receipt vs odometer. Order is assumed (files[0]=receipt, files[1]=odometer).
3. **OCR extraction:** `extractFromImages` concatenates all OCR text and parses as one block. Odometer is incorrectly sought in receipt text; receipt fields may be polluted by odometer/dashboard text.
4. **No image-type labelling:** Users cannot tag images as "receipt" or "odometer" before extraction.

## Selected behaviour

### PhotoCapture (camera): Option A — Guided multi-step capture

1. Step 1: "Capture receipt" — user takes receipt photo(s).
2. Step 2: "Capture odometer (optional)" — user takes odometer/dashboard photo(s).
3. Extract receipt fields (total, litres, date, station, fuel amount) from receipt images only.
4. Extract odometer from odometer images only. Do not search for odometer in receipt text.

### Upload: Option B — Single upload with role selection

1. User uploads multiple photos in one action.
2. UI shows thumbnails; user assigns each image as "Receipt" or "Odometer".
3. Extraction runs per image role.

### Image viewing

All images (receipt, odometer, extra) must be viewable by the user. Provide a way to scroll or swipe between images (e.g. thumbnail strip, carousel, or gallery) so users can review and verify each photo before or after extraction.

## Acceptance criteria

1. Users can provide both a receipt photo and an odometer photo for one transaction.
2. Receipt fields (total_cost, litres, date, station_name, fuel line items) are extracted from receipt image(s) only.
3. Odometer is extracted from odometer/dashboard image(s) only, not from receipt text.
4. **PhotoCapture:** Guided multi-step flow — capture receipt, then optionally odometer, before proceeding.
5. **Upload:** Thumbnails shown; user assigns each image as "Receipt" or "Odometer" before extraction.
6. **Viewing:** All images can be viewed by the user (e.g. scroll/swipe between them in a carousel or gallery).

## Severity / priority

**Medium** — Aligns implementation with PRD; improves extraction accuracy (see DEF-002).

## Related

- PRD Section 5.1, 8 (Transaction Data Model)
- DEF-002: Odometer wrong source
- DEF-001: Fuel vs total receipt amount
- `src/components/capture/PhotoCapture.tsx`
- `src/lib/ocr/index.ts`, `parser.ts`
- `src/app/add/page.tsx`
