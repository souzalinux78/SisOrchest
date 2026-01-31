import { Router } from 'express'
import { pool } from '../db.js'
import { handleError } from './utils.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { status, common_id } = req.query ?? {}
    const filters = []
    const params = []

    if (status) {
      filters.push('status = ?')
      params.push(status)
    }

    if (common_id) {
      filters.push('common_id = ?')
      params.push(common_id)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const [rows] = await pool.query(
      `SELECT id, name, instrument, phone, email, status, common_id, created_at, updated_at
       FROM musicians ${whereClause} ORDER BY name ASC`,
      params,
    )

    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar músicos.')
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, instrument, phone, email, status, common_id } = req.body ?? {}

    if (!name || !instrument || !common_id) {
      return res.status(400).json({ message: 'Nome, instrumento e comum são obrigatórios.' })
    }

    const [result] = await pool.query(
      `INSERT INTO musicians (name, instrument, phone, email, status, common_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, instrument, phone ?? null, email ?? null, status ?? 'active', common_id],
    )

    return res.status(201).json({ id: result.insertId })
  } catch (error) {
    return handleError(res, error, 'Erro ao criar músico.')
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, instrument, phone, email, status } = req.body ?? {}

    if (!name || !instrument) {
      return res.status(400).json({ message: 'Nome e instrumento são obrigatórios.' })
    }

    const [result] = await pool.query(
      `UPDATE musicians
       SET name = ?, instrument = ?, phone = ?, email = ?, status = ?
       WHERE id = ?`,
      [name, instrument, phone ?? null, email ?? null, status ?? 'active', id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Músico não encontrado.' })
    }

    return res.json({ message: 'Músico atualizado.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao atualizar músico.')
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM musicians WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Músico não encontrado.' })
    }

    return res.json({ message: 'Músico removido.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao remover músico.')
  }
})

export { router as musiciansRouter }
