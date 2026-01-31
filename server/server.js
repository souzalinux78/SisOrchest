import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { pool } from './db.js'
import { createApp } from './app.js'

const bootstrapAdmin = async () => {
  if (!config.bootstrapAdmin) return

  const [rows] = await pool.query('SELECT COUNT(*) as total FROM users')
  const total = rows?.[0]?.total ?? 0
  if (total > 0) return

  const passwordHash = await bcrypt.hash(config.admin.password, 10)
  await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, status)
     VALUES (?, ?, ?, ?, 'admin', 'approved')`,
    [config.admin.name, config.admin.email, config.admin.phone ?? null, passwordHash],
  )
}

const startServer = async () => {
  if (config.admin.password === 'SisOrchest@2026') {
    console.warn('ATENÇÃO: ADMIN_PASSWORD padrão em uso. Configure um valor seguro no ambiente.')
  }
  if (config.environment === 'production' && config.corsOrigin === '*') {
    console.warn('ATENÇÃO: CORS_ORIGIN está aberto em produção.')
  }
  if (config.jwt.secret === 'change-me') {
    console.warn('ATENÇÃO: JWT_SECRET padrão em uso. Configure um valor seguro no ambiente.')
  }
  await bootstrapAdmin()
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`SisOrchest API rodando na porta ${config.port}`)
  })
}

startServer()
