// src/utils/courierData.ts

export interface CourierService {
  id: string;
  company: string;
  serviceName: string;
  type: "domestic" | "international";
  originCountry: string;
  supportedRoutes: string[];
  features: {
    tracking: boolean;
    insurance: boolean;
    pickup: boolean;
  };
  deliveryDays: {
    min: number;
    max: number;
  };
  reliabilityScore: number;
  tags: string[];

  // Pricing coefficients for mockup calculation
  baseRate: number;                  // local currency (domestic) or USD (international)
  perAdditionalHalfKgRate: number;   // local currency (domestic) or USD (international)
  distanceRate: number;              // local currency (domestic) or USD (international)
  maxWeightAllowed: number;          // in kg
}

export interface PricingRule {
  baseRate: number;
  baseWeightLimit: number;
  perUnitWeightCost: number;
  pickupSurcharge?: number;
  expressMultiplier?: number;
}

// NOTE: Hardcoded price datasets have been removed in favor of src/data JSON configuration files.
// These are kept as empty arrays/objects to prevent type import errors in scripts.
export const COURIER_SERVICES: CourierService[] = [];
export const DOMESTIC_PRICING_RULES: Record<string, Record<string, PricingRule>> = {};
export const INTERNATIONAL_PRICING_RULES: Record<string, Record<string, PricingRule>> = {};
