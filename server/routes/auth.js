import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { config } from '../config.js'
import { handleError } from './utils.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {}

    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    const normalizedPassword = String(password ?? '')

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: 'Informe e-mail e senha.' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'E-mail inválido.' })
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, password_hash, role, status, common_id
       FROM users WHERE email = ? LIMIT 1`,
      [normalizedEmail],
    )

    const user = rows?.[0]
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    const isValid = await bcrypt.compare(normalizedPassword, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ message: 'Conta aguardando aprovação do administrador.' })
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
        common_id: user.common_id,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.accessTtl },
    )

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      common_id: user.common_id,
      access_token: token,
      token_type: 'Bearer',
      expires_in: config.jwt.accessTtl,
    })
  } catch (error) {
    return handleError(res, error, 'Erro ao autenticar.')
  }
})

export { router as authRouter }
