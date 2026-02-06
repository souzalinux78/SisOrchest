import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { pingDb } from './db.js'
import routes from './routes/index.js'
import { optionalAuth } from './routes/utils.js'

export const createApp = () => {
  const app = express()

  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    next()
  })
  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json({ limit: '1mb' }))
  app.use(optionalAuth)

  const rateLimitStore = new Map()
  const rateLimit = (key, max, windowMs) => (req, res, next) => {
    const now = Date.now()
    const clientKey = `${req.ip}:${key}`
    const entry = rateLimitStore.get(clientKey) ?? { count: 0, start: now }
    if (now - entry.start > windowMs) {
      entry.count = 0
      entry.start = now
    }
    entry.count += 1
    rateLimitStore.set(clientKey, entry)
    if (entry.count > max) {
      return res.status(429).json({ message: 'Muitas tentativas. Tente novamente mais tarde.' })
    }
    return next()
  }

  app.get('/health', async (_req, res) => {
    try {
      await pingDb()
      res.json({ status: 'ok' })
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Falha ao conectar no banco.' })
    }
  })

  // Rate limiting para rotas específicas
  app.use('/api/auth/login', rateLimit('auth-login', 20, 15 * 60 * 1000))
  app.use('/api/users/register', rateLimit('users-register', 10, 15 * 60 * 1000))

  // Monta todas as rotas sob o prefixo /api
  app.use('/api', routes)

  // Handler 404 para rotas não encontradas
  app.use((_req, res) => {
    res.status(404).json({ message: 'Rota não encontrada.' })
  })

  // Error handler
  app.use((err, _req, res, _next) => {
    res.status(500).json({ message: 'Erro interno do servidor.' })
  })

  return app
}
