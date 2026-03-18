const FUEL_ITEM_KEYWORDS =
  /\b(?:fuel|petrol|diesel|unleaded|premium|ultimate|regular|e10|e5|e85|ulp|lpg|gas|v-?power|synergy)\b/i;
const DISCOUNT_KEYWORDS =
  /\b(?:discount|discounts|rebate|loyalty|reward|coupon|voucher|promo|savings?|cashback)\b/i;
const SUMMARY_KEYWORDS =
  /\b(?:total|subtotal|sub-total|grand total|amount due|amount paid|balance|change|tax|gst|vat)\b/i;
const RATE_KEYWORDS = /\b(?:per\s*litre|ppl|rate)\b|\/l\b/i;
const EXPLICIT_AMOUNT_CUES = /\b(?:total|amount|charge|cost)\b/i;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractMoneyTokens(line: string): number[] {
  const cleaned = line.replace(/\$\s*-/g, "-$");
  const regex = /(^|[^0-9A-Za-z])([+-])?(?:\$)?(\d[\d,]*(?:\.\d{1,3}))/g;
  const amounts: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const sign = match[2] === "-" ? -1 : 1;
    const amount = parseFloat(match[3].replace(/,/g, ""));
    if (Number.isFinite(amount)) {
      amounts.push(sign * amount);
    }
  }

  return amounts;
}

function looksLikeFuelLine(line: string): boolean {
  return (
    FUEL_ITEM_KEYWORDS.test(line) ||
    (/\b\d[\d,]*(?:\.\d{1,3})?\s*(?:l|litres?)\b/i.test(line) &&
      /(?:@|\/l\b|=)/i.test(line)) ||
    (/\b\d[\d,]*(?:\.\d{1,3})?\s*\.\s*\$[\d,]*\.?\d*\s*\/\s*l\b/i.test(line) &&
      /(?:@|\/l\b|=)/i.test(line))
  );
}

function extractFuelLineAmount(line: string): number | undefined {
  const amounts = extractMoneyTokens(line);
  if (!amounts.length) {
    return undefined;
  }

  const hasRateCue = RATE_KEYWORDS.test(line);
  if (hasRateCue && amounts.length < 3 && !EXPLICIT_AMOUNT_CUES.test(line)) {
    return undefined;
  }

  return roundCurrency(amounts[amounts.length - 1]);
}

function extractDiscountAmount(line: string): number | undefined {
  if (!DISCOUNT_KEYWORDS.test(line)) {
    return undefined;
  }

  const amounts = extractMoneyTokens(line);
  if (!amounts.length) {
    return undefined;
  }

  return roundCurrency(-Math.abs(amounts[amounts.length - 1]));
}

export function extractFuelReceiptAmount(text: string): number | undefined {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let fuelAmount = 0;
  let discountAmount = 0;
  let foundFuelLine = false;

  for (const line of lines) {
    if (SUMMARY_KEYWORDS.test(line)) {
      continue;
    }

    if (looksLikeFuelLine(line)) {
      const amount = extractFuelLineAmount(line);
      if (amount != null) {
        foundFuelLine = true;
        fuelAmount += amount;
      }
      continue;
    }

    const discount = extractDiscountAmount(line);
    if (discount != null) {
      discountAmount += discount;
    }
  }

  if (!foundFuelLine) {
    return undefined;
  }

  return roundCurrency(fuelAmount + discountAmount);
}
