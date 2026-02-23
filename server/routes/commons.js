import { Router } from 'express'
import { pool } from '../db.js'
import { handleError, requireAuth, requireRole, resolveScopedCommonId } from './utils.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin'
    if (isAdmin) {
      const [rows] = await pool.query(
        'SELECT id, name, created_at, updated_at FROM commons ORDER BY name ASC',
      )
      return res.json(rows ?? [])
    }

    const scopedCommonId = resolveScopedCommonId(req, null)
    const [rows] = await pool.query(
      'SELECT id, name, created_at, updated_at FROM commons WHERE id = ? ORDER BY name ASC',
      [scopedCommonId],
    )
    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar comuns.')
  }
})

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body ?? {}
    if (!name) {
      return res.status(400).json({ message: 'Nome da comum e obrigatorio.' })
    }

    const normalizedName = String(name).trim().toUpperCase()
    const [result] = await pool.query('INSERT INTO commons (name) VALUES (?)', [normalizedName])
    return res.status(201).json({ id: result.insertId })
  } catch (error) {
    return handleError(res, error, 'Erro ao criar comum.')
  }
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM commons WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Comum nao encontrada.' })
    }
    return res.json({ message: 'Comum removida.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao remover comum.')
  }
})

export { router as commonsRouter }
