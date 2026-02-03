import { Router } from 'express'
import { pool } from '../db.js'
import { handleError } from './utils.js'

const router = Router()

const normalizeServiceDate = (value) => {
  if (value === undefined || value === null || value === '') return null
  try {
    const trimmed = String(value).trim()
    if (!trimmed) return null
    
    // Aceita formato ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00`)
      if (Number.isNaN(parsed.getTime())) return null
      return trimmed
    }
    
    // Aceita formato brasileiro: DD/MM/YYYY
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    
    const [, day, month, year] = match
    const dayNum = Number(day)
    const monthNum = Number(month)
    const yearNum = Number(year)
    
    // Validação básica de ranges
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return null
    }
    
    const iso = `${year}-${month}-${day}`
    const parsed = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return null
    
    // Verifica se a data convertida corresponde aos valores originais (evita 31/02 virar 03/03)
    const parsedDay = parsed.getDate()
    const parsedMonth = parsed.getMonth() + 1
    const parsedYear = parsed.getFullYear()
    
    if (parsedDay !== dayNum || parsedMonth !== monthNum || parsedYear !== yearNum) {
      return null
    }
    
    return iso
  } catch (error) {
    console.error('Erro ao normalizar data:', { value, error: error.message })
    return null
  }
}

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

router.get('/visitors', async (req, res) => {
  try {
    const { service_id, service_date, cult_date, common_id } = req.query ?? {}
    const filters = []
    const params = []

    if (service_id !== undefined && service_id !== null && service_id !== '') {
      const serviceId = Number(service_id)
      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return res.status(400).json({ message: 'Culto inválido.' })
      }
      filters.push('v.service_id = ?')
      params.push(serviceId)
    }

    const dateValue = service_date ?? cult_date
    if (dateValue !== undefined && dateValue !== null && dateValue !== '') {
      const normalizedDate = normalizeServiceDate(dateValue)
      if (!normalizedDate) {
        return res.status(400).json({ message: 'Data do culto inválida. Use o formato DD/MM/AAAA ou YYYY-MM-DD.' })
      }
      filters.push('v.service_date = ?')
      params.push(normalizedDate)
    }

    if (common_id !== undefined && common_id !== null && common_id !== '') {
      const commonId = Number(common_id)
      if (!Number.isInteger(commonId) || commonId <= 0) {
        return res.status(400).json({ message: 'Comum inválida.' })
      }
      filters.push('s.common_id = ?')
      params.push(commonId)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const [rows] = await pool.query(
      `SELECT v.service_id, v.service_date, v.visitors_count, v.updated_at, s.common_id
       FROM attendance_visitors v
       INNER JOIN services s ON s.id = v.service_id
       ${whereClause}
       ORDER BY v.service_date DESC`,
      params,
    )

    return res.json(rows ?? [])
  } catch (error) {
    // Tratamento específico para erros do MySQL
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR') {
      console.error('Erro de SQL ao listar visitantes.', {
        query: req.query,
        error: error.message,
        code: error.code,
        sqlState: error.sqlState,
      })
      return res.status(500).json({ message: 'Erro interno no banco de dados. Contate o administrador.' })
    }

    console.error('Erro ao listar visitantes.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    })
    return handleError(res, error, 'Erro ao listar visitantes.')
  }
})

router.post('/visitors', async (req, res) => {
  try {
    const { service_id, service_date, visitors_count } = req.body ?? {}

    if (service_id === undefined || service_id === null || service_id === '') {
      return res.status(400).json({ message: 'Culto é obrigatório.' })
    }

    const serviceId = Number(service_id)
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({ message: 'Culto inválido.' })
    }

    if (service_date === undefined || service_date === null || service_date === '') {
      return res.status(400).json({ message: 'Data do culto é obrigatória.' })
    }

    const normalizedDate = normalizeServiceDate(service_date)
    if (!normalizedDate) {
      return res.status(400).json({ message: 'Data do culto inválida. Use o formato DD/MM/AAAA ou YYYY-MM-DD.' })
    }

    if (visitors_count === undefined || visitors_count === null || visitors_count === '') {
      return res.status(400).json({ message: 'Quantidade de visitantes é obrigatória.' })
    }

    const count = Number(visitors_count)
    if (Number.isNaN(count) || count < 0 || !Number.isInteger(count)) {
      return res.status(400).json({ message: 'Quantidade de visitantes inválida. Deve ser um número inteiro maior ou igual a zero.' })
    }

    // Validação: verificar se o service_id existe antes de inserir
    const [serviceCheck] = await pool.query(
      'SELECT id FROM services WHERE id = ?',
      [serviceId],
    )

    if (!serviceCheck || serviceCheck.length === 0) {
      return res.status(404).json({ message: 'Culto não encontrado.' })
    }

    await pool.query(
      `INSERT INTO attendance_visitors (service_id, service_date, visitors_count)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE visitors_count = VALUES(visitors_count), updated_at = CURRENT_TIMESTAMP`,
      [serviceId, normalizedDate, count],
    )

    return res.json({ message: 'Visitantes registrados.' })
  } catch (error) {
    // Tratamento específico para erros do MySQL
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      console.error('Erro de foreign key ao registrar visitantes.', {
        body: req.body,
        error: error.message,
        code: error.code,
      })
      return res.status(404).json({ message: 'Culto não encontrado ou inválido.' })
    }

    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Erro de duplicação ao registrar visitantes.', {
        body: req.body,
        error: error.message,
        code: error.code,
      })
      // Este erro não deveria ocorrer devido ao ON DUPLICATE KEY UPDATE, mas tratamos mesmo assim
      return res.status(409).json({ message: 'Registro duplicado. Tente novamente.' })
    }

    if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR') {
      console.error('Erro de SQL ao registrar visitantes.', {
        body: req.body,
        error: error.message,
        code: error.code,
        sqlState: error.sqlState,
      })
      return res.status(500).json({ message: 'Erro interno no banco de dados. Contate o administrador.' })
    }

    console.error('Erro ao registrar visitantes.', {
      body: req.body,
      error: error.message,
      stack: error.stack,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    })
    return handleError(res, error, 'Erro ao registrar visitantes.')
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
