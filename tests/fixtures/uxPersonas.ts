import { DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
import { PERSONAS } from "./personas";

/** The 8 households /ux-pass walks through (.claude/skills/ux-pass/scripts/personas.ts), as fixtures for the UX-n fixes. */
const A = (o: Partial<Answers>): Answers => ({ ...DEFAULT_ANSWERS, ...o });
export const UX_PERSONAS: { id: string; who: string; a: Answers }[] = [
  { id: "solo-renter", who: "Solo apartment renter, Chicago, no car", a: A({ zip: "60614", adults: 1, homeType: "apartment", floors: 1, heatSources: ["electric"], cooking: "electric", vehicleFuels: [], storage: ["closets"], budget: "500_1500", evacuation: { destination: "friends_family", distanceMiles: 25 } }) },
  { id: "toddlers", who: "Two parents, kids 1, 3 and 6, a dog", a: A({ zip: "43215", adults: 2, childrenAges: [1, 3, 6], toddlerNeeds: ["diapers", "milk"], pets: [{ type: "dog", size: "medium", count: 1, specialDiet: false, medications: false }], hasGarage: true, hasYard: true, storage: ["garage", "closets"], vehicleFuels: ["gas", "hybrid"], approach: "family_friends", evacuation: { destination: "friends_family", distanceMiles: 120 } }) },
  { id: "elderly-mobility", who: "Couple in their 80s, limited mobility, Maine", a: A({ zip: "04101", adults: 2, elderlyOrMobility: true, hasPrescriptions: true, homeType: "townhouse", floors: 1, heatSources: ["oil"], cooking: "electric", budget: "1500_5000", storage: ["closets", "other_indoor"] }) },
  { id: "powered-device", who: "Adult on oxygen and CPAP, Phoenix apartment", a: A({ zip: "85004", adults: 1, hasPrescriptions: true, poweredDevices: ["oxygen", "cpap"], homeType: "apartment", floors: 1, heatSources: ["electric"], cooking: "electric", storage: ["closets"] }) },
  { id: "rural-wildfire", who: "Rural couple, well, propane, two big dogs, wildfire country", a: A({ zip: "95969", adults: 2, pets: [{ type: "dog", size: "large", count: 2, specialDiet: false, medications: false }], hasGarage: true, hasYard: true, hasShed: true, heatSources: ["propane", "wood"], waterSource: "well", vehicleFuels: ["diesel", "gas"], storage: ["garage", "shed"], approach: "family_friends", evacuation: { destination: "friends_family", distanceMiles: 120 }, budget: "1500_5000", skills: ["camping", "tools"], scenarioDays: 30 }) },
  { id: "gulf-hurricane", who: "Family of four, New Orleans, cat, hotel inland", a: A({ zip: "70112", adults: 2, childrenAges: [8, 12], pets: [{ type: "cat", size: "small", count: 1, specialDiet: false, medications: false }], heatSources: ["electric"], approach: "hotel_shelter", evacuation: { destination: "hotel", distanceMiles: 250 } }) },
  { id: "tight-budget", who: "Single parent, 9-year-old, Atlanta, under $500, no car, 72 hours", a: A({ zip: "30310", adults: 1, childrenAges: [9], homeType: "apartment", floors: 1, heatSources: ["electric"], cooking: "electric", vehicleFuels: [], storage: ["limited"], budget: "under_500", scenarioDays: 3, approach: "hotel_shelter", evacuation: { destination: "public_shelter" } }) },
  { id: "generous-budget", who: "Couple with teens, Boulder, $5,000+, 90 days", a: A({ zip: "80302", adults: 2, childrenAges: [14, 16], hasBasement: true, hasGarage: true, hasYard: true, storage: ["basement", "garage"], scenarioDays: 90, budget: "5000_plus", vehicleFuels: ["ev", "gas"], waterFilter: "personal", skills: ["first_aid"], approach: "another_property", evacuation: { destination: "second_property", distanceMiles: 250 } }) },
];

/** Every named household the tests know: the sample, the 10 personas and the 8 UX-pass households. */
export const ALL_HOUSEHOLDS: { id: string; a: Answers }[] = [
  { id: "sample", a: SAMPLE_HOUSEHOLD },
  ...PERSONAS.map((p) => ({ id: p.name, a: p.a })),
  ...UX_PERSONAS.map((p) => ({ id: p.id, a: p.a })),
];
