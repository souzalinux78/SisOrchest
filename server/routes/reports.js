import { Router } from 'express'
import * as presencaService from '../services/presencaService.js'
import * as relatorioPdfService from '../services/relatorioPdfService.js'
import * as responseHandler from '../utils/responseHandler.js'
import { requireAuth, resolveScopedCommonId } from './utils.js'

const router = Router()
router.use(requireAuth)

const parseMonthYear = (month, year, res) => {
  if (!month) {
    responseHandler.error(res, 'Parametro month e obrigatorio', 400)
    return null
  }
  if (!year) {
    responseHandler.error(res, 'Parametro year e obrigatorio', 400)
    return null
  }

  const monthNum = Number(month)
  const yearNum = Number(year)

  if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    responseHandler.error(res, 'month deve ser um numero entre 1 e 12', 400)
    return null
  }
  if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
    responseHandler.error(res, 'year deve ser um numero valido', 400)
    return null
  }

  return { monthNum, yearNum }
}

const parseScopedCommonId = (req, res) => {
  try {
    return resolveScopedCommonId(req, req.query.common_id, { requiredForAdmin: true })
  } catch (error) {
    responseHandler.error(res, error.message, error.status || 400)
    return null
  }
}

const parseWeekday = (weekday, res) => {
  const weekdayStr = weekday ? String(weekday).trim() : null
  const weekdaysValidos = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  if (weekdayStr && !weekdaysValidos.includes(weekdayStr)) {
    responseHandler.error(res, 'weekday deve ser um dia da semana valido', 400)
    return null
  }
  return weekdayStr
}

router.get('/summary', async (req, res) => {
  try {
    const commonId = parseScopedCommonId(req, res)
    if (!commonId) return

    const parsed = parseMonthYear(req.query.month, req.query.year, res)
    if (!parsed) return

    const weekdayStr = parseWeekday(req.query.weekday, res)
    if (req.query.weekday && !weekdayStr) return

    const summary = await presencaService.gerarResumoExecutivo(
      commonId,
      parsed.monthNum,
      parsed.yearNum,
      weekdayStr,
      req.query.specific_date,
    )

    return responseHandler.success(res, summary, 'Resumo executivo gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar resumo executivo:', error)
    return responseHandler.error(res, 'Erro ao gerar resumo executivo', 500)
  }
})

router.get('/ranking', async (req, res) => {
  try {
    const commonId = parseScopedCommonId(req, res)
    if (!commonId) return

    const parsed = parseMonthYear(req.query.month, req.query.year, res)
    if (!parsed) return

    const weekdayStr = parseWeekday(req.query.weekday, res)
    if (req.query.weekday && !weekdayStr) return

    const ranking = await presencaService.gerarRankingMusicos(
      commonId,
      parsed.monthNum,
      parsed.yearNum,
      weekdayStr,
      req.query.specific_date,
    )

    return responseHandler.success(res, ranking, 'Ranking de musicos gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar ranking de faltas:', error)
    return responseHandler.error(res, 'Erro ao gerar ranking de faltas', 500)
  }
})

router.get('/history', async (req, res) => {
  try {
    const commonId = parseScopedCommonId(req, res)
    if (!commonId) return

    const parsed = parseMonthYear(req.query.month, req.query.year, res)
    if (!parsed) return

    const weekdayStr = parseWeekday(req.query.weekday, res)
    if (req.query.weekday && !weekdayStr) return

    const history = await presencaService.gerarHistoricoPorData(
      commonId,
      parsed.monthNum,
      parsed.yearNum,
      weekdayStr,
      req.query.specific_date,
    )

    return responseHandler.success(res, history, 'Historico por data gerado com sucesso')
  } catch (error) {
    console.error('Erro ao gerar historico por data:', error)
    return responseHandler.error(res, 'Erro ao gerar historico por data', 500)
  }
})

router.get('/pdf', async (req, res) => {
  try {
    const commonId = parseScopedCommonId(req, res)
    if (!commonId) return

    const parsed = parseMonthYear(req.query.month, req.query.year, res)
    if (!parsed) return

    const doc = await relatorioPdfService.gerarPdfRelatorioExecutivo(
      commonId,
      parsed.monthNum,
      parsed.yearNum,
      req.query.weekday,
      req.query.specific_date,
    )

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
    const nomeMes = meses[parsed.monthNum] || parsed.monthNum
    const filename = `relatorio-executivo-${nomeMes}-${parsed.yearNum}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    doc.pipe(res)
    doc.end()
  } catch (error) {
    console.error('Erro ao gerar PDF executivo:', error)
    return responseHandler.error(res, 'Erro ao gerar PDF executivo', 500)
  }
})

router.get('/pdf-history-presence', async (req, res) => {
  try {
    const commonId = parseScopedCommonId(req, res)
    if (!commonId) return

    const parsed = parseMonthYear(req.query.month, req.query.year, res)
    if (!parsed) return

    const weekdayStr = parseWeekday(req.query.weekday, res)
    if (req.query.weekday && !weekdayStr) return

    const doc = await relatorioPdfService.gerarPdfHistoricoPresentes(
      commonId,
      parsed.monthNum,
      parsed.yearNum,
      weekdayStr,
      req.query.specific_date,
    )

    const meses = [
      '',
      'Janeiro',
      'Fevereiro',
      'Marco',
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
    const nomeMes = meses[parsed.monthNum] || parsed.monthNum
    const filename = `relatorio-historico-presenca-${nomeMes}-${parsed.yearNum}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    doc.pipe(res)
    doc.end()
  } catch (error) {
    console.error('Erro ao gerar PDF historico de presenca:', error)
    return responseHandler.error(res, 'Erro ao gerar PDF historico de presenca', 500)
  }
})

router.get('/available-dates', async (req, res) => {
  try {
    const commonId = parseScopedCommonId(req, res)
    if (!commonId) return

    const parsed = parseMonthYear(req.query.month, req.query.year, res)
    if (!parsed) return

    const dates = await presencaService.buscarDatasServicos(
      commonId,
      parsed.monthNum,
      parsed.yearNum,
      req.query.weekday ? String(req.query.weekday) : null,
    )

    return responseHandler.success(res, dates, 'Datas recuperadas com sucesso')
  } catch (error) {
    console.error('Erro ao buscar datas disponiveis:', error)
    return responseHandler.error(res, 'Erro ao buscar datas disponiveis', 500)
  }
})

export default router
