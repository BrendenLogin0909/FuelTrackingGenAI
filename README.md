# Fuel Tracking App

Track fuel usage, costs, and vehicle efficiency. Capture receipts via camera or upload, with automatic OCR extraction.

## Tech Stack

- Next.js 14 (App Router)
- React + Tailwind CSS
- Tesseract.js (client-side OCR)
- Dexie (IndexedDB)
- Local-first storage

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm test` - Unit tests (Jest)
- `npm run test:e2e` - E2E tests (Playwright)

## MVP Features

- Add transaction via photo (camera/upload) or manual entry
- OCR extraction from receipt/odometer images
- Auto-save after photo upload
- Fuel efficiency (L/100km), cost per km, average efficiency
- Dashboard with recent transactions
- Edit existing transactions
