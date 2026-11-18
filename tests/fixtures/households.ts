import { DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";

export const at = (over: Partial<Answers>): Answers => ({ ...DEFAULT_ANSWERS, zip: "11746", ...over });

export { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
