import { Router } from 'express'
import { supabase } from '../db/index.js'
import { authMiddleware } from './auth.js'

const router = Router()
router.use(authMiddleware)

router.get('/me/today', async (req: any, res) => {
  try {
    const [profileResult, missionResult, plansResult, completedResult, membershipsResult] = await Promise.all([
      supabase
        .from('student_learning_profiles')
        .select('primary_goal,subjects,daily_minutes,tutor_persona')
        .eq('user_id', req.userId)
        .maybeSingle(),
      supabase
        .from('learning_missions')
        .select('id,title,description,subject,estimated_minutes,mission_type,status,created_at')
        .eq('user_id', req.userId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('study_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('status', 'active'),
      supabase
        .from('learning_missions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('status', 'completed'),
      supabase
        .from('organization_members')
        .select('role,status,organizations(id,name,type)')
        .eq('user_id', req.userId)
        .eq('status', 'active'),
    ])

    const firstError = [profileResult.error, missionResult.error, plansResult.error, completedResult.error, membershipsResult.error].find(Boolean)
    if (firstError) throw firstError

    const { count: pendingMissions, error: pendingError } = await supabase
      .from('learning_missions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .in('status', ['pending', 'in_progress'])

    if (pendingError) throw pendingError

    res.json({
      learningProfile: profileResult.data,
      mission: missionResult.data,
      stats: {
        missionsCompleted: completedResult.count || 0,
        activePlans: plansResult.count || 0,
        pendingMissions: pendingMissions || 0,
      },
      organizations: membershipsResult.data || [],
    })
  } catch (error: any) {
    console.error('Today overview error:', error)
    res.status(500).json({ message: error.message || 'Não foi possível carregar seu dia' })
  }
})

export default router
