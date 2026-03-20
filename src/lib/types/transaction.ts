/**
 * Fuel transaction data model (PRD Section 8)
 */
export const AUSTRALIAN_FUEL_TYPES = [
  "U91",
  "P95",
  "P98",
  "E10",
  "E85",
  "Diesel",
  "Premium Diesel",
  "LPG",
] as const;

export type FuelTypeOption = typeof AUSTRALIAN_FUEL_TYPES[number];

export interface FuelTransaction {
  id: string;
  date: string; // ISO date
  litres?: number;
  total_cost?: number;
  price_per_litre?: number;
  odometer?: number;
  distance_since_last?: number; // calculated
  fuel_efficiency?: number; // L/100km, calculated
  station_name?: string;
  fuel_type?: FuelTypeOption;
  receipt_image?: string; // base64 or blob ref
  odometer_image?: string;
  extra_images?: string[];
  created_at: string;
  updated_at: string;
}

export type TransactionImageRole = "receipt" | "odometer" | "other";

export interface TransactionImageInput {
  id: string;
  role: TransactionImageRole;
  file: File;
  preview_url?: string;
}

export interface TransactionImageSource {
  role: TransactionImageRole;
  image: string | File | Blob;
}

export interface ExtractedFields {
  total_cost?: number;
  litres?: number;
  price_per_litre?: number;
  station_name?: string;
  fuel_type?: FuelTypeOption;
  date?: string;
  odometer?: number;
  trip_meter?: number;
}
