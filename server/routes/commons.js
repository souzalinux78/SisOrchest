import { Router } from 'express'
import { pool } from '../db.js'
import { handleError } from './utils.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at, updated_at FROM commons ORDER BY name ASC',
    )
    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar comuns.')
  }
})

router.post('/', async (req, res) => {
  try {
    const { name } = req.body ?? {}
    if (!name) {
      return res.status(400).json({ message: 'Nome da comum é obrigatório.' })
    }

    const normalizedName = String(name).trim().toUpperCase()
    const [result] = await pool.query('INSERT INTO commons (name) VALUES (?)', [normalizedName])
    return res.status(201).json({ id: result.insertId })
  } catch (error) {
    return handleError(res, error, 'Erro ao criar comum.')
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM commons WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Comum não encontrada.' })
    }
    return res.json({ message: 'Comum removida.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao remover comum.')
  }
})

export { router as commonsRouter }
