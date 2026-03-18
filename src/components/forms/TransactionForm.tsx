"use client";

import { useState, useEffect } from "react";
import {
  AUSTRALIAN_FUEL_TYPES,
  type FuelTransaction,
  type FuelTypeOption,
} from "@/lib/types/transaction";
import {
  sanitiseString,
  validateLitres,
  validatePricePerLitre,
  validateTotalCost,
  validateOdometer,
  validateDate,
} from "@/lib/validation";

interface TransactionFormProps {
  initial?: Partial<FuelTransaction>;
  onSubmit: (tx: FuelTransaction) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
}

export function TransactionForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const [date, setDate] = useState("");
  const [litres, setLitres] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [pricePerLitre, setPricePerLitre] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelType, setFuelType] = useState<FuelTypeOption | "">("");
  const [stationName, setStationName] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [pricePerLitreEdited, setPricePerLitreEdited] = useState(false);

  useEffect(() => {
    if (initial) {
      setDate(initial.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
      setLitres(initial.litres?.toString() ?? "");
      setTotalCost(initial.total_cost?.toString() ?? "");
      setPricePerLitre(
        initial.price_per_litre?.toFixed(3).replace(/\.?0+$/, "") ??
          derivePricePerLitreValue(initial.total_cost, initial.litres)
      );
      setOdometer(initial.odometer?.toString() ?? "");
      setFuelType(initial.fuel_type ?? "");
      setStationName(initial.station_name ?? "");
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setPricePerLitre("");
    }
    setPricePerLitreEdited(false);
  }, [initial]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [initial?.id, initial?.receipt_image, initial?.odometer_image, initial?.extra_images]);

  useEffect(() => {
    if (pricePerLitreEdited) {
      return;
    }
    setPricePerLitre(derivePricePerLitreInput(totalCost, litres));
  }, [litres, totalCost, pricePerLitreEdited]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const tx: FuelTransaction = {
      id: initial?.id ?? `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      date: date || now.slice(0, 10),
      created_at: initial?.created_at ?? now,
      updated_at: now,
      receipt_image: initial?.receipt_image,
      odometer_image: initial?.odometer_image,
      extra_images: initial?.extra_images,
    };
    const l = litres ? parseFloat(litres) : undefined;
    const c = totalCost ? parseFloat(totalCost) : undefined;
    const enteredPricePerLitre = pricePerLitre ? parseFloat(pricePerLitre) : undefined;
    const o = odometer ? parseInt(odometer, 10) : undefined;
    if (l != null && validateLitres(l)) tx.litres = l;
    if (c != null && validateTotalCost(c)) tx.total_cost = c;
    if (enteredPricePerLitre != null && validatePricePerLitre(enteredPricePerLitre)) {
      tx.price_per_litre = enteredPricePerLitre;
    } else if (l != null && c != null && validateLitres(l) && validateTotalCost(c)) {
      tx.price_per_litre = c / l;
    }
    if (o != null && validateOdometer(o)) tx.odometer = o;
    if (validateDate(tx.date)) {
      // date already set
    } else {
      tx.date = now.slice(0, 10);
    }
    if (fuelType) tx.fuel_type = fuelType;
    if (stationName) tx.station_name = sanitiseString(stationName);
    onSubmit(tx);
  };

  const galleryImages = [
    initial?.receipt_image
      ? { label: "Receipt", src: initial.receipt_image }
      : null,
    initial?.odometer_image
      ? { label: "Odometer", src: initial.odometer_image }
      : null,
    ...(initial?.extra_images?.map((src, index) => ({
      label: `Additional ${index + 1}`,
      src,
    })) ?? []),
  ].filter((image): image is { label: string; src: string } => Boolean(image));

  const previewImage = galleryImages[activeImageIndex] ?? galleryImages[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Form Fields */}
        <div className="flex-1 space-y-6 lg:order-1">
          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-medium text-foreground">
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
                className="text-primary"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
              Transaction Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Date" htmlFor="date">
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </FormField>
              <FormField label="Station name" htmlFor="stationName" optional>
                <input
                  id="stationName"
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder="e.g. BP Northgate"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </FormField>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-medium text-foreground">
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
                className="text-primary"
              >
                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
              </svg>
              Fuel Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Litres" htmlFor="litres">
                <div className="relative">
                  <input
                    id="litres"
                    type="number"
                    step="0.01"
                    min="0"
                    value={litres}
                    onChange={(e) => setLitres(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">L</span>
                </div>
              </FormField>
              <FormField label="Total cost" htmlFor="totalCost">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pl-7 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </FormField>
              <FormField label="Price per litre" htmlFor="pricePerLitre">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    id="pricePerLitre"
                    type="number"
                    step="0.001"
                    min="0"
                    value={pricePerLitre}
                    onChange={(e) => {
                      setPricePerLitre(e.target.value);
                      setPricePerLitreEdited(true);
                    }}
                    placeholder="Auto-calculated"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pl-7 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/L</span>
                </div>
              </FormField>
              <FormField label="Fuel type" htmlFor="fuelType" optional>
                <select
                  id="fuelType"
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelTypeOption | "")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select fuel type</option>
                  {AUSTRALIAN_FUEL_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {getFuelTypeLabel(option)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 md:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-medium text-foreground">
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
                className="text-primary"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Odometer Reading
            </h3>
            <FormField label="Current odometer" htmlFor="odometer" description="Used to calculate fuel efficiency between fill-ups">
              <div className="relative">
                <input
                  id="odometer"
                  type="number"
                  min="0"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">km</span>
              </div>
            </FormField>
          </div>
        </div>

        {/* Image Preview */}
        {previewImage && (
          <div className="w-full lg:w-96 lg:order-2">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 font-medium text-foreground">
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
                  className="text-primary"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                {previewImage.label}
              </h3>
              <div className="overflow-hidden rounded-lg border border-border bg-secondary/30">
                <img
                  src={previewImage.src}
                  alt={previewImage.label}
                  className="w-full object-contain max-h-80 lg:max-h-[28rem]"
                />
              </div>
              {galleryImages.length > 1 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image.label}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`overflow-hidden rounded-lg border transition-all ${
                        index === activeImageIndex
                          ? "border-primary ring-1 ring-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={image.src}
                        alt={image.label}
                        className="h-16 w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          )}
          {onDelete && initial?.id && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete this transaction? This cannot be undone.")) {
                  onDelete(initial.id!);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/50 px-4 py-2.5 font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
              Delete
            </button>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save Transaction
        </button>
      </div>
    </form>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  optional?: boolean;
  description?: string;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, optional, description, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-foreground">
        {label}
        {optional && <span className="text-xs text-muted-foreground">(optional)</span>}
      </label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function derivePricePerLitreInput(totalCost: string, litres: string): string {
  const cost = totalCost ? parseFloat(totalCost) : undefined;
  const volume = litres ? parseFloat(litres) : undefined;
  return derivePricePerLitreValue(cost, volume);
}

function derivePricePerLitreValue(
  totalCost?: number,
  litres?: number
): string {
  if (
    totalCost == null ||
    litres == null ||
    !validateTotalCost(totalCost) ||
    !validateLitres(litres) ||
    litres <= 0
  ) {
    return "";
  }
  return (Math.round((totalCost / litres) * 1000) / 1000)
    .toFixed(3)
    .replace(/\.?0+$/, "");
}

function getFuelTypeLabel(fuelType: FuelTypeOption): string {
  switch (fuelType) {
    case "U91":
      return "Unleaded 91 (U91)";
    case "P95":
      return "Premium 95 (P95)";
    case "P98":
      return "Premium 98 (P98)";
    case "E10":
      return "E10 (Unleaded + 10% ethanol)";
    case "E85":
      return "E85 (Flex-fuel)";
    case "Diesel":
      return "Diesel";
    case "Premium Diesel":
      return "Premium Diesel";
    case "LPG":
      return "LPG (Autogas)";
  }
}
