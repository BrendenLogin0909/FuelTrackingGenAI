import type { ExtractedFields } from "../types/transaction";

/**
 * Maps raw OCR text to transaction fields.
 * Assumptions: Common receipt formats (AU/UK style), decimal separators . or ,
 * Odometer: 5-7 digit number, often at start of line or after "odo"/"km"
 */
export function parseOcrText(text: string): ExtractedFields {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: ExtractedFields = {};

  // Total / amount paid - patterns: "Total 85.50", "TOTAL $85.50", "Amount 85,50"
  const totalMatch = normalized.match(
    /(?:total|amount|sum|paid)\s*[:\s]*[$€£]?\s*([\d,]+\.?\d*)/i
  );
  if (totalMatch) {
    result.total_cost = parseFloat(totalMatch[1].replace(",", "."));
  }
  if (!result.total_cost) {
    const altTotal = normalized.match(/\b([\d,]+\.\d{2})\s*(?:aud|usd|eur)?\s*$/i);
    if (altTotal) result.total_cost = parseFloat(altTotal[1].replace(",", "."));
  }

  // Litres - patterns: "45.2 L", "45.2 litres", "Volume 45.2" (avoid matching "l" in "Total")
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

  // Price per litre
  const pplMatch = normalized.match(
    /(?:price\s*per\s*(?:litre|l)|ppl|rate)\s*[:\s]*[$€£]?\s*([\d,]+\.?\d*)/i
  );
  if (pplMatch) {
    result.price_per_litre = parseFloat(pplMatch[1].replace(",", "."));
  }
  if (!result.price_per_litre && result.litres && result.total_cost) {
    result.price_per_litre = result.total_cost / result.litres;
  }

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

  // Odometer - 5-7 digit number, often "odo 123456" or "km 123456"
  const odoMatch = normalized.match(
    /(?:odo(?:meter)?|km|mileage)\s*[:\s]*(\d{5,7})\b/i
  );
  if (odoMatch) {
    result.odometer = parseInt(odoMatch[1], 10);
  }
  if (!result.odometer) {
    const sixDigit = normalized.match(/\b(\d{5,7})\b/);
    if (sixDigit) {
      const n = parseInt(sixDigit[1], 10);
      if (n >= 10000 && n <= 999999) result.odometer = n;
    }
  }

  // Trip meter (optional)
  const tripMatch = normalized.match(
    /(?:trip|trip meter)\s*[:\s]*(\d+\.?\d*)/i
  );
  if (tripMatch) result.trip_meter = parseFloat(tripMatch[1]);

  return result;
}
