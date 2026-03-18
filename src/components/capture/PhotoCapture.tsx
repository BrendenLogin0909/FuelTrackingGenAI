"use client";

import { useRef, useState, useEffect } from "react";
import { validateImageFile } from "@/lib/validation";
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onImagesSelected(draftImages)}
              disabled={!draftImages.some((image) => image.role === "receipt")}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
              Continue with selected
            </button>
            <button
              type="button"
              onClick={() => startCamera(draftImages.some((image) => image.role === "receipt") ? "odometer" : "receipt")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              {draftImages.some((image) => image.role === "receipt")
                ? "Capture odometer"
                : "Capture receipt"}
            </button>
            <button
              type="button"
              onClick={() => setDraftImages([])}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Start over
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
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
