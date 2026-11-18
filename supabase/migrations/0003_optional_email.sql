-- Email is optional: plans can exist before (or without) an email address.
alter table plans alter column user_id drop not null;
create index if not exists email_events_type_idx on email_events(type);
