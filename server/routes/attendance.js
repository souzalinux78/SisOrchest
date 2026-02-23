import { Router } from 'express'
import * as presencaService from '../services/presencaService.js'
import * as relatorioPdfService from '../services/relatorioPdfService.js'
import * as responseHandler from '../utils/responseHandler.js'
import { requireAuth, resolveScopedCommonId } from './utils.js'

const router = Router()
router.use(requireAuth)

const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const resolveCommonScopeOrFail = (req, res, requestedCommonId, options = {}) => {
  try {
    const commonId = resolveScopedCommonId(req, requestedCommonId, options)
    return { ok: true, commonId }
  } catch (error) {
    responseHandler.error(res, error.message, error.status || 400)
    return { ok: false, commonId: null }
  }
}

const parsePositiveInt = (value) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

const ensureServiceAccess = async (req, res, serviceId) => {
  const serviceCheck = await presencaService.verificarCultoExiste(serviceId)
  if (!serviceCheck || serviceCheck.length === 0) {
    responseHandler.error(res, 'Culto nao encontrado.', 404)
    return null
  }

  const service = serviceCheck[0]
  if (req.user?.role !== 'admin') {
    const userCommonId = parsePositiveInt(req.user?.common_id)
    if (!userCommonId || Number(service.common_id) !== userCommonId) {
      responseHandler.error(res, 'Acesso negado para culto de outra comum.', 403)
      return null
    }
  }

  return service
}

const normalizeServiceDate = (value) => {
  if (value === undefined || value === null || value === '') return null

  const trimmed = String(value).trim()
  if (!trimmed) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return null
    return trimmed
  }

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return null
  }

  const iso = `${year}-${month}-${day}`
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null

  if (parsed.getDate() !== dayNum || parsed.getMonth() + 1 !== monthNum || parsed.getFullYear() !== yearNum) {
    return null
  }

  return iso
}

const parseMonthYear = (res, mes, ano) => {
  if (mes === undefined || mes === null || mes === '') {
    responseHandler.error(res, 'Mes e obrigatorio.', 400)
    return null
  }
  if (ano === undefined || ano === null || ano === '') {
    responseHandler.error(res, 'Ano e obrigatorio.', 400)
    return null
  }

  const mesNum = Number(mes)
  const anoNum = Number(ano)

  if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
    responseHandler.error(res, 'Mes invalido. Use um numero entre 1 e 12.', 400)
    return null
  }
  if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
    responseHandler.error(res, 'Ano invalido. Use um numero entre 1900 e 2100.', 400)
    return null
  }

  return { mesNum, anoNum }
}

const parseWeekdayOrFail = (res, diaSemana) => {
  if (diaSemana === undefined || diaSemana === null || diaSemana === '') return null
  if (!weekdays.includes(diaSemana)) {
    responseHandler.error(res, 'Dia da semana invalido.', 400)
    return null
  }
  return diaSemana
}

router.get('/', async (req, res) => {
  try {
    const { service_id, common_id } = req.query ?? {}
    const filters = {}

    if (service_id !== undefined && service_id !== null && service_id !== '') {
      const serviceId = parsePositiveInt(service_id)
      if (!serviceId) {
        return responseHandler.error(res, 'Culto invalido.', 400)
      }
      const service = await ensureServiceAccess(req, res, serviceId)
      if (!service) return
      filters.service_id = serviceId
    }

    const scope = resolveCommonScopeOrFail(req, res, common_id)
    if (!scope.ok) return
    if (scope.commonId) {
      filters.common_id = scope.commonId
    }

    const data = await presencaService.listarPresencas(filters)
    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao listar presencas.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao listar presencas.', 500)
  }
})

router.get('/visitors', async (req, res) => {
  try {
    const { service_id, service_date, cult_date, common_id } = req.query ?? {}
    const filters = {}

    if (service_id !== undefined && service_id !== null && service_id !== '') {
      const serviceId = parsePositiveInt(service_id)
      if (!serviceId) {
        return responseHandler.error(res, 'Culto invalido.', 400)
      }
      const service = await ensureServiceAccess(req, res, serviceId)
      if (!service) return
      filters.service_id = serviceId
    }

    const dateValue = service_date ?? cult_date
    if (dateValue !== undefined && dateValue !== null && dateValue !== '') {
      const normalizedDate = normalizeServiceDate(dateValue)
      if (!normalizedDate) {
        return responseHandler.error(res, 'Data do culto invalida. Use DD/MM/AAAA ou YYYY-MM-DD.', 400)
      }
      filters.service_date = normalizedDate
    }

    const scope = resolveCommonScopeOrFail(req, res, common_id)
    if (!scope.ok) return
    if (scope.commonId) {
      filters.common_id = scope.commonId
    }

    const data = await presencaService.listarVisitantes(filters)
    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao listar visitantes.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    })
    return responseHandler.error(res, 'Erro ao listar visitantes.', 500)
  }
})

router.post('/visitors', async (req, res) => {
  try {
    const { service_id, service_date, visitors_count } = req.body ?? {}

    const serviceId = parsePositiveInt(service_id)
    if (!serviceId) {
      return responseHandler.error(res, 'Culto invalido.', 400)
    }

    if (service_date === undefined || service_date === null || service_date === '') {
      return responseHandler.error(res, 'Data do culto e obrigatoria.', 400)
    }
    const normalizedDate = normalizeServiceDate(service_date)
    if (!normalizedDate) {
      return responseHandler.error(res, 'Data do culto invalida. Use DD/MM/AAAA ou YYYY-MM-DD.', 400)
    }

    const count = Number(visitors_count)
    if (!Number.isInteger(count) || count < 0) {
      return responseHandler.error(res, 'Quantidade de visitantes invalida.', 400)
    }

    const service = await ensureServiceAccess(req, res, serviceId)
    if (!service) return

    await presencaService.salvarVisitantes(serviceId, normalizedDate, count)
    return responseHandler.success(res, null, 'Visitantes registrados.')
  } catch (error) {
    console.error('Erro ao registrar visitantes.', {
      body: req.body,
      error: error.message,
      stack: error.stack,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    })
    return responseHandler.error(res, 'Erro ao registrar visitantes.', 500)
  }
})

router.post('/', async (req, res) => {
  try {
    const { service_id, presentes, service_weekday, service_date } = req.body ?? {}

    const serviceId = parsePositiveInt(service_id)
    if (!serviceId) {
      return responseHandler.error(res, 'ID do culto invalido.', 400)
    }
    if (!service_weekday || !service_date) {
      return responseHandler.error(res, 'Dia da semana e data do culto sao obrigatorios.', 400)
    }
    if (!weekdays.includes(service_weekday)) {
      return responseHandler.error(res, 'Dia da semana invalido.', 400)
    }

    const normalizedDate = normalizeServiceDate(service_date)
    if (!normalizedDate) {
      return responseHandler.error(res, 'Data do culto invalida. Use DD/MM/AAAA ou YYYY-MM-DD.', 400)
    }

    const service = await ensureServiceAccess(req, res, serviceId)
    if (!service) return

    const presentesIds = Array.isArray(presentes)
      ? presentes.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : []

    await presencaService.salvarPresencasCulto(serviceId, presentesIds, service_weekday, normalizedDate)
    return responseHandler.success(res, null, 'Presencas registradas com sucesso.')
  } catch (error) {
    console.error('Erro ao registrar presencas.', {
      body: req.body,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao registrar presencas.', 500)
  }
})

router.get('/relatorios/presenca', async (req, res) => {
  try {
    const { mes, ano, diaSemana, somentePresentes, cultoId, common_id } = req.query ?? {}

    if (cultoId !== undefined && cultoId !== null && cultoId !== '') {
      const cultoIdNum = parsePositiveInt(cultoId)
      if (!cultoIdNum) {
        return responseHandler.error(res, 'ID do culto invalido.', 400)
      }

      const scope = resolveCommonScopeOrFail(req, res, common_id)
      if (!scope.ok) return

      const service = await ensureServiceAccess(req, res, cultoIdNum)
      if (!service) return

      if (scope.commonId && Number(service.common_id) !== Number(scope.commonId)) {
        return responseHandler.error(res, 'Culto fora do escopo da comum.', 403)
      }

      const onlyPresent = somentePresentes === 'true' || somentePresentes === true
      const attendance = await presencaService.listarPresencas({
        service_id: cultoIdNum,
        common_id: scope.commonId || undefined,
      })

      const byMusician = new Map()
      attendance.forEach((item) => {
        if (!byMusician.has(item.musician_id)) {
          byMusician.set(item.musician_id, {
            id: item.musician_id,
            nome: item.name || '--',
            total_escalas: 0,
            total_presencas: 0,
            total_faltas: 0,
          })
        }
        const musician = byMusician.get(item.musician_id)
        musician.total_escalas += 1
        if (item.status === 'present') {
          musician.total_presencas += 1
        } else {
          musician.total_faltas += 1
        }
      })

      let data = Array.from(byMusician.values()).map((musician) => {
        const totalEscalas = musician.total_escalas || 0
        const percentualPresenca =
          totalEscalas > 0 ? Number(((musician.total_presencas / totalEscalas) * 100).toFixed(2)) : 0
        const percentualFaltas =
          totalEscalas > 0 ? Number(((musician.total_faltas / totalEscalas) * 100).toFixed(2)) : 0

        return {
          ...musician,
          percentual_presenca: percentualPresenca,
          percentual_faltas: percentualFaltas,
        }
      })

      if (onlyPresent) {
        data = data.filter((musician) => musician.total_presencas > 0)
      }

      return responseHandler.success(res, data)
    }

    const scope = resolveCommonScopeOrFail(req, res, common_id, { requiredForAdmin: true })
    if (!scope.ok) return

    const parsed = parseMonthYear(res, mes, ano)
    if (!parsed) return

    const diaSemanaParam = parseWeekdayOrFail(res, diaSemana)
    if (diaSemana && !diaSemanaParam) return

    const onlyPresent = somentePresentes === 'true' || somentePresentes === true
    const data = await presencaService.gerarRelatorioPresenca(
      scope.commonId,
      parsed.mesNum,
      parsed.anoNum,
      diaSemanaParam,
      onlyPresent,
    )

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar relatorio de presenca.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar relatorio de presenca.', 500)
  }
})

router.get('/relatorios/ranking-faltas', async (req, res) => {
  try {
    const { common_id, mes, ano, diaSemana } = req.query ?? {}
    const scope = resolveCommonScopeOrFail(req, res, common_id, { requiredForAdmin: true })
    if (!scope.ok) return

    const parsed = parseMonthYear(res, mes, ano)
    if (!parsed) return

    const diaSemanaParam = parseWeekdayOrFail(res, diaSemana)
    if (diaSemana && !diaSemanaParam) return

    const data = await presencaService.gerarRankingFaltas(
      scope.commonId,
      parsed.mesNum,
      parsed.anoNum,
      diaSemanaParam,
    )

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar ranking de faltas.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar ranking de faltas.', 500)
  }
})

router.get('/relatorios/ranking-faltas-periodo', async (req, res) => {
  try {
    const { common_id, mes, ano, diaSemana } = req.query ?? {}
    const scope = resolveCommonScopeOrFail(req, res, common_id, { requiredForAdmin: true })
    if (!scope.ok) return

    const parsed = parseMonthYear(res, mes, ano)
    if (!parsed) return

    const diaSemanaParam = parseWeekdayOrFail(res, diaSemana)
    if (diaSemana && !diaSemanaParam) return

    const data = await presencaService.gerarRankingFaltasPeriodo(
      scope.commonId,
      parsed.mesNum,
      parsed.anoNum,
      diaSemanaParam,
    )

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar ranking de faltas por periodo.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar ranking de faltas por periodo.', 500)
  }
})

router.get('/relatorios/cultos-com-presenca', async (req, res) => {
  try {
    const { common_id, mes, ano } = req.query ?? {}
    const scope = resolveCommonScopeOrFail(req, res, common_id, { requiredForAdmin: true })
    if (!scope.ok) return

    const parsed = parseMonthYear(res, mes, ano)
    if (!parsed) return

    const data = await presencaService.listarCultosComPresenca(parsed.mesNum, parsed.anoNum, scope.commonId)
    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao listar cultos com presenca.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao listar cultos com presenca.', 500)
  }
})

router.get('/relatorios/historico-por-data', async (req, res) => {
  try {
    const { common_id, mes, ano } = req.query ?? {}
    const scope = resolveCommonScopeOrFail(req, res, common_id, { requiredForAdmin: true })
    if (!scope.ok) return

    const parsed = parseMonthYear(res, mes, ano)
    if (!parsed) return

    const data = await presencaService.gerarHistoricoPorData(scope.commonId, parsed.mesNum, parsed.anoNum)
    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar historico por data.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar historico por data.', 500)
  }
})

router.get('/relatorios/presenca/pdf', async (req, res) => {
  try {
    const { common_id, mes, ano, diaSemana, somentePresentes } = req.query ?? {}
    const scope = resolveCommonScopeOrFail(req, res, common_id, { requiredForAdmin: true })
    if (!scope.ok) return

    const parsed = parseMonthYear(res, mes, ano)
    if (!parsed) return

    let diaSemanaParam = null
    if (diaSemana !== undefined && diaSemana !== null && diaSemana !== '') {
      const diaSemanaNum = Number(diaSemana)
      if (Number.isInteger(diaSemanaNum) && diaSemanaNum >= 1 && diaSemanaNum <= 7) {
        diaSemanaParam = diaSemanaNum
      } else if (typeof diaSemana === 'string' && weekdays.includes(diaSemana)) {
        diaSemanaParam = diaSemana
      } else {
        return responseHandler.error(res, 'Dia da semana invalido.', 400)
      }
    }

    const somentePresentesBool = somentePresentes === 'true' || somentePresentes === true
    const doc = await relatorioPdfService.gerarPdfRelatorioPresenca(
      scope.commonId,
      parsed.mesNum,
      parsed.anoNum,
      diaSemanaParam,
      somentePresentesBool,
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-presenca.pdf"')
    doc.pipe(res)
    doc.end()
  } catch (error) {
    console.error('Erro ao gerar PDF do relatorio de presenca.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar PDF do relatorio de presenca.', 500)
  }
})

export { router as attendanceRouter }
