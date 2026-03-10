/**
 * Input validation and sanitisation (Security Officer)
 * - Image size limits
 * - Numeric bounds
 * - String sanitisation for XSS
 */

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_DIMENSION = 4000;
export const MAX_STRING_LENGTH = 500;

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image too large (max ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB)`,
    };
  }
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid image type (use JPEG, PNG, or WebP)",
    };
  }
  return { valid: true };
}

export function sanitiseString(input: string): string {
  return input
    .slice(0, MAX_STRING_LENGTH)
    .replace(/[<>]/g, "")
    .trim();
}

export function validateLitres(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 2000;
}

export function validateTotalCost(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 10000;
}

export function validateOdometer(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 9999999;
}

export function validateDate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100;
}
