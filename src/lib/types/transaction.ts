/**
 * Fuel transaction data model (PRD Section 8)
 */
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
  fuel_type?: string;
  receipt_image?: string; // base64 or blob ref
  odometer_image?: string;
  extra_images?: string[];
  created_at: string;
  updated_at: string;
}

export interface ExtractedFields {
  total_cost?: number;
  litres?: number;
  price_per_litre?: number;
  station_name?: string;
  fuel_type?: string;
  date?: string;
  odometer?: number;
  trip_meter?: number;
}
