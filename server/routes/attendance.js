import { Router } from 'express'
import * as presencaService from '../services/presencaService.js'
import * as relatorioPdfService from '../services/relatorioPdfService.js'
import * as responseHandler from '../utils/responseHandler.js'

const router = Router()

const normalizeServiceDate = (value) => {
  if (value === undefined || value === null || value === '') return null
  try {
    const trimmed = String(value).trim()
    if (!trimmed) return null
    
    // Aceita formato ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00`)
      if (Number.isNaN(parsed.getTime())) return null
      return trimmed
    }
    
    // Aceita formato brasileiro: DD/MM/YYYY
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    
    const [, day, month, year] = match
    const dayNum = Number(day)
    const monthNum = Number(month)
    const yearNum = Number(year)
    
    // Validação básica de ranges
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return null
    }
    
    const iso = `${year}-${month}-${day}`
    const parsed = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return null
    
    // Verifica se a data convertida corresponde aos valores originais (evita 31/02 virar 03/03)
    const parsedDay = parsed.getDate()
    const parsedMonth = parsed.getMonth() + 1
    const parsedYear = parsed.getFullYear()
    
    if (parsedDay !== dayNum || parsedMonth !== monthNum || parsedYear !== yearNum) {
      return null
    }
    
    return iso
  } catch (error) {
    console.error('Erro ao normalizar data:', { value, error: error.message })
    return null
  }
}

router.get('/', async (req, res) => {
  try {
    const { service_id, common_id } = req.query ?? {}
    const filters = {}

    if (service_id) {
      filters.service_id = service_id
    }

    if (common_id) {
      filters.common_id = common_id
    }

    const data = await presencaService.listarPresencas(filters)
    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao listar presenças.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao listar presenças.', 500)
  }
})

router.get('/visitors', async (req, res) => {
  try {
    const { service_id, service_date, cult_date, common_id } = req.query ?? {}
    const filters = {}

    if (service_id !== undefined && service_id !== null && service_id !== '') {
      const serviceId = Number(service_id)
      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return responseHandler.error(res, 'Culto inválido.', 400)
      }
      filters.service_id = serviceId
    }

    const dateValue = service_date ?? cult_date
    if (dateValue !== undefined && dateValue !== null && dateValue !== '') {
      const normalizedDate = normalizeServiceDate(dateValue)
      if (!normalizedDate) {
        return responseHandler.error(res, 'Data do culto inválida. Use o formato DD/MM/AAAA ou YYYY-MM-DD.', 400)
      }
      filters.service_date = normalizedDate
    }

    if (common_id !== undefined && common_id !== null && common_id !== '') {
      const commonId = Number(common_id)
      if (!Number.isInteger(commonId) || commonId <= 0) {
        return responseHandler.error(res, 'Comum inválida.', 400)
      }
      filters.common_id = commonId
    }

    const data = await presencaService.listarVisitantes(filters)
    return responseHandler.success(res, data)
  } catch (error) {
    // Tratamento específico para erros do MySQL
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR' || error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Erro de SQL ao listar visitantes.', {
        query: req.query,
        error: error.message,
        code: error.code,
        sqlState: error.sqlState,
      })
      return responseHandler.error(res, 'Erro interno no banco de dados. Contate o administrador.', 500)
    }

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

    if (service_id === undefined || service_id === null || service_id === '') {
      return responseHandler.error(res, 'Culto é obrigatório.', 400)
    }

    const serviceId = Number(service_id)
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return responseHandler.error(res, 'Culto inválido.', 400)
    }

    if (service_date === undefined || service_date === null || service_date === '') {
      return responseHandler.error(res, 'Data do culto é obrigatória.', 400)
    }

    const normalizedDate = normalizeServiceDate(service_date)
    if (!normalizedDate) {
      return responseHandler.error(res, 'Data do culto inválida. Use o formato DD/MM/AAAA ou YYYY-MM-DD.', 400)
    }

    if (visitors_count === undefined || visitors_count === null || visitors_count === '') {
      return responseHandler.error(res, 'Quantidade de visitantes é obrigatória.', 400)
    }

    const count = Number(visitors_count)
    if (Number.isNaN(count) || count < 0 || !Number.isInteger(count)) {
      return responseHandler.error(res, 'Quantidade de visitantes inválida. Deve ser um número inteiro maior ou igual a zero.', 400)
    }

    // Validação: verificar se o service_id existe antes de inserir
    const serviceCheck = await presencaService.verificarCultoExiste(serviceId)

    if (!serviceCheck || serviceCheck.length === 0) {
      return responseHandler.error(res, 'Culto não encontrado.', 404)
    }

    await presencaService.salvarVisitantes(serviceId, normalizedDate, count)

    return responseHandler.success(res, null, 'Visitantes registrados.')
  } catch (error) {
    // Tratamento específico para erros do MySQL
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      console.error('Erro de foreign key ao registrar visitantes.', {
        body: req.body,
        error: error.message,
        code: error.code,
      })
      return responseHandler.error(res, 'Culto não encontrado ou inválido.', 404)
    }

    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Erro de duplicação ao registrar visitantes.', {
        body: req.body,
        error: error.message,
        code: error.code,
      })
      // Este erro não deveria ocorrer devido ao ON DUPLICATE KEY UPDATE, mas tratamos mesmo assim
      return responseHandler.error(res, 'Registro duplicado. Tente novamente.', 409)
    }

    if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR' || error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Erro de SQL ao registrar visitantes.', {
        body: req.body,
        error: error.message,
        code: error.code,
        sqlState: error.sqlState,
      })
      return responseHandler.error(res, 'Erro interno no banco de dados. Contate o administrador.', 500)
    }

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
  console.log('🔵 [AUDITORIA] ROTA POST /attendance EXECUTADA')
  console.log('🔵 [AUDITORIA] Body recebido:', JSON.stringify(req.body, null, 2))
  try {
    // Nova API: recebe service_id, lista de presentes, service_weekday e service_date
    const { service_id, presentes, service_weekday, service_date } = req.body ?? {}

    // Validação básica
    if (!service_id) {
      return responseHandler.error(res, 'ID do culto é obrigatório.', 400)
    }

    if (!service_weekday || !service_date) {
      return responseHandler.error(res, 'Dia da semana e data do culto são obrigatórios.', 400)
    }

    const serviceId = Number(service_id)
    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return responseHandler.error(res, 'ID do culto inválido.', 400)
    }

    const normalizedDate = normalizeServiceDate(service_date)
    if (!normalizedDate) {
      return responseHandler.error(res, 'Data do culto inválida. Use o formato DD/MM/AAAA ou YYYY-MM-DD.', 400)
    }

    // Valida service_weekday como string
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    if (!weekdays.includes(service_weekday)) {
      return responseHandler.error(res, 'Dia da semana inválido. Use: Domingo, Segunda, Terça, Quarta, Quinta, Sexta ou Sábado.', 400)
    }

    // Processa lista de presentes (pode ser array ou undefined/null)
    const presentesIds = Array.isArray(presentes) 
      ? presentes.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)
      : []

    // Salva presenças e faltas para todos os músicos escalados
    console.log('🔵 [AUDITORIA] Chamando presencaService.salvarPresencasCulto com:', {
      serviceId,
      presentesIds,
      service_weekday,
      normalizedDate,
    })
    await presencaService.salvarPresencasCulto(serviceId, presentesIds, service_weekday, normalizedDate)
    console.log('🔵 [AUDITORIA] presencaService.salvarPresencasCulto concluído com sucesso')

    return responseHandler.success(res, null, 'Presenças registradas com sucesso.')
  } catch (error) {
    console.error('Erro ao registrar presenças.', {
      body: req.body,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao registrar presenças.', 500)
  }
})

router.get('/relatorios/presenca', async (req, res) => {
  try {
    const { mes, ano, diaSemana, somentePresentes, ocorrenciaSemana, cultoId } = req.query ?? {}

    // Se cultoId for informado, usa lógica específica para um culto
    if (cultoId !== undefined && cultoId !== null && cultoId !== '') {
      const cultoIdNum = Number(cultoId)
      if (!Number.isInteger(cultoIdNum) || cultoIdNum <= 0) {
        return responseHandler.error(res, 'ID do culto inválido.', 400)
      }

      // Processa somentePresentes (opcional, boolean)
      const somentePresentesBool = somentePresentes === 'true' || somentePresentes === true

      // Busca presenças do culto específico
      const attendance = await presencaService.listarPresencas({ service_id: cultoIdNum })

      // Agrupa por músico
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

      // Calcula percentuais
      let data = Array.from(byMusician.values()).map((musician) => {
        const totalEscalas = musician.total_escalas || 0
        const percentualPresenca = totalEscalas > 0
          ? Number(((musician.total_presencas / totalEscalas) * 100).toFixed(2))
          : 0
        const percentualFaltas = totalEscalas > 0
          ? Number(((musician.total_faltas / totalEscalas) * 100).toFixed(2))
          : 0

        return {
          ...musician,
          percentual_presenca: percentualPresenca,
          percentual_faltas: percentualFaltas,
        }
      })

      // Filtra apenas músicos presentes se solicitado
      if (somentePresentesBool) {
        data = data.filter((musician) => musician.total_presencas > 0)
      }

      return responseHandler.success(res, data)
    }

    // Lógica para relatório por período
    // Validação: common_id é obrigatório
    const { common_id } = req.query ?? {}
    if (common_id === undefined || common_id === null || common_id === '') {
      return responseHandler.error(res, 'ID da comum é obrigatório.', 400)
    }

    const commonIdNum = Number(common_id)
    if (!Number.isInteger(commonIdNum) || commonIdNum <= 0) {
      return responseHandler.error(res, 'ID da comum inválido.', 400)
    }

    // Validação: mes é obrigatório
    if (mes === undefined || mes === null || mes === '') {
      return responseHandler.error(res, 'Mês é obrigatório.', 400)
    }

    const mesNum = Number(mes)
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return responseHandler.error(res, 'Mês inválido. Deve ser um número entre 1 e 12.', 400)
    }

    // Validação: ano é obrigatório
    if (ano === undefined || ano === null || ano === '') {
      return responseHandler.error(res, 'Ano é obrigatório.', 400)
    }

    const anoNum = Number(ano)
    if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
      return responseHandler.error(res, 'Ano inválido. Deve ser um número entre 1900 e 2100.', 400)
    }

    // Processa diaSemana (opcional) - aceita apenas string (nome do dia)
    let diaSemanaParam = null
    if (diaSemana !== undefined && diaSemana !== null && diaSemana !== '') {
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      if (weekdays.includes(diaSemana)) {
        diaSemanaParam = diaSemana
      } else {
        return responseHandler.error(res, 'Dia da semana inválido. Use: Domingo, Segunda, Terça, Quarta, Quinta, Sexta ou Sábado.', 400)
      }
    }

    // Processa somentePresentes (opcional, boolean)
    const somentePresentesBool = somentePresentes === 'true' || somentePresentes === true

    const data = await presencaService.gerarRelatorioPresenca(commonIdNum, mesNum, anoNum, diaSemanaParam, somentePresentesBool)

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar relatório de presença.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar relatório de presença.', 500)
  }
})

router.get('/relatorios/ranking-faltas', async (req, res) => {
  try {
    const { common_id, mes, ano, diaSemana } = req.query ?? {}

    // Validação: common_id é obrigatório
    if (common_id === undefined || common_id === null || common_id === '') {
      return responseHandler.error(res, 'ID da comum é obrigatório.', 400)
    }

    const commonIdNum = Number(common_id)
    if (!Number.isInteger(commonIdNum) || commonIdNum <= 0) {
      return responseHandler.error(res, 'ID da comum inválido.', 400)
    }

    // Validação: mes é obrigatório
    if (mes === undefined || mes === null || mes === '') {
      return responseHandler.error(res, 'Mês é obrigatório.', 400)
    }

    const mesNum = Number(mes)
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return responseHandler.error(res, 'Mês inválido. Deve ser um número entre 1 e 12.', 400)
    }

    // Validação: ano é obrigatório
    if (ano === undefined || ano === null || ano === '') {
      return responseHandler.error(res, 'Ano é obrigatório.', 400)
    }

    const anoNum = Number(ano)
    if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
      return responseHandler.error(res, 'Ano inválido. Deve ser um número entre 1900 e 2100.', 400)
    }

    // Processa diaSemana (opcional) - aceita apenas string (nome do dia)
    let diaSemanaParam = null
    if (diaSemana !== undefined && diaSemana !== null && diaSemana !== '') {
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      if (weekdays.includes(diaSemana)) {
        diaSemanaParam = diaSemana
      } else {
        return responseHandler.error(res, 'Dia da semana inválido. Use: Domingo, Segunda, Terça, Quarta, Quinta, Sexta ou Sábado.', 400)
      }
    }

    const data = await presencaService.gerarRankingFaltas(commonIdNum, mesNum, anoNum, diaSemanaParam)

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

    // Validação: common_id é obrigatório
    if (common_id === undefined || common_id === null || common_id === '') {
      return responseHandler.error(res, 'ID da comum é obrigatório.', 400)
    }

    const commonIdNum = Number(common_id)
    if (!Number.isInteger(commonIdNum) || commonIdNum <= 0) {
      return responseHandler.error(res, 'ID da comum inválido.', 400)
    }

    // Validação: mes é obrigatório
    if (mes === undefined || mes === null || mes === '') {
      return responseHandler.error(res, 'Mês é obrigatório.', 400)
    }

    const mesNum = Number(mes)
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return responseHandler.error(res, 'Mês inválido. Deve ser um número entre 1 e 12.', 400)
    }

    // Validação: ano é obrigatório
    if (ano === undefined || ano === null || ano === '') {
      return responseHandler.error(res, 'Ano é obrigatório.', 400)
    }

    const anoNum = Number(ano)
    if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
      return responseHandler.error(res, 'Ano inválido. Deve ser um número entre 1900 e 2100.', 400)
    }

    // Processa diaSemana (opcional) - aceita apenas string (nome do dia)
    let diaSemanaParam = null
    if (diaSemana !== undefined && diaSemana !== null && diaSemana !== '') {
      const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      if (weekdays.includes(diaSemana)) {
        diaSemanaParam = diaSemana
      } else {
        return responseHandler.error(res, 'Dia da semana inválido. Use: Domingo, Segunda, Terça, Quarta, Quinta, Sexta ou Sábado.', 400)
      }
    }

    const data = await presencaService.gerarRankingFaltasPeriodo(commonIdNum, mesNum, anoNum, diaSemanaParam)

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar ranking de faltas por período.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar ranking de faltas por período.', 500)
  }
})

router.get('/relatorios/cultos-com-presenca', async (req, res) => {
  try {
    const { mes, ano } = req.query ?? {}

    // Validação: mes é obrigatório
    if (mes === undefined || mes === null || mes === '') {
      return responseHandler.error(res, 'Mês é obrigatório.', 400)
    }

    const mesNum = Number(mes)
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return responseHandler.error(res, 'Mês inválido. Deve ser um número entre 1 e 12.', 400)
    }

    // Validação: ano é obrigatório
    if (ano === undefined || ano === null || ano === '') {
      return responseHandler.error(res, 'Ano é obrigatório.', 400)
    }

    const anoNum = Number(ano)
    if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
      return responseHandler.error(res, 'Ano inválido. Deve ser um número entre 1900 e 2100.', 400)
    }

    const data = await presencaService.listarCultosComPresenca(mesNum, anoNum)

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao listar cultos com presença.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao listar cultos com presença.', 500)
  }
})

router.get('/relatorios/historico-por-data', async (req, res) => {
  try {
    const { common_id, mes, ano } = req.query ?? {}

    // Validação: common_id é obrigatório
    if (common_id === undefined || common_id === null || common_id === '') {
      return responseHandler.error(res, 'ID da comum é obrigatório.', 400)
    }

    const commonIdNum = Number(common_id)
    if (!Number.isInteger(commonIdNum) || commonIdNum <= 0) {
      return responseHandler.error(res, 'ID da comum inválido.', 400)
    }

    // Validação: mes é obrigatório
    if (mes === undefined || mes === null || mes === '') {
      return responseHandler.error(res, 'Mês é obrigatório.', 400)
    }

    const mesNum = Number(mes)
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return responseHandler.error(res, 'Mês inválido. Deve ser um número entre 1 e 12.', 400)
    }

    // Validação: ano é obrigatório
    if (ano === undefined || ano === null || ano === '') {
      return responseHandler.error(res, 'Ano é obrigatório.', 400)
    }

    const anoNum = Number(ano)
    if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
      return responseHandler.error(res, 'Ano inválido. Deve ser um número entre 1900 e 2100.', 400)
    }

    const data = await presencaService.gerarHistoricoPorData(commonIdNum, mesNum, anoNum)

    return responseHandler.success(res, data)
  } catch (error) {
    console.error('Erro ao gerar histórico por data.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar histórico por data.', 500)
  }
})

router.get('/relatorios/presenca/pdf', async (req, res) => {
  try {
    const { mes, ano, diaSemana, somentePresentes } = req.query ?? {}

    // Validação: mes é obrigatório
    if (mes === undefined || mes === null || mes === '') {
      return responseHandler.error(res, 'Mês é obrigatório.', 400)
    }

    const mesNum = Number(mes)
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return responseHandler.error(res, 'Mês inválido. Deve ser um número entre 1 e 12.', 400)
    }

    // Validação: ano é obrigatório
    if (ano === undefined || ano === null || ano === '') {
      return responseHandler.error(res, 'Ano é obrigatório.', 400)
    }

    const anoNum = Number(ano)
    if (!Number.isInteger(anoNum) || anoNum < 1900 || anoNum > 2100) {
      return responseHandler.error(res, 'Ano inválido. Deve ser um número entre 1900 e 2100.', 400)
    }

    // Processa diaSemana (opcional) - pode ser número (1-7) ou string (nome do dia)
    let diaSemanaParam = null
    if (diaSemana !== undefined && diaSemana !== null && diaSemana !== '') {
      // Se for número, mantém como número (será convertido para string no repository)
      // Se for string, mantém como string
      const diaSemanaNum = Number(diaSemana)
      if (Number.isInteger(diaSemanaNum) && diaSemanaNum >= 1 && diaSemanaNum <= 7) {
        diaSemanaParam = diaSemanaNum
      } else if (typeof diaSemana === 'string') {
        const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        if (weekdays.includes(diaSemana)) {
          diaSemanaParam = diaSemana
        } else {
          return responseHandler.error(res, 'Dia da semana inválido. Use: Domingo, Segunda, Terça, Quarta, Quinta, Sexta ou Sábado.', 400)
        }
      } else {
        return responseHandler.error(res, 'Dia da semana inválido. Deve ser um número entre 1 (Domingo) e 7 (Sábado) ou o nome do dia.', 400)
      }
    }

    // Processa somentePresentes (opcional, boolean)
    const somentePresentesBool = somentePresentes === 'true' || somentePresentes === true

    // Gera o PDF
    const doc = await relatorioPdfService.gerarPdfRelatorioPresenca(mesNum, anoNum, diaSemanaNum, somentePresentesBool)

    // Configura headers
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-presenca.pdf"')

    // Pipe do PDFDocument direto para a response
    doc.pipe(res)
    doc.end()
  } catch (error) {
    console.error('Erro ao gerar PDF do relatório de presença.', {
      query: req.query,
      error: error.message,
      stack: error.stack,
    })
    return responseHandler.error(res, 'Erro ao gerar PDF do relatório de presença.', 500)
  }
})

export { router as attendanceRouter }
