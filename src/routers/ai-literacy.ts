import { Router } from 'express'
import { authMiddleware } from './auth.js'
import { getProfileByUserId, supabase } from '../db/index.js'
import { getAILiteracyCurriculum } from '../services/ai-literacy.js'
import type { AgeGroup } from '../services/responsible-ai.js'

const router = Router()
router.use(authMiddleware)

router.get('/curriculum', async (req, res) => {
  const userId = (req as any).userId
  const profile = await getProfileByUserId(userId)
  if (!profile) return res.status(404).json({ message: 'Perfil não encontrado' })
  res.json(getAILiteracyCurriculum(profile.age_group as AgeGroup))
})

router.get('/progress', async (req, res) => {
  const userId = (req as any).userId
  const profile = await getProfileByUserId(userId)
  if (!profile) return res.status(404).json({ message: 'Perfil não encontrado' })
  const { data, error } = await supabase.from('ai_literacy_progress').select('*').eq('profile_id', profile.id)
  if (error) return res.status(500).json({ message: error.message })
  res.json({ progress: data || [] })
})

router.post('/evidence', async (req, res) => {
  const userId = (req as any).userId
  const profile = await getProfileByUserId(userId)
  if (!profile) return res.status(404).json({ message: 'Perfil não encontrado' })
  const { competencyKey, mastery, stage } = req.body
  if (!competencyKey || typeof mastery !== 'number') return res.status(400).json({ message: 'Competência e domínio são obrigatórios' })

  const { data: current } = await supabase.from('ai_literacy_progress').select('*').eq('profile_id', profile.id).eq('competency_key', competencyKey).maybeSingle()
  const { data, error } = await supabase.from('ai_literacy_progress').upsert({
    profile_id: profile.id,
    competency_key: competencyKey,
    stage: stage || 'learning',
    mastery: Math.max(0, Math.min(100, mastery)),
    evidence_count: (current?.evidence_count || 0) + 1,
    last_evidence_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id,competency_key' }).select().single()

  if (error) return res.status(500).json({ message: error.message })
  res.json({ success: true, progress: data })
})

export default router
