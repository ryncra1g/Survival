-- Accounts track (owner brief D2, Batch D). Behind ACCOUNTS_ENABLED. The owner applies migrations.
-- Household inventory per plan (have / need / bought / low, quantity, optional expiry), encrypted by the
-- app (AES-256-GCM, lib/server/crypto.ts) like answers and plans. Deleted with the plan (cascade).
alter table plans add column if not exists inventory_json jsonb;
