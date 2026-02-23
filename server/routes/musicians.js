import { Router } from 'express'
import { pool } from '../db.js'
import { handleError, requireAuth, resolveScopedCommonId } from './utils.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { status, common_id } = req.query ?? {}
    const filters = []
    const params = []

    if (status) {
      filters.push('status = ?')
      params.push(status)
    }

    const scopedCommonId = resolveScopedCommonId(req, common_id)
    if (scopedCommonId) {
      filters.push('common_id = ?')
      params.push(scopedCommonId)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const [rows] = await pool.query(
      `SELECT id, name, instrument, phone, email, status, common_id, created_at, updated_at
       FROM musicians ${whereClause} ORDER BY name ASC`,
      params,
    )

    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar musicos.')
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, instrument, phone, email, status, common_id } = req.body ?? {}

    if (!name || !instrument) {
      return res.status(400).json({ message: 'Nome e instrumento sao obrigatorios.' })
    }

    const scopedCommonId = resolveScopedCommonId(req, common_id, { requiredForAdmin: true })

    const [result] = await pool.query(
      `INSERT INTO musicians (name, instrument, phone, email, status, common_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, instrument, phone ?? null, email ?? null, status ?? 'active', scopedCommonId],
    )

    return res.status(201).json({ id: result.insertId })
  } catch (error) {
    return handleError(res, error, 'Erro ao criar musico.')
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, instrument, phone, email, status } = req.body ?? {}

    if (!name || !instrument) {
      return res.status(400).json({ message: 'Nome e instrumento sao obrigatorios.' })
    }

    const params = [name, instrument, phone ?? null, email ?? null, status ?? 'active', id]
    let whereScope = ''
    if (req.user?.role !== 'admin') {
      const scopedCommonId = resolveScopedCommonId(req, null)
      whereScope = ' AND common_id = ?'
      params.push(scopedCommonId)
    }

    const [result] = await pool.query(
      `UPDATE musicians
       SET name = ?, instrument = ?, phone = ?, email = ?, status = ?
       WHERE id = ?${whereScope}`,
      params,
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Musico nao encontrado.' })
    }

    return res.json({ message: 'Musico atualizado.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao atualizar musico.')
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const params = [id]
    let whereScope = ''

    if (req.user?.role !== 'admin') {
      const scopedCommonId = resolveScopedCommonId(req, null)
      whereScope = ' AND common_id = ?'
      params.push(scopedCommonId)
    }

    const [result] = await pool.query(`DELETE FROM musicians WHERE id = ?${whereScope}`, params)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Musico nao encontrado.' })
    }

    return res.json({ message: 'Musico removido.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao remover musico.')
  }
})

export { router as musiciansRouter }
