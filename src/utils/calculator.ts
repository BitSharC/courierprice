// src/utils/calculator.ts

import { COUNTRIES_DATA, type StateRegion } from './countryData';

export interface ParcelInput {
  weight: number;
  weightUnit: "kg" | "g";
  category: string;
  length?: number; // cm
  width?: number;  // cm
  height?: number; // cm
}

export interface ShippingInput {
  type: "domestic" | "international";
  pickupCountry: string;
  pickupState: string;
  pickupDistrict?: string;     // only used if country is India (IN)
  deliveryCountry: string;
  deliveryState: string;
  deliveryDistrict?: string;   // only used if country is India (IN)
  parcels: ParcelInput[];
  insurance: boolean;
  express: boolean;
  pickupRequired: boolean;
}

export interface PriceBreakdown {
  baseCharge: number;
  weightCharge: number;
  distanceCharge: number;
  insuranceCharge: number;
  packagingCharge: number;
  pickupFee: number;
  taxes: number;
  total: number;
}

export interface CourierEstimate {
  id: string;
  name: string;
  estimatedPrice: number;
  estimatedDays: number;
  reliabilityScore: number;
  trackingAvailable: boolean;
  insuranceAvailable: boolean;
  pickupAvailable: boolean;
  recommendationBadge?: "cheapest" | "fastest" | "value" | null;
  breakdown: PriceBreakdown;
  currencySymbol: string;
}

export const CATEGORIES = [
  { id: "documents", name: "Documents", basePackaging: 10 },
  { id: "electronics", name: "Electronics", basePackaging: 200 },
  { id: "clothes", name: "Clothes", basePackaging: 20 },
  { id: "books", name: "Books", basePackaging: 15 },
  { id: "fragile", name: "Fragile Items", basePackaging: 300 },
  { id: "furniture", name: "Furniture", basePackaging: 800 },
  { id: "bike", name: "Bike", basePackaging: 1500 },
  { id: "household", name: "Household Items", basePackaging: 600 },
  { id: "others", name: "Others", basePackaging: 30 }
];

// USD conversion rates for international carrier base pricing conversions
const USD_TO_CURRENCY: Record<string, number> = {
  "INR": 83.0,
  "USD": 1.0,
  "GBP": 0.79,
  "CAD": 1.37,
  "AUD": 1.50,
  "EUR": 0.92,
  "AED": 3.67
};

// Calculate Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Domestic courier configurations schema
interface DomesticCourierConfig {
  id: string;
  name: string;
  reliabilityScore: number;
  tracking: boolean;
  insurance: boolean;
  pickup: boolean;
  baseRate: number;                 // up to 0.5kg in local currency
  perAdditionalHalfKgRate: number;      // rate per 0.5kg after the first 0.5kg
  distanceRatePer500Km: number;         // distance charge per 500km
  speedFactor: number;              // time scaling: lower is faster
  minDays: number;
  maxWeightAllowed: number;         // in kg
  localOnly?: boolean;
}

// Country-specific domestic courier services configurations
const DOMESTIC_COURIERS: Record<string, DomesticCourierConfig[]> = {
  "IN": [
    {
      id: "india-post",
      name: "India Post (Speed Post)",
      reliabilityScore: 4.1,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 40,
      perAdditionalHalfKgRate: 15,
      distanceRatePer500Km: 8,
      speedFactor: 1.2,
      minDays: 3,
      maxWeightAllowed: 35
    },
    {
      id: "blue-dart",
      name: "Blue Dart (DHL Group)",
      reliabilityScore: 4.9,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 160,
      perAdditionalHalfKgRate: 45,
      distanceRatePer500Km: 25,
      speedFactor: 0.5,
      minDays: 1,
      maxWeightAllowed: 100
    },
    {
      id: "dtdc",
      name: "DTDC Express",
      reliabilityScore: 4.4,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 80,
      perAdditionalHalfKgRate: 25,
      distanceRatePer500Km: 15,
      speedFactor: 0.8,
      minDays: 2,
      maxWeightAllowed: 70
    },
    {
      id: "delhivery",
      name: "Delhivery",
      reliabilityScore: 4.5,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 70,
      perAdditionalHalfKgRate: 22,
      distanceRatePer500Km: 12,
      speedFactor: 0.85,
      minDays: 2,
      maxWeightAllowed: 150
    },
    {
      id: "xpressbees",
      name: "XpressBees",
      reliabilityScore: 4.2,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 50,
      perAdditionalHalfKgRate: 18,
      distanceRatePer500Km: 10,
      speedFactor: 1.0,
      minDays: 3,
      maxWeightAllowed: 50
    },
    {
      id: "porter",
      name: "Porter (Intra-city & Heavy)",
      reliabilityScore: 4.6,
      tracking: true,
      insurance: false,
      pickup: true,
      baseRate: 250,
      perAdditionalHalfKgRate: 35,
      distanceRatePer500Km: 150,
      speedFactor: 0.4,
      minDays: 1,
      maxWeightAllowed: 2000,
      localOnly: true
    }
  ],
  "US": [
    {
      id: "usps-priority",
      name: "USPS Priority Mail",
      reliabilityScore: 4.3,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 9.20,
      perAdditionalHalfKgRate: 1.50,
      distanceRatePer500Km: 0.40,
      speedFactor: 0.9,
      minDays: 2,
      maxWeightAllowed: 30
    },
    {
      id: "fedex-ground",
      name: "FedEx Ground",
      reliabilityScore: 4.7,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 14.50,
      perAdditionalHalfKgRate: 2.10,
      distanceRatePer500Km: 0.60,
      speedFactor: 0.7,
      minDays: 2,
      maxWeightAllowed: 70
    },
    {
      id: "ups-ground",
      name: "UPS Ground",
      reliabilityScore: 4.6,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 13.80,
      perAdditionalHalfKgRate: 1.90,
      distanceRatePer500Km: 0.55,
      speedFactor: 0.75,
      minDays: 2,
      maxWeightAllowed: 70
    },
    {
      id: "dhl-express-us",
      name: "DHL Express Domestic",
      reliabilityScore: 4.8,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 28.00,
      perAdditionalHalfKgRate: 4.50,
      distanceRatePer500Km: 1.20,
      speedFactor: 0.4,
      minDays: 1,
      maxWeightAllowed: 100
    }
  ],
  "GB": [
    {
      id: "royal-mail-tracked",
      name: "Royal Mail Tracked 48",
      reliabilityScore: 4.4,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 3.50,
      perAdditionalHalfKgRate: 0.80,
      distanceRatePer500Km: 0.20,
      speedFactor: 1.0,
      minDays: 2,
      maxWeightAllowed: 20
    },
    {
      id: "evri-standard",
      name: "Evri Standard",
      reliabilityScore: 3.9,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 2.80,
      perAdditionalHalfKgRate: 0.60,
      distanceRatePer500Km: 0.15,
      speedFactor: 1.2,
      minDays: 3,
      maxWeightAllowed: 15
    },
    {
      id: "dpd-uk",
      name: "DPD UK Delivery",
      reliabilityScore: 4.7,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 7.20,
      perAdditionalHalfKgRate: 1.40,
      distanceRatePer500Km: 0.35,
      speedFactor: 0.6,
      minDays: 1,
      maxWeightAllowed: 30
    },
    {
      id: "dhl-uk",
      name: "DHL UK Next Day",
      reliabilityScore: 4.8,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 12.50,
      perAdditionalHalfKgRate: 2.50,
      distanceRatePer500Km: 0.50,
      speedFactor: 0.5,
      minDays: 1,
      maxWeightAllowed: 50
    }
  ],
  "CA": [
    {
      id: "canada-post",
      name: "Canada Post Regular Parcel",
      reliabilityScore: 4.2,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 9.80,
      perAdditionalHalfKgRate: 1.80,
      distanceRatePer500Km: 0.45,
      speedFactor: 1.0,
      minDays: 3,
      maxWeightAllowed: 30
    },
    {
      id: "purolator-ground",
      name: "Purolator Ground",
      reliabilityScore: 4.5,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 15.20,
      perAdditionalHalfKgRate: 2.40,
      distanceRatePer500Km: 0.70,
      speedFactor: 0.8,
      minDays: 2,
      maxWeightAllowed: 65
    },
    {
      id: "fedex-canada",
      name: "FedEx Ground Canada",
      reliabilityScore: 4.7,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 16.50,
      perAdditionalHalfKgRate: 2.60,
      distanceRatePer500Km: 0.75,
      speedFactor: 0.75,
      minDays: 2,
      maxWeightAllowed: 70
    },
    {
      id: "ups-canada",
      name: "UPS Standard Canada",
      reliabilityScore: 4.6,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 14.90,
      perAdditionalHalfKgRate: 2.20,
      distanceRatePer500Km: 0.65,
      speedFactor: 0.8,
      minDays: 2,
      maxWeightAllowed: 70
    }
  ],
  "AU": [
    {
      id: "auspost-parcel",
      name: "Australia Post Parcel Post",
      reliabilityScore: 4.3,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 8.95,
      perAdditionalHalfKgRate: 1.90,
      distanceRatePer500Km: 0.50,
      speedFactor: 1.1,
      minDays: 3,
      maxWeightAllowed: 22
    },
    {
      id: "sendle",
      name: "Sendle Standard",
      reliabilityScore: 4.1,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 6.95,
      perAdditionalHalfKgRate: 1.40,
      distanceRatePer500Km: 0.35,
      speedFactor: 1.3,
      minDays: 4,
      maxWeightAllowed: 25
    },
    {
      id: "toll-priority",
      name: "Toll Priority",
      reliabilityScore: 4.5,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 19.50,
      perAdditionalHalfKgRate: 3.20,
      distanceRatePer500Km: 0.90,
      speedFactor: 0.6,
      minDays: 1,
      maxWeightAllowed: 50
    },
    {
      id: "allied-express",
      name: "Allied Express",
      reliabilityScore: 4.2,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 14.00,
      perAdditionalHalfKgRate: 2.30,
      distanceRatePer500Km: 0.65,
      speedFactor: 0.9,
      minDays: 2,
      maxWeightAllowed: 100
    }
  ],
  "DE": [
    {
      id: "dhl-paket",
      name: "DHL Paket",
      reliabilityScore: 4.8,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 4.99,
      perAdditionalHalfKgRate: 0.70,
      distanceRatePer500Km: 0.15,
      speedFactor: 0.8,
      minDays: 2,
      maxWeightAllowed: 31.5
    },
    {
      id: "hermes-paket",
      name: "Hermes Paket",
      reliabilityScore: 4.1,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 3.99,
      perAdditionalHalfKgRate: 0.60,
      distanceRatePer500Km: 0.10,
      speedFactor: 1.1,
      minDays: 3,
      maxWeightAllowed: 25
    },
    {
      id: "dpd-germany",
      name: "DPD Classic Germany",
      reliabilityScore: 4.4,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 5.40,
      perAdditionalHalfKgRate: 0.90,
      distanceRatePer500Km: 0.20,
      speedFactor: 0.9,
      minDays: 2,
      maxWeightAllowed: 31.5
    },
    {
      id: "gls-germany",
      name: "GLS Standard Germany",
      reliabilityScore: 4.3,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 4.80,
      perAdditionalHalfKgRate: 0.85,
      distanceRatePer500Km: 0.18,
      speedFactor: 0.9,
      minDays: 2,
      maxWeightAllowed: 40
    }
  ],
  "AE": [
    {
      id: "aramex-domestic",
      name: "Aramex Domestic",
      reliabilityScore: 4.5,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 19.00,
      perAdditionalHalfKgRate: 3.00,
      distanceRatePer500Km: 4.00,
      speedFactor: 0.6,
      minDays: 1,
      maxWeightAllowed: 30
    },
    {
      id: "emirates-post",
      name: "Emirates Post Courier",
      reliabilityScore: 4.2,
      tracking: true,
      insurance: true,
      pickup: false,
      baseRate: 15.00,
      perAdditionalHalfKgRate: 2.00,
      distanceRatePer500Km: 2.50,
      speedFactor: 0.9,
      minDays: 2,
      maxWeightAllowed: 35
    },
    {
      id: "fetchr",
      name: "Fetchr Next-Day",
      reliabilityScore: 4.3,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 25.00,
      perAdditionalHalfKgRate: 4.00,
      distanceRatePer500Km: 5.00,
      speedFactor: 0.5,
      minDays: 1,
      maxWeightAllowed: 20
    },
    {
      id: "dhl-uae",
      name: "DHL Domestic UAE",
      reliabilityScore: 4.8,
      tracking: true,
      insurance: true,
      pickup: true,
      baseRate: 40.00,
      perAdditionalHalfKgRate: 8.00,
      distanceRatePer500Km: 8.00,
      speedFactor: 0.4,
      minDays: 1,
      maxWeightAllowed: 50
    }
  ]
};

// Global International courier configurations (in base USD, converted dynamically)
interface InternationalCourierConfig {
  id: string;
  name: string;
  reliabilityScore: number;
  tracking: boolean;
  insurance: boolean;
  pickup: boolean;
  baseRateUsd: number;             // up to 0.5kg
  perAdditionalHalfKgRateUsd: number; // rate per 0.5kg after
  distanceRatePer2000KmUsd: number;    // distance charge per 2000km
  speedFactor: number;
  minDays: number;
  maxWeightAllowed: number;        // in kg
}

const INTL_COURIERS: InternationalCourierConfig[] = [
  {
    id: "dhl-intl",
    name: "DHL Express International",
    reliabilityScore: 4.9,
    tracking: true,
    insurance: true,
    pickup: true,
    baseRateUsd: 22.00,
    perAdditionalHalfKgRateUsd: 7.50,
    distanceRatePer2000KmUsd: 2.50,
    speedFactor: 0.4,
    minDays: 2,
    maxWeightAllowed: 300
  },
  {
    id: "fedex-intl",
    name: "FedEx International Priority",
    reliabilityScore: 4.8,
    tracking: true,
    insurance: true,
    pickup: true,
    baseRateUsd: 20.00,
    perAdditionalHalfKgRateUsd: 7.00,
    distanceRatePer2000KmUsd: 2.30,
    speedFactor: 0.45,
    minDays: 3,
    maxWeightAllowed: 300
  },
  {
    id: "ups-intl",
    name: "UPS Worldwide Saver",
    reliabilityScore: 4.7,
    tracking: true,
    insurance: true,
    pickup: true,
    baseRateUsd: 18.50,
    perAdditionalHalfKgRateUsd: 6.70,
    distanceRatePer2000KmUsd: 2.20,
    speedFactor: 0.45,
    minDays: 3,
    maxWeightAllowed: 300
  },
  {
    id: "aramex-intl",
    name: "Aramex International",
    reliabilityScore: 4.3,
    tracking: true,
    insurance: true,
    pickup: true,
    baseRateUsd: 13.00,
    perAdditionalHalfKgRateUsd: 4.50,
    distanceRatePer2000KmUsd: 1.50,
    speedFactor: 0.65,
    minDays: 4,
    maxWeightAllowed: 100
  },
  {
    id: "postal-ems-intl",
    name: "EMS Global Postal",
    reliabilityScore: 4.0,
    tracking: true,
    insurance: true,
    pickup: false,
    baseRateUsd: 9.50,
    perAdditionalHalfKgRateUsd: 3.20,
    distanceRatePer2000KmUsd: 1.10,
    speedFactor: 0.85,
    minDays: 5,
    maxWeightAllowed: 35
  }
];

export function getEstimates(input: ShippingInput): CourierEstimate[] {
  const pickupCountryObj = COUNTRIES_DATA[input.pickupCountry];
  const deliveryCountryObj = COUNTRIES_DATA[input.deliveryCountry];
  if (!pickupCountryObj || !deliveryCountryObj) return [];

  const currencySymbol = pickupCountryObj.currencySymbol;
  const currencyCode = pickupCountryObj.currency;
  
  // Find state/region coordinates
  const pickupStateObj = pickupCountryObj.states.find(s => s.name === input.pickupState);
  const deliveryStateObj = deliveryCountryObj.states.find(s => s.name === input.deliveryState);
  
  if (!pickupStateObj || !deliveryStateObj) return [];

  const isInternational = input.type === "international";
  let distance = 0;
  let isSameCity = false;
  let zone: "LOCAL" | "METRO" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL" = "NATIONAL";

  if (isInternational) {
    distance = calculateDistance(pickupStateObj.lat, pickupStateObj.lng, deliveryStateObj.lat, deliveryStateObj.lng);
    // Standard minimal distance for international transits
    if (distance < 500) {
      distance = 1200;
    }
    zone = "INTERNATIONAL";
  } else {
    isSameCity = input.pickupState === input.deliveryState && 
      (input.pickupCountry !== 'IN' || input.pickupDistrict === input.deliveryDistrict);

    if (isSameCity) {
      distance = 12;
      zone = "LOCAL";
    } else if (input.pickupState === input.deliveryState) {
      distance = 180;
      zone = "REGIONAL";
    } else {
      distance = calculateDistance(pickupStateObj.lat, pickupStateObj.lng, deliveryStateObj.lat, deliveryStateObj.lng);
      if (distance < 50) {
        distance = 150;
      }
      
      // Determine if Metro-to-Metro (custom logic for India and US main hubs)
      const metros = [
        "Mumbai City", "Mumbai Suburban", "Pune", "Thane", "Bengaluru Urban", "Chennai", "Kolkata", "Hyderabad", "New Delhi",
        "California", "New York", "London", "Dubai", "Abu Dhabi"
      ];
      const isPickupMetro = metros.includes(input.pickupDistrict || "") || metros.includes(input.pickupState);
      const isDeliveryMetro = metros.includes(input.deliveryDistrict || "") || metros.includes(input.deliveryState);
      
      if (isPickupMetro && isDeliveryMetro) {
        zone = "METRO";
      } else {
        zone = "NATIONAL";
      }
    }
  }

  // Calculate billing weight and packaging charges
  let totalBillingWeight = 0;
  let totalPackagingCharge = 0;
  let rawActualWeightSum = 0;

  for (const parcel of input.parcels) {
    let weightInKg = parcel.weight;
    if (parcel.weightUnit === "g") {
      weightInKg = parcel.weight / 1000;
    }
    rawActualWeightSum += weightInKg;

    // Volumetric weight
    let volumetricWeight = 0;
    if (parcel.length && parcel.width && parcel.height) {
      volumetricWeight = (parcel.length * parcel.width * parcel.height) / 5000;
    }

    const billingWeight = Math.max(weightInKg, volumetricWeight);
    const roundedBillingWeight = Math.max(0.5, Math.ceil(billingWeight * 2) / 2);
    totalBillingWeight += roundedBillingWeight;

    // Packaging Charge
    const cat = CATEGORIES.find(c => c.id === parcel.category);
    let packagingCharge = cat ? cat.basePackaging : 30;
    if (parcel.category === "electronics") {
      packagingCharge = 250;
    } else if (parcel.category === "fragile") {
      packagingCharge = 350;
    }
    totalPackagingCharge += packagingCharge;
  }

  // Scale packaging charge to destination currency values roughly
  if (currencyCode !== "INR") {
    // scale packaging down for $, £, € from INR base
    const conversion = USD_TO_CURRENCY[currencyCode] / 83.0;
    totalPackagingCharge = Math.max(1, Math.round(totalPackagingCharge * conversion));
  }

  const estimates: CourierEstimate[] = [];

  if (!isInternational) {
    const configs = DOMESTIC_COURIERS[input.pickupCountry] || [];
    
    for (const courier of configs) {
      if (totalBillingWeight > courier.maxWeightAllowed) continue;
      if (courier.localOnly && distance > 250 && !isSameCity) continue;

      // Heavy load optimizations
      if (totalBillingWeight > 40 && (courier.id === "india-post" || courier.id === "xpressbees" || courier.id === "usps-priority")) {
        continue;
      }

      // Base Charge
      let baseCharge = courier.baseRate;

      // Weight Surcharge
      let weightCharge = 0;
      if (totalBillingWeight > 0.5) {
        const additionalSlabs = (totalBillingWeight - 0.5) / 0.5;
        if (courier.id === "porter") {
          weightCharge = totalBillingWeight * courier.perAdditionalHalfKgRate;
        } else {
          weightCharge = additionalSlabs * courier.perAdditionalHalfKgRate;
        }
      }

      // Special category adjustments
      const mainCategory = input.parcels[0]?.category;
      if (mainCategory === "documents" && totalBillingWeight < 0.5) {
        baseCharge *= 0.6;
        weightCharge = 0;
      } else if (mainCategory === "fragile") {
        baseCharge *= 1.25;
      } else if (mainCategory === "bike") {
        const bikeLoading = currencyCode === "INR" ? 500 : 15;
        baseCharge += bikeLoading;
      }

      // Distance Charge
      let distanceCharge = 0;
      if (isSameCity) {
        distanceCharge = courier.id === "porter" ? distance * (currencyCode === "INR" ? 30 : 0.8) : (currencyCode === "INR" ? 10 : 0.5);
      } else {
        if (courier.id === "porter") continue;
        distanceCharge = (distance / 500) * courier.distanceRatePer500Km;
      }

      // Zone Adjustments
      if (zone === "METRO") {
        baseCharge *= 1.1;
      } else if (zone === "REGIONAL") {
        distanceCharge *= 0.9;
      } else if (zone === "NATIONAL") {
        distanceCharge *= 1.25;
      }

      // Insurance Surcharge (1.2% of billing weight scaling)
      let insuranceCharge = 0;
      if (input.insurance && courier.insurance) {
        const minInsurance = currencyCode === "INR" ? 80 : 2.5;
        const weightMult = currencyCode === "INR" ? 18 : 0.5;
        insuranceCharge = Math.max(minInsurance, totalBillingWeight * weightMult);
      }

      // Home Pickup Surcharge
      let pickupFee = 0;
      if (input.pickupRequired && courier.pickup) {
        if (totalBillingWeight > 30) {
          pickupFee = currencyCode === "INR" ? 150 : 5.0;
        } else {
          pickupFee = currencyCode === "INR" ? 50 : 2.0;
        }
      }

      // Express Surcharges
      let speedFactor = courier.speedFactor;
      if (input.express) {
        speedFactor *= 0.7;
        baseCharge *= 1.35;
        weightCharge *= 1.15;
      }

      // Transit days estimation
      let transitDays = Math.ceil((distance / 420) * speedFactor);
      if (isSameCity) {
        transitDays = courier.id === "porter" || courier.id === "blue-dart" || courier.id === "dpd-uk" ? 1 : 2;
      }
      transitDays = Math.max(courier.minDays, transitDays);
      if (transitDays > 10) {
        transitDays = 10;
      }

      // Taxes (18% GST/VAT equivalent)
      const subtotal = baseCharge + weightCharge + distanceCharge + insuranceCharge + totalPackagingCharge + pickupFee;
      const taxes = Math.round(subtotal * 0.18 * 100) / 100;
      const total = Math.round(subtotal + taxes);

      estimates.push({
        id: courier.id,
        name: courier.name,
        estimatedPrice: total,
        estimatedDays: transitDays,
        reliabilityScore: courier.reliabilityScore,
        trackingAvailable: courier.tracking,
        insuranceAvailable: courier.insurance,
        pickupAvailable: courier.pickup,
        breakdown: {
          baseCharge: Math.round(baseCharge * 100) / 100,
          weightCharge: Math.round(weightCharge * 100) / 100,
          distanceCharge: Math.round(distanceCharge * 100) / 100,
          insuranceCharge: Math.round(insuranceCharge * 100) / 100,
          packagingCharge: Math.round(totalPackagingCharge * 100) / 100,
          pickupFee: Math.round(pickupFee * 100) / 100,
          taxes: Math.round(taxes * 100) / 100,
          total: total
        },
        currencySymbol
      });
    }
  } else {
    // Process International Carriers
    const rateConversion = USD_TO_CURRENCY[currencyCode] || 1.0;
    
    for (const courier of INTL_COURIERS) {
      if (totalBillingWeight > courier.maxWeightAllowed) continue;
      if (totalBillingWeight > 30 && courier.id === "postal-ems-intl") continue;

      // Base Charge in Origin Currency
      let baseCharge = courier.baseRateUsd * rateConversion;

      // Weight Surcharge
      let weightCharge = 0;
      if (totalBillingWeight > 0.5) {
        const additionalSlabs = (totalBillingWeight - 0.5) / 0.5;
        weightCharge = additionalSlabs * courier.perAdditionalHalfKgRateUsd * rateConversion;
      }

      // Category adjustments
      const mainCategory = input.parcels[0]?.category;
      if (mainCategory === "documents" && totalBillingWeight < 0.5) {
        baseCharge *= 0.75;
        weightCharge = 0;
      } else if (mainCategory === "fragile") {
        baseCharge *= 1.35;
      }

      // Distance Charge
      const distanceCharge = (distance / 2000) * courier.distanceRatePer2000KmUsd * rateConversion;

      // Insurance Charge
      let insuranceCharge = 0;
      if (input.insurance && courier.insurance) {
        const minInsurance = 5.0 * rateConversion;
        const weightMult = 1.0 * rateConversion;
        insuranceCharge = Math.max(minInsurance, totalBillingWeight * weightMult);
      }

      // Pickup Charge
      let pickupFee = 0;
      if (input.pickupRequired && courier.pickup) {
        pickupFee = (totalBillingWeight > 30 ? 6.0 : 3.0) * rateConversion;
      }

      // Express Multipliers
      let speedFactor = courier.speedFactor;
      if (input.express) {
        speedFactor *= 0.65;
        baseCharge *= 1.4;
        weightCharge *= 1.2;
      }

      // Transit days estimation
      let transitDays = Math.ceil((distance / 2200) * speedFactor);
      transitDays = Math.max(courier.minDays, transitDays);
      if (transitDays > 14) {
        transitDays = 14;
      }

      // Taxes (18% GST/VAT equivalent for export shipment fees)
      const subtotal = baseCharge + weightCharge + distanceCharge + insuranceCharge + totalPackagingCharge + pickupFee;
      const taxes = Math.round(subtotal * 0.18 * 100) / 100;
      const total = Math.round(subtotal + taxes);

      estimates.push({
        id: courier.id,
        name: courier.name,
        estimatedPrice: total,
        estimatedDays: transitDays,
        reliabilityScore: courier.reliabilityScore,
        trackingAvailable: courier.tracking,
        insuranceAvailable: courier.insurance,
        pickupAvailable: courier.pickup,
        breakdown: {
          baseCharge: Math.round(baseCharge * 100) / 100,
          weightCharge: Math.round(weightCharge * 100) / 100,
          distanceCharge: Math.round(distanceCharge * 100) / 100,
          insuranceCharge: Math.round(insuranceCharge * 100) / 100,
          packagingCharge: Math.round(totalPackagingCharge * 100) / 100,
          pickupFee: Math.round(pickupFee * 100) / 100,
          taxes: Math.round(taxes * 100) / 100,
          total: total
        },
        currencySymbol
      });
    }
  }

  // Sort and apply recommendation badges
  if (estimates.length > 0) {
    const sortedByPrice = [...estimates].sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    const cheapestId = sortedByPrice[0].id;

    const sortedBySpeed = [...estimates].sort((a, b) => {
      if (a.estimatedDays === b.estimatedDays) {
        return b.reliabilityScore - a.reliabilityScore;
      }
      return a.estimatedDays - b.estimatedDays;
    });
    const fastestId = sortedBySpeed[0].id;

    const sortedByValue = [...estimates].sort((a, b) => {
      const valA = (a.reliabilityScore * 1000) / ((a.estimatedPrice / 100) * a.estimatedDays);
      const valB = (b.reliabilityScore * 1000) / ((b.estimatedPrice / 100) * b.estimatedDays);
      return valB - valA;
    });
    const valueId = sortedByValue[0].id;

    for (const est of estimates) {
      if (est.id === cheapestId) {
        est.recommendationBadge = "cheapest";
      } else if (est.id === fastestId) {
        est.recommendationBadge = "fastest";
      } else if (est.id === valueId) {
        est.recommendationBadge = "value";
      } else {
        est.recommendationBadge = null;
      }
    }
  }

  return estimates;
}
