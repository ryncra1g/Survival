/**
 * Plan, questionnaire and user ids are UUID v4, lowercase: `crypto.randomUUID()` in the file store and
 * `gen_random_uuid()` in Postgres. Routes check this exact format before any store lookup (security review
 * Low 6) and answer 404 when it doesn't match.
 */
export const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isId = (s: unknown): s is string => typeof s === "string" && ID_RE.test(s);
