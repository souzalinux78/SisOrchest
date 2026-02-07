import { Router } from 'express'
import * as presencaService from '../services/presencaService.js'
import * as relatorioPdfService from '../services/relatorioPdfService.js'
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
      req.query.specific_date,
    )

    return responseHandler.success(res, summary, 'Resumo executivo gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar resumo executivo:', error)
    return responseHandler.error(res, 'Erro ao gerar resumo executivo', 500)
  }
})

/**
 * GET /api/reports/ranking
 * Retorna ranking de faltas por músico
 * Query params:
 * - common_id (obrigatório): ID da comum
 * - month (obrigatório): Mês (1-12)
 * - year (obrigatório): Ano
 * - weekday (opcional): Dia da semana
 */
router.get('/ranking', async (req, res) => {
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

    // Busca dados do ranking de músicos
    const ranking = await presencaService.gerarRankingMusicos(commonId, monthNum, yearNum, weekdayStr, req.query.specific_date)

    return responseHandler.success(res, ranking, 'Ranking de músicos gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar ranking de faltas:', error)
    return responseHandler.error(res, 'Erro ao gerar ranking de faltas', 500)
  }
})

/**
 * GET /api/reports/history
 * Retorna histórico de presenças e faltas por data
 * Query params:
 * - common_id (obrigatório): ID da comum
 * - month (obrigatório): Mês (1-12)
 * - year (obrigatório): Ano
 * - weekday (opcional): Dia da semana
 */
router.get('/history', async (req, res) => {
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

    // Busca dados do histórico
    const history = await presencaService.gerarHistoricoPorData(
      commonId,
      monthNum,
      yearNum,
      weekdayStr,
      req.query.specific_date,
    )

    return responseHandler.success(res, history, 'Histórico por data gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar histórico por data:', error)
    return responseHandler.error(res, 'Erro ao gerar histórico por data', 500)
  }
})

/**
 * GET /api/reports/pdf
 * Gera relatório executivo em PDF
 * Query params:
 * - common_id (obrigatório): ID da comum
 * - month (obrigatório): Mês (1-12)
 * - year (obrigatório): Ano
 */
router.get('/pdf', async (req, res) => {
  try {
    const { common_id, month, year } = req.query

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

    // Gera PDF
    const doc = await relatorioPdfService.gerarPdfRelatorioExecutivo(commonId, monthNum, yearNum, req.query.weekday, req.query.specific_date)

    // Configura headers para download
    const meses = [
      '',
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]
    const nomeMes = meses[monthNum] || monthNum
    const filename = `relatorio-executivo-${nomeMes}-${yearNum}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    // Pipe do PDFDocument direto para a response
    doc.pipe(res)
    doc.end()
  } catch (error) {
    console.error('Erro ao gerar PDF executivo:', error)
    return responseHandler.error(res, 'Erro ao gerar PDF executivo', 500)
  }
})

/**
 * GET /api/reports/available-dates
 * Retorna lista de datas de cultos disponíveis para o período
 */
router.get('/available-dates', async (req, res) => {
  try {
    const { common_id, month, year, weekday } = req.query

    if (!common_id || !month || !year) {
      return responseHandler.error(res, 'Parâmetros common_id, month e year são obrigatórios', 400)
    }

    const dates = await presencaService.buscarDatasServicos(
      Number(common_id),
      Number(month),
      Number(year),
      weekday ? String(weekday) : null,
    )

    return responseHandler.success(res, dates, 'Datas recuperadas com sucesso')
  } catch (error) {
    console.error('Erro ao buscar datas disponíveis:', error)
    return responseHandler.error(res, 'Erro ao buscar datas disponíveis', 500)
  }
})

export default router
