import { Router } from 'express'
import { pool } from '../db.js'
import { handleError } from './utils.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { service_id, common_id } = req.query ?? {}
    const params = []
    const filters = []

    if (service_id) {
      filters.push('a.service_id = ?')
      params.push(service_id)
    }

    if (common_id) {
      filters.push('m.common_id = ?')
      params.push(common_id)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const [rows] = await pool.query(
      `SELECT a.id, a.service_id, a.musician_id, a.status, a.service_weekday, a.service_date, a.recorded_at,
              m.name, m.instrument, m.common_id
       FROM attendance a
       INNER JOIN musicians m ON m.id = a.musician_id
       ${whereClause}
       ORDER BY a.service_date DESC, m.name ASC`,
      params,
    )

    return res.json(rows ?? [])
  } catch (error) {
    return handleError(res, error, 'Erro ao listar presenças.')
  }
})

router.post('/', async (req, res) => {
  try {
    const { service_id, musician_id, status, service_weekday, service_date } = req.body ?? {}

    if (!service_id || !musician_id || !service_weekday || !service_date) {
      return res.status(400).json({ message: 'Dados do culto e músico são obrigatórios.' })
    }

    await pool.query(
      `INSERT INTO attendance (service_id, musician_id, status, service_weekday, service_date)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), service_weekday = VALUES(service_weekday), service_date = VALUES(service_date), recorded_at = CURRENT_TIMESTAMP`,
      [service_id, musician_id, status ?? 'present', service_weekday, service_date],
    )

    return res.json({ message: 'Presença registrada.' })
  } catch (error) {
    return handleError(res, error, 'Erro ao registrar presença.')
  }
})

export { router as attendanceRouter }
