export type OcrProgressStage =
  | "preparing"
  | "ocr-receipt"
  | "ocr-odometer"
  | "retry-receipt"
  | "retry-odometer"
  | "parsing";

export type ExtractFromImagesOptions = {
  onProgress?: (stage: OcrProgressStage) => void;
};
