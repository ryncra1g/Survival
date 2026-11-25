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
    qty: "water_jugs", tags: [], group: "water", level: "standard",
  },
  {
    id: "water-gallons", category: "Water", name: "Gallon water jugs or refilled bottles (low-cost)",
    spec: "Store-bought 1-gallon water, or clean 2-liter soda bottles refilled with tap water (not milk jugs)",
    models: ["Any store-brand gallon water"], priceLow: 1, priceHigh: 1.5, tier: 1, phase: 1, priority: 2,
    qty: "water_gallons", tags: [], essential: true, group: "water", level: "essential",
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
    // D6 water kit: the light backup treatment method.
    id: "water-tablets", category: "Water", name: "Water treatment tablets (chlorine dioxide)",
    spec: "Chlorine dioxide tablets as a light backup to your filter or boiling; follow the label for amount and wait time",
    models: ["Katadyn Micropur MP1", "Aquamira water treatment tablets"], priceLow: 10, priceHigh: 20, tier: 1, phase: 3, priority: 6, qty: 1, tags: [],
  },
  {
    // D6 water kit: spare elements for the household filter.
    id: "filter-spare", category: "Water", name: "Spare filter elements or cartridges",
    spec: "Replacement elements for your household filter, or a backflush kit; match your filter's brand and model",
    models: ["Your filter maker's replacement elements"], priceLow: 20, priceHigh: 60, tier: 2, phase: 3, priority: 7, qty: 1, tags: ["filter_kit"],
  },
  {
    id: "filter-basic", category: "Water", name: "Hollow-fiber water filter",
    spec: "0.1-micron hollow fiber (removes bacteria & protozoa; boil or disinfect for viruses); gravity or squeeze",
    models: ["Sawyer Squeeze", "LifeStraw Family 2.0"], priceLow: 35, priceHigh: 90, tier: 1, phase: 1, priority: 6,
    qty: 1, tags: ["needs_filter"], group: "filter", level: "essential", essential: true,
  },
  {
    id: "filter-gravity", category: "Water", name: "Countertop gravity filter",
    spec: "Gravity system with independent test results (NSF/ANSI 53 or P231 where available), ≥2 gal/hour",
    models: ["Berkey-style gravity system", "LifeStraw Community"], priceLow: 250, priceHigh: 450, tier: 3, phase: 3, priority: 4,
    qty: 1, tags: ["needs_filter"], group: "filter", level: "premium",
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
    id: "first-aid", category: "First aid", name: "First aid kit",
    spec: "200+ piece kit with trauma pads, gauze, tape, elastic wrap, gloves, thermometer, tweezers, shears",
    models: ["Adventure Medical Kits Family", "American Red Cross Deluxe Family Kit"], priceLow: 30, priceHigh: 80, tier: 1, phase: 1, priority: 10,
    qty: 1, tags: [], essential: true,
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
  {
    id: "power-bank", category: "Power", name: "USB power bank",
    spec: "20,000 mAh or larger, USB-C PD; keeps a phone running 3–4 days (one per adult is ideal)",
    models: ["Anker PowerCore 20K", "INIU 20000 mAh"], priceLow: 25, priceHigh: 45, tier: 1, phase: 1, priority: 9,
    qty: "adults", tags: [],
  },
  {
    id: "quake-kit", category: "Earthquake", name: "Water-heater straps + gas shutoff wrench",
    spec: "Seismic water-heater strap kit, furniture/TV anchors, and a gas/water shutoff wrench kept by the meter",
    models: ["QuakeHOLD! strap kit", "Rothenberger 4-in-1 shutoff wrench"], priceLow: 30, priceHigh: 70, tier: 1, phase: 1, priority: 3,
    qty: 1, tags: ["earthquake", "house_or_townhouse"],
  },
  {
    id: "quake-bedside", category: "Earthquake", name: "Bedside kit",
    spec: "Sturdy shoes, flashlight and work gloves in a bag tied to each bed (broken glass is the #1 quake injury)",
    models: ["Any — use old sneakers"], priceLow: 15, priceHigh: 30, tier: 1, phase: 1, priority: 4,
    qty: "adults", tags: ["earthquake"],
  },
  {
    id: "smoke-masks", category: "Wildfire", name: "N95 masks + HEPA air purifier",
    spec: "NIOSH-approved N95 masks (fit-tested sizes for each person) and a HEPA purifier sized for your safe room",
    models: ["3M Aura 9205+", "Coway AP-1512HH"], priceLow: 120, priceHigh: 250, tier: 1, phase: 1, priority: 5,
    qty: 1, tags: ["wildfire"],
  },
  {
    id: "flood-kit", category: "Flood", name: "Flood kit",
    spec: "Waterproof bins for documents/valuables on an upper shelf, sandbags or water-activated flood barriers for door thresholds",
    models: ["Quick Dam water-activated bags", "Sterilite latching totes"], priceLow: 50, priceHigh: 150, tier: 1, phase: 2, priority: 6,
    qty: 1, tags: ["flood", "house_or_townhouse"],
  },
  {
    id: "mobility-kit", category: "Accessibility", name: "Mobility & access kit",
    spec: "Spare cane/walker tips, a backup manual wheelchair or transfer aid if one is used, extra hearing-aid batteries, a whistle, and a laminated list of needs and contacts",
    models: ["Any — match current equipment"], priceLow: 30, priceHigh: 150, tier: 1, phase: 1, priority: 6,
    qty: 1, tags: ["mobility"],
  },
  // ---------------- Phase 2: power + food ----------------
  {
    id: "generator-dual", category: "Power", name: "Dual-fuel inverter generator",
    spec: "3,500–4,500 W running, inverter (clean power), gasoline + propane, built-in CO auto-shutoff, ≤ 65 dBA",
    models: ["Champion 4500W dual-fuel inverter", "Westinghouse iGen4500DF"], priceLow: 900, priceHigh: 1500, tier: 3, phase: 2, priority: 2,
    qty: 1, tags: ["recommend_generator"], group: "generator", level: "standard",
  },
  {
    id: "generator-small", category: "Power", name: "Small inverter generator",
    spec: "2,200–2,500 W inverter with CO auto-shutoff (runs fridge, furnace blower via inlet, charging)",
    models: ["Champion 2500W inverter", "Honda EU2200i"], priceLow: 550, priceHigh: 1200, tier: 2, phase: 2, priority: 3,
    qty: 1, tags: ["recommend_generator"], group: "generator", level: "essential", notes: "Picked instead of the dual-fuel model when the budget is tighter",
  },
  {
    id: "inlet-interlock", category: "Power", name: "Generator inlet + interlock (electrician-installed)",
    spec: "Power inlet box + panel interlock kit or transfer switch, installed by a licensed electrician (permit where required)",
    models: ["Reliance Controls PB30 inlet", "Panel-maker interlock kit"], priceLow: 500, priceHigh: 1500, tier: 2, phase: 2, priority: 3,
    qty: 1, requiresGroup: "generator", tags: ["has_generator", "fuel_furnace", "house_or_townhouse"], notes: "Range includes typical install cost",
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
    qty: 1, tags: ["apartment"], group: "battery-apt", level: "standard",
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
    spec: "One food-grade 5-gal bucket with a gamma seal lid, mylar bag and oxygen absorbers for rice, beans or oats; enough buckets for your bulk staples",
    models: ["Gamma Seal lid kit", "ShieldPro mylar kit"], priceLow: 20, priceHigh: 35, tier: 1, phase: 2, priority: 10,
    qty: "food_buckets", tags: [], notes: "Priced per bucket (estimate); the plan sizes the count to the bulk staples (D7)",
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
  // ---------------- À la carte levels: essential / premium alternatives ----------------
  {
    id: "water-bricks", category: "Water", name: "Stackable water bricks",
    spec: "Rigid 3.5-gal stackable BPA-free bricks with spigot caps; stack 4–5 high in a closet or under shelves",
    models: ["WaterBrick 3.5 gal", "Augason Farms stackable"], priceLow: 25, priceHigh: 35, tier: 3, phase: 1, priority: 2,
    qty: "water_bricks", tags: [], group: "water", level: "premium",
  },
  {
    id: "generator-standby", category: "Power", name: "Whole-home standby generator (professionally installed)",
    spec: "14–24 kW standby unit on a pad outdoors, natural gas or propane, automatic transfer switch, installed with permits by licensed electrician and plumber",
    models: ["Generac Guardian 22 kW", "Kohler 20RESCL"], priceLow: 9000, priceHigh: 18000, tier: 4, phase: 2, priority: 2,
    qty: 1, tags: ["recommend_generator", "house_or_townhouse"], group: "generator", level: "premium",
    excludes: ["gas-cans", "gen-cord", "propane-20", "inlet-interlock"], notes: "Range includes typical installation",
  },
  {
    id: "power-station-small", category: "Power", name: "Small power station",
    spec: "300–700 Wh LiFePO4 with AC outlets; phones, lights, router and a fan for a day or two",
    models: ["Jackery Explorer 300 Plus", "EcoFlow River 2 Pro"], priceLow: 200, priceHigh: 450, tier: 1, phase: 2, priority: 3,
    qty: 1, tags: ["apartment"], group: "battery-apt", level: "essential",
  },
  {
    id: "power-station-large", category: "Power", name: "Large expandable power station",
    spec: "3–4 kWh expandable LiFePO4, 3,000 W+ output; runs a fridge, CPAP and lights for days, pairs with solar",
    models: ["EcoFlow DELTA Pro", "Anker SOLIX F3800"], priceLow: 2200, priceHigh: 3800, tier: 4, phase: 2, priority: 3,
    qty: 1, tags: ["apartment"], group: "battery-apt", level: "premium",
  },
  {
    id: "power-station-house-large", category: "Power", name: "Large expandable power station (quiet hours)",
    spec: "3–4 kWh expandable LiFePO4; covers overnight loads silently and pairs with solar panels",
    models: ["EcoFlow DELTA Pro", "Anker SOLIX F3800"], priceLow: 2200, priceHigh: 3800, tier: 4, phase: 3, priority: 1,
    qty: 1, tags: ["house_or_townhouse", "!owns_solar"], group: "battery-house", level: "premium",
  },
  {
    id: "filter-gravity-bag", category: "Water", name: "Gravity bag filter",
    spec: "Hang-and-forget gravity bag, 0.2-micron hollow fiber, filters several liters per minute for a whole household",
    models: ["Platypus GravityWorks 4L", "Sawyer Gravity system"], priceLow: 90, priceHigh: 140, tier: 2, phase: 1, priority: 6,
    qty: 1, tags: ["needs_filter"], group: "filter", level: "standard",
  },
  {
    id: "frs-radios", category: "Communications", name: "FRS walkie-talkies",
    spec: "License-free FRS pair, AA or rechargeable, for household use within about a mile",
    models: ["Motorola Talkabout T110", "Cobra RX100"], priceLow: 25, priceHigh: 45, tier: 1, phase: 3, priority: 3,
    qty: 1, tags: [], group: "two-way", level: "essential",
  },
  {
    id: "sat-messenger", category: "Communications", name: "Satellite messenger",
    spec: "Two-way satellite texting and SOS with no cell service; needs a monthly plan (about $15–65/mo)",
    models: ["Garmin inReach Mini 2", "ZOLEO"], priceLow: 200, priceHigh: 400, tier: 3, phase: 3, priority: 3,
    qty: 1, tags: [], group: "two-way", level: "premium",
  },
  {
    id: "go-bag-basic", category: "Evacuation", name: "Go-bag from a backpack you own",
    spec: "Any sturdy backpack + the go-bag checklist; buy only the missing pieces (headlamp, water bottle, first aid)",
    models: ["Any backpack you already own"], priceLow: 20, priceHigh: 40, tier: 1, phase: 3, priority: 7,
    qty: "adults", tags: ["evacuation"], group: "go-bag", level: "essential",
  },
  {
    id: "go-bag-kit", category: "Evacuation", name: "Premium pre-packed go-bag",
    spec: "Pre-packed 72-hour kit in a weatherproof pack: water filter, stove (outdoor use), shelter, first aid, light, power bank",
    models: ["Uncharted Supply Co. The Seventy2", "Preppi PREPPI72"], priceLow: 300, priceHigh: 450, tier: 3, phase: 3, priority: 7,
    qty: "adults", tags: ["evacuation"], group: "go-bag", level: "premium",
  },
  {
    id: "tarp-shelter", category: "Evacuation", name: "Tarp shelter kit",
    spec: "Two 10×12 ft heavy tarps, 100 ft paracord, stakes, ground cloth; quick rain-and-wind shelter",
    models: ["Any heavy-duty poly tarp kit"], priceLow: 50, priceHigh: 100, tier: 1, phase: 3, priority: 9,
    qty: 1, tags: ["raw_land"], group: "shelter", level: "essential",
  },
  {
    id: "canvas-tent", category: "Evacuation", name: "Canvas bell or cabin tent",
    spec: "Four-season canvas tent for long stays, breathable and warmer than nylon; sized for the whole household",
    models: ["White Duck Regatta bell tent", "Kodiak Canvas Flex-Bow"], priceLow: 600, priceHigh: 1400, tier: 3, phase: 3, priority: 9,
    qty: 1, tags: ["raw_land"], group: "shelter", level: "premium",
  },
  {
    id: "vehicle-kit-basic", category: "Evacuation", name: "Basic vehicle kit",
    spec: "Jumper cables, tire gauge, flashlight, blanket, paper map",
    models: ["Any roadside emergency kit"], priceLow: 35, priceHigh: 70, tier: 1, phase: 3, priority: 8,
    qty: 1, tags: ["vehicles", "evacuation"], group: "vehicle-kit", level: "essential",
  },
  {
    id: "vehicle-kit-premium", category: "Evacuation", name: "Recovery + cargo kit",
    spec: "Lithium jump starter, 12 V compressor, traction boards, recovery strap and shackles, rooftop cargo box for gear",
    models: ["MAXTRAX traction boards", "Thule Force XT cargo box"], priceLow: 700, priceHigh: 1500, tier: 3, phase: 3, priority: 8,
    qty: 1, tags: ["vehicles", "evacuation"], group: "vehicle-kit", level: "premium",
  },
  {
    id: "food-freeze-dried", category: "Food", name: "Freeze-dried long-term food",
    spec: "25-year shelf-life freeze-dried meals, about 2,000 kcal per person-day; no rotation needed, just add hot water",
    models: ["Mountain House buckets", "Augason Farms 30-day kit"], priceLow: 700, priceHigh: 1100, tier: 4, phase: 2, priority: 1,
    qty: "freeze_dried_units", tags: [], group: "food", level: "premium", notes: "Priced per 1-person, 30-day supply",
  },
  // ---------------- Luxury track ----------------
  {
    id: "raw-land-cabin", category: "Evacuation", name: "Small cabin or insulated shed on your land",
    spec: "Prefab shed or tiny cabin on piers with a rain-catchment barrel and a bucket-toilet corner; check local zoning and permits first",
    models: ["Local shed builder or prefab kit"], priceLow: 8000, priceHigh: 25000, tier: 4, phase: 3, priority: 20,
    qty: 1, tags: ["raw_land"], notes: "Luxury option; no Buy link",
  },
  // ---------------- Phase 3: comfort, solar, comms ----------------
  {
    id: "solar-panel", category: "Power", name: "Portable solar panel",
    spec: "200–400 W folding panel matched to your power station's input (voltage/connector)",
    models: ["EcoFlow 220W bifacial", "Jackery SolarSaga 200W"], priceLow: 300, priceHigh: 650, tier: 3, phase: 3, priority: 2,
    qty: 1, tags: ["!owns_solar"],
  },
  {
    id: "power-station-house", category: "Power", name: "Portable power station (quiet hours)",
    spec: "1–2 kWh LiFePO4, pure sine wave; covers overnight fridge/phone/CPAP loads so the generator can be off",
    models: ["EcoFlow DELTA 2", "Jackery Explorer 1000 v2"], priceLow: 400, priceHigh: 900, tier: 3, phase: 3, priority: 1,
    qty: 1, tags: ["house_or_townhouse", "!owns_solar"], group: "battery-house", level: "standard",
  },
  {
    id: "gmrs", category: "Communications", name: "GMRS/FRS handheld radios",
    spec: "Pair of FRS (license-free) or GMRS radios (FCC license, no exam) for neighborhood/family comms",
    models: ["Midland GXT1000VP4", "Motorola Talkabout T470"], priceLow: 60, priceHigh: 150, tier: 2, phase: 3, priority: 3,
    qty: 1, tags: [], group: "two-way", level: "standard",
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
    models: ["Osprey Daylite", "REI Ruckpack 40"], priceLow: 40, priceHigh: 120, tier: 1, phase: 3, priority: 7, qty: "adults", tags: ["evacuation"], group: "go-bag", level: "standard",
  },
  {
    id: "vehicle-kit", category: "Evacuation", name: "Vehicle emergency kit",
    spec: "Lithium jump starter, 12 V tire inflator, tow strap, reflective triangles, paper road atlas",
    models: ["NOCO Boost GB40", "AstroAI tire inflator"], priceLow: 100, priceHigh: 200, tier: 1, phase: 3, priority: 8, qty: 1, tags: ["vehicles", "evacuation"], group: "vehicle-kit", level: "standard",
  },
  {
    id: "tent", category: "Evacuation", name: "Tent + tarps",
    spec: "3-season (or 4-season for winter) family tent, 2 heavy tarps, paracord, stakes",
    models: ["Coleman Skydome 6", "REI Base Camp 6"], priceLow: 150, priceHigh: 450, tier: 2, phase: 3, priority: 9, qty: 1, tags: ["raw_land"], group: "shelter", level: "standard",
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
