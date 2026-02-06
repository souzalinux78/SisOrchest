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
 * Gera relatório de presença com cálculos de percentuais
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {number|null} diaSemana - Dia da semana opcional (1=Domingo, 2=Segunda, ..., 7=Sábado)
 * @param {boolean} somentePresentes - Se true, retorna apenas músicos com presenças > 0
 * @returns {Promise<Array>} Array com relatório de presenças por músico incluindo percentuais
 */
export async function gerarRelatorioPresenca(mes, ano, diaSemana = null, somentePresentes = false) {
  // Busca dados do repositório
  const dados = await presencaRepository.gerarRelatorioPresenca(mes, ano, diaSemana)

  // Processa cada registro calculando percentuais
  const relatorio = dados.map((registro) => {
    const totalEscalas = Number(registro.total_escalas) || 0
    const totalPresencas = Number(registro.total_presencas) || 0
    const totalFaltas = Number(registro.total_faltas) || 0

    // Calcula percentuais (evita divisão por zero)
    const percentualPresenca = totalEscalas > 0
      ? Number(((totalPresencas / totalEscalas) * 100).toFixed(2))
      : 0

    const percentualFaltas = totalEscalas > 0
      ? Number(((totalFaltas / totalEscalas) * 100).toFixed(2))
      : 0

    return {
      id: registro.id,
      nome: registro.nome,
      total_escalas: totalEscalas,
      total_presencas: totalPresencas,
      total_faltas: totalFaltas,
      percentual_presenca: percentualPresenca,
      percentual_faltas: percentualFaltas,
    }
  })

  // Filtra apenas músicos com presenças se solicitado
  let resultado = relatorio
  if (somentePresentes) {
    resultado = relatorio.filter((item) => item.total_presencas > 0)
  }

  // Ordena do maior percentual_presenca para o menor
  resultado.sort((a, b) => b.percentual_presenca - a.percentual_presenca)

  return resultado
}
