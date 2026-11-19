import { z } from "zod";
import { BRAND } from "@/lib/brand";

const LevelOptionSchema = z.object({
  level: z.enum(["essential", "standard", "premium"]),
  name: z.string(),
  price: z.string(),
  selected: z.boolean(),
});
export type LevelOption = z.infer<typeof LevelOptionSchema>;

/** The one plan structure rendered on screen, in the PDF and in the email. */
export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string() }),
  z.object({ type: z.literal("bullets"), items: z.array(z.string()) }),
  z.object({
    type: z.literal("checklist"),
    items: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        /** One line on why this step matters (shown under the step). Written by code. */
        why: z.string().optional(),
        /** Catalog item ids that can fulfil this step, best first. Renderers show a Buy button for the first one
         *  that is in this plan's gear (so we never sell something the household already has). */
        buy: z.array(z.string()).optional(),
        /** An official resource for this step (state/county site). Never an affiliate link. */
        link: z.object({ label: z.string(), url: z.string().url() }).optional(),
      }),
    ),
  }),
  z.object({
    type: z.literal("table"),
    caption: z.string().optional(),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
  z.object({ type: z.literal("ifthen"), rows: z.array(z.object({ if: z.string(), then: z.string() })) }),
  z.object({
    type: z.literal("callout"),
    tone: z.enum(["danger", "warning", "info"]),
    title: z.string(),
    text: z.string(),
  }),
  z.object({ type: z.literal("subheading"), text: z.string() }),
  /** A level chooser for a slot that isn't a single product row (e.g. food: bulk staples vs freeze-dried). */
  z.object({ type: z.literal("levelchoice"), group: z.string(), caption: z.string(), levels: z.array(LevelOptionSchema) }),
  /** Gear with optional Buy buttons. Renderers build the tracked link from itemId (/go/<itemId>). */
  z.object({
    type: z.literal("products"),
    caption: z.string().optional(),
    /** Compact rows (name, qty, price, Buy) for the shopping list; full specs live in Recommended gear. */
    compact: z.boolean().optional(),
    items: z.array(
      z.object({
        itemId: z.string(),
        name: z.string(),
        category: z.string(),
        spec: z.string(),
        models: z.array(z.string()),
        price: z.string(),
        qty: z.string(),
        buyable: z.boolean(),
        /** À la carte: the slot this item fills and every level's price (the chosen one is selected). */
        group: z.string().optional(),
        levels: z.array(LevelOptionSchema).optional(),
        /** False for Amazon links (not allowed in email/PDF); emails link back to the plan page instead. */
        emailSafe: z.boolean().default(false),
        later: z.boolean(),
      }),
    ),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  summary: z.string(),
  blocks: z.array(BlockSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const PlanDocumentSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  generatedAt: z.string(),
  rulesVersion: z.string(),
  writer: z.enum(["template", "llm"]),
  sections: z.array(SectionSchema),
  disclaimer: z.string(),
  affiliateDisclosure: z.string().nullable(),
  sources: z.array(z.object({ name: z.string(), url: z.string() })),
});
export type PlanDocument = z.infer<typeof PlanDocumentSchema>;

export const SOURCES = [
  { name: "Ready.gov — Build a Kit & Make a Plan", url: "https://www.ready.gov/kit" },
  { name: "FEMA — Preparedness resources", url: "https://www.fema.gov/emergency-managers/individuals-communities" },
  { name: "CDC — Carbon monoxide poisoning prevention", url: "https://www.cdc.gov/carbon-monoxide/prevention/" },
  { name: "CDC — Power outages & food/water safety", url: "https://www.cdc.gov/natural-disasters/safety/power-outage-safety.html" },
  { name: "American Red Cross — Emergency preparedness", url: "https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html" },
  { name: "EPA — Emergency disinfection of drinking water", url: "https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water" },
  { name: "FoodSafety.gov — Food safety during power outages", url: "https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage" },
];

export const DISCLAIMER =
  `${BRAND.name} provides general preparedness guidance, not professional, medical, legal or electrical advice. ` +
  "Follow official instructions from local emergency management. Quantities are planning estimates. " +
  "Prices and products change — check current specs, recalls and reviews before you buy.";
