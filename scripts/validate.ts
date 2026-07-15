// scripts/validate.ts
import { getEstimates } from '../src/utils/calculator.ts';

console.log('--- RUNNING DOMESTIC US TEST ---');
const domesticUS = getEstimates({
  type: "domestic",
  pickupCountry: "US",
  pickupState: "California",
  deliveryCountry: "US",
  deliveryState: "New York",
  parcels: [
    { weight: 2.5, weightUnit: "kg", category: "electronics", declaredValue: 200 }
  ],
  insurance: true,
  express: true,
  pickupRequired: true
});

console.log(`Found ${domesticUS.length} domestic US couriers.`);
if (domesticUS.length > 0) {
  const c = domesticUS[0];
  console.log(`First Courier: ${c.name}`);
  console.log(`Price: ${c.currencySymbol}${c.estimatedPrice}`);
  console.log(`Days: ${c.estimatedDays}`);
  console.log(`Badge: ${c.recommendationBadge}`);
  console.log('Breakdown:', c.breakdown);
}

console.log('\n--- RUNNING INTERNATIONAL US TO IN TEST ---');
const intlTest = getEstimates({
  type: "international",
  pickupCountry: "US",
  pickupState: "California",
  deliveryCountry: "IN",
  deliveryState: "Maharashtra",
  parcels: [
    { weight: 1.2, weightUnit: "kg", category: "documents", declaredValue: 50 }
  ],
  insurance: true,
  express: false,
  pickupRequired: false
});

console.log(`Found ${intlTest.length} international couriers.`);
if (intlTest.length > 0) {
  const c = intlTest[0];
  console.log(`First Courier: ${c.name}`);
  console.log(`Price: ${c.currencySymbol}${c.estimatedPrice}`);
  console.log(`Days: ${c.estimatedDays}`);
  console.log(`Badge: ${c.recommendationBadge}`);
  console.log('Breakdown:', c.breakdown);
}

console.log('\n--- RUNNING DOMESTIC INDIA TEST ---');
const domesticIN = getEstimates({
  type: "domestic",
  pickupCountry: "IN",
  pickupState: "Maharashtra",
  pickupDistrict: "Mumbai City",
  deliveryCountry: "IN",
  deliveryState: "Karnataka",
  deliveryDistrict: "Bengaluru Urban",
  parcels: [
    { weight: 500, weightUnit: "g", category: "books", declaredValue: 1500 }
  ],
  insurance: false,
  express: false,
  pickupRequired: true
});

console.log(`Found ${domesticIN.length} domestic India couriers.`);
if (domesticIN.length > 0) {
  const c = domesticIN[0];
  console.log(`First Courier: ${c.name}`);
  console.log(`Price: ${c.currencySymbol}${c.estimatedPrice}`);
  console.log(`Days: ${c.estimatedDays}`);
  console.log(`Badge: ${c.recommendationBadge}`);
  console.log('Breakdown:', c.breakdown);
}
