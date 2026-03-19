"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoCapture } from "@/components/capture/PhotoCapture";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";
import { extractFromImages } from "@/lib/ocr";
import { generateId } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { CameraIcon, PenIcon } from "@/components/icons";
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
    } catch {
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
    <>
      <Header title="Add Transaction" showBack />
      <main className="flex-1">
        <div className={`mx-auto px-4 py-6 md:px-6 md:py-8 ${step === "form" ? "max-w-5xl" : "max-w-lg"}`}>
          {extracting ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CameraIcon size={20} className="text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Analyzing your receipt...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  First scan loads the OCR engine (~5s), then a few seconds per image
                </p>
              </div>
            </div>
          ) : step === "choose" ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">How would you like to add?</h2>
                <p className="mt-1 text-muted-foreground">
                  Upload a receipt for automatic extraction or enter details manually.
                </p>
              </div>

              <PhotoCapture
                onImagesSelected={handleImagesSelected}
                onError={(msg) => alert(msg)}
              />
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualEntry}
                className="group flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground transition-all hover:border-primary/50 hover:bg-secondary/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <PenIcon size={20} />
                </div>
                <span className="font-medium">Enter details manually</span>
              </button>
            </div>
          ) : null}

          {step === "form" && !extracting && (
            <TransactionForm
              initial={prefill}
              onSubmit={handleSubmit}
              onCancel={() => router.push("/")}
            />
          )}
        </div>
      </main>
    </>
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
