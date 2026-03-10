# Fuel Tracking App — Product Requirements Document (PRD)
Version: MVP v1

## 1. Product Vision
Create a simple application that allows individual car owners to track fuel usage, costs, and vehicle efficiency by capturing receipts and odometer readings.

The app should minimise manual entry by automatically extracting information from photos while still allowing manual input when needed.

---

## 2. Problem Statement
Drivers who want to track fuel costs or vehicle efficiency currently need to manually record data such as:

- Litres purchased
- Price paid
- Odometer readings
- Fuel efficiency

Existing solutions often require significant manual input, making them inconvenient for everyday use.

A simple system that captures this information automatically from receipts and dashboard photos would significantly reduce friction.

---

## 3. Target User (MVP)

Primary user:

Individual car owners who want to track:
- Fuel costs
- Vehicle fuel efficiency
- Fuel consumption trends

Not included in MVP:

- Multiple vehicles
- Family accounts
- Fleet management
- Business expense tracking

These may be added in later versions.

---

## 4. Platform Strategy

Initial build:

**Web application (mobile-friendly)**

Reasons:

- Fastest development using v0
- Easiest deployment
- Accessible on both desktop and mobile

Future expansion:

- Wrap web app into iOS and Android apps
- Progressive Web App (PWA)

---

## 5. Core MVP Features

### 5.1 Add Fuel Transaction

Users can add a fuel transaction by:

Option A  
Taking photos using the device camera.

Option B  
Uploading existing photos.

Typical transaction photos:

- Fuel receipt
- Odometer
- Vehicle dashboard (optional)

---

### 5.2 Automatic Data Extraction

The system extracts information from images using OCR.

Possible fields extracted:

- Total price
- Litres purchased
- Price per litre
- Station name
- Transaction date
- Odometer reading
- Trip meter reading (optional)

If OCR fails, the user can manually edit the transaction.

---

### 5.3 Manual Entry

Users can create a transaction without photos.

Fields:

- Litres
- Total cost
- Odometer reading
- Fuel type (optional)

Manual entry ensures the app remains usable if photos are unavailable.

---

### 5.4 Automatic Saving

After photos are uploaded:

- Data extraction runs automatically
- The transaction is saved automatically

Users may later edit the entry if needed.

This prevents data loss if the app is closed immediately.

---

## 6. Calculations

### Fuel Efficiency

Primary metric:

**Litres per 100 kilometres (L/100km)**

Formula:

L/100km = (litres / distance travelled) × 100

Distance travelled:

distance = current odometer – previous odometer

---

### Additional Metrics

Also calculated:

- Kilometres per litre
- Cost per kilometre
- Cost per tank
- Litres per tank

These values can be shown per transaction.

---

## 7. Data Handling Rules

Transactions may contain incomplete information.

Examples:

- No receipt
- No odometer reading

The system must:

- Allow saving incomplete entries
- Calculate metrics only when sufficient data exists

Example:

Without odometer data, fuel efficiency cannot be calculated.

---

## 8. Transaction Data Model

Each fuel transaction contains:

| Field | Description |
|------|-------------|
| date | Transaction date |
| litres | Fuel purchased |
| total_cost | Amount paid |
| price_per_litre | Optional |
| odometer | Vehicle odometer |
| distance_since_last | Calculated |
| fuel_efficiency | Calculated |
| station_name | Optional |
| fuel_type | Optional |
| receipt_image | Stored image |
| odometer_image | Stored image |
| extra_images | Optional |

---

## 9. Image Handling

Images are stored to allow:

- Verification
- Correction
- Future improvements to OCR

Images may be retained for a limited period (e.g. two years).

---

## 10. OCR Strategy

Default approach:

Use **standard OCR** to extract text from images.

If accuracy is insufficient due to varied receipt formats, an AI-based image analysis approach may be introduced later.

AI is **not required for the MVP**.

---

## 11. Dashboard (MVP)

The dashboard may be minimal or optional in MVP.

Possible displayed values:

- Latest fuel entry
- Latest fuel efficiency
- Average fuel efficiency
- Recent transactions

Advanced analytics are not required initially.

---

## 12. Reports (MVP)

Basic calculations available within the app:

- Cost per tank
- Litres per tank
- Litres per 100 km
- Cost per km

Export features (CSV/PDF) are optional and may be added later.

---

## 13. Out of Scope for MVP

Not included in Version 1:

- Multiple vehicles
- Family accounts
- Fleet management
- Notifications
- Fuel station comparison
- AI insights
- Tax reporting
- GPS tracking

---

## 14. Future Roadmap

### Phase 2

- Multiple vehicles
- Vehicle profiles
- Fuel station analysis
- Monthly fuel cost reports
- Export data

### Phase 3

- Fuel price trends
- AI insights
- Predictive maintenance alerts
- Route fuel tracking

### Phase 4

- Fleet management
- Family accounts
- Business expense integration

---

## 15. Key Design Principles

The application must prioritise:

1. Low friction data entry
2. Automatic capture through photos
3. Minimal required manual input
4. Simple calculations

---

## 16. Success Criteria

The MVP is successful if users can:

- Record fuel transactions quickly
- Capture data via photos
- Automatically calculate fuel efficiency
- View basic fuel cost metrics