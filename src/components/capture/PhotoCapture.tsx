"use client";

import { useRef, useState, useEffect } from "react";
import { validateImageFile } from "@/lib/validation";
import { UploadIcon, CameraIcon, TrashIcon, ArrowRightIcon, CaptureCircleIcon } from "@/components/icons";
import type {
  TransactionImageInput,
  TransactionImageRole,
} from "@/lib/types/transaction";

interface PhotoCaptureProps {
  onImagesSelected: (images: TransactionImageInput[]) => void;
  onError?: (message: string) => void;
}

type CapturableImageRole = Extract<TransactionImageRole, "receipt" | "odometer">;

export function PhotoCapture({ onImagesSelected, onError }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [draftImages, setDraftImages] = useState<TransactionImageInput[]>([]);
  const [cameraStep, setCameraStep] = useState<CapturableImageRole>("receipt");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const valid: File[] = [];
      for (const f of Array.from(files)) {
        const { valid: ok, error } = validateImageFile(f);
        if (ok) valid.push(f);
        else onError?.(error ?? "Invalid image");
      }
      if (valid.length > 0) {
        const prepared = await Promise.all(
          valid.map((file, index) =>
            createImageInput(
              file,
              index === 0 ? "receipt" : index === 1 ? "odometer" : "other"
            )
          )
        );
        setDraftImages(prepared);
      }
    }
    e.target.value = "";
  };

  const startCamera = async (role: CapturableImageRole = "receipt") => {
    try {
      setCameraStep(role);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
    } catch {
      onError?.("Camera access denied or unavailable");
    }
  };

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          const imageInput = await createImageInput(file, cameraStep);
          setDraftImages((current) => [
            ...current.filter((image) => image.role !== cameraStep),
            imageInput,
          ]);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!stream && draftImages.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-secondary/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <UploadIcon size={24} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Upload photos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select receipt images from your device
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => startCamera("receipt")}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-secondary/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <CameraIcon size={24} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Take photo</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your camera to capture receipt
              </p>
            </div>
          </button>
        </div>
      ) : !stream ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-6">
          <div>
            <h3 className="font-medium text-foreground">Review and assign image roles</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Receipt is required. Odometer is optional for efficiency tracking.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {draftImages.map((image) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-secondary/30"
              >
                {image.preview_url && (
                  <img
                    src={image.preview_url}
                    alt={`${image.role} preview`}
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-3 space-y-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Image role
                  </label>
                  <select
                    value={image.role}
                    onChange={(e) =>
                      setDraftImages((current) =>
                        current.map((entry) =>
                          entry.id === image.id
                            ? {
                                ...entry,
                                role: e.target.value as TransactionImageRole,
                              }
                            : entry
                        )
                      )
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="receipt">Receipt</option>
                    <option value="odometer">Odometer</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftImages((current) =>
                        current.filter((entry) => entry.id !== image.id)
                      )
                    }
                    className="flex items-center gap-1 text-sm text-destructive transition-colors hover:text-destructive/80"
                  >
                    <TrashIcon size={14} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setDraftImages([])}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Start over
            </button>
            {(() => {
              const hasOdometer = draftImages.some((image) => image.role === "odometer");
              return (
                <button
                  type="button"
                  onClick={() => startCamera(draftImages.some((image) => image.role === "receipt") ? "odometer" : "receipt")}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 font-medium transition-colors ${
                    !hasOdometer
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  <CameraIcon size={18} />
                  {draftImages.some((image) => image.role === "receipt")
                    ? "Capture odometer"
                    : "Capture receipt"}
                </button>
              );
            })()}
            <button
              type="button"
              onClick={() => onImagesSelected(draftImages)}
              disabled={!draftImages.some((image) => image.role === "receipt")}
              className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowRightIcon size={18} />
              Continue
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {cameraStep === "receipt" ? "1" : "2"}
            </div>
            <h3 className="font-medium text-foreground">
              {cameraStep === "receipt"
                ? "Capture your receipt"
                : "Capture odometer (optional)"}
            </h3>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-72 rounded-lg bg-black object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CaptureCircleIcon size={18} />
              Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function createImageInput(
  file: File,
  role: TransactionImageRole
): Promise<TransactionImageInput> {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    file,
    preview_url: await fileToDataUrl(file),
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to preview image"));
    reader.readAsDataURL(file);
  });
}
