import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { handleError } from './utils.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, common_name } = req.body ?? {}

    const normalizedName = String(name ?? '').trim()
    const normalizedEmail = String(email ?? '').trim().toLowerCase()
    const normalizedPhone = String(phone ?? '').replace(/\D/g, '')
    const normalizedPassword = String(password ?? '')
    const normalizedCommon = String(common_name ?? '').trim().toUpperCase()

    if (!normalizedName || !normalizedEmail || !normalizedPhone || !normalizedPassword || !normalizedCommon) {
      return res.status(400).json({ message: 'Nome, email, celular, senha e comum são obrigatórios.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'E-mail inválido.' })
    }

    if (normalizedName.length > 120 || normalizedCommon.length > 160) {
      return res.status(400).json({ message: 'Dados informados são muito longos.' })
    }

    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return res.status(400).json({ message: 'Celular inválido.' })
    }

    if (normalizedPassword.length < 6) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres.' })
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail])
    if (existingUser?.[0]?.id) {
      return res.status(409).json({ message: 'Email já cadastrado.' })
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10)

    const [existingCommons] = await pool.query('SELECT id FROM commons WHERE name = ? LIMIT 1', [
      normalizedCommon,
    ])
    let commonId = existingCommons?.[0]?.id
    if (!commonId) {
      const [commonResult] = await pool.query('INSERT INTO commons (name) VALUES (?)', [
        normalizedCommon,
      ])
      commonId = commonResult.insertId
    }

    await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status, common_id)
       VALUES (?, ?, ?, ?, 'manager', 'pending', ?)`,
      [normalizedName, normalizedEmail, normalizedPhone, passwordHash, commonId],
    )

    return res.status(201).json({ message: 'Cadastro enviado para aprovação do administrador.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao cadastrar usuário.')
  }
})

router.get('/', async (req, res) => {
  try {
    const { status } = req.query ?? {}
    const filters = []
    const params = []

    if (status) {
      filters.push('u.status = ?')
      params.push(status)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.common_id, c.name as common_name
       FROM users u
       LEFT JOIN commons c ON c.id = u.common_id
       ${whereClause}
       ORDER BY u.created_at DESC`,
      params,
    )

    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar usuários.')
  }
})

router.patch('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params
    const { approved_by, note } = req.body ?? {}

    if (!approved_by) {
      return res.status(400).json({ message: 'Aprovação deve informar o administrador.' })
    }
    if (req.user) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Apenas administrador pode aprovar usuários.' })
      }
      if (String(req.user.sub) !== String(approved_by)) {
        return res.status(400).json({ message: 'Administrador inválido para aprovação.' })
      }
    }
    if (note && String(note).length > 255) {
      return res.status(400).json({ message: 'Nota de aprovação muito longa.' })
    }

    const [result] = await pool.query(
      `UPDATE users SET status = 'approved' WHERE id = ?`,
      [id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' })
    }

    await pool.query(
      `INSERT INTO user_approval_audit (user_id, approved_by, note) VALUES (?, ?, ?)`,
      [id, approved_by, note ?? null],
    )

    return res.json({ message: 'Usuário aprovado.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao aprovar usuário.')
  }
})

export { router as usersRouter }
