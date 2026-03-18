import {
  AUSTRALIAN_FUEL_TYPES,
  type ExtractedFields,
  type FuelTypeOption,
} from "../types/transaction";
import { extractFuelReceiptAmount } from "./receipt-amount";

const FUEL_TYPE_PATTERNS: Array<{ fuelType: FuelTypeOption; pattern: RegExp }> = [
  { fuelType: "Premium Diesel", pattern: /\bpremium\s+diesel\b/i },
  { fuelType: "Diesel", pattern: /\b(?:diesel|distillate)\b/i },
  { fuelType: "U91", pattern: /\b(?:u91|ulp|up(?:\s*no\.?\d+)?|unleaded\s*91|91\s*ron|regular\s*(?:unleaded)?\s*91)\b/i },
  { fuelType: "P95", pattern: /\b(?:p95|premium\s*95|95\s*ron)\b/i },
  { fuelType: "P98", pattern: /\b(?:p98|premium\s*98|98\s*ron)\b/i },
  { fuelType: "E10", pattern: /\b(?:e10|ethanol\s*10)\b/i },
  { fuelType: "E85", pattern: /\b(?:e85|flex[-\s]*fuel)\b/i },
  { fuelType: "LPG", pattern: /\b(?:lpg|autogas)\b/i },
];

/**
 * Maps raw OCR text to transaction fields.
 * Assumptions: Common receipt formats (AU/UK style), decimal separators . or ,
 * Odometer: explicit label only ("odo", "odometer", "km", "mileage")
 */
export function parseOcrText(text: string): ExtractedFields {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: ExtractedFields = {};

  const fuelAmount = extractFuelReceiptAmount(text);
  const totalMatch = normalized.match(
    /(?:total|amount|sum|paid|tal|lotal|otal|includes)(?:\s+[a-zA-Z]+)*\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i
  );
  const totalMatchValue = totalMatch
    ? parseFloat(totalMatch[1].replace(",", "."))
    : null;

  // Litres and rate for consistency check (parse early)
  let litresForCheck: number | null = null;
  const litresMatchEarly = normalized.match(/\b([\d,]+\.?\d*)\s*(?:l|litres?)\b/i);
  if (litresMatchEarly) litresForCheck = parseFloat(litresMatchEarly[1].replace(",", "."));
  const rateMatch = normalized.match(
    /@\s*\$?([\d,]+\.?\d*)\s*\/?\s*l\b|(?:per\s*litre|ppl|rate)\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i
  );
  const rateForCheck = rateMatch
    ? parseFloat((rateMatch[1] ?? rateMatch[2]).replace(",", "."))
    : null;

  let chosenTotal = fuelAmount ?? totalMatchValue;
  // When fuel line > Total and Total matches litres×rate, prefer Total (OCR often misreads 5→9)
  if (
    fuelAmount != null &&
    totalMatchValue != null &&
    fuelAmount > totalMatchValue &&
    litresForCheck != null &&
    rateForCheck != null
  ) {
    const expected = Math.round(litresForCheck * rateForCheck * 100) / 100;
    const totalDiff = Math.abs(totalMatchValue - expected);
    if (totalDiff < 0.02) chosenTotal = totalMatchValue;
  }

  if (chosenTotal != null) {
    result.total_cost = chosenTotal;
  } else {
    const altTotal = normalized.match(/\b([\d,]+\.\d{2})\s*(?:aud|usd|eur)?\s*$/i);
    if (altTotal) result.total_cost = parseFloat(altTotal[1].replace(",", "."));
  }

  // Litres - patterns: "45.2 L", "45.2 litres", "Volume 45.2", "44.93. $1.09/L" (number before PPL)
  const litresMatch = normalized.match(
    /(?:volume|litres?|quantity|qty|\bl\b)\s*[:\s]*([\d,]+\.?\d*)/i
  );
  if (litresMatch) {
    result.litres = parseFloat(litresMatch[1].replace(",", "."));
  }
  if (!result.litres) {
    const altLitres = normalized.match(/\b([\d,]+\.?\d*)\s*(?:l|litres?)\b/i);
    if (altLitres) result.litres = parseFloat(altLitres[1].replace(",", "."));
  }
  if (!result.litres) {
    const litresBeforePpl = normalized.match(
      /\b([\d,]+\.?\d*)\s*(?:\.\s*\$|[\|\s]+[0-9]?\s*\$)[\d,]*\.?\d*\s*\/\s*[l|1]\b/i
    );
    if (litresBeforePpl) result.litres = parseFloat(litresBeforePpl[1].replace(",", "."));
  }

  // Price per litre - also match "$1.09/L" or "$1.689/ L" (no @ or "price per litre" label)
  const pplMatch = normalized.match(
    /(?:@\s*\$?\s*([\d,]+\.?\d*)\s*\/?\s*l\b)|(?:(?:price\s*per\s*(?:litre|l)|ppl|rate)\s*[:\s]*\$?\s*([\d,]+\.?\d*))/i
  );
  if (pplMatch) {
    const rawPricePerLitre = pplMatch[1] ?? pplMatch[2];
    if (rawPricePerLitre) {
      result.price_per_litre = parseFloat(rawPricePerLitre.replace(",", "."));
    }
  }
  if (!result.price_per_litre) {
    const pplDollarSlash = normalized.match(/\$?\s*([\d,]+\.?\d*)\s*\/\s*[l|1]\b/i);
    if (pplDollarSlash) {
      result.price_per_litre = parseFloat(pplDollarSlash[1].replace(",", "."));
    }
  }
  if (!result.price_per_litre && result.litres && result.total_cost) {
    result.price_per_litre = result.total_cost / result.litres;
  }

  result.fuel_type = extractFuelType(text);

  // Date - DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const dateMatch = normalized.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/
  );
  if (dateMatch) {
    const raw = dateMatch[1];
    const parts = raw.split(/[\/\-]/);
    if (parts[0].length === 4) {
      result.date = raw;
    } else if (parts.length === 3) {
      const [d, m, y] = parts;
      const year = y.length === 2 ? `20${y}` : y;
      result.date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  if (!result.date) {
    const today = new Date().toISOString().slice(0, 10);
    result.date = today;
  }

  // Station name - often first non-empty line or contains "petrol"/"fuel"/"service"
  const stationKeywords = /(?:petrol|fuel|service station|caltex|bp|shell|mobil|7-eleven|woolworths|coles)/i;
  for (const line of lines) {
    if (line.length > 2 && line.length < 80 && stationKeywords.test(line)) {
      result.station_name = line;
      break;
    }
  }
  if (!result.station_name && lines.length > 0) {
    const first = lines[0];
    if (first.length > 2 && first.length < 60 && !/^\d+$/.test(first)) {
      result.station_name = first;
    }
  }

  // Odometer - only when a label explicitly points to the reading.
  // Dashboard OCR often returns trip meters (3-4 digits) or decimals (297.6 km); accept 4-7 digits or decimal.
  const odometerPatterns = [
    /(?:odo(?:meter)?|mileage|kilomet(?:er|re)s?|km)\s*[:#\-\s]*([\d,]{4,7}(?:\.\d+)?)\b/i,
    /\b([\d,]{4,7}(?:\.\d+)?)\s*(?:km|kilomet(?:er|re)s?|odo(?:meter)?|mileage)\b/i,
  ];
  const odoCandidates: number[] = [];
  for (const pattern of odometerPatterns) {
    const matches = normalized.matchAll(new RegExp(pattern.source, "gi"));
    for (const m of matches) {
      const raw = m[1].replace(/,/g, "");
      const n = Math.floor(parseFloat(raw));
      if (n >= 1000 && n <= 999999) odoCandidates.push(n);
    }
  }
  if (odoCandidates.length > 0) {
    result.odometer = Math.max(...odoCandidates);
  }

  // Trip meter (optional)
  const tripMatch = normalized.match(
    /(?:trip|trip meter)\s*[:\s]*(\d+\.?\d*)/i
  );
  if (tripMatch) result.trip_meter = parseFloat(tripMatch[1]);

  return result;
}

function extractFuelType(text: string): FuelTypeOption | undefined {
  for (const { fuelType, pattern } of FUEL_TYPE_PATTERNS) {
    if (pattern.test(text)) {
      return fuelType;
    }
  }

  return AUSTRALIAN_FUEL_TYPES.find((fuelType) =>
    text.toLowerCase().includes(fuelType.toLowerCase())
  );
}
