-- Accounts track (owner brief D4, Batch D). Behind ACCOUNTS_ENABLED. The owner applies migrations.
-- "My places": backup destinations (name, address, notes, optional distance), encrypted by the app.
-- Never used in emails, analytics or AI. Deleted with the user row.
alter table users add column if not exists places_json jsonb;
