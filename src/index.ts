import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import { supabase } from './db/index.js'
import authRouter from './routers/auth.js'
import studyRouter from './routers/study.js'
import operationsRouter from './routers/operations.js'
import todayRouter from './routers/today.js'

const app = express()
const PORT = process.env.PORT || 3001

const corsOptions = {
  origin: function (_origin: any, callback: any) {
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MindSteps API', version: '1.2.0', timestamp: new Date().toISOString() })
})

app.get('/debug/db', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      return res.status(500).json({ success: false, error: error.message, details: error.details, hint: error.hint })
    }
    res.json({ success: true, message: 'Database connected!', data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/auth/register', (_req, res) => {
  res.json({
    message: 'Register endpoint ready',
    method: 'POST required',
    example: { email: 'test@example.com', password: '123456', name: 'Test' },
  })
})

app.use('/api/auth', authRouter)
app.use('/api', studyRouter)
app.use('/api/operations', operationsRouter)
app.use('/api/operations', todayRouter)

app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' })
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ message: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log('📚 MindSteps API ready!')
})
