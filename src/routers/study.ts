import { Router } from 'express'
import {
  getProfileByUserId,
  updateProfile,
  createSession,
  endSession,
  saveMessage,
  getSessionMessages,
  addXP,
  getTodayUsage,
  incrementUsage,
} from '../db/index.js'
import { generateSocraticResponse, detectFrustration, calculateCognitiveLevel } from '../services/ai.js'
import { authMiddleware } from './auth.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const profile = await getProfileByUserId(req.userId)
    if (!profile) {
      return res.status(404).json({ message: 'Perfil não encontrado' })
    }
    res.json(profile)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Erro ao buscar perfil' })
  }
})

// Update profile
router.post('/profile/update', async (req, res) => {
  try {
    const { name, tutorId, petType, petName } = req.body
    const updates: any = {}
    if (name) updates.name = name
    if (tutorId) updates.tutor_id = tutorId
    if (petType) updates.pet_type = petType
    if (petName) updates.pet_name = petName

    const profile = await updateProfile(req.userId, updates)
    res.json(profile)
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Erro ao atualizar perfil' })
  }
})

// Start a new study session
router.post('/study/startSession', async (req, res) => {
  try {
    const { tutorId } = req.body
    const profile = await getProfileByUserId(req.userId)

    if (!profile) {
      return res.status(404).json({ message: 'Perfil não encontrado' })
    }

    const session = await createSession(profile.id, tutorId || 'default')
    res.json({ sessionId: session.id })
  } catch (error) {
    console.error('Start session error:', error)
    res.status(500).json({ message: 'Erro ao iniciar sessão' })
  }
})

// Send a message and get AI response
router.post('/study/sendMessage', async (req, res) => {
  try {
    const { sessionId, content, subject } = req.body

    if (!sessionId || !content) {
      return res.status(400).json({ message: 'Mensagem inválida' })
    }

    // Check rate limit (5 messages per day for free tier)
    const todayUsage = await getTodayUsage(req.userId)
    if (todayUsage && todayUsage.message_count >= 5) {
      return res.status(429).json({
        message: 'Limite diário atingido. Volte amanhã para mais aprendizado! 🌟',
      })
    }

    // Get profile for context
    const profile = await getProfileByUserId(req.userId)
    if (!profile) {
      return res.status(404).json({ message: 'Perfil não encontrado' })
    }

    // Save user message
    await saveMessage(sessionId, 'user', content)

    // Get conversation history
    const history = await getSessionMessages(sessionId)
    const conversationHistory = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Generate response
    let response: string
    try {
      response = await generateSocraticResponse(
        content,
        conversationHistory,
        profile.tutor_id,
        profile.age_group,
        profile.name,
        subject || 'geral'
      )
    } catch (aiError) {
      console.error('AI error:', aiError)
      response = 'Ops, tive um probleminha técnico. Pode tentar novamente?'
    }

    // Save AI response
    await saveMessage(sessionId, 'assistant', response)

    // Increment usage
    await incrementUsage(req.userId)

    // Add XP
    const xpEarned = 10
    await addXP(req.userId, xpEarned)

    // Calculate cognitive level
    const cognitiveLevel = calculateCognitiveLevel(conversationHistory)

    res.json({
      response,
      xpEarned,
      cognitiveLevel,
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ message: 'Erro ao processar mensagem' })
  }
})

// Get session history
router.get('/study/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const messages = await getSessionMessages(sessionId)

    res.json({
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
    })
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({ message: 'Erro ao buscar histórico' })
  }
})

// End session
router.post('/study/endSession', async (req, res) => {
  try {
    const { sessionId } = req.body
    await endSession(sessionId)
    res.json({ success: true })
  } catch (error) {
    console.error('End session error:', error)
    res.status(500).json({ message: 'Erro ao encerrar sessão' })
  }
})

// Check usage
router.get('/usage/check', async (req, res) => {
  try {
    const todayUsage = await getTodayUsage(req.userId)
    const messageCount = todayUsage?.message_count || 0
    const limit = 5

    res.json({
      remaining: Math.max(0, limit - messageCount),
      limit,
    })
  } catch (error) {
    console.error('Check usage error:', error)
    res.json({ remaining: 5, limit: 5 })
  }
})

// Claim daily bonus
router.post('/profile/claimDaily', async (req, res) => {
  try {
    const profile = await getProfileByUserId(req.userId)
    if (!profile) {
      return res.status(404).json({ message: 'Perfil não encontrado' })
    }

    // Add streak bonus
    const bonus = profile.streak * 10
    await addXP(req.userId, bonus)

    res.json({
      streak: profile.streak,
      bonus,
    })
  } catch (error) {
    console.error('Claim daily error:', error)
    res.status(500).json({ message: 'Erro ao resgatar bônus' })
  }
})

export default router