-- ReadyPlan schema. Apply with `supabase db push` or paste into the SQL editor.
-- All tables have RLS enabled and NO policies: only the server (service-role key) can access data.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent_at timestamptz not null,
  double_opt_in_at timestamptz,
  unsubscribed_at timestamptz,
  followups_opt_in boolean not null default true,
  created_at timestamptz not null default now()
);

-- answers_json holds AES-256-GCM ciphertext ({v, iv, tag, ct}) — never plaintext answers.
create table if not exists questionnaires (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_nonce text not null,
  answers_json jsonb not null,
  complete boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists questionnaires_user_idx on questionnaires(user_id);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references questionnaires(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  computed_quantities_json jsonb not null, -- encrypted
  plan_json jsonb not null,                -- encrypted
  pdf_url text,                            -- path in the private "plans" storage bucket
  emailed_at timestamptz,
  writer text not null default 'template',
  created_at timestamptz not null default now()
);
create index if not exists plans_user_idx on plans(user_id, created_at desc);

create table if not exists auth_tokens (
  token_hash text primary key,            -- sha256 of the magic-link token; raw token is never stored
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null check (purpose in ('confirm', 'login')),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists gear_catalog (
  id text primary key,
  category text not null,
  name text not null,
  spec text not null,
  models text[] not null default '{}',
  price_low numeric not null,
  price_high numeric not null,
  tier int not null check (tier between 1 and 4),
  phase int not null check (phase between 1 and 3),
  priority int not null default 50,
  qty text not null default '1',
  tags text[] not null default '{}',
  essential boolean not null default false,
  item_group text,
  requires_group text,
  bundle boolean not null default false,
  affiliate_url text,
  notes text not null default '',
  active boolean not null default true,
  reviewed_at date not null
);

create table if not exists rule_constants (
  version serial primary key,
  overrides jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null,          -- e.g. sent:confirm, sent:plan, sent:followup_day3, opened, bounced
  provider_id text,
  sent_at timestamptz not null default now()
);
create index if not exists email_events_user_type_idx on email_events(user_id, type);

create table if not exists rate_limits (
  key text primary key,
  count int not null,
  reset_at timestamptz not null
);

create or replace function rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql as $$
declare c int;
begin
  insert into rate_limits(key, count, reset_at) values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
    reset_at = case when rate_limits.reset_at < now() then now() + make_interval(secs => p_window_seconds) else rate_limits.reset_at end
  returning count into c;
  return c <= p_limit;
end $$;

alter table users enable row level security;
alter table questionnaires enable row level security;
alter table plans enable row level security;
alter table auth_tokens enable row level security;
alter table gear_catalog enable row level security;
alter table rule_constants enable row level security;
alter table email_events enable row level security;
alter table rate_limits enable row level security;

-- Private bucket for generated PDFs (signed URLs only).
insert into storage.buckets (id, name, public) values ('plans', 'plans', false) on conflict (id) do nothing;
