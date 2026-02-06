import { pool } from '../db.js'

/**
 * Repositório para operações de banco de dados relacionadas a presenças
 */

/**
 * Lista presenças com filtros opcionais
 * @param {Object} filters - Filtros opcionais
 * @param {number|null} filters.service_id - ID do culto
 * @param {number|null} filters.common_id - ID da comum
 * @returns {Promise<Array>} Array de presenças
 */
export const listAttendance = async (filters = {}) => {
  const { service_id, common_id } = filters
  const params = []
  const whereFilters = []

  if (service_id) {
    whereFilters.push('a.service_id = ?')
    params.push(service_id)
  }

  if (common_id) {
    whereFilters.push('m.common_id = ?')
    params.push(common_id)
  }

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(' AND ')}` : ''

  const [rows] = await pool.query(
    `SELECT a.id, a.service_id, a.musician_id, a.status, a.service_weekday, a.service_date, a.recorded_at,
            m.name, m.instrument, m.common_id
     FROM attendance a
     INNER JOIN musicians m ON m.id = a.musician_id
     ${whereClause}
     ORDER BY a.service_date DESC, m.name ASC`,
    params,
  )

  return rows ?? []
}

/**
 * Lista visitantes com filtros opcionais
 * @param {Object} filters - Filtros opcionais
 * @param {number|null} filters.service_id - ID do culto
 * @param {string|null} filters.service_date - Data do culto (formato YYYY-MM-DD)
 * @param {number|null} filters.common_id - ID da comum
 * @returns {Promise<Array>} Array de visitantes
 */
export const listVisitors = async (filters = {}) => {
  const { service_id, service_date, common_id } = filters
  const whereFilters = []
  const params = []

  if (service_id !== undefined && service_id !== null && service_id !== '') {
    whereFilters.push('v.service_id = ?')
    params.push(service_id)
  }

  if (service_date !== undefined && service_date !== null && service_date !== '') {
    whereFilters.push('v.service_date = ?')
    params.push(service_date)
  }

  if (common_id !== undefined && common_id !== null && common_id !== '') {
    whereFilters.push('s.common_id = ?')
    params.push(common_id)
  }

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(' AND ')}` : ''

  const [rows] = await pool.query(
    `SELECT v.service_id, v.service_date, v.visitors_count, v.updated_at, s.common_id
     FROM attendance_visitors v
     INNER JOIN services s ON s.id = v.service_id
     ${whereClause}
     ORDER BY v.service_date DESC`,
    params,
  )

  return rows ?? []
}

/**
 * Verifica se um culto existe
 * @param {number} serviceId - ID do culto
 * @returns {Promise<Array>} Array com o resultado da verificação
 */
export const checkServiceExists = async (serviceId) => {
  const [rows] = await pool.query(
    'SELECT id FROM services WHERE id = ?',
    [serviceId],
  )

  return rows ?? []
}

/**
 * Insere ou atualiza visitantes
 * @param {number} serviceId - ID do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @param {number} visitorsCount - Quantidade de visitantes
 * @returns {Promise<void>}
 */
export const upsertVisitors = async (serviceId, serviceDate, visitorsCount) => {
  await pool.query(
    `INSERT INTO attendance_visitors (service_id, service_date, visitors_count)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE visitors_count = VALUES(visitors_count), updated_at = CURRENT_TIMESTAMP`,
    [serviceId, serviceDate, visitorsCount],
  )
}

/**
 * Insere ou atualiza presença
 * @param {number} serviceId - ID do culto
 * @param {number} musicianId - ID do músico
 * @param {string} status - Status da presença ('present' ou 'absent')
 * @param {string} serviceWeekday - Dia da semana do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<void>}
 */
export const upsertAttendance = async (serviceId, musicianId, status, serviceWeekday, serviceDate) => {
  await pool.query(
    `INSERT INTO attendance (service_id, musician_id, status, service_weekday, service_date)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), service_weekday = VALUES(service_weekday), service_date = VALUES(service_date), recorded_at = CURRENT_TIMESTAMP`,
    [serviceId, musicianId, status ?? 'present', serviceWeekday, serviceDate],
  )
}
