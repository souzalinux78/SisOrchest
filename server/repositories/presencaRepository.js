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
  const params = []
  const whereFilters = []

  if (service_id) {
    whereFilters.push('av.service_id = ?')
    params.push(service_id)
  }

  if (service_date) {
    whereFilters.push('av.service_date = ?')
    params.push(service_date)
  }

  if (common_id) {
    whereFilters.push('s.common_id = ?')
    params.push(common_id)
  }

  const whereClause = whereFilters.length ? `WHERE ${whereFilters.join(' AND ')}` : ''

  const [rows] = await pool.query(
    `SELECT av.service_id, av.service_date, av.visitors_count, s.common_id
     FROM attendance_visitors av
     INNER JOIN services s ON s.id = av.service_id
     ${whereClause}
     ORDER BY av.service_date DESC`,
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
  const [rows] = await pool.query('SELECT id FROM services WHERE id = ?', [serviceId])
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
     ON DUPLICATE KEY UPDATE visitors_count = ?`,
    [serviceId, serviceDate, visitorsCount, visitorsCount],
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
     ON DUPLICATE KEY UPDATE status = ?, service_weekday = ?, service_date = ?`,
    [serviceId, musicianId, status, serviceWeekday, serviceDate, status, serviceWeekday, serviceDate],
  )
}

/**
 * Busca músicos escalados para um culto
 * @param {number} serviceId - ID do culto
 * @returns {Promise<Array>} Array de músicos escalados
 */
export const buscarMusicosEscalados = async (serviceId) => {
  const [rows] = await pool.query(
    `SELECT m.id, m.name, m.instrument, m.common_id
     FROM musicians m
     INNER JOIN services s ON s.id = ? AND s.common_id = m.common_id
     WHERE m.status = 'active'`,
    [serviceId],
  )
  return rows ?? []
}

/**
 * Verifica se um registro de presença existe
 * @param {number} serviceId - ID do culto
 * @param {number} musicianId - ID do músico
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<Array>} Array com o resultado da verificação
 */
export const verificarRegistroExiste = async (serviceId, musicianId, serviceDate) => {
  const [rows] = await pool.query(
    'SELECT id FROM attendance WHERE service_id = ? AND musician_id = ? AND service_date = ?',
    [serviceId, musicianId, serviceDate],
  )
  return rows ?? []
}

/**
 * Busca músicos ativos de uma comum
 * @param {number} commonId - ID da comum
 * @returns {Promise<Array>} Array de músicos ativos
 */
export const buscarMusicosAtivosComum = async (commonId) => {
  const [rows] = await pool.query(
    'SELECT id, name, instrument FROM musicians WHERE common_id = ? AND status = ?',
    [commonId, 'active'],
  )
  return rows ?? []
}

/**
 * Insere registro de ausência
 * @param {number} serviceId - ID do culto
 * @param {number} musicianId - ID do músico
 * @param {string} serviceWeekday - Dia da semana do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<void>}
 */
export const inserirRegistroAusente = async (serviceId, musicianId, serviceWeekday, serviceDate) => {
  await pool.query(
    `INSERT INTO attendance (service_id, musician_id, status, service_weekday, service_date)
     VALUES (?, ?, 'absent', ?, ?)
     ON DUPLICATE KEY UPDATE status = 'absent'`,
    [serviceId, musicianId, serviceWeekday, serviceDate],
  )
}

/**
 * Atualiza registro para presente
 * @param {number} serviceId - ID do culto
 * @param {number} musicianId - ID do músico
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<void>}
 */
export const atualizarRegistroPresente = async (serviceId, musicianId, serviceDate) => {
  await pool.query(
    'UPDATE attendance SET status = ? WHERE service_id = ? AND musician_id = ? AND service_date = ?',
    ['present', serviceId, musicianId, serviceDate],
  )
}

/**
 * Busca IDs de músicos que já têm registro de presença
 * @param {number} serviceId - ID do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<Array>} Array de IDs de músicos
 */
export const buscarMusicosComRegistro = async (serviceId, serviceDate) => {
  const [rows] = await pool.query(
    'SELECT DISTINCT musician_id FROM attendance WHERE service_id = ? AND service_date = ?',
    [serviceId, serviceDate],
  )
  return rows ?? []
}

/**
 * Salva presenças de um culto (insere faltas automaticamente)
 * @param {number} serviceId - ID do culto
 * @param {Array<number>} presentesIds - Array de IDs de músicos presentes
 * @param {string} serviceWeekday - Dia da semana do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<void>}
 */
export const salvarPresencasCulto = async (serviceId, presentesIds, serviceWeekday, serviceDate) => {
  // Busca common_id do culto
  const [serviceRows] = await pool.query('SELECT common_id FROM services WHERE id = ?', [serviceId])
  if (!serviceRows || serviceRows.length === 0) {
    throw new Error('Culto não encontrado')
  }
  const commonId = serviceRows[0].common_id

  // Busca todos os músicos ativos da comum
  const musicosAtivos = await buscarMusicosAtivosComum(commonId)
  const musicosAtivosIds = musicosAtivos.map((m) => m.id)

  // Busca músicos que já têm registro
  const musicosComRegistro = await buscarMusicosComRegistro(serviceId, serviceDate)
  const musicosComRegistroIds = musicosComRegistro.map((r) => r.musician_id)

  // Identifica músicos sem registro
  const musicosSemRegistro = musicosAtivosIds.filter((id) => !musicosComRegistroIds.includes(id))

  // Insere faltas em lote para músicos sem registro
  if (musicosSemRegistro.length > 0) {
    const values = musicosSemRegistro.map(() => '(?, ?, ?, ?, ?)').join(', ')
    const params = musicosSemRegistro.flatMap((id) => [serviceId, id, 'absent', serviceWeekday, serviceDate])
    await pool.query(
      `INSERT INTO attendance (service_id, musician_id, status, service_weekday, service_date)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE status = 'absent'`,
      params,
    )
  }

  // Atualiza presenças em lote
  if (presentesIds.length > 0) {
    const placeholders = presentesIds.map(() => '?').join(', ')
    await pool.query(
      `UPDATE attendance
       SET status = 'present'
       WHERE service_id = ? AND musician_id IN (${placeholders}) AND service_date = ?`,
      [serviceId, ...presentesIds, serviceDate],
    )
  }

  // Atualiza faltas em lote para músicos que não estão na lista de presentes
  const ausentesIds = musicosAtivosIds.filter((id) => !presentesIds.includes(id))
  if (ausentesIds.length > 0) {
    const placeholders = ausentesIds.map(() => '?').join(', ')
    await pool.query(
      `UPDATE attendance
       SET status = 'absent'
       WHERE service_id = ? AND musician_id IN (${placeholders}) AND service_date = ?`,
      [serviceId, ...ausentesIds, serviceDate],
    )
  }
}

/**
 * Gera relatório de presença
 * @param {number} commonId - ID da comum
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @param {number|null} ocorrenciaSemana - Ocorrência da semana no mês (1-5, opcional)
 * @returns {Promise<Array>} Array com dados do relatório
 */
export const gerarRelatorioPresenca = async (commonId, mes, ano, diaSemana = null, ocorrenciaSemana = null) => {
  const params = [commonId, mes, ano]
  let weekdayFilter = ''
  let ocorrenciaFilter = ''

  if (diaSemana) {
    weekdayFilter = 'AND s.weekday = ?'
    params.push(diaSemana)
  }

  if (ocorrenciaSemana) {
    ocorrenciaFilter = 'AND FLOOR((DAY(a.service_date)-1)/7)+1 = ?'
    params.push(ocorrenciaSemana)
  }

  const [rows] = await pool.query(
    `SELECT
       m.id,
       m.name AS nome,
       COUNT(DISTINCT a.service_id) AS total_escalas,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_presencas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_faltas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     INNER JOIN musicians m ON m.id = a.musician_id
     WHERE s.common_id = ?
       AND MONTH(a.service_date) = ?
       AND YEAR(a.service_date) = ?
       ${weekdayFilter}
       ${ocorrenciaFilter}
     GROUP BY m.id, m.name
     ORDER BY m.name ASC`,
    params,
  )

  return rows ?? []
}

/**
 * Lista cultos com presença registrada
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano
 * @returns {Promise<Array>} Array com dados dos cultos
 */
export const listarCultosComPresenca = async (mes, ano) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT a.service_id AS id, a.service_date AS data
     FROM attendance a
     WHERE MONTH(a.service_date) = ? AND YEAR(a.service_date) = ?
     ORDER BY a.service_date DESC`,
    [mes, ano],
  )

  return rows ?? []
}

/**
 * Gera ranking de faltas do período
 * @param {number} commonId - ID da comum
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @returns {Promise<Array>} Array com dados do ranking
 */
export const gerarRankingFaltasPeriodo = async (commonId, mes, ano, diaSemana = null) => {
  const params = [commonId, mes, ano]
  let weekdayFilter = ''

  if (diaSemana) {
    weekdayFilter = 'AND s.weekday = ?'
    params.push(diaSemana)
  }

  const [rows] = await pool.query(
    `SELECT
       m.id,
       m.name AS nome,
       COUNT(DISTINCT a.service_id) AS total_escalas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_faltas,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_presencas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     INNER JOIN musicians m ON m.id = a.musician_id
     WHERE s.common_id = ?
       AND MONTH(a.service_date) = ?
       AND YEAR(a.service_date) = ?
       ${weekdayFilter}
     GROUP BY m.id, m.name
     HAVING COUNT(a.id) > 0
     ORDER BY total_faltas DESC`,
    params,
  )

  return rows ?? []
}

/**
 * Gera histórico de presença por data
 * @param {number} commonId - ID da comum
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @returns {Promise<Array>} Array com histórico por data
 */
export const gerarHistoricoPorData = async (commonId, mes, ano, diaSemana = null) => {
  const params = [commonId, mes, ano]
  let weekdayFilter = ''

  if (diaSemana) {
    weekdayFilter = 'AND s.weekday = ?'
    params.push(diaSemana)
  }

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
       ${weekdayFilter}
     GROUP BY a.service_date, s.weekday
     ORDER BY a.service_date DESC`,
    params,
  )

  return rows ?? []
}

/**
 * Busca dados para relatório executivo
 * @param {number} commonId - ID da comum
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @param {string|null} weekday - Dia da semana (opcional)
 * @returns {Promise<Object>} Objeto com dados do relatório
 */
export const buscarDadosRelatorioExecutivo = async (commonId, month, year, weekday = null) => {
  const params = [commonId, month, year]
  let weekdayFilter = ''

  if (weekday) {
    weekdayFilter = 'AND s.weekday = ?'
    params.push(weekday)
  }

  // Busca músicos ativos da comum
  const [musiciansRows] = await pool.query(
    'SELECT COUNT(*) AS total FROM musicians WHERE common_id = ? AND status = ?',
    [commonId, 'active'],
  )
  const totalMusicos = musiciansRows?.[0]?.total ?? 0

  // Busca cultos distintos do período
  const [servicesRows] = await pool.query(
    `SELECT COUNT(DISTINCT a.service_id) AS total
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     WHERE s.common_id = ?
       AND MONTH(a.service_date) = ?
       AND YEAR(a.service_date) = ?
       ${weekdayFilter}`,
    params,
  )
  const totalCultosDistintos = servicesRows?.[0]?.total ?? 0

  // Busca presenças e faltas
  const [attendanceRows] = await pool.query(
    `SELECT
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_presencas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_faltas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     INNER JOIN musicians m ON m.id = a.musician_id
     WHERE s.common_id = ?
       AND MONTH(a.service_date) = ?
       AND YEAR(a.service_date) = ?
       AND m.status = 'active'
       ${weekdayFilter}`,
    params,
  )

  const totalPresencas = Number(attendanceRows?.[0]?.total_presencas) || 0
  const totalFaltas = Number(attendanceRows?.[0]?.total_faltas) || 0

  return {
    total_musicos: Number(totalMusicos) || 0,
    total_cultos_distintos: Number(totalCultosDistintos) || 0,
    total_presencas: totalPresencas,
    total_faltas: totalFaltas,
  }
}
