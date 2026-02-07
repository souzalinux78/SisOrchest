import PDFDocument from 'pdfkit'
import * as presencaService from './presencaService.js'

/**
 * Service para geração de relatórios em PDF relacionados a presenças
 */

/**
 * Gera relatório de presença em PDF
 * @param {number} mes - Mês (1-12)
 * @param {number} ano - Ano (ex: 2024)
 * @param {number|null} diaSemana - Dia da semana opcional (1=Domingo, 2=Segunda, ..., 7=Sábado)
 * @param {boolean} somentePresentes - Se true, retorna apenas músicos com presenças > 0
 * @returns {Promise<PDFDocument>} Documento PDF gerado
 */
export async function gerarPdfRelatorioPresenca(mes, ano, diaSemana = null, somentePresentes = false) {
  // Busca dados do service
  const dados = await presencaService.gerarRelatorioPresenca(mes, ano, diaSemana, somentePresentes)

  // Cria novo documento PDF
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  })

  // Adiciona título
  doc.fontSize(18)
    .font('Helvetica-Bold')
    .text('RELATÓRIO DE PRESENÇA', { align: 'center' })

  // Adiciona mês e ano
  doc.moveDown(1)
    .fontSize(12)
    .font('Helvetica')
    .text(`Mês: ${mes} | Ano: ${ano}`, { align: 'center' })

  // Se diaSemana for informado, mostrar o número do dia da semana
  if (diaSemana !== null && diaSemana !== undefined) {
    const diasSemana = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const nomeDia = diasSemana[diaSemana] || `Dia ${diaSemana}`
    doc.text(`Dia da Semana: ${nomeDia} (${diaSemana})`, { align: 'center' })
  }

  // Espaçamento antes da tabela
  doc.moveDown(2)

  // Cabeçalho da tabela
  const startY = doc.y
  const colWidths = [200, 100, 100, 100, 100]
  const rowHeight = 25
  const headerY = startY

  // Desenha cabeçalho da tabela
  doc.fontSize(10)
    .font('Helvetica-Bold')
    .text('Nome', 50, headerY, { width: colWidths[0] })
    .text('Total Escalas', 50 + colWidths[0], headerY, { width: colWidths[1] })
    .text('Total Presenças', 50 + colWidths[0] + colWidths[1], headerY, { width: colWidths[2] })
    .text('Total Faltas', 50 + colWidths[0] + colWidths[1] + colWidths[2], headerY, { width: colWidths[3] })
    .text('Percentual Presença', 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], headerY, { width: colWidths[4] })

  // Linha separadora do cabeçalho
  doc.moveTo(50, headerY + 20)
    .lineTo(550, headerY + 20)
    .stroke()

  // Dados da tabela
  let currentY = headerY + rowHeight
  doc.fontSize(9)
    .font('Helvetica')

  dados.forEach((item) => {
    // Verifica se precisa de nova página
    if (currentY > 750) {
      doc.addPage()
      currentY = 50
    }

    // Desenha linha de dados
    doc.text(item.nome || '--', 50, currentY, { width: colWidths[0] })
      .text(String(item.total_escalas || 0), 50 + colWidths[0], currentY, { width: colWidths[1] })
      .text(String(item.total_presencas || 0), 50 + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] })
      .text(String(item.total_faltas || 0), 50 + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[3] })
      .text(`${item.percentual_presenca?.toFixed(2) || '0.00'}%`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY, { width: colWidths[4] })

    // Linha separadora
    doc.moveTo(50, currentY + 15)
      .lineTo(550, currentY + 15)
      .stroke()

    currentY += rowHeight
  })

  // Se não houver dados, exibe mensagem
  if (dados.length === 0) {
    doc.fontSize(12)
      .font('Helvetica')
      .text('Nenhum dado disponível para o período selecionado.', 50, currentY, { align: 'center' })
  }

  return doc
}

/**
 * Gera relatório executivo completo em PDF
 * @param {number} commonId - ID da comum
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @returns {Promise<PDFDocument>} Documento PDF gerado
 */
// Constantes de cores e layout
const COLORS = {
  PRIMARY: '#B8860B',    // Dark Golden Rod (Cor principal do sistema)
  SECONDARY: '#1c1c1c',  // Quase preto (Texto principal)
  ACCENT: '#333333',     // Cinza escuro (Subtítulos)
  LIGHT_BG: '#f5f5f5',    // Fundo alternado de tabelas
  WHITE: '#ffffff',
  DANGER: '#ef4444',
  SUCCESS: '#10b981',
}

/**
 * Gera relatório executivo completo em PDF
 * @param {number} commonId - ID da comum
 * @param {number} month - Mês (1-12)
 * @param {number} year - Ano
 * @returns {Promise<PDFDocument>} Documento PDF gerado
 */
export async function gerarPdfRelatorioExecutivo(commonId, month, year, weekday = null, specificDate = null) {
  // Busca dados do resumo executivo, rankings, nome da comum e datas dos serviços
  const [summary, ranking, commonName, serviceDates] = await Promise.all([
    presencaService.gerarResumoExecutivo(commonId, month, year, weekday, specificDate),
    presencaService.gerarRankingMusicos(commonId, month, year, weekday, specificDate),
    presencaService.buscarNomeComum(commonId),
    presencaService.buscarDatasServicos(commonId, month, year, weekday, specificDate),
  ])

  // Cria novo documento PDF
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    bufferPages: true,
  })

  // === CABEÇALHO ===

  // Título Principal
  doc.fontSize(24)
    .font('Helvetica-Bold')
    .fillColor(COLORS.PRIMARY)
    .text('SISORCHEST', { align: 'center' })

  // Nome da Comum
  doc.moveDown(0.2)
  doc.fontSize(16)
    .font('Helvetica')
    .fillColor(COLORS.SECONDARY)
    .text(commonName || 'Relatório Geral', { align: 'center' })

  // Mês e Ano
  const meses = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  // Formatação do subtítulo
  if (specificDate) {
    const [ano, mes, dia] = specificDate.split('-')
    doc.text(`Relatório do Culto: ${dia}/${mes}/${ano}`, { align: 'center' })
  } else {
    let periodoTexto = `${meses[month] || month} de ${year}`
    if (weekday) {
      periodoTexto += ` - ${weekday}s`
    }
    doc.text(periodoTexto, { align: 'center' })

    // Lista de datas dos cultos
    if (serviceDates && serviceDates.length > 0) {
      const datasFormatadas = serviceDates
        .map(d => {
          const date = new Date(d.service_date)
          return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`
        })
        .join(', ')

      doc.moveDown(0.3)
      doc.fontSize(10)
        .font('Helvetica-Oblique')
        .text(`Datas: ${datasFormatadas}`, { align: 'center' })
    }
  }

  // Linha separadora do cabeçalho
  doc.moveDown(1)
  doc.moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .lineWidth(2)
    .strokeColor(COLORS.PRIMARY)
    .stroke()

  doc.moveDown(2)

  // === SEÇÃO: RESUMO DE PRESENÇA ===

  drawSectionTitle(doc, 'RESUMO DE PRESENÇA')

  const resumoY = doc.y + 10

  // Cards de KPI estilizados
  drawKpiCard(doc, 'Total de Músicos', summary.total_musicos, 50, resumoY)
  drawKpiCard(doc, 'Cultos Realizados', summary.total_cultos_distintos, 220, resumoY)
  drawKpiCard(doc, 'Presença Global', `${summary.percentual_presenca.toFixed(2)}%`, 390, resumoY, true)

  doc.y = resumoY + 70

  // Detalhamento do resumo
  doc.fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.SECONDARY)
    .text(`Total de Presenças Registradas: ${summary.total_presencas}`, 50, doc.y)
    .text(`Total de Faltas Registradas: ${summary.total_faltas}`, 50, doc.y + 15)

  doc.moveDown(4)

  // === SEÇÃO: MÚSICOS COM MAIS FALTAS ===

  drawSectionTitle(doc, 'MÚSICOS COM MAIS FALTAS')

  if (ranking.ranking_faltas.length > 0) {
    drawTable(doc, ranking.ranking_faltas, ['Pos.', 'Músico', 'Presenças', 'Faltas', '% Presença'], [40, 230, 80, 60, 80])
  } else {
    drawNoDataMessage(doc)
  }

  doc.moveDown(3)

  // Verifica quebra de página
  if (doc.y > 650) {
    doc.addPage()
    doc.moveDown(2) // Espaço extra se for nova página
  }

  // === SEÇÃO: MÚSICOS MAIS PRESENTES ===

  drawSectionTitle(doc, 'MÚSICOS MAIS PRESENTES')

  if (ranking.ranking_presencas.length > 0) {
    drawTable(doc, ranking.ranking_presencas, ['Pos.', 'Músico', 'Presenças', 'Faltas', '% Presença'], [40, 230, 80, 60, 80])
  } else {
    drawNoDataMessage(doc)
  }

  // Rodapé com paginação
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc.fontSize(8)
      .fillColor(COLORS.ACCENT)
      .text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} - Página ${i + 1} de ${range.count}`,
        50,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - 100 }
      )
  }

  return doc
}

// === FUNÇÕES AUXILIARES DE DESIGN ===

function drawSectionTitle(doc, title) {
  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(COLORS.PRIMARY)
    .text(title.toUpperCase(), 50, doc.y, { align: 'left' })

  doc.moveDown(0.2)
  doc.lineWidth(1)
    .moveTo(50, doc.y) // Linha fina abaixo do título
    .lineTo(200, doc.y) // Linha curta estilizada
    .strokeColor(COLORS.PRIMARY)
    .stroke()

  doc.moveDown(1)
}

function drawKpiCard(doc, label, value, x, y, isPercent = false) {
  // Caixa
  // doc.rect(x, y, 150, 50).fillAndStroke(COLORS.LIGHT_BG, COLORS.ACCENT) // Opcional: fundo cinza

  doc.fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.ACCENT)
    .text(label, x, y)

  doc.fontSize(16)
    .font('Helvetica-Bold')
    .fillColor(isPercent && parseFloat(value) >= 70 ? COLORS.SUCCESS : (isPercent && parseFloat(value) < 50 ? COLORS.DANGER : COLORS.SECONDARY))
    .text(String(value), x, y + 20)
}

function drawTable(doc, data, headers, widths) {
  const startX = 50
  let currentY = doc.y + 10

  // Cabeçalho da Tabela
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.WHITE)

  // Fundo do cabeçalho
  doc.rect(startX, currentY - 5, 500, 20).fill(COLORS.SECONDARY)

  let currentX = startX
  headers.forEach((header, i) => {
    doc.fillColor(COLORS.WHITE).text(header, currentX + 5, currentY, { width: widths[i], align: 'left' })
    currentX += widths[i]
  })

  currentY += 20

  // Linhas
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.SECONDARY)

  data.forEach((item, index) => {
    // Zebra striping
    if (index % 2 === 0) {
      doc.rect(startX, currentY - 5, 500, 18).fill(COLORS.LIGHT_BG)
    }

    currentX = startX
    doc.fillColor(COLORS.SECONDARY) // Reset cor

    // Posição
    doc.text(`${index + 1}º`, currentX + 5, currentY, { width: widths[0] })
    currentX += widths[0]

    // Nome
    doc.text(item.musician_name, currentX + 5, currentY, { width: widths[1], ellipsis: true })
    currentX += widths[1]

    // Presenças
    doc.text(String(item.presencas), currentX + 5, currentY, { width: widths[2] })
    currentX += widths[2]

    // Faltas
    // Se estiver na tabela "Mais Faltas" e tiver faltas, destaca em vermelho? Opcional
    doc.text(String(item.faltas), currentX + 5, currentY, { width: widths[3] })
    currentX += widths[3]

    // Percentual
    const perc = item.percentual_presenca
    const color = perc >= 70 ? COLORS.SUCCESS : (perc < 50 ? COLORS.DANGER : COLORS.SECONDARY)

    doc.fillColor(color).text(`${perc.toFixed(2)}%`, currentX + 5, currentY, { width: widths[4] })

    currentY += 18

    // Nova página se necessário
    if (currentY > 750) {
      doc.addPage()
      currentY = 50
    }
  })
}

function drawNoDataMessage(doc) {
  doc.fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor(COLORS.ACCENT)
    .text('Nenhum dado registrado para este período.', 50, doc.y)
}
