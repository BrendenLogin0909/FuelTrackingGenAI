import type { TransactionImageRole } from "../types/transaction";

const MAX_WORKING_DIMENSION = 2200;
const MAX_ANALYSIS_DIMENSION = 900;
const JPEG_QUALITY = 0.88;

export interface OcrPreprocessProfile {
  id: string;
  role: TransactionImageRole;
  rotations: number[];
  grayscale?: boolean;
  contrast?: number;
  brightness?: number;
  saturation?: number;
  blurPx?: number;
  threshold?: number;
  autoCrop?: boolean;
  odometerCenterCrop?: boolean;
  sharpen?: boolean;
}

export interface PreparedOcrImage {
  dataUrl: string;
  width: number;
  height: number;
  profileId: string;
  rotation: number;
}

export async function imageSourceToDataUrl(
  imageSource: string | File | Blob
): Promise<string> {
  if (typeof imageSource === "string") {
    return imageSource;
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(imageSource as Blob);
  });
}

export function getSafePreprocessProfile(role: TransactionImageRole): OcrPreprocessProfile {
  return {
    id: `${role}-safe`,
    role,
    rotations: [0],
  };
}

export function getRetryPreprocessProfiles(role: TransactionImageRole): OcrPreprocessProfile[] {
  if (role === "odometer") {
    return [
      {
        id: "odometer-contrast",
        role,
        rotations: [0],
        grayscale: true,
        contrast: 1.2,
        brightness: 1.02,
        saturation: 0,
      },
      {
        id: "odometer-crop-contrast",
        role,
        rotations: [0, 90, 270],
        autoCrop: true,
        odometerCenterCrop: true,
        grayscale: true,
        contrast: 1.3,
        brightness: 1.04,
        saturation: 0,
      },
    ];
  }

  if (role === "other") {
    return [
      {
        id: "other-retry",
        role,
        rotations: [0],
        grayscale: true,
        contrast: 1.1,
      },
    ];
  }

  return [
    {
      id: "receipt-contrast",
      role,
      rotations: [0],
      grayscale: true,
      contrast: 1.12,
      brightness: 1.01,
      saturation: 0,
    },
    {
      id: "receipt-crop-contrast",
      role,
      rotations: [0, 90, 270, 180],
      autoCrop: true,
      grayscale: true,
      contrast: 1.2,
      brightness: 1.03,
      saturation: 0,
    },
    {
      id: "receipt-threshold",
      role,
      rotations: [0],
      autoCrop: true,
      grayscale: true,
      contrast: 1.24,
      brightness: 1.04,
      saturation: 0,
      threshold: 170,
    },
  ];
}

export async function prepareImageForOcr(
  dataUrl: string,
  profile: OcrPreprocessProfile,
  rotation: number = 0
): Promise<PreparedOcrImage> {
  const image = await loadImage(dataUrl);
  const base = document.createElement("canvas");
  const rotated = drawRotatedImage(base, image, rotation);
  const cropBounds = profile.autoCrop ? detectCropBounds(rotated) : fullBounds(rotated);
  const cropped = cropCanvas(rotated, cropBounds);
  const roleAdjusted =
    profile.odometerCenterCrop && profile.role === "odometer"
      ? cropCanvas(cropped, getOdometerFocusBounds(cropped))
      : cropped;
  const working = scaleCanvas(roleAdjusted, MAX_WORKING_DIMENSION);
  const enhanced = applyVisualEnhancements(working, profile);
  if (profile.threshold != null) {
    applyThreshold(enhanced, profile.threshold);
  }
  if (profile.sharpen) {
    applySharpen(enhanced);
  }

  return {
    dataUrl: enhanced.toDataURL("image/jpeg", JPEG_QUALITY),
    width: enhanced.width,
    height: enhanced.height,
    profileId: profile.id,
    rotation,
  };
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = dataUrl;
  });
}

function drawRotatedImage(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  rotation: number
): HTMLCanvasElement {
  const radians = (rotation * Math.PI) / 180;
  const rotateQuarterTurn = Math.abs(rotation % 180) === 90;
  const width = (image as HTMLImageElement).width ?? (image as HTMLCanvasElement).width;
  const height = (image as HTMLImageElement).height ?? (image as HTMLCanvasElement).height;
  canvas.width = rotateQuarterTurn ? height : width;
  canvas.height = rotateQuarterTurn ? width : height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return canvas;
}

function detectCropBounds(canvas: HTMLCanvasElement): Rect {
  const analysisCanvas = scaleCanvas(canvas, MAX_ANALYSIS_DIMENSION);
  const ctx = analysisCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return fullBounds(canvas);
  }

  const { width, height } = analysisCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const background = estimateBackgroundLuminance(imageData.data, width, height);
  const differenceThreshold = 18;
  const rowThreshold = Math.max(3, Math.floor(width * 0.015));
  const colThreshold = Math.max(3, Math.floor(height * 0.015));

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < bottom && countRowEdges(imageData.data, width, top, background, differenceThreshold) < rowThreshold) {
    top += 1;
  }
  while (bottom > top && countRowEdges(imageData.data, width, bottom, background, differenceThreshold) < rowThreshold) {
    bottom -= 1;
  }
  while (left < right && countColumnEdges(imageData.data, width, height, left, background, differenceThreshold) < colThreshold) {
    left += 1;
  }
  while (right > left && countColumnEdges(imageData.data, width, height, right, background, differenceThreshold) < colThreshold) {
    right -= 1;
  }

  const scaleX = canvas.width / width;
  const scaleY = canvas.height / height;
  const paddingX = Math.round(16 * scaleX);
  const paddingY = Math.round(16 * scaleY);

  return clampRect(
    {
      x: Math.round(left * scaleX) - paddingX,
      y: Math.round(top * scaleY) - paddingY,
      width: Math.round((right - left + 1) * scaleX) + paddingX * 2,
      height: Math.round((bottom - top + 1) * scaleY) + paddingY * 2,
    },
    canvas.width,
    canvas.height
  );
}

function estimateBackgroundLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  const samples = [
    getLuminanceAt(data, width, 0, 0),
    getLuminanceAt(data, width, width - 1, 0),
    getLuminanceAt(data, width, 0, height - 1),
    getLuminanceAt(data, width, width - 1, height - 1),
    getLuminanceAt(data, width, Math.floor(width / 2), 0),
    getLuminanceAt(data, width, Math.floor(width / 2), height - 1),
  ];
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

function countRowEdges(
  data: Uint8ClampedArray,
  width: number,
  row: number,
  background: number,
  threshold: number
): number {
  let count = 0;
  for (let x = 0; x < width; x += 1) {
    if (Math.abs(getLuminanceAt(data, width, x, row) - background) > threshold) {
      count += 1;
    }
  }
  return count;
}

function countColumnEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  column: number,
  background: number,
  threshold: number
): number {
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    if (Math.abs(getLuminanceAt(data, width, column, y) - background) > threshold) {
      count += 1;
    }
  }
  return count;
}

function getLuminanceAt(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): number {
  const index = (y * width + x) * 4;
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getOdometerFocusBounds(canvas: HTMLCanvasElement): Rect {
  const width = canvas.width;
  const height = canvas.height;
  return clampRect(
    {
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.18),
      width: Math.round(width * 0.84),
      height: Math.round(height * 0.56),
    },
    width,
    height
  );
}

function cropCanvas(source: HTMLCanvasElement, rect: Rect): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, rect.width);
  canvas.height = Math.max(1, rect.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return source;
  }

  ctx.drawImage(
    source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function scaleCanvas(source: HTMLCanvasElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  if (scale === 1) {
    const clone = document.createElement("canvas");
    clone.width = source.width;
    clone.height = source.height;
    const cloneCtx = clone.getContext("2d");
    cloneCtx?.drawImage(source, 0, 0);
    return clone;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function applyVisualEnhancements(
  source: HTMLCanvasElement,
  profile: OcrPreprocessProfile
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return source;
  }

  const filters: string[] = [];
  if (profile.grayscale) filters.push("grayscale(1)");
  if (profile.contrast) filters.push(`contrast(${profile.contrast})`);
  if (profile.brightness) filters.push(`brightness(${profile.brightness})`);
  if (profile.saturation != null) filters.push(`saturate(${profile.saturation})`);
  if (profile.blurPx) filters.push(`blur(${profile.blurPx}px)`);
  ctx.filter = filters.join(" ");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
  return canvas;
}

function applyThreshold(canvas: HTMLCanvasElement, threshold: number): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    const value = luminance >= threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
}

function applySharpen(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const sharpened = convolve(imageData, [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ]);
  ctx.putImageData(sharpened, 0, 0);
}

function convolve(imageData: ImageData, kernel: number[]): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let ky = 0; ky < side; ky += 1) {
        for (let kx = 0; kx < side; kx += 1) {
          const sampleX = Math.min(width - 1, Math.max(0, x + kx - halfSide));
          const sampleY = Math.min(height - 1, Math.max(0, y + ky - halfSide));
          const sampleIndex = (sampleY * width + sampleX) * 4;
          const weight = kernel[ky * side + kx];
          red += data[sampleIndex] * weight;
          green += data[sampleIndex + 1] * weight;
          blue += data[sampleIndex + 2] * weight;
          alpha += data[sampleIndex + 3] * weight;
        }
      }

      const targetIndex = (y * width + x) * 4;
      output.data[targetIndex] = clampColor(red);
      output.data[targetIndex + 1] = clampColor(green);
      output.data[targetIndex + 2] = clampColor(blue);
      output.data[targetIndex + 3] = clampColor(alpha || data[targetIndex + 3]);
    }
  }

  return output;
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function fullBounds(canvas: HTMLCanvasElement): Rect {
  return {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  };
}

function clampRect(rect: Rect, maxWidth: number, maxHeight: number): Rect {
  const x = Math.max(0, Math.min(rect.x, maxWidth - 1));
  const y = Math.max(0, Math.min(rect.y, maxHeight - 1));
  const width = Math.max(1, Math.min(rect.width, maxWidth - x));
  const height = Math.max(1, Math.min(rect.height, maxHeight - y));
  return { x, y, width, height };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
