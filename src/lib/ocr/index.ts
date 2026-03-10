import { createWorker } from "tesseract.js";
import { parseOcrText } from "./parser";
import type { ExtractedFields } from "../types/transaction";

const MAX_IMAGE_DIMENSION = 2000;
const JPEG_QUALITY = 0.8;

async function compressImage(
  dataUrl: string,
  maxDim: number = MAX_IMAGE_DIMENSION
): Promise<string> {
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
      resolve(
        canvas.toDataURL("image/jpeg", JPEG_QUALITY)
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export async function extractTextFromImage(
  imageSource: string | File | Blob
): Promise<string> {
  let src: string;
  if (typeof imageSource === "string") {
    src = imageSource;
  } else {
    src = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Failed to read file"));
      r.readAsDataURL(imageSource as Blob);
    });
  }

  const compressed = await compressImage(src);
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(compressed);
    return text ?? "";
  } finally {
    await worker.terminate();
  }
}

export async function extractFromImages(
  images: (string | File | Blob)[]
): Promise<ExtractedFields> {
  const allText: string[] = [];
  for (const img of images) {
    const text = await extractTextFromImage(img);
    if (text.trim()) allText.push(text);
  }
  const combined = allText.join("\n\n");
  return parseOcrText(combined);
}

export { parseOcrText } from "./parser";
