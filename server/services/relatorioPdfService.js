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
