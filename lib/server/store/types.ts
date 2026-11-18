import type { CatalogItem } from "@/lib/catalog/types";

export interface UserRow {
  id: string;
  email: string;
  consent_at: string;
  double_opt_in_at: string | null;
  unsubscribed_at: string | null;
  followups_opt_in: boolean;
  created_at: string;
}

export interface QuestionnaireRow {
  id: string;
  user_id: string;
  /** Session that created it. Unconfirmed sessions can only see their own questionnaires. */
  session_nonce: string;
  /** Decrypted answers (draft or complete). Stored encrypted. */
  answers: Record<string, unknown>;
  complete: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: string;
  questionnaire_id: string;
  user_id: string;
  /** Decrypted. Stored encrypted. */
  computed_quantities: unknown;
  plan: unknown;
  pdf_url: string | null;
  emailed_at: string | null;
  writer: string;
  created_at: string;
}

export interface TokenRow {
  token_hash: string;
  user_id: string;
  purpose: "confirm" | "login";
  expires_at: string;
  used_at: string | null;
}

export interface EmailEventRow {
  id: string;
  user_id: string | null;
  type: string;
  provider_id: string | null;
  sent_at: string;
}

export interface RuleConstantsRow {
  version: number;
  overrides: unknown;
  created_by: string;
  created_at: string;
}

export interface Stats {
  signups: number;
  confirmed: number;
  questionnairesStarted: number;
  questionnairesCompleted: number;
  plansGenerated: number;
  emailsSent: number;
  emailOpens: number;
  unsubscribed: number;
}

export interface Store {
  getUserByEmail(email: string): Promise<UserRow | null>;
  getUser(id: string): Promise<UserRow | null>;
  createUser(u: Omit<UserRow, "id" | "created_at">): Promise<UserRow>;
  updateUser(id: string, patch: Partial<UserRow>): Promise<void>;
  listUsers(): Promise<UserRow[]>;
  /** GDPR/CCPA delete: user + all questionnaires, plans, tokens, events. */
  deleteUserCascade(id: string): Promise<void>;

  createQuestionnaire(q: Omit<QuestionnaireRow, "id" | "created_at" | "updated_at">): Promise<QuestionnaireRow>;
  getQuestionnaire(id: string): Promise<QuestionnaireRow | null>;
  updateQuestionnaire(id: string, patch: Partial<Pick<QuestionnaireRow, "answers" | "complete">>): Promise<void>;
  listQuestionnaires(userId: string): Promise<QuestionnaireRow[]>;

  createPlan(p: Omit<PlanRow, "id" | "created_at">): Promise<PlanRow>;
  getPlan(id: string): Promise<PlanRow | null>;
  updatePlan(id: string, patch: Partial<Pick<PlanRow, "pdf_url" | "emailed_at">>): Promise<void>;
  listPlans(userId: string): Promise<PlanRow[]>;

  createToken(t: TokenRow): Promise<void>;
  /** Atomically mark a token used; returns it if valid, unused and unexpired. */
  consumeToken(hash: string): Promise<TokenRow | null>;

  listCatalog(): Promise<CatalogItem[]>;
  upsertCatalogItem(item: CatalogItem): Promise<void>;
  deleteCatalogItem(id: string): Promise<void>;

  latestRuleConstants(): Promise<RuleConstantsRow | null>;
  saveRuleConstants(overrides: unknown, by: string): Promise<RuleConstantsRow>;

  addEmailEvent(e: Omit<EmailEventRow, "id">): Promise<void>;
  hasEmailEvent(userId: string, type: string): Promise<boolean>;
  listEmailEvents(userId: string): Promise<EmailEventRow[]>;

  /** Fixed-window rate limit. Returns true if the hit is allowed. */
  rateLimit(key: string, limit: number, windowSec: number): Promise<boolean>;

  stats(): Promise<Stats>;
}
