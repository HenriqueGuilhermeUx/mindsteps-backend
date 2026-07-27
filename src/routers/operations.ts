import { Router } from 'express'
import crypto from 'node:crypto'
import { z } from 'zod'
import { supabase } from '../db/index.js'
import { authMiddleware } from './auth.js'

const router = Router()
router.use(authMiddleware)

const audienceSchema = z.enum(['independente','aluno','familia','professor','coordenacao','direcao','rede'])

router.get('/me/role', async (req: any, res) => {
  const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', req.userId).maybeSingle()
  if (error) return res.status(500).json({ message: error.message })
  res.json({ role: data })
})

router.put('/me/role', async (req: any, res) => {
  try {
    const body = z.object({ role: audienceSchema, onboardingCompleted: z.boolean().optional() }).parse(req.body)
    const { data, error } = await supabase.from('user_roles').upsert({
      user_id: req.userId,
      role: body.role,
      onboarding_completed: body.onboardingCompleted ?? false,
      updated_at: new Date().toISOString(),
    }).select().single()
    if (error) throw error
    res.json(data)
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Dados inválidos' })
  }
})

router.post('/onboarding/events', async (req: any, res) => {
  try {
    const body = z.object({ audience: audienceSchema, eventName: z.string().min(2), metadata: z.record(z.unknown()).optional() }).parse(req.body)
    const { data, error } = await supabase.from('onboarding_events').insert({
      user_id: req.userId,
      audience: body.audience,
      event_name: body.eventName,
      metadata: body.metadata || {},
    }).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Não foi possível registrar o onboarding' })
  }
})

router.get('/learning-goals', async (req: any, res) => {
  const { data, error } = await supabase.from('learning_goals').select('*').eq('user_id', req.userId).order('created_at', { ascending: false })
  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

router.post('/learning-goals', async (req: any, res) => {
  try {
    const body = z.object({
      title: z.string().min(3),
      subject: z.string().optional(),
      targetDate: z.string().optional(),
      weeklyMinutes: z.number().int().min(15).max(3000).default(120),
    }).parse(req.body)
    const { data, error } = await supabase.from('learning_goals').insert({
      user_id: req.userId,
      title: body.title,
      subject: body.subject || null,
      target_date: body.targetDate || null,
      weekly_minutes: body.weeklyMinutes,
    }).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Meta inválida' })
  }
})

router.post('/organizations', async (req: any, res) => {
  try {
    const body = z.object({ name: z.string().min(2), type: z.enum(['escola','rede','curso','familia']) }).parse(req.body)
    const { data: organization, error } = await supabase.from('organizations').insert({
      name: body.name,
      type: body.type,
      owner_user_id: req.userId,
    }).select().single()
    if (error) throw error
    await supabase.from('organization_members').insert({ organization_id: organization.id, user_id: req.userId, role: 'owner' })
    res.status(201).json(organization)
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Não foi possível criar a organização' })
  }
})

router.get('/organizations', async (req: any, res) => {
  const { data, error } = await supabase.from('organization_members').select('role,status,organizations(*)').eq('user_id', req.userId)
  if (error) return res.status(500).json({ message: error.message })
  res.json(data)
})

router.post('/organizations/:organizationId/invitations', async (req: any, res) => {
  try {
    const body = z.object({ email: z.string().email(), role: z.string().min(2) }).parse(req.body)
    const { data: membership } = await supabase.from('organization_members').select('role').eq('organization_id', req.params.organizationId).eq('user_id', req.userId).maybeSingle()
    if (!membership) return res.status(403).json({ message: 'Sem permissão para convidar usuários' })
    const token = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase.from('invitations').insert({
      organization_id: req.params.organizationId,
      email: body.email.toLowerCase(),
      role: body.role,
      token,
      invited_by: req.userId,
      expires_at: expiresAt,
    }).select().single()
    if (error) throw error
    res.status(201).json({ ...data, acceptancePath: `/convite/${token}` })
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Convite inválido' })
  }
})

router.post('/adoption/events', async (req: any, res) => {
  try {
    const body = z.object({ organizationId: z.string().uuid().optional(), eventName: z.string().min(2), audience: audienceSchema.optional(), metadata: z.record(z.unknown()).optional() }).parse(req.body)
    const { data, error } = await supabase.from('adoption_events').insert({
      user_id: req.userId,
      organization_id: body.organizationId || null,
      event_name: body.eventName,
      audience: body.audience || null,
      metadata: body.metadata || {},
    }).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Evento inválido' })
  }
})

router.get('/organizations/:organizationId/adoption-summary', async (req: any, res) => {
  const { data, error } = await supabase.from('adoption_events').select('event_name,audience,user_id,created_at').eq('organization_id', req.params.organizationId)
  if (error) return res.status(500).json({ message: error.message })
  const events = data || []
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.event_name] = (acc[event.event_name] || 0) + 1
    return acc
  }, {})
  const activeUsers = new Set(events.map((event) => event.user_id).filter(Boolean)).size
  res.json({ organizationId: req.params.organizationId, totalEvents: events.length, activeUsers, counts })
})

export default router
