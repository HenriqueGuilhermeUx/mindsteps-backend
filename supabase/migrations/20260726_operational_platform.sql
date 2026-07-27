create extension if not exists "pgcrypto";

create table if not exists user_roles (
  user_id uuid primary key references users(id) on delete cascade,
  role text not null check (role in ('independente','aluno','familia','professor','coordenacao','direcao','rede')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('escola','rede','curso','familia')),
  owner_user_id uuid not null references users(id),
  status text not null default 'pilot' check (status in ('pilot','active','paused','archived')),
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  role text not null,
  token text not null unique,
  invited_by uuid not null references users(id),
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists onboarding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  audience text not null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  subject text,
  target_date date,
  weekly_minutes integer not null default 120,
  status text not null default 'active' check (status in ('active','completed','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists adoption_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  organization_id uuid references organizations(id) on delete cascade,
  event_name text not null,
  audience text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_onboarding_events_user on onboarding_events(user_id, created_at desc);
create index if not exists idx_adoption_events_org on adoption_events(organization_id, created_at desc);
create index if not exists idx_invitations_email on invitations(lower(email), status);
create index if not exists idx_learning_goals_user on learning_goals(user_id, status);
