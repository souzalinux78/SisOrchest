import { Router } from 'express'
import { pool } from '../db.js'
import { handleError, requireAuth, resolveScopedCommonId } from './utils.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { common_id } = req.query ?? {}
    const filters = []
    const params = []

    const scopedCommonId = resolveScopedCommonId(req, common_id)
    if (scopedCommonId) {
      filters.push('s.common_id = ?')
      params.push(scopedCommonId)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const [rows] = await pool.query(
      `SELECT s.id, s.weekday, s.service_time, s.common_id,
              s.created_at, s.updated_at, c.name AS common_name
       FROM services s
       INNER JOIN commons c ON c.id = s.common_id
       ${whereClause}
       ORDER BY FIELD(s.weekday,'Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'), s.service_time ASC`,
      params,
    )

    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar cultos.')
  }
})

router.post('/', async (req, res) => {
  try {
    const { weekday, service_time, common_id } = req.body ?? {}

    if (!weekday || !service_time) {
      return res.status(400).json({ message: 'Dia e hora sao obrigatorios.' })
    }

    const scopedCommonId = resolveScopedCommonId(req, common_id, { requiredForAdmin: true })

    const [result] = await pool.query(
      `INSERT INTO services (weekday, service_time, common_id)
       VALUES (?, ?, ?)`,
      [weekday, service_time, scopedCommonId],
    )

    return res.status(201).json({ id: result.insertId })
  } catch (error) {
    return handleError(res, error, 'Erro ao criar culto.')
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { weekday, service_time, common_id } = req.body ?? {}

    if (!weekday || !service_time) {
      return res.status(400).json({ message: 'Dia e hora sao obrigatorios.' })
    }

    const params = [weekday, service_time]
    let scopeSql = ''

    if (req.user?.role === 'admin') {
      const scopedCommonId = resolveScopedCommonId(req, common_id, { requiredForAdmin: true })
      params.push(scopedCommonId, id)
      scopeSql = 'common_id = ?,'
    } else {
      params.push(id)
    }

    if (req.user?.role !== 'admin') {
      const scopedCommonId = resolveScopedCommonId(req, null)
      params.push(scopedCommonId)
    }

    const [result] = await pool.query(
      `UPDATE services
       SET weekday = ?, service_time = ?, ${scopeSql}
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?${req.user?.role === 'admin' ? '' : ' AND common_id = ?'}`,
      params,
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Culto nao encontrado.' })
    }

    return res.json({ message: 'Culto atualizado.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao atualizar culto.')
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

    const [result] = await pool.query(`DELETE FROM services WHERE id = ?${whereScope}`, params)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Culto nao encontrado.' })
    }

    return res.json({ message: 'Culto removido.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao remover culto.')
  }
})

export { router as servicesRouter }
