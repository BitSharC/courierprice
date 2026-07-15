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
    { weight: 2.5, weightUnit: "kg", category: "electronics" }
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
    { weight: 1.2, weightUnit: "kg", category: "documents" }
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
    { weight: 500, weightUnit: "g", category: "books" }
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

console.log('\n--- RUNNING JAMMU TO PUNE TEST (Porter should NOT be present) ---');
const jammuToPune = getEstimates({
  type: "domestic",
  pickupCountry: "IN",
  pickupState: "Jammu and Kashmir (UT)",
  pickupDistrict: "Jammu",
  deliveryCountry: "IN",
  deliveryState: "Maharashtra",
  deliveryDistrict: "Pune",
  parcels: [{ weight: 1, weightUnit: "kg", category: "clothes" }],
  insurance: false,
  express: false,
  pickupRequired: false
});
console.log(`Total couriers found: ${jammuToPune.length}`);
console.log(`Is Porter present? ${jammuToPune.some(c => c.id.includes('porter'))}`);

console.log('\n--- RUNNING JAMMU TO JAMMU TEST (Porter should NOT be present - Jammu not supported) ---');
const jammuToJammu = getEstimates({
  type: "domestic",
  pickupCountry: "IN",
  pickupState: "Jammu and Kashmir (UT)",
  pickupDistrict: "Jammu",
  deliveryCountry: "IN",
  deliveryState: "Jammu and Kashmir (UT)",
  deliveryDistrict: "Jammu",
  parcels: [{ weight: 1, weightUnit: "kg", category: "clothes" }],
  insurance: false,
  express: false,
  pickupRequired: false
});
console.log(`Total couriers found: ${jammuToJammu.length}`);
console.log(`Is Porter present? ${jammuToJammu.some(c => c.id.includes('porter'))}`);

console.log('\n--- RUNNING PUNE TO PUNE TEST (Porter SHOULD be present) ---');
const puneToPune = getEstimates({
  type: "domestic",
  pickupCountry: "IN",
  pickupState: "Maharashtra",
  pickupDistrict: "Pune",
  deliveryCountry: "IN",
  deliveryState: "Maharashtra",
  deliveryDistrict: "Pune",
  parcels: [{ weight: 1, weightUnit: "kg", category: "clothes" }],
  insurance: false,
  express: false,
  pickupRequired: false
});
console.log(`Total couriers found: ${puneToPune.length}`);
console.log(`Is Porter present? ${puneToPune.some(c => c.id.includes('porter'))}`);

console.log('\n--- RUNNING CA TO WA TEST (OnTrac SHOULD be present, LSO should NOT) ---');
const caToWa = getEstimates({
  type: "domestic",
  pickupCountry: "US",
  pickupState: "California",
  deliveryCountry: "US",
  deliveryState: "Washington",
  parcels: [{ weight: 1, weightUnit: "kg", category: "electronics" }],
  insurance: false,
  express: false,
  pickupRequired: false
});
console.log(`OnTrac present? ${caToWa.some(c => c.id.includes('ontrac'))}`);
console.log(`LSO present? ${caToWa.some(c => c.id.includes('lso'))}`);

console.log('\n--- RUNNING TX TO TX TEST (LSO SHOULD be present, OnTrac should NOT) ---');
const txToTx = getEstimates({
  type: "domestic",
  pickupCountry: "US",
  pickupState: "Texas",
  deliveryCountry: "US",
  deliveryState: "Texas",
  parcels: [{ weight: 1, weightUnit: "kg", category: "electronics" }],
  insurance: false,
  express: false,
  pickupRequired: false
});
console.log(`OnTrac present? ${txToTx.some(c => c.id.includes('ontrac'))}`);
console.log(`LSO present? ${txToTx.some(c => c.id.includes('lso'))}`);

console.log('\n--- RUNNING NY TO GA TEST (OnTrac should NOT be present, LSO should NOT) ---');
const nyToGa = getEstimates({
  type: "domestic",
  pickupCountry: "US",
  pickupState: "New York",
  deliveryCountry: "US",
  deliveryState: "Georgia",
  parcels: [{ weight: 1, weightUnit: "kg", category: "electronics" }],
  insurance: false,
  express: false,
  pickupRequired: false
});
console.log(`OnTrac present? ${nyToGa.some(c => c.id.includes('ontrac'))}`);
logCourierAvailability(nyToGa);

function logCourierAvailability(estimates: any[]) {
  console.log(`LSO present? ${estimates.some(c => c.id.includes('lso'))}`);
}


