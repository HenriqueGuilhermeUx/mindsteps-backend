-- MindSteps Responsible AI Core
-- Governance, explainability, human oversight, provenance and AI literacy foundation.

create table if not exists ai_system_registry (
  id uuid primary key default gen_random_uuid(),
  system_key text unique not null,
  name text not null,
  purpose text not null,
  audience text[] not null default '{}',
  data_categories text[] not null default '{}',
  risks jsonb not null default '[]'::jsonb,
  mitigations jsonb not null default '[]'::jsonb,
  human_oversight text not null,
  status text not null default 'active' check (status in ('draft','active','paused','retired')),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  profile_id uuid,
  session_id uuid,
  system_key text not null,
  event_type text not null,
  age_group text,
  subject text,
  policy_mode text,
  direct_answer_allowed boolean,
  cognitive_guard_triggered boolean not null default false,
  confidence text check (confidence is null or confidence in ('low','medium','high')),
  explanation jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_events_profile_created on ai_interaction_events(profile_id, created_at desc);
create index if not exists idx_ai_events_system_created on ai_interaction_events(system_key, created_at desc);

create table if not exists ai_human_overrides (
  id uuid primary key default gen_random_uuid(),
  interaction_event_id uuid references ai_interaction_events(id) on delete set null,
  user_id uuid,
  profile_id uuid,
  actor_role text not null check (actor_role in ('student','teacher','guardian','coordinator','admin')),
  decision text not null check (decision in ('accepted','adjusted','rejected','reported')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists ai_incidents (
  id uuid primary key default gen_random_uuid(),
  system_key text not null,
  reporter_user_id uuid,
  category text not null,
  severity text not null default 'low' check (severity in ('low','medium','high','critical')),
  description text not null,
  status text not null default 'open' check (status in ('open','investigating','mitigated','closed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists authorship_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  profile_id uuid,
  artifact_type text not null,
  artifact_id text,
  event_type text not null check (event_type in ('student_created','ai_feedback','ai_suggestion','suggestion_accepted','suggestion_rejected','student_revised','finalized')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_literacy_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  competency_key text not null,
  stage text not null,
  mastery numeric(5,2) not null default 0 check (mastery >= 0 and mastery <= 100),
  evidence_count integer not null default 0,
  last_evidence_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, competency_key)
);

insert into ai_system_registry(system_key, name, purpose, audience, data_categories, risks, mitigations, human_oversight, status)
values (
  'socratic_tutor',
  'Tutor Socrático MindSteps',
  'Apoiar aprendizagem ativa por diálogo, pistas, explicações graduais e personalização pedagógica.',
  array['student'],
  array['age_group','grade','study_interactions','subject'],
  '["resposta factual incorreta","dependência cognitiva","conteúdo inadequado à idade","viés"]'::jsonb,
  '["age policy","cognitive effort guard","verificação crítica","human override","monitoramento"]'::jsonb,
  'Professor, responsável ou equipe pedagógica pode revisar, ajustar, rejeitar ou reportar recomendações.',
  'active'
)
on conflict (system_key) do update set
  purpose = excluded.purpose,
  risks = excluded.risks,
  mitigations = excluded.mitigations,
  human_oversight = excluded.human_oversight,
  updated_at = now();
