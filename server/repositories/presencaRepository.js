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

/**
 * Busca músicos escalados para um culto (todos os músicos ativos da mesma comum)
 * @param {number} serviceId - ID do culto
 * @returns {Promise<Array>} Array com IDs dos músicos escalados
 */
export const buscarMusicosEscalados = async (serviceId) => {
  const [rows] = await pool.query(
    `SELECT m.id
     FROM services s
     INNER JOIN musicians m ON m.common_id = s.common_id
     WHERE s.id = ? AND m.status = 'active'
     ORDER BY m.name ASC`,
    [serviceId],
  )
  return rows ?? []
}

/**
 * Salva presenças e faltas para todos os músicos escalados de um culto
 * @param {number} serviceId - ID do culto
 * @param {Array<number>} presentesIds - Array com IDs dos músicos presentes
 * @param {string} serviceWeekday - Dia da semana do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<void>}
 */
export const salvarPresencasCulto = async (serviceId, presentesIds, serviceWeekday, serviceDate) => {
  // Busca todos os músicos escalados
  const musicosEscalados = await buscarMusicosEscalados(serviceId)
  const presentesSet = new Set(presentesIds.map(id => Number(id)))

  // Prepara os dados para inserção em lote
  const valores = musicosEscalados.map((musico) => {
    const status = presentesSet.has(musico.id) ? 'present' : 'absent'
    return [serviceId, musico.id, status, serviceWeekday, serviceDate]
  })

  if (valores.length === 0) {
    return
  }

  // Insere ou atualiza em lote usando INSERT ... ON DUPLICATE KEY UPDATE
  const placeholders = valores.map(() => '(?, ?, ?, ?, ?)').join(', ')
  const params = valores.flat()

  await pool.query(
    `INSERT INTO attendance (service_id, musician_id, status, service_weekday, service_date)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE 
       status = VALUES(status), 
       service_weekday = VALUES(service_weekday), 
       service_date = VALUES(service_date), 
       recorded_at = CURRENT_TIMESTAMP`,
    params,
  )
}

/**
 * Gera relatório de presença agrupado por músico
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {string|null} diaSemana - Dia da semana opcional (string como "Domingo", "Segunda", etc.)
 * @returns {Promise<Array>} Array com relatório de presenças por músico
 */
export const gerarRelatorioPresenca = async (commonId, mes, ano, diaSemana = null) => {
  const params = []
  const whereFilters = []

  // Filtro obrigatório por comum
  whereFilters.push('s.common_id = ?')
  params.push(commonId)

  // Filtro por mês e ano da data do culto
  whereFilters.push('MONTH(a.service_date) = ?')
  params.push(mes)
  whereFilters.push('YEAR(a.service_date) = ?')
  params.push(ano)

  // Filtro opcional por dia da semana usando services.weekday (string)
  if (diaSemana !== null && diaSemana !== undefined && diaSemana !== '') {
    // Se for número (1-7), converte para nome do dia da semana
    let diaSemanaFiltro = diaSemana
    if (typeof diaSemana === 'number') {
      const diasSemana = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      if (diaSemana >= 1 && diaSemana <= 7) {
        diaSemanaFiltro = diasSemana[diaSemana]
      }
    }
    whereFilters.push('s.weekday = ?')
    params.push(diaSemanaFiltro)
  }

  const whereClause = `WHERE ${whereFilters.join(' AND ')}`

  const [rows] = await pool.query(
    `SELECT 
       m.id,
       m.name as nome,
       COUNT(*) as total_escalas,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as total_presencas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as total_faltas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     INNER JOIN musicians m ON m.id = a.musician_id
     ${whereClause}
     GROUP BY m.id, m.name`,
    params,
  )

  return rows ?? []
}

/**
 * Lista cultos que possuem pelo menos uma presença registrada
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @returns {Promise<Array>} Array com cultos que possuem presenças registradas
 */
export const listarCultosComPresenca = async (mes, ano) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT
       a.service_id AS id,
       a.service_date AS data
     FROM attendance a
     WHERE MONTH(a.service_date) = ?
     AND YEAR(a.service_date) = ?
     ORDER BY a.service_date DESC`,
    [mes, ano],
  )

  return rows ?? []
}

/**
 * Gera ranking de faltas por período agrupado por músico
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {string|null} diaSemana - Dia da semana opcional (string como "Domingo", "Segunda", etc.)
 * @returns {Promise<Array>} Array com ranking de faltas por músico
 */
export const gerarRankingFaltasPeriodo = async (commonId, mes, ano, diaSemana = null) => {
  const params = []
  const whereFilters = []

  // Filtro obrigatório por comum
  whereFilters.push('s.common_id = ?')
  params.push(commonId)

  // Filtro por mês e ano da data do culto
  whereFilters.push('MONTH(a.service_date) = ?')
  params.push(mes)
  whereFilters.push('YEAR(a.service_date) = ?')
  params.push(ano)

  // Filtro opcional por dia da semana usando services.weekday (string)
  if (diaSemana !== null && diaSemana !== undefined && diaSemana !== '') {
    // Se for número (1-7), converte para nome do dia da semana
    let diaSemanaFiltro = diaSemana
    if (typeof diaSemana === 'number') {
      const diasSemana = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      if (diaSemana >= 1 && diaSemana <= 7) {
        diaSemanaFiltro = diasSemana[diaSemana]
      }
    }
    whereFilters.push('s.weekday = ?')
    params.push(diaSemanaFiltro)
  }

  const whereClause = `WHERE ${whereFilters.join(' AND ')}`

  const [rows] = await pool.query(
    `SELECT 
       m.id,
       m.name,
       COUNT(*) AS total_escalas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_faltas,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_presencas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     INNER JOIN musicians m ON m.id = a.musician_id
     ${whereClause}
     GROUP BY m.id, m.name
     HAVING COUNT(*) > 0`,
    params,
  )

  return rows ?? []
}

/**
 * Gera histórico de presenças e faltas por data
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @returns {Promise<Array>} Array com histórico por data
 */
export const gerarHistoricoPorData = async (commonId, mes, ano) => {
  const [rows] = await pool.query(
    `SELECT
       a.service_date,
       s.weekday,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presencas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS faltas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     WHERE s.common_id = ?
     AND MONTH(a.service_date) = ?
     AND YEAR(a.service_date) = ?
     GROUP BY a.service_date, s.weekday
     ORDER BY a.service_date DESC`,
    [commonId, mes, ano],
  )

  return rows ?? []
}
