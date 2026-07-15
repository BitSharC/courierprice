// scripts/splitData.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COURIER_SERVICES, DOMESTIC_PRICING_RULES, INTERNATIONAL_PRICING_RULES } from '../src/utils/courierData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../src/data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Company URL mappings
const COMPANY_WEBSITES: Record<string, string> = {
  "UPS": "https://www.ups.com",
  "FedEx": "https://www.fedex.com",
  "USPS": "https://www.usps.com",
  "OnTrac": "https://www.ontrac.com",
  "LSO": "https://www.lso.com",
  "Royal Mail": "https://www.royalmail.com",
  "DPD Local": "https://www.dpdlocal.co.uk",
  "Evri": "https://www.evri.com",
  "DHL": "https://www.dhl.com",
  "ParcelForce": "https://www.parcelforce.com",
  "Canada Post": "https://www.canadapost-postescanada.ca",
  "Purolator": "https://www.purolator.com",
  "Canpar": "https://www.canpar.com",
  "Australia Post": "https://auspost.com.au",
  "Sendle": "https://www.sendle.com",
  "CouriersPlease": "https://www.couriersplease.com.au",
  "StarTrack": "https://startrack.com.au",
  "Hermes DE": "https://www.myhermes.de",
  "DPD DE": "https://www.dpd.com/de",
  "GLS": "https://gls-group.com",
  "Aramex": "https://www.aramex.com",
  "Emirates Post": "https://www.emiratespost.ae",
  "Fetchr": "https://www.fetchr.us",
  "India Post": "https://www.indiapost.gov.in",
  "DTDC": "https://www.dtdc.in",
  "Delhivery": "https://www.delhivery.com",
  "Professional": "https://www.tpcindia.com",
  "Professional Couriers": "https://www.tpcindia.com",
  "The Professional Couriers": "https://www.tpcindia.com",
  "Blue Dart": "https://www.bluedart.com",
  "Porter": "https://www.porter.in",
  "Garudavega": "https://www.garudavega.com",
  "XpressBees": "https://www.xpressbees.com",
  "Shadowfax": "https://www.shadowfax.in",
  "Ecom Express": "https://ecomexpress.in"
};

// 1. Generate couriers.json
const couriers = COURIER_SERVICES.map(c => {
  const logoName = c.company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const website = COMPANY_WEBSITES[c.company] || `https://www.${logoName}.com`;
  return {
    id: c.id,
    company: c.company,
    serviceName: c.serviceName,
    deliveryDays: c.deliveryDays,
    reliabilityScore: c.reliabilityScore,
    features: c.features,
    tags: c.tags,
    logo: `/assets/logos/${logoName}.svg`,
    website: website
  };
});

fs.writeFileSync(
  path.join(DATA_DIR, 'couriers.json'),
  JSON.stringify(couriers, null, 2),
  'utf-8'
);
console.log('Generated couriers.json');

// 2. Generate country-routing.json
const routing = {
  domestic: {} as Record<string, string[]>,
  international: {} as Record<string, Record<string, string[]>>
};

COURIER_SERVICES.forEach(c => {
  if (c.type === 'domestic') {
    if (!routing.domestic[c.originCountry]) {
      routing.domestic[c.originCountry] = [];
    }
    routing.domestic[c.originCountry].push(c.id);
  } else {
    if (!routing.international[c.originCountry]) {
      routing.international[c.originCountry] = {};
    }
    c.supportedRoutes.forEach(dest => {
      if (!routing.international[c.originCountry][dest]) {
        routing.international[c.originCountry][dest] = [];
      }
      routing.international[c.originCountry][dest].push(c.id);
    });
  }
});

fs.writeFileSync(
  path.join(DATA_DIR, 'country-routing.json'),
  JSON.stringify(routing, null, 2),
  'utf-8'
);
console.log('Generated country-routing.json');

// 3. Generate pricing.json
const pricing = {
  exchangeRates: {
    "INR": 83.0,
    "USD": 1.0,
    "GBP": 0.79,
    "CAD": 1.37,
    "AUD": 1.50,
    "EUR": 0.92,
    "AED": 3.67
  },
  domestic: {} as Record<string, Record<string, any>>,
  international: {} as Record<string, Record<string, any>>
};

COURIER_SERVICES.forEach(c => {
  const origin = c.originCountry;
  const isINR = origin === 'IN';
  
  if (c.type === 'domestic') {
    if (!pricing.domestic[origin]) {
      pricing.domestic[origin] = {};
    }
    
    // Check for existing rule
    const rule = DOMESTIC_PRICING_RULES[origin]?.[c.id];
    let baseRate = c.baseRate;
    let baseWeightLimit = 0.5;
    let perUnitWeightCost = c.perAdditionalHalfKgRate * 2;
    let pickupCharges: any = isINR 
      ? { standard: 50.0, heavy: 150.0, threshold: 30 } 
      : { standard: 2.0, heavy: 5.0, threshold: 30 };
    let expressMultiplier = 1.35; // Default for domestic in old code
    
    if (rule) {
      baseRate = rule.baseRate;
      baseWeightLimit = rule.baseWeightLimit;
      perUnitWeightCost = rule.perUnitWeightCost;
      if (rule.pickupSurcharge !== undefined) {
        pickupCharges = { flat: rule.pickupSurcharge };
      }
      if (rule.expressMultiplier !== undefined) {
        expressMultiplier = rule.expressMultiplier;
      }
    }
    
    pricing.domestic[origin][c.id] = {
      baseRate,
      baseWeightLimit,
      perUnitWeightCost,
      pickupCharges,
      expressMultiplier,
      fuelSurcharge: 0.07, // Default domestic fuel surcharge
      insuranceRate: 0.01, // Default insurance rate
      maxWeight: c.maxWeightAllowed,
      currency: isINR ? 'INR' : (origin === 'GB' ? 'GBP' : (origin === 'CA' ? 'CAD' : (origin === 'AU' ? 'AUD' : (origin === 'DE' ? 'EUR' : (origin === 'AE' ? 'AED' : 'USD')))))
    };
  } else {
    // International
    c.supportedRoutes.forEach(dest => {
      const routeKey = `${origin}_TO_${dest}`;
      if (!pricing.international[routeKey]) {
        pricing.international[routeKey] = {};
      }
      
      const rule = INTERNATIONAL_PRICING_RULES[routeKey]?.[c.id];
      let baseRate = c.baseRate;
      let baseWeightLimit = 0.5;
      let perUnitWeightCost = c.perAdditionalHalfKgRate * 2;
      let pickupCharges: any = { standard: 3.0, heavy: 6.0, threshold: 30 };
      let expressMultiplier = 1.40; // Default for intl in old code
      
      if (rule) {
        baseRate = rule.baseRate;
        baseWeightLimit = rule.baseWeightLimit;
        perUnitWeightCost = rule.perUnitWeightCost;
        if (rule.pickupSurcharge !== undefined) {
          pickupCharges = { flat: rule.pickupSurcharge };
        }
        if (rule.expressMultiplier !== undefined) {
          expressMultiplier = rule.expressMultiplier;
        }
      }
      
      pricing.international[routeKey][c.id] = {
        baseRate,
        baseWeightLimit,
        perUnitWeightCost,
        pickupCharges,
        expressMultiplier,
        fuelSurcharge: 0.12, // Default international fuel surcharge
        insuranceRate: 0.01, // Default insurance rate
        maxWeight: c.maxWeightAllowed,
        currency: isINR ? 'INR' : (origin === 'GB' ? 'GBP' : (origin === 'CA' ? 'CAD' : (origin === 'AU' ? 'AUD' : (origin === 'DE' ? 'EUR' : (origin === 'AE' ? 'AED' : 'USD')))))
      };
    });
  }
});

fs.writeFileSync(
  path.join(DATA_DIR, 'pricing.json'),
  JSON.stringify(pricing, null, 2),
  'utf-8'
);
console.log('Generated pricing.json');

// 4. Generate distance-zones.json
const distanceZones = {
  domestic: [
    { name: "Local", min: 0, max: 50, multiplier: 1.00 },
    { name: "Zone A", min: 50, max: 300, multiplier: 1.10 },
    { name: "Zone B", min: 300, max: 800, multiplier: 1.25 },
    { name: "Zone C", min: 800, max: 1500, multiplier: 1.45 },
    { name: "Zone D", min: 1500, max: 999999, multiplier: 1.70 }
  ],
  international: {
    neighbor: 1.20,
    same_region: 1.50,
    intercontinental: 2.00,
    long_haul: 2.50
  },
  internationalRoutes: {
    "US_TO_CA": "neighbor",
    "US_TO_GB": "intercontinental",
    "US_TO_AU": "long_haul",
    "US_TO_IN": "long_haul",
    "US_TO_DE": "intercontinental",
    "US_TO_AE": "long_haul",
    
    "GB_TO_US": "intercontinental",
    "GB_TO_DE": "neighbor",
    "GB_TO_AU": "long_haul",
    "GB_TO_IN": "long_haul",
    "GB_TO_CA": "intercontinental",
    "GB_TO_AE": "long_haul",
    
    "CA_TO_US": "neighbor",
    "CA_TO_GB": "intercontinental",
    "CA_TO_DE": "intercontinental",
    "CA_TO_AU": "long_haul",
    "CA_TO_AE": "long_haul",
    "CA_TO_IN": "long_haul",
    
    "AU_TO_US": "long_haul",
    "AU_TO_CA": "long_haul",
    "AU_TO_GB": "long_haul",
    "AU_TO_DE": "long_haul",
    "AU_TO_IN": "long_haul",
    "AU_TO_AE": "long_haul",
    
    "DE_TO_GB": "neighbor",
    "DE_TO_US": "intercontinental",
    "DE_TO_CA": "intercontinental",
    "DE_TO_AE": "long_haul",
    "DE_TO_IN": "long_haul",
    "DE_TO_AU": "long_haul",
    
    "AE_TO_IN": "same_region",
    "AE_TO_GB": "long_haul",
    "AE_TO_DE": "long_haul",
    "AE_TO_US": "long_haul",
    "AE_TO_CA": "long_haul",
    "AE_TO_AU": "long_haul",
    
    "IN_TO_AE": "same_region",
    "IN_TO_GB": "long_haul",
    "IN_TO_DE": "long_haul",
    "IN_TO_US": "long_haul",
    "IN_TO_CA": "long_haul",
    "IN_TO_AU": "long_haul"
  }
};

fs.writeFileSync(
  path.join(DATA_DIR, 'distance-zones.json'),
  JSON.stringify(distanceZones, null, 2),
  'utf-8'
);
console.log('Generated distance-zones.json');

// 5. Generate recommendation-rules.json
const recRules = {
  cheapest: {
    priceWeight: 0.8,
    speedWeight: 0.1,
    reliabilityWeight: 0.1,
    requiredTags: ["cheapest"]
  },
  fastest: {
    priceWeight: 0.1,
    speedWeight: 0.8,
    reliabilityWeight: 0.1,
    requiredTags: ["fastest"]
  },
  reliable: {
    priceWeight: 0.1,
    speedWeight: 0.2,
    reliabilityWeight: 0.7,
    requiredTags: ["reliable", "most_reliable"]
  },
  student: {
    priceWeight: 0.7,
    speedWeight: 0.1,
    reliabilityWeight: 0.2,
    requiredTags: ["student_friendly"]
  },
  business: {
    priceWeight: 0.2,
    speedWeight: 0.4,
    reliabilityWeight: 0.4,
    requiredTags: ["business_friendly"]
  },
  express: {
    priceWeight: 0.1,
    speedWeight: 0.7,
    reliabilityWeight: 0.2,
    requiredTags: ["fastest", "premium"]
  }
};

fs.writeFileSync(
  path.join(DATA_DIR, 'recommendation-rules.json'),
  JSON.stringify(recRules, null, 2),
  'utf-8'
);
console.log('Generated recommendation-rules.json');
console.log('Data splitting completed successfully!');
