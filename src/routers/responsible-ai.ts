import { Router } from 'express'
import { authMiddleware } from './auth.js'
import { getProfileByUserId, supabase } from '../db/index.js'
import { explainRecommendation, resolveAgePolicy } from '../services/responsible-ai.js'

const router = Router()
router.use(authMiddleware)

router.get('/policy', async (req, res) => {
  const userId = (req as any).userId
  const profile = await getProfileByUserId(userId)
  if (!profile) return res.status(404).json({ message: 'Perfil não encontrado' })

  res.json({
    policy: resolveAgePolicy({ ageGroup: profile.age_group, grade: profile.grade }),
    principles: ['aprendizagem ativa','supervisão humana','explicabilidade','privacidade','autoria','equidade','verificação crítica'],
  })
})

router.get('/registry', async (_req, res) => {
  const { data, error } = await supabase.from('ai_system_registry').select('*').order('created_at', { ascending: true })
  if (error) return res.status(500).json({ message: error.message })
  res.json({ systems: data || [] })
})

router.post('/override', async (req, res) => {
  const userId = (req as any).userId
  const profile = await getProfileByUserId(userId)
  const { interactionEventId, decision, reason, actorRole = 'student' } = req.body

  if (!['accepted','adjusted','rejected','reported'].includes(decision)) {
    return res.status(400).json({ message: 'Decisão inválida' })
  }

  const { data, error } = await supabase.from('ai_human_overrides').insert({
    interaction_event_id: interactionEventId || null,
    user_id: userId,
    profile_id: profile?.id || null,
    actor_role: actorRole,
    decision,
    reason: reason || null,
  }).select().single()

  if (error) return res.status(500).json({ message: error.message })
  res.json({ success: true, override: data })
})

router.post('/incident', async (req, res) => {
  const userId = (req as any).userId
  const { systemKey = 'socratic_tutor', category, severity = 'low', description } = req.body
  if (!category || !description) return res.status(400).json({ message: 'Categoria e descrição são obrigatórias' })

  const { data, error } = await supabase.from('ai_incidents').insert({
    system_key: systemKey,
    reporter_user_id: userId,
    category,
    severity,
    description,
  }).select().single()

  if (error) return res.status(500).json({ message: error.message })
  res.json({ success: true, incident: data })
})

router.post('/explain', async (req, res) => {
  const { reason, evidence = [], confidence = 'medium' } = req.body
  if (!reason) return res.status(400).json({ message: 'Motivo obrigatório' })
  res.json(explainRecommendation(reason, evidence, confidence))
})

export default router
