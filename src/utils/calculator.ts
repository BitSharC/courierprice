// src/utils/calculator.ts

import { COUNTRIES_DATA } from './countryData.ts';
import couriersData from '../data/couriers.json' with { type: 'json' };
import pricingData from '../data/pricing.json' with { type: 'json' };
import countryRoutingData from '../data/country-routing.json' with { type: 'json' };
import distanceZonesData from '../data/distance-zones.json' with { type: 'json' };
import recRulesData from '../data/recommendation-rules.json' with { type: 'json' };

// Type definitions
export interface Courier {
  id: string;
  company: string;
  serviceName: string;
  deliveryDays: { min: number; max: number };
  reliabilityScore: number;
  features: { tracking: boolean; insurance: boolean; pickup: boolean };
  tags: string[];
  logo: string;
  website: string;
}

export interface PricingCharges {
  flat?: number;
  standard?: number;
  heavy?: number;
  threshold?: number;
}

export interface PricingRule {
  baseRate: number;
  baseWeightLimit: number;
  perUnitWeightCost: number;
  pickupCharges: PricingCharges;
  expressMultiplier: number;
  fuelSurcharge: number;
  insuranceRate: number;
  maxWeight: number;
  currency: string;
  domesticMultiplier?: number;
  internationalMultiplier?: number;
}

export interface DistanceBand {
  name: string;
  min: number;
  max: number;
  multiplier: number;
}

export interface DistanceZones {
  domestic: DistanceBand[];
  international: Record<string, number>;
  internationalRoutes: Record<string, string>;
}

export interface ParcelInput {
  weight: number;
  weightUnit: "kg" | "g";
  category: string;
  length?: number; // cm
  width?: number;  // cm
  height?: number; // cm
  declaredValue?: number; // monetary value in display currency
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
  fuelCharge: number;
  pickupFee: number;
  insuranceCharge: number;
  expressCharge: number;
  packagingCharge: number; // Keep as 0 for compatibility
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
  website: string;
  logo: string;
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

// Cast imports to strictly defined typed objects
const COURIERS = couriersData as Courier[];
const PRICING = pricingData as any;
const ROUTING = countryRoutingData as any;
const DISTANCE_ZONES = distanceZonesData as DistanceZones;
const REC_RULES = recRulesData as any;

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
  
  // Coordinates fallback to country centers if state coordinates aren't defined
  const lat1 = pickupStateObj ? pickupStateObj.lat : pickupCountryObj.lat;
  const lon1 = pickupStateObj ? pickupStateObj.lng : pickupCountryObj.lng;
  const lat2 = deliveryStateObj ? deliveryStateObj.lat : deliveryCountryObj.lat;
  const lon2 = deliveryStateObj ? deliveryStateObj.lng : deliveryCountryObj.lng;
  
  const isInternational = input.type === "international";
  let distance = calculateDistance(lat1, lon1, lat2, lon2);

  // Correct distance minimum limits
  if (isInternational && distance < 500) {
    distance = 1200;
  } else if (!isInternational) {
    const isSameCity = input.pickupState === input.deliveryState && 
      (input.pickupCountry !== 'IN' || input.pickupDistrict === input.deliveryDistrict);
    if (isSameCity) {
      distance = 12;
    } else if (input.pickupState === input.deliveryState) {
      distance = 180;
    } else if (distance < 50) {
      distance = 150;
    }
  }

  // ================= Step 1: Determine Chargeable Weight =================
  let totalChargeableWeight = 0;
  let totalDeclaredValue = 0;
  let totalPhysicalWeight = 0;

  for (const parcel of input.parcels) {
    let weightInKg = parcel.weight;
    if (parcel.weightUnit === "g") {
      weightInKg = parcel.weight / 1000;
    }
    totalPhysicalWeight += weightInKg;

    // Volumetric weight
    let volumetricWeight = 0;
    if (parcel.length && parcel.width && parcel.height) {
      volumetricWeight = (parcel.length * parcel.width * parcel.height) / 5000;
    }

    const chargeableWeight = Math.max(weightInKg, volumetricWeight);
    totalChargeableWeight += chargeableWeight;
    
    // Sum declared value
    totalDeclaredValue += parcel.declaredValue || 0;
  }

  // Ensure weight is at least 0.5 kg for baseline pricing
  totalChargeableWeight = Math.max(0.5, totalChargeableWeight);

  // ================= Step 2: Determine Shipment Type & Load Compatible Couriers =================
  const compatibleCourierIds: string[] = isInternational
    ? (ROUTING.international[input.pickupCountry]?.[input.deliveryCountry] || [])
    : (ROUTING.domestic[input.pickupCountry] || []);

  const estimates: CourierEstimate[] = [];

  for (const courierId of compatibleCourierIds) {
    const courier = COURIERS.find(c => c.id === courierId);
    if (!courier) continue;

    // ================= Step 3: Load Courier Pricing Rule =================
    const rule: PricingRule | undefined = isInternational
      ? PRICING.international[`${input.pickupCountry}_TO_${input.deliveryCountry}`]?.[courierId]
      : PRICING.domestic[input.pickupCountry]?.[courierId];

    if (!rule) continue;

    // Check maximum weight limit
    if (totalChargeableWeight > rule.maxWeight) continue;

    // Load exchange rates and calculate conversion factor
    const exchangeRates = PRICING.exchangeRates || {};
    const ruleCurrency = rule.currency || 'USD';
    const rateConversion = (exchangeRates[currencyCode] || 1.0) / (exchangeRates[ruleCurrency] || 1.0);

    // ================= Step 4: Calculate Base Shipping Cost =================
    const weightChargeInRuleCurrency = Math.max(totalChargeableWeight - rule.baseWeightLimit, 0) * rule.perUnitWeightCost;
    const baseCostInRuleCurrency = rule.baseRate + weightChargeInRuleCurrency;
    
    // Convert to display currency
    const baseRateConverted = rule.baseRate * rateConversion;
    const weightChargeConverted = weightChargeInRuleCurrency * rateConversion;
    let baseCost = baseCostInRuleCurrency * rateConversion;

    // ================= Step 5: Apply Distance Multiplier =================
    let distanceMultiplier = 1.0;
    if (!isInternational) {
      const band = DISTANCE_ZONES.domestic.find(b => distance >= b.min && distance < b.max);
      distanceMultiplier = band ? band.multiplier : 1.70;
    } else {
      const routeKey = `${input.pickupCountry}_TO_${input.deliveryCountry}`;
      const classification = DISTANCE_ZONES.internationalRoutes[routeKey];
      distanceMultiplier = classification ? (DISTANCE_ZONES.international[classification] || 2.0) : 2.0;
    }
    const distanceCharge = baseCost * (distanceMultiplier - 1);
    let currentCost = baseCost * distanceMultiplier;

    // ================= Step 5b: Apply Domestic / International Multiplier =================
    const routeMultiplier = isInternational 
      ? (rule.internationalMultiplier ?? 1.0) 
      : (rule.domesticMultiplier ?? 1.0);
    currentCost *= routeMultiplier;

    // ================= Step 6: Apply Fuel Surcharge =================
    const fuelSurcharge = rule.fuelSurcharge !== undefined 
      ? rule.fuelSurcharge 
      : (isInternational ? 0.12 : 0.07);
    const fuelCharge = currentCost * fuelSurcharge;
    currentCost *= (1 + fuelSurcharge);

    // ================= Step 7: Apply Pickup Charges =================
    let pickupFee = 0;
    if (input.pickupRequired && courier.features.pickup) {
      const pc = rule.pickupCharges;
      if (typeof pc === 'number') {
        pickupFee = pc;
      } else if (pc && pc.flat !== undefined) {
        pickupFee = pc.flat;
      } else if (pc && pc.standard !== undefined && pc.heavy !== undefined && pc.threshold !== undefined) {
        pickupFee = totalChargeableWeight > pc.threshold ? pc.heavy : pc.standard;
      }
      pickupFee = pickupFee * rateConversion;
    }
    currentCost += pickupFee;

    // ================= Step 8: Apply Insurance =================
    let insuranceCharge = 0;
    if (input.insurance && courier.features.insurance) {
      const rate = rule.insuranceRate !== undefined ? rule.insuranceRate : 0.01;
      const calculatedInsurance = totalDeclaredValue * rate;
      const minInsurance = 5.0 * rateConversion; // Currency dependent min fee (5 in rule currency)
      insuranceCharge = Math.max(calculatedInsurance, minInsurance);
    }
    currentCost += insuranceCharge;

    // ================= Step 9: Apply Express Multiplier =================
    let expressCharge = 0;
    if (input.express) {
      const expressMult = rule.expressMultiplier !== undefined ? rule.expressMultiplier : 1.30;
      expressCharge = currentCost * (expressMult - 1);
      currentCost *= expressMult;
    }

    // ================= Step 10: Apply Taxes =================
    const taxes = currentCost * 0.18; // Final tax layer

    // ================= Step 11: Return Estimated Price =================
    const total = currentCost + taxes;

    // Estimate transit days based on speed tags
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
    }

    let transitDays = Math.ceil((distance / (isInternational ? 2200 : 420)) * speedFactor);
    if (!isInternational && distance <= 12) {
      transitDays = (courier.id.includes("porter") || courier.id.includes("blue-dart") || courier.tags.includes("fastest")) ? 1 : 2;
    }
    transitDays = Math.max(courier.deliveryDays.min, transitDays);
    if (transitDays > courier.deliveryDays.max) {
      transitDays = courier.deliveryDays.max;
    }

    estimates.push({
      id: courier.id,
      name: courier.serviceName ? `${courier.company} ${courier.serviceName}` : courier.company,
      estimatedPrice: Math.round(total),
      estimatedDays: transitDays,
      reliabilityScore: courier.reliabilityScore,
      trackingAvailable: courier.features.tracking,
      insuranceAvailable: courier.features.insurance,
      pickupAvailable: courier.features.pickup,
      website: courier.website,
      logo: courier.logo,
      breakdown: {
        baseCharge: Math.round(baseRateConverted * 100) / 100,
        weightCharge: Math.round(weightChargeConverted * 100) / 100,
        distanceCharge: Math.round(distanceCharge * 100) / 100,
        fuelCharge: Math.round(fuelCharge * 100) / 100,
        pickupFee: Math.round(pickupFee * 100) / 100,
        insuranceCharge: Math.round(insuranceCharge * 100) / 100,
        expressCharge: Math.round(expressCharge * 100) / 100,
        packagingCharge: 0,
        taxes: Math.round(taxes * 100) / 100,
        total: Math.round(total)
      },
      currencySymbol
    });
  }

  // ================= Recommendation Engine Matchmaking =================
  if (estimates.length > 0) {
    const minPrice = Math.min(...estimates.map(e => e.estimatedPrice));
    const minDays = Math.min(...estimates.map(e => e.estimatedDays));

    const scoredEstimates = estimates.map(est => {
      const courier = COURIERS.find(c => c.id === est.id)!;
      const priceScore = minPrice / est.estimatedPrice;
      const speedScore = minDays / est.estimatedDays;
      const reliabilityScore = est.reliabilityScore / 10;

      // Score for Cheapest profile
      const rCheapest = REC_RULES.cheapest;
      let cheapestScore = (priceScore * rCheapest.priceWeight) + 
                           (speedScore * rCheapest.speedWeight) + 
                           (reliabilityScore * rCheapest.reliabilityWeight);
      if (rCheapest.requiredTags && rCheapest.requiredTags.some((t: string) => courier.tags.includes(t))) {
        cheapestScore *= 1.2;
      }

      // Score for Fastest profile
      const rFastest = REC_RULES.fastest;
      let fastestScore = (priceScore * rFastest.priceWeight) + 
                          (speedScore * rFastest.speedWeight) + 
                          (reliabilityScore * rFastest.reliabilityWeight);
      if (rFastest.requiredTags && rFastest.requiredTags.some((t: string) => courier.tags.includes(t))) {
        fastestScore *= 1.2;
      }

      // Score for Reliable (Value) profile
      const rReliable = REC_RULES.reliable;
      let valueScore = (priceScore * rReliable.priceWeight) + 
                        (speedScore * rReliable.speedWeight) + 
                        (reliabilityScore * rReliable.reliabilityWeight);
      if (rReliable.requiredTags && rReliable.requiredTags.some((t: string) => courier.tags.includes(t))) {
        valueScore *= 1.2;
      }

      return {
        id: est.id,
        cheapestScore,
        fastestScore,
        valueScore
      };
    });

    const cheapestId = [...scoredEstimates].sort((a, b) => b.cheapestScore - a.cheapestScore)[0].id;
    const fastestId = [...scoredEstimates].sort((a, b) => b.fastestScore - a.fastestScore)[0].id;
    const valueId = [...scoredEstimates].sort((a, b) => b.valueScore - a.valueScore)[0].id;

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
