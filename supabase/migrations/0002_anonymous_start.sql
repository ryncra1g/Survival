-- Questionnaires can start before the email is collected (email is asked at the end).
alter table questionnaires alter column user_id drop not null;
create index if not exists questionnaires_anon_idx on questionnaires(updated_at) where user_id is null;
