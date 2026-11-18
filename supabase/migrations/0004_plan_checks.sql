-- Checklist ticks follow the plan across devices (ids only; not sensitive).
alter table plans add column if not exists checks jsonb not null default '{}'::jsonb;
