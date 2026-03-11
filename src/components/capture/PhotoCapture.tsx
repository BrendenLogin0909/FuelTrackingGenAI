"use client";

import { useRef, useState, useEffect } from "react";
import { validateImageFile } from "@/lib/validation";

interface PhotoCaptureProps {
  onImagesSelected: (files: File[]) => void;
  onError?: (message: string) => void;
}

export function PhotoCapture({ onImagesSelected, onError }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Effect to attach stream to video element after render
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const valid: File[] = [];
      for (const f of Array.from(files)) {
        const { valid: ok, error } = validateImageFile(f);
        if (ok) valid.push(f);
        else onError?.(error ?? "Invalid image");
      }
      if (valid.length > 0) onImagesSelected(valid);
    }
    e.target.value = "";
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      // srcObject is now assigned via useEffect after the video element renders
    } catch (err) {
      onError?.("Camera access denied or unavailable");
    }
  };

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
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onImagesSelected([file]);
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

      {!stream ? (
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
            onClick={startCamera}
            className="rounded-lg border border-slate-600 px-4 py-3 text-slate-700 hover:bg-slate-100"
          >
            Take photo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
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
              Capture
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
