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
