import { Router } from 'express'
import * as presencaService from '../services/presencaService.js'
import * as responseHandler from '../utils/responseHandler.js'

const router = Router()

/**
 * GET /api/reports/summary
 * Retorna resumo executivo de relatórios
 * Query params:
 * - common_id (obrigatório): ID da comum
 * - month (obrigatório): Mês (1-12)
 * - year (obrigatório): Ano
 * - weekday (opcional): Dia da semana
 */
router.get('/summary', async (req, res) => {
  try {
    const { common_id, month, year, weekday } = req.query

    // Validação de parâmetros obrigatórios
    if (!common_id) {
      return responseHandler.error(res, 'Parâmetro common_id é obrigatório', 400)
    }

    if (!month) {
      return responseHandler.error(res, 'Parâmetro month é obrigatório', 400)
    }

    if (!year) {
      return responseHandler.error(res, 'Parâmetro year é obrigatório', 400)
    }

    // Validação de tipos
    const commonId = Number(common_id)
    const monthNum = Number(month)
    const yearNum = Number(year)

    if (Number.isNaN(commonId) || commonId <= 0) {
      return responseHandler.error(res, 'common_id deve ser um número positivo', 400)
    }

    if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return responseHandler.error(res, 'month deve ser um número entre 1 e 12', 400)
    }

    if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return responseHandler.error(res, 'year deve ser um número válido', 400)
    }

    // Validação de weekday (se fornecido)
    const weekdayStr = weekday ? String(weekday).trim() : null
    const weekdaysValidos = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    if (weekdayStr && !weekdaysValidos.includes(weekdayStr)) {
      return responseHandler.error(res, 'weekday deve ser um dia da semana válido', 400)
    }

    // Busca dados do resumo executivo
    const summary = await presencaService.gerarResumoExecutivo(
      commonId,
      monthNum,
      yearNum,
      weekdayStr,
    )

    return responseHandler.success(res, summary, 'Resumo executivo gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar resumo executivo:', error)
    return responseHandler.error(res, 'Erro ao gerar resumo executivo', 500)
  }
})

export default router
