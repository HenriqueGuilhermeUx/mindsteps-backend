import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

import authRouter from './routers/auth.js'
import studyRouter from './routers/study.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration - allow all frontend domains
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow all origins for now (can be restricted later for security)
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Debug endpoint - test database connection
app.get('/debug/db', async (req, res) => {
  try {
    console.log('Testing database connection...')
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET')
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')

    const { data, error } = await supabase.from('users').select('count').limit(1)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details,
        hint: error.hint
      })
    }

    res.json({ success: true, message: 'Database connected!', data })
  } catch (err: any) {
    console.error('Connection error:', err)
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack
    })
  }
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api', studyRouter)

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  res.status(500).json({ message: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📚 MindSteps API ready!`)
})