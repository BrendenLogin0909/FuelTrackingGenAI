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
      label: `Additional image ${index + 1}`,
      src,
    })) ?? []),
  ].filter((image): image is { label: string; src: string } => Boolean(image));

  const previewImage = galleryImages[activeImageIndex] ?? galleryImages[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex-1 min-w-0 space-y-4 md:order-1">
          <div>
        <label htmlFor="date" className="block text-sm font-medium text-slate-700">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="litres" className="block text-sm font-medium text-slate-700">
          Litres
        </label>
        <input
          id="litres"
          type="number"
          step="0.01"
          min="0"
          value={litres}
          onChange={(e) => setLitres(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="totalCost" className="block text-sm font-medium text-slate-700">
          Total cost ($)
        </label>
        <input
          id="totalCost"
          type="number"
          step="0.01"
          min="0"
          value={totalCost}
          onChange={(e) => setTotalCost(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="odometer" className="block text-sm font-medium text-slate-700">
          Odometer (km)
        </label>
        <input
          id="odometer"
          type="number"
          min="0"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="pricePerLitre" className="block text-sm font-medium text-slate-700">
          Price per litre ($/L)
        </label>
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
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="fuelType" className="block text-sm font-medium text-slate-700">
          Fuel type (optional)
        </label>
        <select
          id="fuelType"
          value={fuelType}
          onChange={(e) => setFuelType(e.target.value as FuelTypeOption | "")}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="">Select fuel type</option>
          {AUSTRALIAN_FUEL_TYPES.map((option) => (
            <option key={option} value={option}>
              {getFuelTypeLabel(option)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="stationName" className="block text-sm font-medium text-slate-700">
          Station name (optional)
        </label>
        <input
          id="stationName"
          type="text"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          placeholder="e.g. BP Northgate"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
        </div>
        {previewImage && (
          <div className="w-full md:flex-1 md:min-w-80 md:order-2">
            <p className="mb-1 text-sm font-medium text-slate-600">
              {previewImage.label}
            </p>
            <img
              src={previewImage.src}
              alt={previewImage.label}
              className="w-full rounded-lg border border-slate-200 object-contain bg-slate-50 max-h-80 md:max-h-[32rem] object-top"
            />
            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image.label}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`overflow-hidden rounded-lg border ${
                      index === activeImageIndex
                        ? "border-slate-700 ring-1 ring-slate-700"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={image.src}
                      alt={image.label}
                      className="h-24 w-full object-cover"
                    />
                    <span className="block px-2 py-1 text-left text-xs text-slate-600">
                      {image.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
          >
            Save
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-400 px-4 py-2 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
        {onDelete && initial?.id && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this transaction? This cannot be undone.")) {
                onDelete(initial.id!);
              }
            }}
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100"
          >
            Delete transaction
          </button>
        )}
      </div>
    </form>
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
