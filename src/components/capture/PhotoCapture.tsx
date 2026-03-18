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
    } catch (err) {
      onError?.("Camera access denied or unavailable");
    }
  };

  // Assign srcObject after video mounts (video is conditionally rendered when stream is set,
  // so videoRef.current is null during startCamera)
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
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-slate-700 px-4 py-3 text-white hover:bg-slate-600"
          >
            Upload photos
          </button>
          <button
            type="button"
            onClick={() => startCamera("receipt")}
            className="rounded-lg border border-slate-600 px-4 py-3 text-slate-700 hover:bg-slate-100"
          >
            Take photo
          </button>
        </div>
      ) : !stream ? (
        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              {draftImages.some((image) => image.preview_url)
                ? "Review and assign image roles"
                : "Review captured images"}
            </p>
            <p className="text-sm text-slate-500">
              Receipt is required. Odometer is optional and should only be a dashboard/odometer photo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {draftImages.map((image) => (
              <div
                key={image.id}
                className="space-y-2 rounded-lg border border-slate-200 p-3"
              >
                {image.preview_url && (
                  <img
                    src={image.preview_url}
                    alt={`${image.role} preview`}
                    className="h-40 w-full rounded-md object-cover"
                  />
                )}
                <label className="block text-sm font-medium text-slate-700">
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
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
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove image
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onImagesSelected(draftImages)}
              disabled={!draftImages.some((image) => image.role === "receipt")}
              className="flex-1 rounded-lg bg-slate-800 px-4 py-3 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Use selected images
            </button>
            <button
              type="button"
              onClick={() => startCamera(draftImages.some((image) => image.role === "receipt") ? "odometer" : "receipt")}
              className="rounded-lg border border-slate-400 px-4 py-3 text-slate-700 hover:bg-slate-100"
            >
              {draftImages.some((image) => image.role === "receipt")
                ? "Capture odometer"
                : "Capture receipt"}
            </button>
            <button
              type="button"
              onClick={() => setDraftImages([])}
              className="rounded-lg border border-slate-400 px-4 py-3 text-slate-700 hover:bg-slate-100"
            >
              Start over
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {cameraStep === "receipt"
              ? "Step 1: Capture receipt"
              : "Step 2: Capture odometer (optional)"}
          </p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-64 rounded-lg bg-black object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Capture {cameraStep}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-lg border border-slate-400 px-4 py-2 hover:bg-slate-100"
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
