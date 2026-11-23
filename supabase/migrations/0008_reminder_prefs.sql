-- Accounts track (owner brief D12, Batch D). Behind ACCOUNTS_ENABLED. The owner applies migrations.
-- Opt-in email reminder preferences ({ enabled, types: { <maintenance id>: { on, every } } }).
-- A separate switch from marketing (followups_opt_in). Not personal content; deleted with the user row.
alter table users add column if not exists reminder_prefs jsonb;
