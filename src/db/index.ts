import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types (UUID compatible)
export interface User {
  id: string
  email: string
  password_hash: string
  created_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  name: string
  age_group: '6-10' | '11-14' | '15-17'
  grade: string
  xp: number
  level: number
  streak: number
  last_study_date: string | null
  tutor_id: string
  pet_type: string | null
  pet_name: string | null
  pet_xp: number
  created_at: string
}

export interface StudySession {
  id: string
  profile_id: string
  tutor_id: string
  subject: string
  started_at: string
  ended_at: string | null
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface DailyUsage {
  id: string
  user_id: string
  date: string
  message_count: number
}

// Helper functions
export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) return null
  return data as User
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as User
}

export async function createUser(email: string, passwordHash: string) {
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: passwordHash })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as User
}

export async function getProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as StudentProfile
}

export async function createProfile(userId: string, name: string, ageGroup: string, grade: string) {
  const { data, error } = await supabase
    .from('student_profiles')
    .insert({
      user_id: userId,
      name,
      age_group: ageGroup,
      grade,
      xp: 0,
      level: 1,
      streak: 0,
      tutor_id: 'default',
      pet_xp: 0,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as StudentProfile
}

export async function updateProfile(userId: string, updates: Partial<StudentProfile>) {
  const { data, error } = await supabase
    .from('student_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as StudentProfile
}

export async function createSession(profileId: string, tutorId: string) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      profile_id: profileId,
      tutor_id: tutorId,
      subject: 'geral',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as StudySession
}

export async function endSession(sessionId: string) {
  const { error } = await supabase
    .from('study_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw new Error(error.message)
}

export async function saveMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ChatMessage
}

export async function getSessionMessages(sessionId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data as ChatMessage[]
}

export async function getTodayUsage(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data as DailyUsage | null
}

export async function incrementUsage(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('daily_usage')
      .update({ message_count: existing.message_count + 1 })
      .eq('id', existing.id)

    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('daily_usage')
      .insert({
        user_id: userId,
        date: today,
        message_count: 1,
      })

    if (error) throw new Error(error.message)
  }
}

export async function addXP(userId: string, amount: number) {
  const profile = await getProfileByUserId(userId)
  if (!profile) throw new Error('Profile not found')

  const newXP = profile.xp + amount
  let newLevel = profile.level

  // Level up calculation
  if (newXP >= 100 && profile.level === 1) newLevel = 2
  else if (newXP >= 300 && profile.level === 2) newLevel = 3
  else if (newXP >= 600 && profile.level === 3) newLevel = 4
  else if (newXP >= 1000 && profile.level === 4) newLevel = 5
  else if (newXP >= 1500 && profile.level === 5) newLevel = 6

  await updateProfile(userId, { xp: newXP, level: newLevel })

  // Update streak
  const today = new Date().toISOString().split('T')[0]
  if (profile.last_study_date !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    let newStreak = profile.last_study_date === yesterdayStr ? profile.streak + 1 : 1

    await updateProfile(userId, {
      streak: newStreak,
      last_study_date: today,
    })
  }
}