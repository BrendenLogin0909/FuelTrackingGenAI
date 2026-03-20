/** Browser-only: canvas resize + JPEG encode before Tesseract (matches production OCR path). */

export const MAX_IMAGE_DIMENSION = 2000;
export const JPEG_QUALITY = 0.8;
const JPEG_QUALITY_HIGH = 0.92;

/** Pre-OCR experiments (benchmark only unless wired into production). */
export type OcrImageVariant =
  | "baseline"
  | "jpegHigh"
  | "grayscaleContrast"
  | "grayscaleContrastJpegHigh";

export const OCR_IMAGE_VARIANTS: OcrImageVariant[] = [
  "baseline",
  "jpegHigh",
  "grayscaleContrast",
  "grayscaleContrastJpegHigh",
];

function applyGrayscaleLinearContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = max - min || 1;
  for (let i = 0; i < d.length; i += 4) {
    let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    g = ((g - min) / range) * 255;
    g = Math.max(0, Math.min(255, g));
    d[i] = d[i + 1] = d[i + 2] = g;
  }
  ctx.putImageData(imgData, 0, 0);
}

export type CompressImageOptions = {
  variant?: OcrImageVariant;
};

/**
 * Resize + optional variant + JPEG for Tesseract.
 * Production uses `compressImage(url)` → baseline only.
 */
export async function compressImage(
  dataUrl: string,
  maxDim: number = MAX_IMAGE_DIMENSION,
  options?: CompressImageOptions
): Promise<string> {
  const variant = options?.variant ?? "baseline";
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      if (
        variant === "grayscaleContrast" ||
        variant === "grayscaleContrastJpegHigh"
      ) {
        applyGrayscaleLinearContrast(ctx, width, height);
      }
      const q =
        variant === "jpegHigh" || variant === "grayscaleContrastJpegHigh"
          ? JPEG_QUALITY_HIGH
          : JPEG_QUALITY;
      resolve(canvas.toDataURL("image/jpeg", q));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
