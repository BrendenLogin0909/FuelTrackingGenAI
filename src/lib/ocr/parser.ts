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
    const MONTH_ALIASES: Record<string, string> = {
      JAN: "01", FEB: "02", MAR: "03", M4R: "03", MAK: "03", NAR: "03", APR: "04", MAY: "05",
      JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
    };
    const textMonthMatch = normalized.match(
      /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|M4R|MAK|NAR)[A-Z]*\s+(\d{2,4})\b/i
    );
    if (textMonthMatch) {
      const [, d, m, y] = textMonthMatch;
      const monthNum = MONTH_ALIASES[m!.toUpperCase().slice(0, 3)];
      const year = (y!.length === 2 ? `20${y}` : y!) as string;
      if (monthNum) result.date = `${year}-${monthNum}-${d!.padStart(2, "0")}`;
    }
  }
  if (!result.date) {
    result.date = new Date().toISOString().slice(0, 10);
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
    const matches = Array.from(normalized.matchAll(new RegExp(pattern.source, "gi")));
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

export type OcrQualityLabel = "strong" | "moderate" | "weak";

export interface OcrQualityScore {
  score: number;
  label: OcrQualityLabel;
  completeness: number;
  consistency: number;
  textSignals: {
    hasTotalCue: boolean;
    hasLitresCue: boolean;
    hasPriceCue: boolean;
    hasOdometerCue: boolean;
    hasFuelCue: boolean;
    hasDateCue: boolean;
  };
  presentFields: Array<keyof ExtractedFields>;
  missingFields: Array<keyof ExtractedFields>;
  reasons: string[];
  shouldFallback: boolean;
}

export interface OcrQualityOptions {
  requiredFields?: Array<keyof ExtractedFields>;
}

const OCR_QUALITY_FIELD_WEIGHTS: Record<keyof ExtractedFields, number> = {
  total_cost: 22,
  litres: 18,
  price_per_litre: 14,
  station_name: 8,
  fuel_type: 10,
  date: 10,
  odometer: 14,
  trip_meter: 4,
};

const OCR_REQUIRED_RECEIPT_FIELDS: Array<keyof ExtractedFields> = ["total_cost", "litres"];

export function scoreParsedOcrFields(
  text: string,
  fields: Partial<ExtractedFields>,
  options: OcrQualityOptions = {}
): OcrQualityScore {
  const requiredFields = options.requiredFields ?? OCR_REQUIRED_RECEIPT_FIELDS;
  const normalized = normalizeOcrText(text);
  const presentFields = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key]) => key as keyof ExtractedFields);
  const missingFields = (Object.keys(OCR_QUALITY_FIELD_WEIGHTS) as Array<keyof ExtractedFields>)
    .filter((field) => fields[field] == null);

  const textSignals = {
    hasTotalCue: /\b(total|amount|sum|paid)\b/i.test(normalized),
    hasLitresCue: /\b(l|litres?|quantity|qty|volume)\b/i.test(normalized),
    hasPriceCue: /\b(?:@|ppl|price\s*per\s*(?:litre|l)|rate)\b/i.test(normalized),
    hasOdometerCue: /\b(?:odo(?:meter)?|mileage|kilomet(?:er|re)s?|km)\b/i.test(normalized),
    hasFuelCue: /\b(?:u91|p95|p98|e10|e85|diesel|lpg|unleaded|premium)\b/i.test(normalized),
    hasDateCue: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(
      normalized
    ),
  };

  let score = 0;
  let reasons: string[] = [];

  for (const field of presentFields) {
    score += OCR_QUALITY_FIELD_WEIGHTS[field];
  }

  if (fields.total_cost != null) {
    score += textSignals.hasTotalCue ? 6 : 0;
    if (fields.total_cost > 0 && fields.total_cost < 5000) score += 4;
    if (fields.total_cost <= 0 || fields.total_cost >= 5000) reasons.push("total_cost_out_of_range");
  }

  if (fields.litres != null) {
    score += textSignals.hasLitresCue ? 5 : 0;
    if (fields.litres > 0 && fields.litres < 1000) score += 3;
    if (fields.litres <= 0 || fields.litres >= 1000) reasons.push("litres_out_of_range");
  }

  if (fields.price_per_litre != null) {
    score += textSignals.hasPriceCue ? 4 : 0;
    if (fields.price_per_litre > 0 && fields.price_per_litre < 10) score += 2;
    if (fields.price_per_litre <= 0 || fields.price_per_litre >= 10) reasons.push("price_per_litre_out_of_range");
  }

  if (fields.odometer != null) {
    score += textSignals.hasOdometerCue ? 6 : 0;
    if (fields.odometer >= 1000 && fields.odometer <= 999999) score += 4;
    if (fields.odometer < 1000 || fields.odometer > 999999) reasons.push("odometer_out_of_range");
  }

  if (fields.trip_meter != null) {
    score += 2;
  }

  const completeness = presentFields.length / Object.keys(OCR_QUALITY_FIELD_WEIGHTS).length;

  if (fields.total_cost != null && fields.litres != null && fields.price_per_litre != null) {
    const expectedTotal = Math.round(fields.litres * fields.price_per_litre * 100) / 100;
    const totalDiff = Math.abs(fields.total_cost - expectedTotal);
    if (totalDiff <= 0.05) {
      score += 12;
    } else if (totalDiff <= 0.25) {
      score += 6;
      reasons.push("weak_total_litres_rate_consistency");
    } else {
      score -= 12;
      reasons.push("total_litres_rate_mismatch");
    }
  } else if (fields.total_cost != null && fields.litres != null) {
    score += 4;
  }

  if (fields.fuel_type) {
    score += textSignals.hasFuelCue ? 4 : 0;
  }

  if (fields.date) {
    score += textSignals.hasDateCue ? 4 : 0;
  }

  const signalMatches = Object.values(textSignals).filter(Boolean).length;
  score += signalMatches * 2;

  if (normalized.length < 20) {
    score -= 20;
    reasons.push("text_too_short");
  } else if (normalized.length < 60) {
    score -= 8;
    reasons.push("text_short");
  }

  if (presentFields.length === 0) {
    score -= 18;
    reasons.push("no_fields_parsed");
  }

  const uniqueReasons = Array.from(new Set(reasons));
  score = clampScore(score);
  const label = score >= 75 ? "strong" : score >= 45 ? "moderate" : "weak";
  const shouldFallback =
    label === "weak" ||
    requiredFields.some((field) => fields[field] == null) ||
    uniqueReasons.includes("total_litres_rate_mismatch");

  return {
    score,
    label,
    completeness,
    consistency: scoreConsistency(fields),
    textSignals,
    presentFields,
    missingFields,
    reasons: uniqueReasons,
    shouldFallback,
  };
}

export function shouldFallbackToServerOcr(
  text: string,
  fields: Partial<ExtractedFields>,
  options: OcrQualityOptions = {}
): boolean {
  return scoreParsedOcrFields(text, fields, options).shouldFallback;
}

function normalizeOcrText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreConsistency(fields: Partial<ExtractedFields>): number {
  if (fields.total_cost != null && fields.litres != null && fields.price_per_litre != null) {
    const expectedTotal = Math.round(fields.litres * fields.price_per_litre * 100) / 100;
    const totalDiff = Math.abs(fields.total_cost - expectedTotal);
    if (totalDiff <= 0.05) return 1;
    if (totalDiff <= 0.25) return 0.6;
    return 0.2;
  }

  if (fields.total_cost != null && fields.litres != null) {
    return 0.65;
  }

  return 0.35;
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
