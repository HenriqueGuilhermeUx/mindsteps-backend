import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import {
  getUserByEmail,
  createUser,
  getProfileByUserId,
  createProfile,
} from '../db/index.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  age: z.string().optional(),
  grade: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

// Register
router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body)

    // Check if user exists
    const existingUser = await getUserByEmail(body.email)
    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10)

    // Create user
    const user = await createUser(body.email, passwordHash)

    // Create profile
    const profile = await createProfile(
      user.id,
      body.name,
      body.age || '11-14',
      body.grade || '6'
    )

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: user.id, email: user.email },
      profile,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error('Register error:', error)
    res.status(500).json({ message: 'Erro ao criar conta' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body)

    // Find user
    const user = await getUserByEmail(body.email)
    if (!user) {
      return res.status(401).json({ message: 'Email ou senha incorretos' })
    }

    // Check password
    const validPassword = await bcrypt.compare(body.password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou senha incorretos' })
    }

    // Get profile
    const profile = await getProfileByUserId(user.id)

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: user.id, email: user.email },
      profile,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message })
    }
    console.error('Login error:', error)
    res.status(500).json({ message: 'Erro ao fazer login' })
  }
})

// Middleware to verify JWT
export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ message: 'Token inválido' })
  }
}

export default router