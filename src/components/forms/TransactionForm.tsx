"use client";

import { useState, useEffect } from "react";
import type { FuelTransaction } from "@/lib/types/transaction";
import {
  sanitiseString,
  validateLitres,
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
  const [odometer, setOdometer] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [stationName, setStationName] = useState("");

  useEffect(() => {
    if (initial) {
      setDate(initial.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
      setLitres(initial.litres?.toString() ?? "");
      setTotalCost(initial.total_cost?.toString() ?? "");
      setOdometer(initial.odometer?.toString() ?? "");
      setFuelType(initial.fuel_type ?? "");
      setStationName(initial.station_name ?? "");
    } else {
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [initial]);

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
    const o = odometer ? parseInt(odometer, 10) : undefined;
    if (l != null && validateLitres(l)) tx.litres = l;
    if (c != null && validateTotalCost(c)) tx.total_cost = c;
    if (o != null && validateOdometer(o)) tx.odometer = o;
    if (validateDate(tx.date)) {
      // date already set
    } else {
      tx.date = now.slice(0, 10);
    }
    if (fuelType) tx.fuel_type = sanitiseString(fuelType);
    if (stationName) tx.station_name = sanitiseString(stationName);
    if (tx.litres && tx.total_cost) {
      tx.price_per_litre = tx.total_cost / tx.litres;
    }
    onSubmit(tx);
  };

  const previewImage = initial?.receipt_image ?? initial?.odometer_image;

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
        <label htmlFor="fuelType" className="block text-sm font-medium text-slate-700">
          Fuel type (optional)
        </label>
        <input
          id="fuelType"
          type="text"
          value={fuelType}
          onChange={(e) => setFuelType(e.target.value)}
          placeholder="e.g. Unleaded 91"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
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
            <p className="mb-1 text-sm font-medium text-slate-600">Source image</p>
            <img
              src={previewImage}
              alt="Receipt or odometer"
              className="w-full rounded-lg border border-slate-200 object-contain bg-slate-50 max-h-80 md:max-h-[32rem] object-top"
            />
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
