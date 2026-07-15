// src/utils/countryData.ts
import { INDIA_STATES } from './indiaData.ts';

export interface StateRegion {
  name: string;
  lat: number;
  lng: number;
  districts?: string[];
}

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  lat: number;
  lng: number;
  states: StateRegion[];
}

export const COUNTRIES_DATA: Record<string, CountryInfo> = {
  "IN": {
    code: "IN",
    name: "India",
    currency: "INR",
    currencySymbol: "₹",
    lat: 20.5937,
    lng: 78.9629,
    states: INDIA_STATES.map(s => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      districts: s.districts
    }))
  },
  "US": {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    lat: 37.0902,
    lng: -95.7129,
    states: [
      { name: "California", lat: 36.7783, lng: -119.4179 },
      { name: "New York", lat: 40.7128, lng: -74.0060 },
      { name: "Texas", lat: 31.9686, lng: -99.9018 },
      { name: "Florida", lat: 27.6648, lng: -81.5158 },
      { name: "Illinois", lat: 40.6331, lng: -89.3985 },
      { name: "Pennsylvania", lat: 41.2033, lng: -77.1945 },
      { name: "Ohio", lat: 40.4173, lng: -82.9071 },
      { name: "Georgia", lat: 32.1656, lng: -82.9001 },
      { name: "North Carolina", lat: 35.7596, lng: -79.0193 },
      { name: "Washington", lat: 47.7511, lng: -120.7401 }
    ]
  },
  "GB": {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    lat: 55.3781,
    lng: -3.4360,
    states: [
      { name: "Greater London", lat: 51.5074, lng: -0.1278 },
      { name: "West Midlands", lat: 52.4862, lng: -1.8904 },
      { name: "Greater Manchester", lat: 53.4808, lng: -2.2426 },
      { name: "Scotland", lat: 56.4907, lng: -4.2026 },
      { name: "Wales", lat: 52.1307, lng: -3.7837 },
      { name: "Northern Ireland", lat: 54.7877, lng: -6.4923 },
      { name: "South West England", lat: 50.7489, lng: -3.9880 }
    ]
  },
  "CA": {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    currencySymbol: "C$",
    lat: 56.1304,
    lng: -106.3468,
    states: [
      { name: "Ontario", lat: 51.2538, lng: -85.3232 },
      { name: "Quebec", lat: 52.9399, lng: -73.5491 },
      { name: "British Columbia", lat: 53.7267, lng: -127.6476 },
      { name: "Alberta", lat: 53.9333, lng: -116.5765 },
      { name: "Manitoba", lat: 53.7609, lng: -98.8139 },
      { name: "Saskatchewan", lat: 52.9399, lng: -106.4509 },
      { name: "Nova Scotia", lat: 44.6820, lng: -63.7443 }
    ]
  },
  "AU": {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    currencySymbol: "A$",
    lat: -25.2744,
    lng: 133.7751,
    states: [
      { name: "New South Wales", lat: -31.8402, lng: 145.6127 },
      { name: "Victoria", lat: -37.0201, lng: 144.9646 },
      { name: "Queensland", lat: -20.9176, lng: 142.7028 },
      { name: "Western Australia", lat: -27.6728, lng: 121.6283 },
      { name: "South Australia", lat: -30.0002, lng: 135.0000 },
      { name: "Tasmania", lat: -42.0409, lng: 146.8087 },
      { name: "Australian Capital Territory", lat: -35.2809, lng: 149.1300 }
    ]
  },
  "DE": {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    currencySymbol: "€",
    lat: 51.1657,
    lng: 10.4515,
    states: [
      { name: "North Rhine-Westphalia", lat: 51.4332, lng: 7.6616 },
      { name: "Bavaria", lat: 48.7904, lng: 11.4975 },
      { name: "Baden-Württemberg", lat: 48.6616, lng: 9.3501 },
      { name: "Lower Saxony", lat: 52.6367, lng: 9.8451 },
      { name: "Hesse", lat: 50.6521, lng: 9.1624 },
      { name: "Berlin", lat: 52.5200, lng: 13.4050 },
      { name: "Hamburg", lat: 53.5511, lng: 9.9937 }
    ]
  },
  "AE": {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "AED ",
    lat: 23.4241,
    lng: 53.8478,
    states: [
      { name: "Abu Dhabi", lat: 24.4539, lng: 54.3773 },
      { name: "Dubai", lat: 25.2048, lng: 55.2708 },
      { name: "Sharjah", lat: 25.3463, lng: 55.4209 },
      { name: "Ajman", lat: 25.4111, lng: 55.4800 },
      { name: "Umm Al Quwain", lat: 25.5647, lng: 55.5552 },
      { name: "Ras Al Khaimah", lat: 25.7895, lng: 55.9432 },
      { name: "Fujairah", lat: 25.1288, lng: 56.3265 }
    ]
  }
};
