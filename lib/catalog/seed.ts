import type { CatalogItem } from "./types";

/**
 * Seed gear catalog. Specs first, example models second. Prices are approximate US retail
 * ranges at review time and WILL drift — re-review every 6 months (admin flags stale items).
 * Example models are illustrative, not endorsements. No affiliate links are seeded.
 *
 * `qty` strings are resolved by the rules engine (see lib/rules/gear.ts).
 */
const R = "2026-11-01";

type Seed = Omit<CatalogItem, "affiliateUrl" | "notes" | "active" | "essential" | "reviewedAt"> &
  Partial<Pick<CatalogItem, "essential" | "notes" | "reviewedAt">>;

const seed: Seed[] = [
  // ---------------- Phase 1: life safety ----------------
  {
    id: "co-alarm", category: "Life safety", name: "Carbon monoxide alarm",
    spec: "UL 2034 listed, battery or plug-in with battery backup, digital readout; one per floor and outside each sleeping area",
    models: ["Kidde KN-COPP-3", "First Alert CO605"], priceLow: 20, priceHigh: 40, tier: 1, phase: 1, priority: 1,
    qty: "co_alarms", tags: [], essential: true,
  },
  {
    id: "water-jug", category: "Water", name: "7-gallon water container",
    spec: "Food-grade HDPE (#2), BPA-free, with spigot; stack no more than 2 high",
    models: ["Reliance Aqua-Tainer 7 gal", "Scepter 7 gal water container"], priceLow: 20, priceHigh: 35, tier: 1, phase: 1, priority: 2,
    qty: "water_jugs", tags: [], essential: true,
  },
  {
    id: "water-drum", category: "Water", name: "55-gallon water drum kit",
    spec: "Food-grade blue HDPE drum with bung wrench and siphon/hand pump; keep off bare concrete",
    models: ["Augason Farms 55-gallon kit", "Emergency Essentials 55-gal barrel"], priceLow: 90, priceHigh: 160, tier: 2, phase: 1, priority: 3,
    qty: "water_drums", tags: ["large_storage"],
  },
  {
    id: "tub-bladder", category: "Water", name: "Bathtub water bladder",
    spec: "Food-grade liner that fills a bathtub (~100 gal) when a storm is forecast",
    models: ["WaterBOB 100 gal"], priceLow: 25, priceHigh: 40, tier: 1, phase: 1, priority: 4, qty: 1, tags: [],
  },
  {
    id: "bleach", category: "Water", name: "Unscented household bleach",
    spec: "Regular, unscented 6–8.25% sodium hypochlorite; no splash-less or scented types; replace yearly",
    models: ["Any store brand"], priceLow: 4, priceHigh: 8, tier: 1, phase: 1, priority: 5, qty: 1, tags: [], essential: true,
  },
  {
    id: "filter-basic", category: "Water", name: "Hollow-fiber water filter",
    spec: "0.1-micron hollow fiber (removes bacteria & protozoa; boil or disinfect for viruses); gravity or squeeze",
    models: ["Sawyer Squeeze", "LifeStraw Family 2.0"], priceLow: 35, priceHigh: 90, tier: 1, phase: 1, priority: 6,
    qty: 1, tags: ["needs_filter"],
  },
  {
    id: "filter-gravity", category: "Water", name: "Countertop gravity filter",
    spec: "Gravity system with independent test results (NSF/ANSI 53 or P231 where available), ≥2 gal/hour",
    models: ["Berkey-style gravity system", "LifeStraw Community"], priceLow: 250, priceHigh: 450, tier: 3, phase: 3, priority: 4,
    qty: 1, tags: ["needs_filter"],
  },
  {
    id: "lights", category: "Light", name: "Headlamps + LED lanterns",
    spec: "AA/AAA headlamp per person (≥200 lumens) + 2 LED lanterns; no candles",
    models: ["Black Diamond Astro", "Energizer Vision headlamp"], priceLow: 15, priceHigh: 30, tier: 1, phase: 1, priority: 7,
    qty: "people", tags: [], essential: true,
  },
  {
    id: "batteries", category: "Light", name: "AA/AAA battery stock",
    spec: "Bulk alkaline or rechargeable NiMH (pre-charged); store at room temperature",
    models: ["Amazon Basics bulk", "Panasonic eneloop"], priceLow: 20, priceHigh: 40, tier: 1, phase: 1, priority: 8, qty: 1, tags: [],
  },
  {
    id: "radio", category: "Communications", name: "NOAA weather radio",
    spec: "NOAA Weather Radio with SAME alerts, hand-crank + USB charging",
    models: ["Midland ER310", "Eton FRX3"], priceLow: 50, priceHigh: 80, tier: 1, phase: 1, priority: 9, qty: 1, tags: [],
  },
  {
    id: "first-aid", category: "First aid", name: "Family first aid kit",
    spec: "200+ piece kit with trauma pads, gauze, tape, elastic wrap, gloves, thermometer, tweezers, shears",
    models: ["Adventure Medical Kits Family", "American Red Cross Deluxe Family Kit"], priceLow: 30, priceHigh: 80, tier: 1, phase: 1, priority: 10,
    qty: 1, tags: [],
  },
  {
    id: "extinguisher", category: "Life safety", name: "Fire extinguisher",
    spec: "ABC-rated, 2-A:10-B:C or larger, rechargeable metal valve; one per floor + kitchen",
    models: ["First Alert PRO5", "Kidde Pro 210"], priceLow: 30, priceHigh: 60, tier: 1, phase: 1, priority: 11, qty: "floors", tags: [],
  },
  {
    id: "thermometers", category: "Food", name: "Fridge/freezer thermometers",
    spec: "Appliance thermometers to check the 40°F / 0°F food-safety lines",
    models: ["Rubbermaid appliance thermometer"], priceLow: 8, priceHigh: 15, tier: 1, phase: 1, priority: 12, qty: 1, tags: [],
  },
  {
    id: "buddy-heater", category: "Heat", name: "Indoor-rated portable propane heater",
    spec: "Rated for indoor use, with oxygen depletion sensor (ODS) and tip-over shutoff; use only with a working CO alarm and the ventilation the manual requires",
    models: ["Mr. Heater Portable Buddy (MH9BX)", "Mr. Heater Big Buddy (MH18B)"], priceLow: 100, priceHigh: 200, tier: 1, phase: 1, priority: 13,
    qty: 1, tags: ["needs_backup_heat", "house_or_townhouse", "winter"],
  },
  {
    id: "propane-1lb", category: "Heat", name: "1-lb propane cylinders (heater fuel)",
    spec: "DOT-approved 1-lb cylinders; store outdoors or in a detached shed, never in living space",
    models: ["Coleman 1-lb propane"], priceLow: 30, priceHigh: 50, tier: 1, phase: 1, priority: 14,
    qty: 1, tags: ["needs_backup_heat", "house_or_townhouse", "winter"], notes: "Priced per 4-pack",
  },
  {
    id: "sleep-system", category: "Heat", name: "Cold-rated sleeping bags",
    spec: "Rated 0–20°F (EN/ISO comfort rating where listed), one per person",
    models: ["TETON Sports Celsius 0°F", "Coleman North Rim 0°F"], priceLow: 40, priceHigh: 90, tier: 1, phase: 1, priority: 15,
    qty: "people", tags: ["winter"],
  },
  {
    id: "pipe-insulation", category: "Heat", name: "Pipe insulation & faucet covers",
    spec: "Foam pipe sleeves for exposed pipes + outdoor faucet covers",
    models: ["Frost King foam sleeves"], priceLow: 20, priceHigh: 50, tier: 1, phase: 1, priority: 16, qty: 1, tags: ["winter", "house_or_townhouse"],
  },
  {
    id: "med-battery", category: "Medical power", name: "Battery backup for powered medical device",
    spec: "Battery or power station approved/recommended by the device maker; capacity for at least 2 nights",
    models: ["Device-maker battery pack", "Jackery Explorer 1000 v2"], priceLow: 250, priceHigh: 800, tier: 1, phase: 1, priority: 1,
    qty: 1, tags: ["medical_device"], essential: true,
  },
  {
    id: "well-switch", category: "Power", name: "Manual transfer switch for well pump",
    spec: "Manual transfer switch sized for the well pump circuit (often 240 V); installed by a licensed electrician",
    models: ["Reliance Controls 31406CRK", "Generac 6853"], priceLow: 400, priceHigh: 1200, tier: 2, phase: 1, priority: 2,
    qty: 1, tags: ["well"], notes: "Range includes typical install cost",
  },
  // ---------------- Phase 2: power + food ----------------
  {
    id: "generator-dual", category: "Power", name: "Dual-fuel inverter generator",
    spec: "3,500–4,500 W running, inverter (clean power), gasoline + propane, built-in CO auto-shutoff, ≤ 65 dBA",
    models: ["Champion 4500W dual-fuel inverter", "Westinghouse iGen4500DF"], priceLow: 900, priceHigh: 1500, tier: 3, phase: 2, priority: 2,
    qty: 1, tags: ["recommend_generator"], group: "generator",
  },
  {
    id: "generator-small", category: "Power", name: "Small inverter generator",
    spec: "2,200–2,500 W inverter with CO auto-shutoff (runs fridge, furnace blower via inlet, charging)",
    models: ["Champion 2500W inverter", "Honda EU2200i"], priceLow: 550, priceHigh: 1200, tier: 2, phase: 2, priority: 3,
    qty: 1, tags: ["recommend_generator"], group: "generator", notes: "Picked instead of the dual-fuel model when the budget is tighter",
  },
  {
    id: "inlet-interlock", category: "Power", name: "Generator inlet + interlock (electrician-installed)",
    spec: "Power inlet box + panel interlock kit or transfer switch, installed by a licensed electrician (permit where required)",
    models: ["Reliance Controls PB30 inlet", "Panel-maker interlock kit"], priceLow: 500, priceHigh: 1500, tier: 2, phase: 2, priority: 3,
    qty: 1, requiresGroup: "generator", tags: ["recommend_generator", "fuel_furnace"], notes: "Range includes typical install cost",
  },
  {
    id: "gen-cord", category: "Power", name: "Generator cord + outdoor extension cords",
    spec: "L14-30 generator cord (for an inlet) or 12-gauge outdoor-rated extension cords long enough to keep the generator 20+ ft from the house",
    models: ["Conntek L14-30 25 ft", "Southwire 12/3 outdoor cord"], priceLow: 60, priceHigh: 120, tier: 1, phase: 2, priority: 5,
    qty: 1, bundle: true, requiresGroup: "generator", tags: ["has_generator", "house_or_townhouse"],
  },
  {
    id: "gas-cans", category: "Fuel", name: "5-gallon gas cans + stabilizer",
    spec: "Approved 5-gal cans + fuel stabilizer; store in a detached shed or well-ventilated area away from ignition sources",
    models: ["Scepter SmartControl 5 gal", "STA-BIL Storage"], priceLow: 30, priceHigh: 45, tier: 1, phase: 2, priority: 6,
    qty: "gas_cans", bundle: true, requiresGroup: "generator", tags: ["has_generator", "house_or_townhouse"],
  },
  {
    id: "propane-20", category: "Fuel", name: "20-lb propane cylinders",
    spec: "Filled 20-lb cylinders with OPD valves; store outdoors upright",
    models: ["Blue Rhino exchange", "Worthington 20 lb"], priceLow: 50, priceHigh: 70, tier: 2, phase: 2, priority: 7,
    qty: 2, requiresGroup: "generator", tags: ["has_generator", "house_or_townhouse"],
  },
  {
    id: "power-station", category: "Power", name: "Portable power station",
    spec: "1–2 kWh LiFePO4, pure sine wave, ≥1,500 W output; runs lights, phones, router, fans indoors with no fumes",
    models: ["EcoFlow DELTA 2", "Anker SOLIX C1000"], priceLow: 400, priceHigh: 900, tier: 2, phase: 2, priority: 3,
    qty: 1, tags: ["apartment"], group: "battery",
  },
  {
    id: "camp-stove", category: "Cooking", name: "Two-burner propane camp stove (outdoor use only)",
    spec: "Two-burner propane stove with wind guards; for outdoor use only, 20+ ft from doors and windows",
    models: ["Coleman Classic 2-burner", "Camp Chef Everest 2X"], priceLow: 50, priceHigh: 150, tier: 1, phase: 2, priority: 8,
    qty: 1, tags: ["needs_alt_cooking", "house_or_townhouse"],
  },
  {
    id: "coolers", category: "Food", name: "Multi-day cooler",
    spec: "Rotomolded or 5-day-rated cooler, 45–70 qt",
    models: ["Coleman Xtreme 70 qt", "Igloo MaxCold"], priceLow: 40, priceHigh: 90, tier: 1, phase: 2, priority: 9, qty: 1, tags: [],
  },
  {
    id: "storage-kit", category: "Food", name: "Food storage buckets",
    spec: "Food-grade 5-gal buckets with gamma seal lids, mylar bags and oxygen absorbers for rice/beans/oats",
    models: ["Gamma Seal lid kit", "ShieldPro mylar kit"], priceLow: 40, priceHigh: 90, tier: 1, phase: 2, priority: 10,
    qty: 1, tags: ["long_scenario"],
  },
  {
    id: "toilet-kit", category: "Sanitation", name: "Emergency toilet kit",
    spec: "5-gal bucket toilet seat + heavy-duty liners + absorbent (cat litter or sawdust); two-bucket setup",
    models: ["Reliance Luggable Loo", "Camco bucket toilet seat"], priceLow: 25, priceHigh: 50, tier: 1, phase: 2, priority: 11, qty: 1, tags: [],
  },
  {
    id: "window-protection", category: "Storm", name: "Window protection",
    spec: "Pre-cut 5/8\" exterior plywood with clips, or code-approved storm panels",
    models: ["PlyLox window clips", "Storm panel kits"], priceLow: 150, priceHigh: 600, tier: 2, phase: 2, priority: 12,
    qty: 1, tags: ["hurricane", "house_or_townhouse"],
  },
  {
    id: "sump-backup", category: "Storm", name: "Battery backup sump pump",
    spec: "Battery backup sump pump with alarm and deep-cycle battery",
    models: ["Basement Watchdog Big Dog", "Wayne ESP25"], priceLow: 250, priceHigh: 500, tier: 2, phase: 2, priority: 13,
    qty: 1, tags: ["flood_basement"],
  },
  {
    id: "firewood", category: "Heat", name: "Seasoned firewood",
    spec: "Seasoned hardwood (<20% moisture), stored off the ground and covered; chimney inspected yearly",
    models: ["Local supplier (by the cord)"], priceLow: 250, priceHigh: 450, tier: 1, phase: 2, priority: 1,
    qty: 1, tags: ["wood_heat", "winter"],
  },
  {
    id: "fans-cooling", category: "Heat", name: "Battery fans + cooling towels",
    spec: "Rechargeable USB fans and cooling towels for heat-wave outages",
    models: ["Geek Aire rechargeable fan", "Treva battery fan"], priceLow: 30, priceHigh: 80, tier: 1, phase: 2, priority: 14,
    qty: 1, tags: ["hot_climate"],
  },
  // ---------------- Phase 3: comfort, solar, comms ----------------
  {
    id: "solar-panel", category: "Power", name: "Portable solar panel",
    spec: "200–400 W folding panel matched to your power station's input (voltage/connector)",
    models: ["EcoFlow 220W bifacial", "Jackery SolarSaga 200W"], priceLow: 300, priceHigh: 650, tier: 3, phase: 3, priority: 2,
    qty: 1, tags: [],
  },
  {
    id: "power-station-house", category: "Power", name: "Portable power station (quiet hours)",
    spec: "1–2 kWh LiFePO4, pure sine wave; covers overnight fridge/phone/CPAP loads so the generator can be off",
    models: ["EcoFlow DELTA 2", "Jackery Explorer 1000 v2"], priceLow: 400, priceHigh: 900, tier: 3, phase: 3, priority: 1,
    qty: 1, tags: ["house_or_townhouse"], group: "battery",
  },
  {
    id: "gmrs", category: "Communications", name: "GMRS/FRS handheld radios",
    spec: "Pair of FRS (license-free) or GMRS radios (FCC license, no exam) for neighborhood/family comms",
    models: ["Midland GXT1000VP4", "Motorola Talkabout T470"], priceLow: 60, priceHigh: 150, tier: 2, phase: 3, priority: 3,
    qty: 1, tags: [],
  },
  {
    id: "docs-pouch", category: "Documents", name: "Fire/water-resistant document pouch",
    spec: "Fire- and water-resistant pouch or small safe for copies of IDs, insurance, prescriptions list",
    models: ["SentrySafe document bag", "ROLOWAY fireproof pouch"], priceLow: 20, priceHigh: 60, tier: 1, phase: 3, priority: 5, qty: 1, tags: [],
  },
  {
    id: "morale-kit", category: "Kids", name: "Kids comfort & activity kit",
    spec: "Cards, coloring, books, small toys, glow sticks; kept in a labeled bin",
    models: ["Any — rotate favorites"], priceLow: 20, priceHigh: 50, tier: 1, phase: 3, priority: 6, qty: 1, tags: ["children"],
  },
  {
    id: "pet-kit", category: "Pets", name: "Pet go-kit",
    spec: "Collapsible bowls, spare leash/harness, crate or carrier, waste bags, copy of vaccination records",
    models: ["Kurgo collapsible bowls", "Any airline-style carrier"], priceLow: 30, priceHigh: 100, tier: 1, phase: 2, priority: 15, qty: 1, tags: ["pets"],
  },
  {
    id: "go-bag", category: "Evacuation", name: "Go-bag backpack",
    spec: "30–40 L pack per adult; small pack per child with ID card, snacks, comfort item",
    models: ["Osprey Daylite", "REI Ruckpack 40"], priceLow: 40, priceHigh: 120, tier: 1, phase: 3, priority: 7, qty: "adults", tags: ["evacuation"],
  },
  {
    id: "vehicle-kit", category: "Evacuation", name: "Vehicle emergency kit",
    spec: "Lithium jump starter, 12 V tire inflator, tow strap, reflective triangles, paper road atlas",
    models: ["NOCO Boost GB40", "AstroAI tire inflator"], priceLow: 100, priceHigh: 200, tier: 1, phase: 3, priority: 8, qty: 1, tags: ["vehicles", "evacuation"],
  },
  {
    id: "tent", category: "Evacuation", name: "Family tent + tarps",
    spec: "3-season (or 4-season for winter) family tent, 2 heavy tarps, paracord, stakes",
    models: ["Coleman Skydome 6", "REI Base Camp 6"], priceLow: 150, priceHigh: 450, tier: 2, phase: 3, priority: 9, qty: 1, tags: ["raw_land"],
  },
  {
    id: "raw-land-water", category: "Evacuation", name: "Water transport for off-grid site",
    spec: "2–4 collapsible or rigid 5–7 gal containers dedicated to the vehicle/land site",
    models: ["Reliance Aqua-Tainer 7 gal", "Scepter 5 gal"], priceLow: 40, priceHigh: 90, tier: 1, phase: 3, priority: 10, qty: 1, tags: ["raw_land"],
  },
];

export const SEED_CATALOG: CatalogItem[] = seed.map((s) => ({
  essential: false,
  notes: "",
  reviewedAt: R,
  ...s,
  affiliateUrl: null,
  active: true,
}));
