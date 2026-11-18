-- Clickwrap record per plan: Terms version, when they were accepted, and when health-adjacent answers
-- (prescriptions, powered medical devices, mobility) were consented to. Null for plans built before this.
alter table plans add column if not exists consent jsonb;
