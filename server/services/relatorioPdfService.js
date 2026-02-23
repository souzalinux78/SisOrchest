import PDFDocument from 'pdfkit'
import * as presencaService from './presencaService.js'

const COLORS = {
  PRIMARY: '#B8860B',
  SECONDARY: '#1C1C1C',
  ACCENT: '#333333',
  LIGHT_BG: '#F5F5F5',
  WHITE: '#FFFFFF',
  DANGER: '#EF4444',
  SUCCESS: '#10B981',
}

const PAGE = {
  LEFT: 50,
  RIGHT: 545,
  TOP: 50,
  BOTTOM_GUARD: 60,
}

const ensurePageSpace = (doc, neededHeight = 24) => {
  const limit = doc.page.height - PAGE.BOTTOM_GUARD
  if (doc.y + neededHeight > limit) {
    doc.addPage()
    doc.y = PAGE.TOP
    return true
  }
  return false
}

const toIsoDateOnly = (value) => {
  if (!value) return null
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const asText = String(value).trim()
  if (!asText) return null
  const datePart = asText.includes('T') ? asText.split('T')[0] : asText
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart

  const parsed = new Date(asText)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear()
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const d = String(parsed.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  return null
}

const formatDateBr = (value) => {
  const iso = toIsoDateOnly(value)
  if (!iso) return String(value ?? '--')
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

const drawSectionTitle = (doc, title) => {
  ensurePageSpace(doc, 36)
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.PRIMARY)
    .text(String(title || '').toUpperCase(), PAGE.LEFT, doc.y, { align: 'left' })

  doc.moveDown(0.2)
  doc
    .lineWidth(1)
    .moveTo(PAGE.LEFT, doc.y)
    .lineTo(PAGE.LEFT + 150, doc.y)
    .strokeColor(COLORS.PRIMARY)
    .stroke()

  doc.moveDown(0.8)
}

const drawNoDataMessage = (doc) => {
  ensurePageSpace(doc, 24)
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor(COLORS.ACCENT)
    .text('Nenhum dado registrado para este periodo.', PAGE.LEFT, doc.y)
}

const drawHeaderRow = (doc, y, headers, widths) => {
  doc.rect(PAGE.LEFT, y - 5, widths.reduce((acc, cur) => acc + cur, 0), 20).fill(COLORS.SECONDARY)

  let x = PAGE.LEFT
  headers.forEach((header, i) => {
    doc
      .fillColor(COLORS.WHITE)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(header, x + 5, y, { width: widths[i], align: 'left' })
    x += widths[i]
  })
}

const drawGenericTable = (doc, headers, widths, rows, options = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    drawNoDataMessage(doc)
    return
  }

  const rowHeight = options.rowHeight || 18
  const getCellColor = options.getCellColor || null
  const formatCell = options.formatCell || ((value) => String(value ?? '--'))
  const totalWidth = widths.reduce((acc, cur) => acc + cur, 0)
  const limit = doc.page.height - PAGE.BOTTOM_GUARD

  let currentY = doc.y + 8
  if (currentY + 20 + rowHeight > limit) {
    doc.addPage()
    currentY = PAGE.TOP
  }
  drawHeaderRow(doc, currentY, headers, widths)
  currentY += 20

  rows.forEach((row, rowIndex) => {
    if (currentY + rowHeight > limit) {
      doc.addPage()
      currentY = PAGE.TOP
      drawHeaderRow(doc, currentY, headers, widths)
      currentY += 20
    }

    if (rowIndex % 2 === 0) {
      doc.rect(PAGE.LEFT, currentY - 5, totalWidth, rowHeight).fill(COLORS.LIGHT_BG)
    }

    let x = PAGE.LEFT
    row.forEach((cell, colIndex) => {
      const text = formatCell(cell, rowIndex, colIndex)
      const color = getCellColor ? getCellColor(cell, rowIndex, colIndex) : COLORS.SECONDARY
      doc
        .fillColor(color || COLORS.SECONDARY)
        .font('Helvetica')
        .fontSize(9)
        .text(text, x + 5, currentY, {
          width: Math.max(20, widths[colIndex] - 10),
          height: rowHeight - 2,
          lineBreak: false,
          ellipsis: true,
        })
      x += widths[colIndex]
    })

    currentY += rowHeight
  })

  doc.y = currentY + 8
}

const drawKpiCard = (doc, label, value, x, y, isPercent = false) => {
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.ACCENT)
    .text(label, x, y)

  const numeric = Number.parseFloat(String(value).replace('%', ''))
  const color = isPercent && numeric >= 70
    ? COLORS.SUCCESS
    : isPercent && numeric < 50
      ? COLORS.DANGER
      : COLORS.SECONDARY

  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor(color)
    .text(String(value), x, y + 18)
}

const drawRankingTable = (doc, items) => {
  const headers = ['Pos.', 'Musico', 'Presencas', 'Faltas', '% Presenca']
  const widths = [40, 230, 80, 60, 80]
  const rows = items.map((item, index) => [
    `${index + 1}o`,
    item.musician_name || '--',
    Number(item.presencas || 0),
    Number(item.faltas || 0),
    `${Number(item.percentual_presenca || 0).toFixed(2)}%`,
  ])
  drawGenericTable(doc, headers, widths, rows)
}

const drawAlphabeticalMusiciansTable = (doc, items) => {
  const headers = ['Musico', 'Presencas', 'Faltas', '% Presenca']
  const widths = [300, 80, 70, 80]
  const rows = items.map((item) => [
    item.musician_name || '--',
    Number(item.presencas || 0),
    Number(item.faltas || 0),
    `${Number(item.percentual_presenca || 0).toFixed(2)}%`,
  ])
  drawGenericTable(doc, headers, widths, rows)
}

const drawHistoryTable = (doc, items) => {
  const headers = ['Data', 'Dia da Semana', 'Presencas', 'Faltas']
  const widths = [130, 190, 90, 90]
  const rows = items.map((item) => [
    formatDateBr(item.service_date),
    item.weekday || '--',
    Number(item.total_presencas || 0),
    Number(item.total_faltas || 0),
  ])
  drawGenericTable(doc, headers, widths, rows)
}

const drawNamesInTwoColumns = (doc, names) => {
  const availableWidth = PAGE.RIGHT - PAGE.LEFT
  const columnGap = 16
  const columnWidth = (availableWidth - columnGap) / 2
  const rowHeight = 14

  doc
    .fontSize(8.5)
    .font('Helvetica')
    .fillColor(COLORS.ACCENT)

  for (let i = 0; i < names.length; i += 2) {
    ensurePageSpace(doc, rowHeight + 2)
    const rowY = doc.y

    const leftName = `${i + 1}. ${names[i]}`
    doc.text(leftName, PAGE.LEFT, rowY, {
      width: columnWidth - 4,
      lineBreak: false,
      ellipsis: true,
    })

    if (names[i + 1]) {
      const rightName = `${i + 2}. ${names[i + 1]}`
      doc.text(rightName, PAGE.LEFT + columnWidth + columnGap, rowY, {
        width: columnWidth - 4,
        lineBreak: false,
        ellipsis: true,
      })
    }

    doc.y = rowY + rowHeight
  }
}

const drawPresentesPorData = (doc, items) => {
  items.forEach((item, index) => {
    ensurePageSpace(doc, 34)
    const header = `${formatDateBr(item.service_date)} - ${item.weekday || '--'} (${item.total_presentes || 0} presentes)`
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(COLORS.SECONDARY)
      .text(header, PAGE.LEFT, doc.y)

    doc.moveDown(0.2)

    const names = Array.isArray(item.musicians) ? item.musicians : []
    if (names.length === 0) {
      ensurePageSpace(doc, 16)
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(COLORS.ACCENT)
        .text('--', PAGE.LEFT, doc.y, { width: 495, align: 'left' })
      doc.moveDown(0.3)
    } else {
      drawNamesInTwoColumns(doc, names)
    }

    if (index < items.length - 1) {
      doc.moveDown(0.4)
      ensurePageSpace(doc, 8)
      doc
        .moveTo(PAGE.LEFT, doc.y)
        .lineTo(PAGE.RIGHT, doc.y)
        .lineWidth(0.5)
        .strokeColor('#DDDDDD')
        .stroke()
      doc.moveDown(0.6)
    }
  })
}

const addFooterPagination = (doc) => {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(COLORS.ACCENT)
      .text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')} - Pagina ${i + 1} de ${range.count}`,
        PAGE.LEFT,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - 100, lineBreak: false, ellipsis: true },
      )
  }
}

/**
 * Gera relatorio de presenca em PDF (modulo attendance)
 */
export async function gerarPdfRelatorioPresenca(commonId, mes, ano, diaSemana = null, somentePresentes = false) {
  const dados = await presencaService.gerarRelatorioPresenca(commonId, mes, ano, diaSemana, somentePresentes)

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.TOP, bottom: 50, left: PAGE.LEFT, right: 50 },
  })

  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor(COLORS.SECONDARY)
    .text('RELATORIO DE PRESENCA', { align: 'center' })

  doc
    .moveDown(0.4)
    .fontSize(11)
    .font('Helvetica')
    .text(`Mes: ${mes} | Ano: ${ano}`, { align: 'center' })

  if (diaSemana !== null && diaSemana !== undefined) {
    doc.moveDown(0.2).text(`Dia da semana: ${diaSemana}`, { align: 'center' })
  }

  drawSectionTitle(doc, 'Resumo por musico')
  const headers = ['Nome', 'Total Escalas', 'Total Presencas', 'Total Faltas', '% Presenca']
  const widths = [210, 85, 85, 75, 80]
  const rows = dados.map((item) => [
    item.nome || '--',
    Number(item.total_escalas || 0),
    Number(item.total_presencas || 0),
    Number(item.total_faltas || 0),
    `${Number(item.percentual_presenca || 0).toFixed(2)}%`,
  ])
  drawGenericTable(doc, headers, widths, rows)

  return doc
}

/**
 * PDF executivo limpo (sem historico/presentes por dia)
 */
export async function gerarPdfRelatorioExecutivo(commonId, month, year, weekday = null, specificDate = null) {
  const [summary, commonName, serviceDates, activeMusicians, relatorioPresenca] = await Promise.all([
    presencaService.gerarResumoExecutivo(commonId, month, year, weekday, specificDate),
    presencaService.buscarNomeComum(commonId),
    presencaService.buscarDatasServicos(commonId, month, year, weekday, specificDate),
    presencaService.listarMusicosAtivosComum(commonId),
    presencaService.gerarRelatorioPresenca(commonId, month, year, weekday, false, null, specificDate),
  ])

  const statsByMusicianId = new Map(
    (Array.isArray(relatorioPresenca) ? relatorioPresenca : []).map((item) => [
      Number(item.id),
      {
        presencas: Number(item.total_presencas || 0),
        faltas: Number(item.total_faltas || 0),
        percentual_presenca: Number(item.percentual_presenca || 0),
      },
    ]),
  )

  const allMusicians = (Array.isArray(activeMusicians) ? activeMusicians : [])
    .map((musician) => {
      const id = Number(musician.id)
      const stats = statsByMusicianId.get(id) ?? { presencas: 0, faltas: 0, percentual_presenca: 0 }
      return {
        musician_id: id,
        musician_name: String(musician.name || '--'),
        presencas: stats.presencas,
        faltas: stats.faltas,
        percentual_presenca: stats.percentual_presenca,
      }
    })

  const allMusiciansAlphabetical = allMusicians
    .slice()
    .sort((a, b) => a.musician_name.localeCompare(b.musician_name, 'pt-BR'))

  const rankingFaltasCompleto = allMusicians
    .slice()
    .sort((a, b) => {
      if (b.faltas !== a.faltas) return b.faltas - a.faltas
      return a.musician_name.localeCompare(b.musician_name, 'pt-BR')
    })

  const rankingPresencasCompleto = allMusicians
    .slice()
    .sort((a, b) => {
      if (b.presencas !== a.presencas) return b.presencas - a.presencas
      return a.musician_name.localeCompare(b.musician_name, 'pt-BR')
    })

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.TOP, bottom: 50, left: PAGE.LEFT, right: 50 },
    bufferPages: true,
  })

  const meses = [
    '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor(COLORS.PRIMARY)
    .text('SISORCHEST', { align: 'center' })

  doc
    .moveDown(0.2)
    .fontSize(16)
    .font('Helvetica')
    .fillColor(COLORS.SECONDARY)
    .text(commonName || 'Relatorio Geral', { align: 'center' })

  if (specificDate) {
    doc.text(`Relatorio do culto: ${formatDateBr(specificDate)}`, { align: 'center' })
  } else {
    let periodoTexto = `${meses[month] || month} de ${year}`
    if (weekday) periodoTexto += ` - ${weekday}s`
    doc.text(periodoTexto, { align: 'center' })

    if (Array.isArray(serviceDates) && serviceDates.length > 0) {
      const datasFormatadas = serviceDates.map((d) => formatDateBr(d.service_date)).join(', ')
      doc
        .moveDown(0.3)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor(COLORS.ACCENT)
        .text(`Datas: ${datasFormatadas}`, { align: 'center' })
    }
  }

  doc
    .moveDown(1)
    .moveTo(PAGE.LEFT, doc.y)
    .lineTo(PAGE.RIGHT, doc.y)
    .lineWidth(2)
    .strokeColor(COLORS.PRIMARY)
    .stroke()

  doc.moveDown(1.2)

  drawSectionTitle(doc, 'Resumo de presenca')
  const y = doc.y + 4
  drawKpiCard(doc, 'Total de Musicos', summary.total_musicos, 50, y)
  drawKpiCard(doc, 'Cultos Realizados', summary.total_cultos_distintos, 220, y)
  drawKpiCard(doc, 'Presenca Global', `${Number(summary.percentual_presenca || 0).toFixed(2)}%`, 390, y, true)
  doc.y = y + 62
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.SECONDARY)
    .text(`Total de Presencas Registradas: ${Number(summary.total_presencas || 0)}`, PAGE.LEFT, doc.y)
    .text(`Total de Faltas Registradas: ${Number(summary.total_faltas || 0)}`, PAGE.LEFT, doc.y + 15)

  doc.moveDown(3)

  drawSectionTitle(doc, 'Todos os musicos (ordem alfabetica)')
  if (allMusiciansAlphabetical.length > 0) {
    drawAlphabeticalMusiciansTable(doc, allMusiciansAlphabetical)
  } else {
    drawNoDataMessage(doc)
  }

  doc.moveDown(1.5)

  drawSectionTitle(doc, 'Musicos com mais faltas')
  if (rankingFaltasCompleto.length > 0) {
    drawRankingTable(doc, rankingFaltasCompleto)
  } else {
    drawNoDataMessage(doc)
  }

  doc.moveDown(1.5)

  drawSectionTitle(doc, 'Musicos mais presentes')
  if (rankingPresencasCompleto.length > 0) {
    drawRankingTable(doc, rankingPresencasCompleto)
  } else {
    drawNoDataMessage(doc)
  }

  addFooterPagination(doc)
  return doc
}

/**
 * PDF detalhado separado: historico + musicos presentes por dia
 */
export async function gerarPdfHistoricoPresentes(commonId, month, year, weekday = null, specificDate = null) {
  const [commonName, historyData, presentesPorData] = await Promise.all([
    presencaService.buscarNomeComum(commonId),
    presencaService.gerarHistoricoPorData(commonId, month, year, weekday, specificDate),
    presencaService.buscarPresentesPorData(commonId, month, year, weekday, specificDate),
  ])

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.TOP, bottom: 50, left: PAGE.LEFT, right: 50 },
    bufferPages: true,
  })

  const meses = [
    '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor(COLORS.PRIMARY)
    .text('RELATORIO DETALHADO DE PRESENCA', { align: 'center' })

  doc
    .moveDown(0.2)
    .fontSize(14)
    .font('Helvetica')
    .fillColor(COLORS.SECONDARY)
    .text(commonName || 'Comum', { align: 'center' })

  if (specificDate) {
    doc.text(`Data: ${formatDateBr(specificDate)}`, { align: 'center' })
  } else {
    let periodoTexto = `${meses[month] || month} de ${year}`
    if (weekday) periodoTexto += ` - ${weekday}s`
    doc.text(periodoTexto, { align: 'center' })
  }

  doc
    .moveDown(1)
    .moveTo(PAGE.LEFT, doc.y)
    .lineTo(PAGE.RIGHT, doc.y)
    .lineWidth(2)
    .strokeColor(COLORS.PRIMARY)
    .stroke()

  doc.moveDown(1.2)

  drawSectionTitle(doc, 'Historico por data')
  if (Array.isArray(historyData) && historyData.length > 0) {
    drawHistoryTable(doc, historyData)
  } else {
    drawNoDataMessage(doc)
  }

  doc.moveDown(1.5)

  drawSectionTitle(doc, 'Musicos presentes por dia')
  if (Array.isArray(presentesPorData) && presentesPorData.length > 0) {
    drawPresentesPorData(doc, presentesPorData)
  } else {
    drawNoDataMessage(doc)
  }

  addFooterPagination(doc)
  return doc
}
