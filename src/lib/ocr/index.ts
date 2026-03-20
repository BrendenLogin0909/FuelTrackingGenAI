import { parseOcrText } from "./parser";
import type {
  ExtractedFields,
  TransactionImageRole,
  TransactionImageSource,
} from "../types/transaction";

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

type TesseractWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

async function extractTextWithWorker(
  worker: TesseractWorker,
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
  const {
    data: { text },
  } = await worker.recognize(compressed);
  return text ?? "";
}

export async function extractTextFromImage(
  imageSource: string | File | Blob
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/",
  });
  try {
    return extractTextWithWorker(worker, imageSource);
  } finally {
    await worker.terminate();
  }
}

export async function extractFromImages(
  images: TransactionImageSource[] | (string | File | Blob)[]
): Promise<ExtractedFields> {
  const groupedText: Record<TransactionImageRole, string[]> = {
    receipt: [],
    odometer: [],
    other: [],
  };

  const normalized = normalizeImageSources(images);
  if (normalized.length === 0) return parseExtractedTextByRole(groupedText);

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/",
  });
  try {
    for (const img of normalized) {
      const text = await extractTextWithWorker(worker, img.image);
      if (text.trim()) groupedText[img.role].push(text);
    }
  } finally {
    await worker.terminate();
  }

  return parseExtractedTextByRole(groupedText);
}

export function parseExtractedTextByRole(
  groupedText: Partial<Record<TransactionImageRole, string[]>>
): ExtractedFields {
  const receiptText = (groupedText.receipt ?? []).join("\n\n");
  const odometerText = (groupedText.odometer ?? []).join("\n\n");

  const receiptFields = receiptText ? parseOcrText(receiptText) : {};
  const odometerFields = odometerText ? parseOcrText(odometerText) : {};

  return {
    total_cost: receiptFields.total_cost,
    litres: receiptFields.litres,
    price_per_litre: receiptFields.price_per_litre,
    station_name: receiptFields.station_name,
    fuel_type: receiptFields.fuel_type,
    date: receiptFields.date,
    odometer: odometerFields.odometer,
    trip_meter: odometerFields.trip_meter,
  };
}

function normalizeImageSources(
  images: TransactionImageSource[] | (string | File | Blob)[]
): TransactionImageSource[] {
  return images.map((image, index) => {
    if (isRoleTaggedImage(image)) {
      return image;
    }

    return {
      role: index === 0 ? "receipt" : index === 1 ? "odometer" : "other",
      image,
    };
  });
}

function isRoleTaggedImage(
  image: TransactionImageSource | string | File | Blob
): image is TransactionImageSource {
  return (
    typeof image === "object" &&
    image !== null &&
    "role" in image &&
    "image" in image
  );
}

export { parseOcrText } from "./parser";
