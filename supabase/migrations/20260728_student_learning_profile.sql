create table if not exists student_learning_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  primary_goal text,
  subjects text[] not null default '{}',
  learning_formats text[] not null default '{}',
  help_preferences text[] not null default '{}',
  challenges text[] not null default '{}',
  interests text[] not null default '{}',
  daily_minutes integer not null default 15 check (daily_minutes between 5 and 240),
  preferred_days integer[] not null default '{}',
  tutor_persona text not null default 'lumi',
  current_intention text,
  onboarding_version text not null default 'student-v1',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  title text not null,
  goal text,
  subject text,
  source text not null default 'personal' check (source in ('personal','school','program','family')),
  status text not null default 'active' check (status in ('draft','active','completed','paused','archived')),
  starts_at date,
  target_date date,
  weekly_minutes integer not null default 120,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists learning_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  study_plan_id uuid references study_plans(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  title text not null,
  description text,
  subject text,
  estimated_minutes integer not null default 10,
  mission_type text not null default 'learn' check (mission_type in ('diagnose','learn','practice','review','assess','project')),
  visibility text not null default 'private' check (visibility in ('private','family','teacher','school','program')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sharing_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  granted_by_user_id uuid not null references users(id),
  scope text[] not null default '{}',
  purpose text,
  consent_version text not null,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  unique (user_id, organization_id, consent_version)
);

create index if not exists idx_study_plans_user_status on study_plans(user_id, status);
create index if not exists idx_learning_missions_user_status on learning_missions(user_id, status, due_at);
create index if not exists idx_sharing_consents_user_org on sharing_consents(user_id, organization_id, status);