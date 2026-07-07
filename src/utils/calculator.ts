// src/utils/calculator.ts

// Coordinates for major Indian cities to calculate relative distances (lat/lng-based)
export interface City {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const CITIES: Record<string, City> = {
  "Mumbai": { name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  "Delhi": { name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
  "Bengaluru": { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  "Pune": { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  "Kolkata": { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  "Chennai": { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  "Hyderabad": { name: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
  "Ahmedabad": { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  "Jammu": { name: "Jammu", state: "Jammu and Kashmir", lat: 32.7266, lng: 74.8570 },
  "Guwahati": { name: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  "Patna": { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  "Jaipur": { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 }
};

// Supported international countries with zone pricing factor and distance in km
export interface Country {
  name: string;
  code: string;
  distanceKm: number;
  zoneFactor: number;
}

export const COUNTRIES: Record<string, Country> = {
  "United States": { name: "United States", code: "US", distanceKm: 13500, zoneFactor: 1.85 },
  "United Kingdom": { name: "United Kingdom", code: "GB", distanceKm: 7200, zoneFactor: 1.30 },
  "United Arab Emirates": { name: "United Arab Emirates", code: "AE", distanceKm: 2000, zoneFactor: 0.75 },
  "Canada": { name: "Canada", code: "CA", distanceKm: 11500, zoneFactor: 1.95 },
  "Australia": { name: "Australia", code: "AU", distanceKm: 7800, zoneFactor: 1.45 },
  "Singapore": { name: "Singapore", code: "SG", distanceKm: 3700, zoneFactor: 0.85 },
  "Germany": { name: "Germany", code: "DE", distanceKm: 6500, zoneFactor: 1.25 },
  "Japan": { name: "Japan", code: "JP", distanceKm: 6000, zoneFactor: 1.35 },
  "Saudi Arabia": { name: "Saudi Arabia", code: "SA", distanceKm: 3000, zoneFactor: 0.90 }
};

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
  pickupCity: string;
  deliveryCity?: string;      // empty if international
  deliveryCountry?: string;   // empty if domestic
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
  notAvailableReason?: string;
}

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

// Domestic courier configurations
interface CourierConfig {
  id: string;
  name: string;
  reliabilityScore: number;
  tracking: boolean;
  insurance: boolean;
  pickup: boolean;
  baseRate: number;            // up to 0.5kg
  perAdditionalHalfKgRate: number; // rate per 0.5kg after the first 0.5kg
  distanceRatePer500Km: number;    // distance charge per 500km
  speedFactor: number;         // time scaling: lower is faster
  minDays: number;
  maxWeightAllowed: number;    // in kg
  localOnly?: boolean;
}

const DOMESTIC_COURIER_CONFIGS: CourierConfig[] = [
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
    perAdditionalHalfKgRate: 35, // Treated as base + per kg here
    distanceRatePer500Km: 150,    // High distance charge
    speedFactor: 0.4,
    minDays: 1,
    maxWeightAllowed: 2000,
    localOnly: true
  },
  {
    id: "local-packers",
    name: "Generic Local Packers & Movers",
    reliabilityScore: 3.8,
    tracking: false,
    insurance: true,
    pickup: true,
    baseRate: 1500,
    perAdditionalHalfKgRate: 8,
    distanceRatePer500Km: 60,
    speedFactor: 1.5,
    minDays: 4,
    maxWeightAllowed: 5000
  }
];

// International courier configurations
interface IntlCourierConfig {
  id: string;
  name: string;
  reliabilityScore: number;
  tracking: boolean;
  insurance: boolean;
  pickup: boolean;
  baseRate: number;            // up to 0.5kg
  perAdditionalHalfKgRate: number; // rate per 0.5kg after the first 0.5kg
  distanceRatePer2000Km: number;   // distance charge per 2000km
  speedFactor: number;
  minDays: number;
  maxWeightAllowed: number;    // in kg
}

const INTL_COURIER_CONFIGS: IntlCourierConfig[] = [
  {
    id: "dhl-intl",
    name: "DHL Express International",
    reliabilityScore: 4.9,
    tracking: true,
    insurance: true,
    pickup: true,
    baseRate: 1600,
    perAdditionalHalfKgRate: 550,
    distanceRatePer2000Km: 180,
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
    baseRate: 1450,
    perAdditionalHalfKgRate: 520,
    distanceRatePer2000Km: 170,
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
    baseRate: 1350,
    perAdditionalHalfKgRate: 490,
    distanceRatePer2000Km: 165,
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
    baseRate: 950,
    perAdditionalHalfKgRate: 320,
    distanceRatePer2000Km: 110,
    speedFactor: 0.65,
    minDays: 4,
    maxWeightAllowed: 100
  },
  {
    id: "india-post-ems",
    name: "India Post (EMS International)",
    reliabilityScore: 4.0,
    tracking: true,
    insurance: true,
    pickup: false,
    baseRate: 700,
    perAdditionalHalfKgRate: 220,
    distanceRatePer2000Km: 80,
    speedFactor: 0.85,
    minDays: 5,
    maxWeightAllowed: 35
  }
];

export function getEstimates(input: ShippingInput): CourierEstimate[] {
  const pickup = CITIES[input.pickupCity];
  if (!pickup) return [];

  // Determine destination
  let isInternational = input.type === "international";
  let distance = 0;
  let zoneFactor = 1.0;
  let isSameCity = false;
  let zone: "LOCAL" | "METRO" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL" = "NATIONAL";

  if (isInternational) {
    if (!input.deliveryCountry) return [];
    const country = COUNTRIES[input.deliveryCountry];
    if (!country) return [];
    distance = country.distanceKm;
    zoneFactor = country.zoneFactor;
    zone = "INTERNATIONAL";
  } else {
    if (!input.deliveryCity) return [];
    const delivery = CITIES[input.deliveryCity];
    if (!delivery) return [];
    distance = calculateDistance(pickup.lat, pickup.lng, delivery.lat, delivery.lng);
    isSameCity = input.pickupCity === input.deliveryCity;

    const metroList = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune"];
    if (isSameCity) {
      zone = "LOCAL";
    } else if (metroList.includes(input.pickupCity) && metroList.includes(input.deliveryCity)) {
      zone = "METRO";
    } else if (pickup.state === delivery.state) {
      zone = "REGIONAL";
    } else {
      zone = "NATIONAL";
    }
  }

  // Multi-parcel weight and category checks
  let totalBillingWeight = 0;
  let totalPackagingCharge = 0;
  let rawActualWeightSum = 0;

  for (const parcel of input.parcels) {
    let weightInKg = parcel.weight;
    if (parcel.weightUnit === "g") {
      weightInKg = parcel.weight / 1000;
    }
    rawActualWeightSum += weightInKg;

    // Calculate volumetric weight
    let volumetricWeight = 0;
    if (parcel.length && parcel.width && parcel.height) {
      volumetricWeight = (parcel.length * parcel.width * parcel.height) / 5000;
    }

    // Individual parcel billing weight
    const billingWeight = Math.max(weightInKg, volumetricWeight);
    
    // Round individual billing weight up to the nearest 0.5 kg slab for courier accuracy
    const roundedBillingWeight = Math.max(0.5, Math.ceil(billingWeight * 2) / 2);
    totalBillingWeight += roundedBillingWeight;

    // Category packaging lookup
    const cat = CATEGORIES.find(c => c.id === parcel.category);
    let packagingCharge = cat ? cat.basePackaging : 30;
    if (parcel.category === "electronics") {
      packagingCharge = 250;
    } else if (parcel.category === "fragile") {
      packagingCharge = 350;
    }
    totalPackagingCharge += packagingCharge;
  }

  const estimates: CourierEstimate[] = [];

  if (!isInternational) {
    // Process Domestic Carriers
    for (const courier of DOMESTIC_COURIER_CONFIGS) {
      // 1. Capacity filter
      if (totalBillingWeight > courier.maxWeightAllowed) continue;
      if (courier.localOnly && distance > 250 && !isSameCity) continue;

      // Heavy load optimizations: speed post / xpressbees don't accept parcels > 40kg total
      if (totalBillingWeight > 40 && (courier.id === "india-post" || courier.id === "xpressbees")) {
        continue;
      }

      // 2. Base Charge
      let baseCharge = courier.baseRate;

      // 3. Weight Surcharge
      let weightCharge = 0;
      if (totalBillingWeight > 0.5) {
        const additionalSlabs = (totalBillingWeight - 0.5) / 0.5;
        if (courier.id === "porter") {
          // Porter is flat per kg (perAdditionalHalfKgRate is treated as rate per kg)
          weightCharge = totalBillingWeight * courier.perAdditionalHalfKgRate;
        } else if (courier.id === "local-packers") {
          // Packers also bill per kg
          weightCharge = totalBillingWeight * courier.perAdditionalHalfKgRate * 2;
        } else {
          weightCharge = additionalSlabs * courier.perAdditionalHalfKgRate;
        }
      }

      // Special category adjustments based on the dominant/first category
      const mainCategory = input.parcels[0]?.category;
      if (mainCategory === "documents" && totalBillingWeight < 0.5) {
        baseCharge *= 0.6;
        weightCharge = 0;
      } else if (mainCategory === "fragile") {
        baseCharge *= 1.25;
      } else if (mainCategory === "bike") {
        baseCharge += 500; // loading fee
      }

      // 4. Distance Charge
      let distanceCharge = 0;
      if (isSameCity) {
        distanceCharge = courier.id === "porter" ? distance * 30 : 10;
      } else {
        if (courier.id === "porter") continue; // Porter cannot ship inter-city
        distanceCharge = (distance / 500) * courier.distanceRatePer500Km;
      }

      // Zone Adjustments for Domestic Pricing Accuracy
      if (zone === "METRO") {
        baseCharge *= 1.1; // Metro premium air lanes
      } else if (zone === "REGIONAL") {
        distanceCharge *= 0.9; // Regional transit discount
      } else if (zone === "NATIONAL") {
        distanceCharge *= 1.25; // Remote area distance surcharge
      }

      // 5. Insurance Charge (1.2% of estimated value or flat charge if checked)
      let insuranceCharge = 0;
      if (input.insurance && courier.insurance) {
        insuranceCharge = Math.max(80, totalBillingWeight * 18);
      }

      // 6. Pickup Surcharge
      let pickupFee = 0;
      if (input.pickupRequired && courier.pickup) {
        pickupFee = totalBillingWeight > 30 ? 150 : 50;
      }

      // 7. Express multipliers
      let speedFactor = courier.speedFactor;
      if (input.express) {
        speedFactor *= 0.7;
        baseCharge *= 1.35;
        weightCharge *= 1.15;
      }

      // Calculate transit days
      let transitDays = Math.ceil((distance / 420) * speedFactor);
      if (isSameCity) {
        transitDays = courier.id === "porter" || courier.id === "blue-dart" ? 1 : 2;
      }
      transitDays = Math.max(courier.minDays, transitDays);
      if (transitDays > 10) {
        transitDays = 10;
      }

      // Taxes (18% IGST)
      const subtotal = baseCharge + weightCharge + distanceCharge + insuranceCharge + totalPackagingCharge + pickupFee;
      const taxes = Math.round(subtotal * 0.18);
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
          baseCharge: Math.round(baseCharge),
          weightCharge: Math.round(weightCharge),
          distanceCharge: Math.round(distanceCharge),
          insuranceCharge: Math.round(insuranceCharge),
          packagingCharge: Math.round(totalPackagingCharge),
          pickupFee: Math.round(pickupFee),
          taxes: taxes,
          total: total
        }
      });
    }
  } else {
    // Process International Carriers
    for (const courier of INTL_COURIER_CONFIGS) {
      if (totalBillingWeight > courier.maxWeightAllowed) continue;

      // EMS International limit
      if (totalBillingWeight > 30 && courier.id === "india-post-ems") continue;

      // 2. Base Charge adjusted by Country Zone Factor
      let baseCharge = courier.baseRate * zoneFactor;

      // 3. Weight Surcharge (rounds up in 0.5kg steps)
      let weightCharge = 0;
      if (totalBillingWeight > 0.5) {
        const additionalSlabs = (totalBillingWeight - 0.5) / 0.5;
        weightCharge = additionalSlabs * courier.perAdditionalHalfKgRate * zoneFactor;
      }

      // Special category adjustments
      const mainCategory = input.parcels[0]?.category;
      if (mainCategory === "documents" && totalBillingWeight < 0.5) {
        baseCharge *= 0.75;
        weightCharge = 0;
      } else if (mainCategory === "fragile") {
        baseCharge *= 1.35;
      }

      // 4. Distance Charge (calculated via long distance coordinates)
      const distanceCharge = (distance / 2000) * courier.distanceRatePer2000Km * zoneFactor;

      // 5. Insurance Charge
      let insuranceCharge = 0;
      if (input.insurance && courier.insurance) {
        insuranceCharge = Math.max(250, totalBillingWeight * 70);
      }

      // 6. Pickup Surcharge
      let pickupFee = 0;
      if (input.pickupRequired && courier.pickup) {
        pickupFee = totalBillingWeight > 30 ? 300 : 100;
      }

      // 7. Express speed multipliers
      let speedFactor = courier.speedFactor;
      if (input.express) {
        speedFactor *= 0.65;
        baseCharge *= 1.4; // 40% express premium international
        weightCharge *= 1.2;
      }

      // Calculate international transit days
      let transitDays = Math.ceil((distance / 2200) * speedFactor);
      transitDays = Math.max(courier.minDays, transitDays);
      if (transitDays > 14) {
        transitDays = 14;
      }

      // Taxes (18% GST applies to international shipments leaving India)
      const subtotal = baseCharge + weightCharge + distanceCharge + insuranceCharge + totalPackagingCharge + pickupFee;
      const taxes = Math.round(subtotal * 0.18);
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
          baseCharge: Math.round(baseCharge),
          weightCharge: Math.round(weightCharge),
          distanceCharge: Math.round(distanceCharge),
          insuranceCharge: Math.round(insuranceCharge),
          packagingCharge: Math.round(totalPackagingCharge),
          pickupFee: Math.round(pickupFee),
          taxes: taxes,
          total: total
        }
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
