// src/utils/calculator.ts

import { COUNTRIES_DATA, type StateRegion } from './countryData';
import { COURIER_SERVICES, DOMESTIC_PRICING_RULES, INTERNATIONAL_PRICING_RULES } from './courierData';

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

  const rateConversion = USD_TO_CURRENCY[currencyCode] || 1.0;

  // Filter COURIER_SERVICES based on parameters
  const activeCouriers = COURIER_SERVICES.filter(courier => {
    if (isInternational) {
      return (
        courier.type === "international" &&
        courier.originCountry === input.pickupCountry &&
        courier.supportedRoutes.includes(input.deliveryCountry)
      );
    } else {
      return (
        courier.type === "domestic" &&
        courier.originCountry === input.pickupCountry
      );
    }
  });

  for (const courier of activeCouriers) {
    if (totalBillingWeight > courier.maxWeightAllowed) continue;

    // Heavy load optimizations
    if (totalBillingWeight > 40 && (courier.id.includes("post") || courier.id.includes("xpressbees"))) {
      continue;
    }

    const intlRouteKey = `${input.pickupCountry}_TO_${input.deliveryCountry}`;
    const rule = !isInternational
      ? DOMESTIC_PRICING_RULES[input.pickupCountry]?.[courier.id]
      : INTERNATIONAL_PRICING_RULES[intlRouteKey]?.[courier.id];

    // Base Charge (For international, rates in courierData are in USD; for domestic, they are in local currency)
    let baseCharge = 0;
    let weightCharge = 0;

    if (rule) {
      baseCharge = rule.baseRate;
      if (totalBillingWeight > rule.baseWeightLimit) {
        const additionalWeight = totalBillingWeight - rule.baseWeightLimit;
        weightCharge = additionalWeight * rule.perUnitWeightCost;
      }
    } else {
      baseCharge = isInternational ? courier.baseRate * rateConversion : courier.baseRate;
      // Weight Surcharge
      if (totalBillingWeight > 0.5) {
        const additionalSlabs = (totalBillingWeight - 0.5) / 0.5;
        const rawWeightRate = isInternational ? courier.perAdditionalHalfKgRate * rateConversion : courier.perAdditionalHalfKgRate;
        if (courier.id.includes("porter")) {
          weightCharge = totalBillingWeight * rawWeightRate;
        } else {
          weightCharge = additionalSlabs * rawWeightRate;
        }
      }
    }

    // Special category adjustments
    const mainCategory = input.parcels[0]?.category;
    if (mainCategory === "documents" && totalBillingWeight < 0.5) {
      baseCharge *= isInternational ? 0.75 : 0.6;
      weightCharge = 0;
    } else if (mainCategory === "fragile") {
      baseCharge *= isInternational ? 1.35 : 1.25;
    } else if (!isInternational && mainCategory === "bike") {
      const bikeLoading = currencyCode === "INR" ? 500 : 15;
      baseCharge += bikeLoading;
    }

    // Distance Charge
    let distanceCharge = 0;
    if (!isInternational) {
      if (isSameCity) {
        distanceCharge = courier.id.includes("porter")
          ? distance * (currencyCode === "INR" ? 30 : 0.8)
          : (currencyCode === "INR" ? 10 : 0.5);
      } else {
        if (courier.id.includes("porter")) continue;
        distanceCharge = (distance / 500) * courier.distanceRate;
      }

      // Zone Adjustments
      if (zone === "METRO") {
        baseCharge *= 1.1;
      } else if (zone === "REGIONAL") {
        distanceCharge *= 0.9;
      } else if (zone === "NATIONAL") {
        distanceCharge *= 1.25;
      }
    } else {
      distanceCharge = (distance / 2000) * courier.distanceRate * rateConversion;
    }

    // Insurance Surcharge
    let insuranceCharge = 0;
    if (input.insurance && courier.features.insurance) {
      if (!isInternational) {
        const minInsurance = currencyCode === "INR" ? 80 : 2.5;
        const weightMult = currencyCode === "INR" ? 18 : 0.5;
        insuranceCharge = Math.max(minInsurance, totalBillingWeight * weightMult);
      } else {
        const minInsurance = 5.0 * rateConversion;
        const weightMult = 1.0 * rateConversion;
        insuranceCharge = Math.max(minInsurance, totalBillingWeight * weightMult);
      }
    }

    // Home Pickup Surcharge
    let pickupFee = 0;
    if (input.pickupRequired && courier.features.pickup) {
      if (rule) {
        pickupFee = rule.pickupSurcharge;
      } else if (!isInternational) {
        if (totalBillingWeight > 30) {
          pickupFee = currencyCode === "INR" ? 150 : 5.0;
        } else {
          pickupFee = currencyCode === "INR" ? 50 : 2.0;
        }
      } else {
        pickupFee = (totalBillingWeight > 30 ? 6.0 : 3.0) * rateConversion;
      }
    }

    // Express Surcharges / Speed Factors
    let speedFactor = 1.0;
    if (courier.tags.includes("fastest")) {
      speedFactor = 0.45;
    } else if (courier.tags.includes("premium")) {
      speedFactor = 0.6;
    } else if (courier.tags.includes("cheapest")) {
      speedFactor = isInternational ? 1.25 : 1.2;
    }

    if (input.express) {
      speedFactor *= isInternational ? 0.65 : 0.7;
      if (rule) {
        const expressMult = rule.expressMultiplier ?? 1.0;
        baseCharge *= expressMult;
        weightCharge *= expressMult;
      } else {
        baseCharge *= isInternational ? 1.4 : 1.35;
        weightCharge *= isInternational ? 1.2 : 1.15;
      }
    }

    // Transit days estimation
    let transitDays = Math.ceil((distance / (isInternational ? 2200 : 420)) * speedFactor);
    if (!isInternational && isSameCity) {
      transitDays = (courier.id.includes("porter") || courier.id.includes("blue-dart") || courier.id.includes("dpd-local") || courier.tags.includes("fastest")) ? 1 : 2;
    }
    transitDays = Math.max(courier.deliveryDays.min, transitDays);
    if (transitDays > courier.deliveryDays.max) {
      transitDays = courier.deliveryDays.max;
    }

    // Taxes (18% GST/VAT equivalent)
    const subtotal = baseCharge + weightCharge + distanceCharge + insuranceCharge + totalPackagingCharge + pickupFee;
    const taxes = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round(subtotal + taxes);

    estimates.push({
      id: courier.id,
      name: `${courier.company} ${courier.serviceName}`,
      estimatedPrice: total,
      estimatedDays: transitDays,
      reliabilityScore: courier.reliabilityScore,
      trackingAvailable: courier.features.tracking,
      insuranceAvailable: courier.features.insurance,
      pickupAvailable: courier.features.pickup,
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
