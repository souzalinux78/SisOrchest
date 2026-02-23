import * as presencaRepository from '../repositories/presencaRepository.js'

/**
 * Service para operações de negócio relacionadas a presenças
 * Camada intermediária entre controllers e repositories
 */

/**
 * Lista presenças com filtros opcionais
 * @param {Object} filters - Filtros opcionais
 * @param {number|null} filters.service_id - ID do culto
 * @param {number|null} filters.common_id - ID da comum
 * @returns {Promise<Array>} Array de presenças
 */
export async function listarPresencas(filters = {}) {
  return await presencaRepository.listAttendance(filters)
}

/**
 * Lista visitantes com filtros opcionais
 * @param {Object} filters - Filtros opcionais
 * @param {number|null} filters.service_id - ID do culto
 * @param {string|null} filters.service_date - Data do culto (formato YYYY-MM-DD)
 * @param {number|null} filters.common_id - ID da comum
 * @returns {Promise<Array>} Array de visitantes
 */
export async function listarVisitantes(filters = {}) {
  return await presencaRepository.listVisitors(filters)
}

/**
 * Verifica se um culto existe
 * @param {number} serviceId - ID do culto
 * @returns {Promise<Array>} Array com o resultado da verificação
 */
export async function verificarCultoExiste(serviceId) {
  return await presencaRepository.checkServiceExists(serviceId)
}

/**
 * Insere ou atualiza visitantes
 * @param {number} serviceId - ID do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @param {number} visitorsCount - Quantidade de visitantes
 * @returns {Promise<void>}
 */
export async function salvarVisitantes(serviceId, serviceDate, visitorsCount) {
  return await presencaRepository.upsertVisitors(serviceId, serviceDate, visitorsCount)
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
export async function salvarPresenca(serviceId, musicianId, status, serviceWeekday, serviceDate) {
  return await presencaRepository.upsertAttendance(serviceId, musicianId, status, serviceWeekday, serviceDate)
}

/**
 * Salva presenças de um culto (insere faltas automaticamente)
 * @param {number} serviceId - ID do culto
 * @param {Array<number>} presentesIds - Array de IDs de músicos presentes
 * @param {string} serviceWeekday - Dia da semana do culto
 * @param {string} serviceDate - Data do culto (formato YYYY-MM-DD)
 * @returns {Promise<void>}
 */
export async function salvarPresencasCulto(serviceId, presentesIds, serviceWeekday, serviceDate) {
  return await presencaRepository.salvarPresencasCulto(serviceId, presentesIds, serviceWeekday, serviceDate)
}

/**
 * Lista cultos com presença registrada
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano
 * @returns {Promise<Array>} Array com dados dos cultos
 */
export async function listarCultosComPresenca(mes, ano, commonId = null) {
  return await presencaRepository.listarCultosComPresenca(mes, ano, commonId)
}

/**
 * Gera relatório de presença
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @param {boolean} somentePresentes - Se true, retorna apenas músicos com presenças
 * @param {number|null} ocorrenciaSemana - Ocorrência da semana no mês (1-5, opcional)
 * @returns {Promise<Array>} Array com dados do relatório
 */
export async function gerarRelatorioPresenca(commonId, mes, ano, diaSemana = null, somentePresentes = false, ocorrenciaSemana = null, specificDate = null) {
  const dados = await presencaRepository.gerarRelatorioPresenca(commonId, mes, ano, diaSemana, ocorrenciaSemana, specificDate)

  return dados.map((item) => {
    const totalEscalas = item.total_escalas || 0
    const totalPresencas = item.total_presencas || 0
    const totalFaltas = item.total_faltas || 0

    const percentualPresenca = totalEscalas === 0 ? 0 : Number(((totalPresencas / totalEscalas) * 100).toFixed(2))
    const percentualFaltas = totalEscalas === 0 ? 0 : Number(((totalFaltas / totalEscalas) * 100).toFixed(2))

    return {
      ...item,
      percentual_presenca: percentualPresenca,
      percentual_faltas: percentualFaltas,
    }
  })
    .filter((item) => !somentePresentes || item.total_presencas > 0)
    .sort((a, b) => b.percentual_presenca - a.percentual_presenca)
}

/**
 * Gera ranking de faltas
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @returns {Promise<Array>} Array com top 5 músicos que mais faltaram
 */
export async function gerarRankingFaltas(commonId, mes, ano, diaSemana = null, specificDate = null) {
  const dados = await gerarRelatorioPresenca(commonId, mes, ano, diaSemana, false, null, specificDate)

  return dados
    .filter((item) => item.total_escalas > 0)
    .sort((a, b) => b.percentual_faltas - a.percentual_faltas)
    .slice(0, 5)
}

/**
 * Gera ranking de faltas do período
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @returns {Promise<Array>} Array com top 5 músicos que mais faltaram
 */
export async function gerarRankingFaltasPeriodo(commonId, mes, ano, diaSemana = null, specificDate = null) {
  const dados = await presencaRepository.gerarRankingFaltasPeriodo(commonId, mes, ano, diaSemana, specificDate)

  return dados
    .map((item) => {
      const totalEscalas = Number(item.total_escalas) || 0
      const totalFaltas = Number(item.total_faltas) || 0
      const totalPresencas = Number(item.total_presencas) || 0
      const percentualFaltas = totalEscalas === 0 ? 0 : Number(((totalFaltas / totalEscalas) * 100).toFixed(2))
      const percentualPresenca = totalEscalas === 0 ? 0 : Number(((totalPresencas / totalEscalas) * 100).toFixed(2))

      return {
        musician_id: Number(item.id) || 0,
        musician_name: String(item.nome || ''),
        total_presencas: totalPresencas,
        total_faltas: totalFaltas,
        percentual_presenca: percentualPresenca,
        percentual_faltas: percentualFaltas,
      }
    })
    .filter((item) => item.total_presencas > 0 || item.total_faltas > 0)
    .sort((a, b) => b.total_faltas - a.total_faltas)
}

/**
 * Gera histórico de presenças e faltas por data
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {string|null} diaSemana - Dia da semana (opcional)
 * @returns {Promise<Array>} Array com histórico por data
 */
export async function gerarHistoricoPorData(commonId, mes, ano, diaSemana = null, specificDate = null) {
  const dados = await presencaRepository.gerarHistoricoPorData(commonId, mes, ano, diaSemana, specificDate)

  return dados.map((item) => ({
    service_date: String(item.service_date || ''),
    weekday: String(item.weekday || ''),
    total_presencas: Number(item.presencas) || 0,
    total_faltas: Number(item.faltas) || 0,
  }))
}

/**
 * Gera resumo executivo de relatórios
 * @param {number} commonId - ID da comum (obrigatório)
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @param {string|null} weekday - Dia da semana (opcional)
 * @returns {Promise<Object>} Objeto com resumo executivo
 */
export async function gerarResumoExecutivo(commonId, month, year, weekday = null, specificDate = null) {
  const dados = await presencaRepository.buscarDadosRelatorioExecutivo(commonId, month, year, weekday, specificDate)

  const { total_musicos, total_cultos_distintos, total_presencas, total_faltas } = dados

  // Calcula percentual de presença: (presenças / (músicos x cultos)) * 100
  const totalEsperado = total_musicos * total_cultos_distintos
  const percentualPresenca = totalEsperado === 0 ? 0 : Number(((total_presencas / totalEsperado) * 100).toFixed(2))

  return {
    total_musicos: Number(total_musicos) || 0,
    total_cultos_distintos: Number(total_cultos_distintos) || 0,
    total_presencas: Number(total_presencas) || 0,
    total_faltas: Number(total_faltas) || 0,
    percentual_presenca: percentualPresenca,
  }
}

/**
 * Gera ranking de músicos por faltas e presenças
 * @param {number} commonId - ID da comum
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @returns {Promise<Object>} Objeto com ranking_faltas e ranking_presencas
 */
export async function gerarRankingMusicos(commonId, month, year, weekday = null, specificDate = null) {
  const dados = await presencaRepository.buscarRankingMusicos(commonId, month, year, weekday, specificDate)

  // Processa dados e calcula percentuais
  const processados = dados.map((item) => {
    const presencas = Number(item.presencas) || 0
    const faltas = Number(item.faltas) || 0
    const total = presencas + faltas
    const percentualPresenca = total === 0 ? 0 : Number(((presencas / total) * 100).toFixed(2))

    return {
      musician_id: Number(item.id) || 0,
      musician_name: String(item.name || ''),
      presencas,
      faltas,
      percentual_presenca: percentualPresenca,
    }
  })

  // Ranking por faltas (DESC) - Top 10
  const rankingFaltas = [...processados]
    .filter(item => item.faltas > 0)
    .sort((a, b) => {
      if (b.faltas !== a.faltas) return b.faltas - a.faltas;
      return b.percentual_faltas - a.percentual_faltas;
    })
    .slice(0, 10)

  // Ranking por presenças (DESC) - Top 10
  const rankingPresencas = [...processados]
    .filter(item => item.presencas > 0)
    .sort((a, b) => {
      if (b.presencas !== a.presencas) return b.presencas - a.presencas;
      return b.percentual_presenca - a.percentual_presenca;
    })
    .slice(0, 10)

  return {
    ranking_faltas: rankingFaltas,
    ranking_presencas: rankingPresencas,
  }
}

/**
 * Busca nome da comum por ID
 * @param {number} commonId - ID da comum
 * @returns {Promise<string|null>} Nome da comum
 */
export async function buscarNomeComum(commonId) {
  return await presencaRepository.buscarNomeComum(commonId)
}

/**
 * Busca datas dos serviços realizados no período
 */
export async function buscarDatasServicos(commonId, month, year, weekday = null, specificDate = null) {
  return await presencaRepository.buscarDatasServicos(commonId, month, year, weekday, specificDate)
}

/**
 * Lista músicos ativos da comum
 */
export async function listarMusicosAtivosComum(commonId) {
  return await presencaRepository.buscarMusicosAtivosComum(commonId)
}

/**
 * Busca músicos presentes agrupados por data no período
 */
export async function buscarPresentesPorData(commonId, month, year, weekday = null, specificDate = null) {
  const rows = await presencaRepository.buscarMusicosPresentesPorData(commonId, month, year, weekday, specificDate)
  const grouped = new Map()

  rows.forEach((item) => {
    const dateKey = String(item.service_date || '')
    const weekdayValue = String(item.weekday || '')
    const musicianName = String(item.musician_name || '--')
    const mapKey = `${dateKey}|${weekdayValue}`

    if (!grouped.has(mapKey)) {
      grouped.set(mapKey, {
        service_date: dateKey,
        weekday: weekdayValue,
        musicians: [],
      })
    }
    grouped.get(mapKey).musicians.push(musicianName)
  })

  return Array.from(grouped.values()).map((entry) => ({
    service_date: entry.service_date,
    weekday: entry.weekday,
    total_presentes: entry.musicians.length,
    musicians: entry.musicians,
  }))
}
