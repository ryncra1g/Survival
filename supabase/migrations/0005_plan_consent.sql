-- Clickwrap record per plan: Terms version, when they were accepted, and when health-adjacent answers
-- (prescriptions, powered medical devices, mobility) were consented to. Null for plans built before this.
-- Encrypted like answers and plans (AES-256-GCM, lib/server/crypto.ts): the health timestamp reveals that a
-- household answered yes to a health question.
alter table plans add column if not exists consent_json jsonb;
