/**
 * Utilitário para padronizar respostas da API
 */

/**
 * Retorna uma resposta de sucesso padronizada
 * @param {Object} res - Objeto response do Express
 * @param {*} data - Dados a serem retornados
 * @param {string|null} message - Mensagem opcional de sucesso
 * @returns {Object} Resposta JSON padronizada
 */
export const success = (res, data, message = null) => {
  return res.json({
    success: true,
    message,
    data,
  })
}

/**
 * Retorna uma resposta de erro padronizada
 * @param {Object} res - Objeto response do Express
 * @param {string} message - Mensagem de erro (padrão: "Erro interno")
 * @param {number} status - Código HTTP de status (padrão: 500)
 * @returns {Object} Resposta JSON padronizada
 */
export const error = (res, message = 'Erro interno', status = 500) => {
  return res.status(status).json({
    success: false,
    message,
  })
}
