"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhotoCapture } from "@/components/capture/PhotoCapture";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";
import { extractFromImages } from "@/lib/ocr";
import { generateId } from "@/lib/utils";
import type { FuelTransaction, TransactionImageInput } from "@/lib/types/transaction";

type Step = "choose" | "capture" | "form" | "manual";

export default function AddTransactionPage() {
  const router = useRouter();
  const { save } = useTransactions();
  const [step, setStep] = useState<Step>("choose");
  const [extracting, setExtracting] = useState(false);
  const [prefill, setPrefill] = useState<Partial<FuelTransaction>>({});

  const handleImagesSelected = async (selectedImages: TransactionImageInput[]) => {
    setExtracting(true);
    try {
      const extracted = await extractFromImages(
        selectedImages.map((image) => ({
          role: image.role,
          image: image.file,
        }))
      );
      const now = new Date().toISOString();
      const date = extracted.date ?? now.slice(0, 10);
      const receiptFiles = selectedImages.filter((image) => image.role === "receipt");
      const odometerFiles = selectedImages.filter((image) => image.role === "odometer");
      const otherFiles = selectedImages.filter((image) => image.role === "other");
      const receiptData =
        receiptFiles[0] ? await fileToBase64(receiptFiles[0].file) : undefined;
      const odometerData =
        odometerFiles[0] ? await fileToBase64(odometerFiles[0].file) : undefined;
      const remainingFiles = [
        ...receiptFiles.slice(1),
        ...odometerFiles.slice(1),
        ...otherFiles,
      ];
      const extraImages =
        remainingFiles.length > 0
          ? await Promise.all(remainingFiles.map((image) => fileToBase64(image.file)))
          : undefined;

      const draft: FuelTransaction = {
        id: generateId(),
        date,
        litres: extracted.litres,
        total_cost: extracted.total_cost,
        price_per_litre: extracted.price_per_litre,
        odometer: extracted.odometer,
        station_name: extracted.station_name,
        fuel_type: extracted.fuel_type,
        receipt_image: receiptData,
        odometer_image: odometerData,
        extra_images: extraImages,
        created_at: now,
        updated_at: now,
      };
      setPrefill(draft);
      setStep("form");
    } catch (err) {
      const now = new Date().toISOString();
      const receiptFiles = selectedImages.filter((image) => image.role === "receipt");
      const odometerFiles = selectedImages.filter((image) => image.role === "odometer");
      const otherFiles = selectedImages.filter((image) => image.role === "other");
      const receiptData =
        receiptFiles[0] ? await fileToBase64(receiptFiles[0].file) : undefined;
      const odometerData =
        odometerFiles[0] ? await fileToBase64(odometerFiles[0].file) : undefined;
      const extraImages = await Promise.all(
        [...receiptFiles.slice(1), ...odometerFiles.slice(1), ...otherFiles].map((image) =>
          fileToBase64(image.file)
        )
      );
      const draft: FuelTransaction = {
        id: generateId(),
        date: now.slice(0, 10),
        receipt_image: receiptData,
        odometer_image: odometerData,
        extra_images: extraImages.length > 0 ? extraImages : undefined,
        created_at: now,
        updated_at: now,
      };
      setPrefill(draft);
      setStep("form");
    } finally {
      setExtracting(false);
    }
  };

  const handleManualEntry = () => {
    setPrefill({ date: new Date().toISOString().slice(0, 10) });
    setStep("form");
  };

  const handleSubmit = async (tx: FuelTransaction) => {
    const toSave: FuelTransaction = {
      ...tx,
      id: tx.id ?? generateId(),
    };
    await save(toSave);
    router.push("/");
  };

  return (
    <main className={`mx-auto px-4 py-6 ${step === "form" ? "max-w-4xl" : "max-w-lg"}`}>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-slate-600 hover:text-slate-800">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Add fuel transaction</h1>
      </div>

      {extracting ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-slate-50 py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400 border-t-slate-700" />
          <p className="text-center text-slate-700">Extracting data from photos…</p>
          <p className="text-sm text-slate-500">First run loads OCR engine (~5s), then a few seconds per image</p>
        </div>
      ) : step === "choose" ? (
        <div className="space-y-4">
          <PhotoCapture
            onImagesSelected={handleImagesSelected}
            onError={(msg) => alert(msg)}
          />
          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleManualEntry}
              className="w-full rounded-lg border border-slate-400 px-4 py-3 text-slate-700 hover:bg-slate-50"
            >
              Enter manually
            </button>
          </div>
        </div>
      ) : null}

      {step === "form" && !extracting && (
        <TransactionForm
          initial={prefill}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/")}
        />
      )}
    </main>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}
