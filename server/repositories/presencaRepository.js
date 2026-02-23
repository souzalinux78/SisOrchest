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
  const [rows] = await pool.query('SELECT id, common_id FROM services WHERE id = ?', [serviceId])
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
export const gerarRelatorioPresenca = async (commonId, mes, ano, diaSemana = null, ocorrenciaSemana = null, specificDate = null) => {
  const params = [commonId, mes, ano]
  let weekdayFilter = ''
  let ocorrenciaFilter = ''
  let dateFilter = ''

  if (specificDate) {
    dateFilter = 'AND DATE(a.service_date) = ?'
    params.push(specificDate)
  } else if (diaSemana) {
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
       ${dateFilter}
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
export const listarCultosComPresenca = async (mes, ano, commonId = null) => {
  const params = [mes, ano]
  let commonFilter = ''
  if (commonId) {
    commonFilter = 'AND s.common_id = ?'
    params.push(commonId)
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT a.service_id AS id, a.service_date AS data
     FROM attendance a
     INNER JOIN services s ON s.id = a.service_id
     WHERE MONTH(a.service_date) = ? AND YEAR(a.service_date) = ?
     ${commonFilter}
     ORDER BY a.service_date DESC`,
    params,
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
export const gerarHistoricoPorData = async (commonId, mes, ano, diaSemana = null, specificDate = null) => {
  let whereClause = 'WHERE s.common_id = ?'
  const params = [commonId]

  if (specificDate) {
    whereClause += ' AND DATE(a.service_date) = ?'
    params.push(specificDate)
  } else {
    whereClause += ' AND MONTH(a.service_date) = ? AND YEAR(a.service_date) = ?'
    params.push(mes, ano)

    if (diaSemana) {
      whereClause += ' AND s.weekday = ?'
      params.push(diaSemana)
    }
  }

  const [rows] = await pool.query(
    `SELECT
       a.service_date,
       s.weekday,
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presencas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS faltas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     ${whereClause}
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
export const buscarDadosRelatorioExecutivo = async (commonId, month, year, weekday = null, specificDate = null) => {
  let whereClause = 'WHERE s.common_id = ?'
  const params = [commonId]

  if (specificDate) {
    whereClause += ' AND DATE(a.service_date) = ?'
    params.push(specificDate)
  } else {
    whereClause += ' AND MONTH(a.service_date) = ? AND YEAR(a.service_date) = ?'
    params.push(month, year)

    if (weekday) {
      whereClause += ' AND s.weekday = ?'
      params.push(weekday)
    }
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
     ${whereClause}`,
    params,
  )
  const totalCultosDistintos = servicesRows?.[0]?.total ?? 0

  // Busca presenças e faltas
  // Reutiliza whereClause e params, mas precisa adicionar filtro de status ativo do musico?
  // A query original tinha: AND m.status = 'active'
  // Precisamos tomar cuidado pois whereClause já tem o WHERE.
  // Vamos concatenar AND m.status = 'active'

  const [attendanceRows] = await pool.query(
    `SELECT
       SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS total_presencas,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS total_faltas
     FROM services s
     INNER JOIN attendance a ON a.service_id = s.id
     INNER JOIN musicians m ON m.id = a.musician_id
     ${whereClause}
       AND m.status = 'active'`,
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

/**
 * Busca ranking de músicos por faltas e presenças
 * @param {number} commonId - ID da comum
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @returns {Promise<Array>} Array com ranking de músicos
 */
export const buscarRankingMusicos = async (commonId, month, year, weekday = null, specificDate = null) => {
  const params = [month, year, commonId]
  let weekdayFilter = ''
  let dateFilter = ''

  if (specificDate) {
    dateFilter = 'AND DATE(a.service_date) = ?'
    params.push(specificDate)
  } else if (weekday) {
    weekdayFilter = 'AND s.weekday = ?'
    params.push(weekday)
  }

  const [rows] = await pool.query(
    `SELECT
       m.id,
       m.name,
       COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.service_id END) AS presencas,
       COUNT(DISTINCT CASE WHEN a.status = 'absent' THEN a.service_id END) AS faltas
     FROM musicians m
     LEFT JOIN attendance a
       ON a.musician_id = m.id
       AND MONTH(a.service_date) = ?
       AND YEAR(a.service_date) = ?
       ${dateFilter}
     LEFT JOIN services s ON s.id = a.service_id
     WHERE m.common_id = ?
       AND m.status = 'active'
       ${weekdayFilter}
     GROUP BY m.id, m.name
     HAVING presencas > 0 OR faltas > 0
     ORDER BY faltas DESC, presencas ASC`,
    params,
  )

  return rows ?? []
}

/**
 * Busca nome da comum por ID
 * @param {number} commonId - ID da comum
 * @returns {Promise<string|null>} Nome da comum
 */
export const buscarNomeComum = async (commonId) => {
  const [rows] = await pool.query('SELECT name FROM commons WHERE id = ?', [commonId])
  return rows?.[0]?.name ?? null
}

/**
 * Busca datas dos serviços realizados no período
 */
export const buscarDatasServicos = async (commonId, month, year, weekday = null, specificDate = null) => {
  const params = [commonId, month, year]
  let detailFilter = ''

  if (specificDate) {
    detailFilter = 'AND DATE(a.service_date) = ?'
    params.push(specificDate)
  } else if (weekday) {
    detailFilter = 'AND a.service_weekday = ?'
    params.push(weekday)
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT service_date, service_weekday as weekday 
     FROM attendance a
     INNER JOIN services s ON s.id = a.service_id
     WHERE s.common_id = ? 
       AND MONTH(a.service_date) = ? 
       AND YEAR(a.service_date) = ? 
       ${detailFilter}
     ORDER BY service_date ASC`,
    params
  )
  return rows ?? []
}

/**
 * Busca músicos presentes agrupados por data no período
 */
export const buscarMusicosPresentesPorData = async (commonId, month, year, weekday = null, specificDate = null) => {
  let whereClause = 'WHERE s.common_id = ? AND a.status = ?'
  const params = [commonId, 'present']

  if (specificDate) {
    whereClause += ' AND DATE(a.service_date) = ?'
    params.push(specificDate)
  } else {
    whereClause += ' AND MONTH(a.service_date) = ? AND YEAR(a.service_date) = ?'
    params.push(month, year)

    if (weekday) {
      whereClause += ' AND s.weekday = ?'
      params.push(weekday)
    }
  }

  const [rows] = await pool.query(
    `SELECT a.service_date, s.weekday, m.name AS musician_name
     FROM attendance a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN musicians m ON m.id = a.musician_id
     ${whereClause}
     ORDER BY a.service_date DESC, m.name ASC`,
    params,
  )

  return rows ?? []
}
