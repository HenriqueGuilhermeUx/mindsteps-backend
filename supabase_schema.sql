-- MindSteps Database Schema - Versão UUID (Supabase Compatible)
-- Run this in Supabase SQL Editor

-- ============================================
-- EXTENSÃO UUID
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Users table (usa UUID como padrão do Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student profiles
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT NOT NULL DEFAULT '11-14',
  grade TEXT DEFAULT '6',
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_study_date DATE,
  tutor_id TEXT DEFAULT 'default',
  pet_type TEXT,
  pet_name TEXT,
  pet_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study sessions
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  tutor_id TEXT DEFAULT 'default',
  subject TEXT DEFAULT 'geral',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily usage tracking
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_user_id ON student_profiles(user_id);
CREATE INDEX idx_sessions_profile_id ON study_sessions(profile_id);
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_usage_user_date ON daily_usage(user_id, date);

-- ============================================
-- Row Level Security (DESABILITADO para JWT custom)
-- ============================================
-- A segurança é garantida pelo middleware JWT no backend Node.js

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'student_profiles', 'study_sessions', 'chat_messages', 'daily_usage');