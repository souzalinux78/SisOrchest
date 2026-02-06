import React from 'react'
import { api } from './api'
import type { Attendance, AttendanceVisitors, Common, Musician, Service } from './api'
import { clearTableLoading, clearTextLoading, formatServiceSchedule, requireConfirmClick, setButtonLoading, setHtml, setTableLoading, setText, setTextLoading } from './dom'
import { getCurrentUser } from './session'
import Chart from 'chart.js/auto'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'
import { createRoot } from 'react-dom/client'
import { RankingFaltasChart } from '../components/RankingFaltasChart'

type ReportRow = {
  musicianName: string
  commonName: string
  attendanceCount: number
  totalServices: number
  percentage: number
  totalFaltas?: number
  percentualFaltas?: number
}

let chartInstance: Chart | null = null
let currentReportRows: ReportRow[] = []
let currentReportContext: {
  attendance: Attendance[]
  services: Service[]
  activeTotal: number
  visitors: AttendanceVisitors[]
} | null = null
let availableDates: Array<{ id: number; data: string }> = []
let rankingFaltas: Array<{ id: number; nome: string; total_escalas: number; total_presencas: number; total_faltas: number; percentual_faltas: number }> = []
let currentReportData: Array<{ id: number; nome: string; total_escalas: number; total_presencas: number; total_faltas: number; percentual_presenca: number; percentual_faltas: number }> = []

const weekdayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

let currentSortColumn: 'percentual_presenca' | 'total_faltas' | null = null
let currentSortDirection: 'asc' | 'desc' = 'desc'

const sortTableData = (data: ReportRow[], column: 'percentual_presenca' | 'total_faltas', direction: 'asc' | 'desc') => {
  const sorted = [...data].sort((a, b) => {
    let aValue: number
    let bValue: number

    if (column === 'percentual_presenca') {
      aValue = a.percentage || 0
      bValue = b.percentage || 0
    } else {
      aValue = a.totalFaltas || 0
      bValue = b.totalFaltas || 0
    }

    if (direction === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  return sorted
}

const renderReportTable = (rows: ReportRow[]) => {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="6" class="empty-row">Nenhum dado para o filtro selecionado.</td>
      </tr>
    `
  }

  // Aplica ordenação se houver
  let sortedRows = rows
  if (currentSortColumn) {
    sortedRows = sortTableData(rows, currentSortColumn, currentSortDirection)
  }

  return sortedRows
    .map(
      (row) => {
        const percentualFaltas = row.percentualFaltas || 0
        const percentualPresenca = row.percentage || 0
        const totalFaltas = row.totalFaltas || 0
        const hasHighAbsence = percentualFaltas > 30
        const hasExcellentFrequency = percentualPresenca >= 80
        const rowClass = hasHighAbsence ? 'row-high-absence' : ''

        return `
      <tr class="${rowClass}">
        <td>
          ${row.musicianName}
          ${hasExcellentFrequency ? '<span class="badge-excellent">Excelente Frequência</span>' : ''}
        </td>
        <td>${row.commonName}</td>
        <td>${row.attendanceCount}</td>
        <td>${row.totalServices}</td>
        <td>${row.percentage}%</td>
        <td>${totalFaltas}</td>
      </tr>
    `
      },
    )
    .join('')
}

const setupTableSorting = () => {
  const tableBody = document.getElementById('reports-table-body')
  if (!tableBody) return

  // Remove listeners anteriores para evitar duplicação
  const existingHeaders = document.querySelectorAll('#reports-table-header th[data-sortable]')
  existingHeaders.forEach((header) => {
    const newHeader = header.cloneNode(true)
    header.parentNode?.replaceChild(newHeader, header)
  })

  // Adiciona listeners aos headers clicáveis
  const headerCells = document.querySelectorAll('#reports-table-header th[data-sortable]')
  headerCells.forEach((header) => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort') as 'percentual_presenca' | 'total_faltas' | null
      if (!column) return

      // Alterna direção se for a mesma coluna
      if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        currentSortColumn = column
        currentSortDirection = 'desc'
      }

      // Atualiza indicadores visuais
      headerCells.forEach((h) => {
        const indicator = h.querySelector('.sort-indicator')
        if (h === header) {
          if (indicator) {
            indicator.textContent = currentSortDirection === 'asc' ? '↑' : '↓'
          }
        } else {
          if (indicator) {
            indicator.textContent = ''
          }
        }
      })

      // Re-renderiza a tabela
      if (currentReportRows.length > 0) {
        setHtml('reports-table-body', renderReportTable(currentReportRows))
        setupTableSorting()
      }
    })
  })
}

const renderRankingFaltas = () => {
  const container = document.getElementById('reports-ranking-faltas')
  if (!container) return

  if (!rankingFaltas || rankingFaltas.length === 0) {
    container.innerHTML = '<p>Nenhum dado de ranking disponível para o período selecionado.</p>'
    // Oculta o banner quando não há dados
    checkAndShowAlert()
    return
  }

  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Percentual de faltas</th>
          <th>Total de faltas</th>
        </tr>
      </thead>
      <tbody>
        ${rankingFaltas
          .map(
            (m) => `
          <tr>
            <td>${m.nome || '--'}</td>
            <td>${m.percentual_faltas.toFixed(2)}%</td>
            <td>${m.total_faltas || 0}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `

  container.innerHTML = html
}

const renderRankingChart = () => {
  const container = document.getElementById('reports-ranking-chart')
  if (!container) return

  // Limpa o container anterior
  container.innerHTML = ''

  if (!rankingFaltas || rankingFaltas.length === 0) {
    container.innerHTML = '<p style="padding: 2rem; text-align: center; color: rgba(255, 255, 255, 0.6);">Nenhum dado disponível para o gráfico</p>'
    return
  }

  // Cria a raiz do React e renderiza o componente
  const root = createRoot(container)
  root.render(<RankingFaltasChart data={rankingFaltas} />)
}

const checkAndShowAlert = () => {
  const alertBanner = document.getElementById('report-alert-banner')
  if (!alertBanner) return

  // Verifica se algum músico tem percentual de faltas > 40%
  const hasHighAbsence = rankingFaltas && rankingFaltas.length > 0 && rankingFaltas.some((m) => m.percentual_faltas > 40)

  if (hasHighAbsence) {
    alertBanner.style.display = 'block'
  } else {
    alertBanner.style.display = 'none'
  }
}

const calculateKPIs = (reportData: Array<{ id: number; nome: string; total_escalas: number; total_presencas: number; total_faltas: number; percentual_presenca: number; percentual_faltas: number }>) => {
  if (!reportData || reportData.length === 0) {
    return {
      totalMusicos: 0,
      totalFaltas: 0,
      mediaPresenca: 0,
      musicosEmRisco: 0,
    }
  }

  const totalMusicos = reportData.length
  const totalFaltas = reportData.reduce((sum, item) => sum + (item.total_faltas || 0), 0)
  const mediaPresenca = reportData.length > 0
    ? reportData.reduce((sum, item) => sum + (item.percentual_presenca || 0), 0) / reportData.length
    : 0
  const musicosEmRisco = reportData.filter((item) => (item.percentual_faltas || 0) > 30).length

  return {
    totalMusicos,
    totalFaltas,
    mediaPresenca: Number(mediaPresenca.toFixed(2)),
    musicosEmRisco,
  }
}

const renderKPIs = (kpis: { totalMusicos: number; totalFaltas: number; mediaPresenca: number; musicosEmRisco: number }) => {
  const totalMusicosEl = document.getElementById('kpi-total-musicos')
  const mediaPresencaEl = document.getElementById('kpi-media-presenca')
  const totalFaltasEl = document.getElementById('kpi-total-faltas')
  const musicosRiscoEl = document.getElementById('kpi-musicos-risco')

  if (totalMusicosEl) {
    totalMusicosEl.textContent = String(kpis.totalMusicos)
  }

  if (mediaPresencaEl) {
    mediaPresencaEl.textContent = `${kpis.mediaPresenca}%`
    // Estilização: verde para média alta (>70%), amarelo para média moderada (50-70%), vermelho para baixa (<50%)
    const kpiCard = mediaPresencaEl.closest('.kpi-card')
    if (kpiCard) {
      kpiCard.className = 'kpi-card kpi-card--media'
      if (kpis.mediaPresenca >= 70) {
        kpiCard.classList.add('kpi-card--success')
      } else if (kpis.mediaPresenca >= 50) {
        kpiCard.classList.add('kpi-card--warning')
      } else {
        kpiCard.classList.add('kpi-card--danger')
      }
    }
  }

  if (totalFaltasEl) {
    totalFaltasEl.textContent = String(kpis.totalFaltas)
  }

  if (musicosRiscoEl) {
    musicosRiscoEl.textContent = String(kpis.musicosEmRisco)
    // Estilização: verde se nenhum em risco, amarelo se 1-2, vermelho se 3+
    const kpiCard = musicosRiscoEl.closest('.kpi-card')
    if (kpiCard) {
      kpiCard.className = 'kpi-card kpi-card--risco'
      if (kpis.musicosEmRisco === 0) {
        kpiCard.classList.add('kpi-card--success')
      } else if (kpis.musicosEmRisco <= 2) {
        kpiCard.classList.add('kpi-card--warning')
      } else {
        kpiCard.classList.add('kpi-card--danger')
      }
    }
  }
}

const buildReport = (
  commons: Common[],
  _musicians: Musician[],
  services: Service[],
  attendance: Attendance[],
  activeMusicians: Musician[],
  filters: { commonId?: number | null; musicianId?: number | null; weekday?: string },
): ReportRow[] => {
  const filteredServices = filters.weekday
    ? services.filter((service) => service.weekday === filters.weekday)
    : services

  const serviceIds = new Set(filteredServices.map((service) => service.id))
  const filteredAttendance = attendance.filter((item) => serviceIds.has(item.service_id))

  const filteredMusicians = filters.musicianId
    ? activeMusicians.filter((musician) => musician.id === filters.musicianId)
    : activeMusicians

  const totalServices = filteredServices.length
  const totalActiveMusicians = activeMusicians.length

  return filteredMusicians.map((musician) => {
    const musicianAttendance = filteredAttendance.filter((item) => item.musician_id === musician.id)
    const attendanceCount = musicianAttendance.filter((item) => item.status === 'present').length
    const totalFaltas = musicianAttendance.filter((item) => item.status === 'absent').length
    const totalEscalas = musicianAttendance.length

    // Percentual de presença baseado no total de músicos ativos (para manter compatibilidade)
    const percentage = totalActiveMusicians
      ? Math.round((attendanceCount / totalActiveMusicians) * 100)
      : 0
    
    // Percentual de faltas baseado no total de escalas do músico
    const percentualFaltas = totalEscalas > 0
      ? Number(((totalFaltas / totalEscalas) * 100).toFixed(2))
      : 0

    const commonName = commons.find((common) => common.id === musician.common_id)?.name ?? '--'

    return {
      musicianName: musician.name,
      commonName,
      attendanceCount,
      totalServices: totalEscalas || totalServices,
      percentage,
      totalFaltas,
      percentualFaltas,
    }
  })
}

const renderChart = (rows: ReportRow[]) => {
  const canvas = document.getElementById('report-chart') as HTMLCanvasElement | null
  if (!canvas) return

  if (chartInstance) {
    chartInstance.destroy()
  }

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((row) => row.musicianName),
      datasets: [
        {
          label: 'Presença (%)',
          data: rows.map((row) => row.percentage),
          backgroundColor: '#d4af37',
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
        x: {
          ticks: {
            display: false,
          },
        },
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: (items) => {
              const label = items[0]?.label
              return label ? `Músico: ${label}` : 'Músico'
            },
            label: (item) => `Presença: ${item.parsed.y}%`,
          },
        },
      },
    },
  })
}

const exportReportPdf = (rows: ReportRow[]) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const colors = {
    gold: [212, 175, 55] as [number, number, number],
    text: [17, 17, 17] as [number, number, number],
    muted: [68, 68, 68] as [number, number, number],
    border: [210, 210, 210] as [number, number, number],
    surface: [248, 248, 248] as [number, number, number],
  }

  const context = currentReportContext
  const attendance = context?.attendance ?? []
  const services = context?.services ?? []
  const activeTotal = context?.activeTotal ?? 0
  const visitors = context?.visitors ?? []
  const commonName = rows[0]?.commonName ?? 'Comum'

  const formatPercent = (value: number) => `${Math.round(value)}%`
  const formatIsoDate = (value?: string | null) => {
    if (!value) return '--'
    const normalized = normalizeIsoDate(value)
    if (!normalized) return value
    const [year, month, day] = normalized.split('-')
    if (!year || !month || !day) return value
    return `${day}/${month}/${year}`
  }
  const formatDateWithWeekday = (value?: string | null, weekday?: string | null) => {
    const dateLabel = formatIsoDate(value)
    if (!weekday) return dateLabel
    return `${dateLabel} (${weekday})`
  }
  const normalizeIsoDate = (value?: string | null) => {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    if (value.includes('T')) return value.split('T')[0]
    return value
  }

  const getVisitorsCount = (serviceId: number, date: string) => {
    const normalizedDate = normalizeIsoDate(date)
    const match = visitors.find(
      (item) =>
        item.service_id === serviceId && normalizeIsoDate(item.service_date) === normalizedDate,
    )
    return match?.visitors_count ?? 0
  }

  const getPeriodLabel = () => {
    if (!attendance.length) return 'Período: --'
    const dates = attendance
      .map((item) => normalizeIsoDate(item.service_date))
      .filter(Boolean)
      .sort()
    const start = dates[0]
    const end = dates[dates.length - 1]
    return `Período: ${formatIsoDate(start)} até ${formatIsoDate(end)}`
  }

  const getFooterLabel = () => {
    const generatedAt = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date())
    return `Gerado em ${generatedAt} • ${getPeriodLabel()}`
  }

  const renderHeader = () => {
    const titleY = 12
    const commonY = 18
    doc.setTextColor(...colors.gold)
    doc.setFontSize(14)
    doc.text('SisOrchest – Relatório Gerencial de Presenças', 14, titleY)
    doc.setFontSize(9)
    doc.setTextColor(...colors.muted)
    doc.text(commonName, 14, commonY)
    return 26
  }

  const renderFooter = () => {
    doc.setFontSize(8)
    doc.setTextColor(...colors.muted)
    doc.text(getFooterLabel(), 14, pageHeight - 10)
  }

  const headerBottomY = renderHeader()
  renderFooter()

  const baseTable: UserOptions = {
    theme: 'grid',
    margin: { top: headerBottomY, bottom: 14 },
    styles: {
      textColor: colors.text,
      fontSize: 9,
      cellPadding: 2,
      lineColor: colors.border,
      lineWidth: 0.1,
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: colors.gold,
      textColor: [20, 20, 20],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: colors.surface,
    },
    didDrawPage: () => {
      renderHeader()
      renderFooter()
    },
  }

  const safeAutoTable = (options: UserOptions & { body?: unknown[] }) => {
    if (options.body && options.body.length === 0) return
    autoTable(doc, options)
  }

  if (!attendance.length || !activeTotal) {
    safeAutoTable({
      startY: headerBottomY,
      head: [['Resumo geral']],
      body: [['Nenhum registro encontrado para este período.']],
      ...baseTable,
    })
    doc.save('relatorio-sisorchest.pdf')
    return
  }

  const groupByServiceDate = () => {
    const map = new Map<
      string,
      { service?: Service; date: string; weekday?: string | null; records: Attendance[] }
    >()
    attendance.forEach((item) => {
      const dateKey = normalizeIsoDate(item.service_date)
      if (!dateKey) return
      const key = `${item.service_id}|${dateKey}`
      if (!map.has(key)) {
        map.set(key, {
          service: services.find((service) => service.id === item.service_id),
          date: dateKey,
          weekday: item.service_weekday ?? null,
          records: [],
        })
      }
      map.get(key)?.records.push(item)
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  const serviceGroups = groupByServiceDate()
  const totalCultos = serviceGroups.length
  const averagePresenceRate = serviceGroups.length
    ? serviceGroups.reduce((sum, group) => {
        const presentCount = new Set(
          group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
        ).size
        return sum + (activeTotal ? (presentCount / activeTotal) * 100 : 0)
      }, 0) / serviceGroups.length
    : 0

  safeAutoTable({
    startY: headerBottomY,
    head: [['Resumo geral da comum']],
    body: [[
      `Total de músicos ativos da comum: ${activeTotal}`,
    ], [
      `Total de cultos: ${totalCultos}`,
    ], [
      `Presença média da comum: ${formatPercent(averagePresenceRate)}`,
    ], [
      `Faltas médias da comum: ${formatPercent(100 - averagePresenceRate)}`,
    ], [
      `Nota: Visitantes não entram no cálculo de presença da comum`,
    ]],
    ...baseTable,
  })

  const nextY = () =>
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? headerBottomY) + 6

  const rankingRows = rows
    .map((row) => ({
      name: row.musicianName,
      total: row.totalServices,
      presences: row.attendanceCount,
      rate: row.percentage,
    }))
    .sort((a, b) => b.rate - a.rate)

  if (serviceGroups.length === 1) {
    const group = serviceGroups[0]
    const presentCount = new Set(
      group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
    ).size
    const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
    const visitorsCount = getVisitorsCount(group.service?.id ?? 0, group.date)
    safeAutoTable({
      startY: nextY(),
      head: [['Relatório por culto']],
      body: [[
        `Data: ${formatDateWithWeekday(group.date, group.weekday)}`,
      ], [
        `Comum: ${commonName}`,
      ], [
        `Total de músicos ativos da comum: ${activeTotal}`,
      ], [
        `Músicos da comum presentes: ${presentCount}`,
      ], [
        `Faltas da comum: ${Math.max(activeTotal - presentCount, 0)}`,
      ], [
        `Presença da comum: ${formatPercent(rate)} (${presentCount}/${activeTotal})`,
      ], [
        `Faltas da comum: ${formatPercent(100 - rate)} (${Math.max(activeTotal - presentCount, 0)}/${activeTotal})`,
      ], [
        `Visitantes: ${visitorsCount} (não entram na métrica da comum)`,
      ], [
        `Total geral no culto: ${presentCount + visitorsCount} (apenas informativo)`,
      ]],
      ...baseTable,
    })

    safeAutoTable({
      startY: nextY(),
      head: [['Músico', 'Instrumento', 'Status']],
      body: group.records.length
        ? group.records.map((record) => [
            record.name,
            record.instrument,
            record.status === 'present' ? 'Presente' : 'Falta',
          ])
        : [['Nenhum registro encontrado para este culto.', '', '']],
      ...baseTable,
    })
  }

  const buildWeeklySummary = () => {
    const weeks = new Map<
      string,
      { label: string; cultos: { date: string; serviceId: number; present: number; rate: number }[] }
    >()
    serviceGroups.forEach((group) => {
      const [year, month, day] = group.date.split('-').map(Number)
      const dateObj = Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)
        ? null
        : new Date(year, month - 1, day)
      if (!dateObj || Number.isNaN(dateObj.getTime())) return
      const weekKey = `${dateObj.getFullYear()}-W${Math.ceil(((dateObj.getDate() + (new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getDay() || 7) - 1) / 7))}`
      const presentCount = new Set(
        group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
      ).size
      const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, { label: `Semana ${weekKey}`, cultos: [] })
      }
      weeks.get(weekKey)?.cultos.push({
        date: group.date,
        serviceId: group.service?.id ?? group.records[0]?.service_id ?? 0,
        present: presentCount,
        rate,
      })
    })
    return Array.from(weeks.values())
  }

  const weeklySummary = buildWeeklySummary()

  if (weeklySummary.length) {
    weeklySummary.forEach((week) => {
      const averageRate = week.cultos.length
        ? week.cultos.reduce((sum, item) => sum + item.rate, 0) / week.cultos.length
        : 0
      safeAutoTable({
        startY: nextY(),
        head: [[`Resumo semanal - ${week.label}`]],
        body: [[
          `Total de cultos: ${week.cultos.length}`,
        ], [
          `Presença média da comum: ${formatPercent(averageRate)}`,
        ], [
          `Faltas médias da comum: ${formatPercent(100 - averageRate)}`,
        ]],
        ...baseTable,
      })
    })
  }

  const buildMonthlySummary = () => {
    const months = new Map<
      string,
      { label: string; cultos: { date: string; serviceId: number; present: number; rate: number }[] }
    >()
    serviceGroups.forEach((group) => {
      const [year, month, day] = group.date.split('-').map(Number)
      const dateObj = Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)
        ? null
        : new Date(year, month - 1, day)
      if (!dateObj || Number.isNaN(dateObj.getTime())) return
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      const presentCount = new Set(
        group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
      ).size
      const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
      if (!months.has(monthKey)) {
        months.set(monthKey, { label: `Mês ${monthKey}`, cultos: [] })
      }
      months.get(monthKey)?.cultos.push({
        date: group.date,
        serviceId: group.service?.id ?? group.records[0]?.service_id ?? 0,
        present: presentCount,
        rate,
      })
    })
    return Array.from(months.values())
  }

  const monthlySummary = buildMonthlySummary()
  if (monthlySummary.length) {
    monthlySummary.forEach((month) => {
      const averageRate = month.cultos.length
        ? month.cultos.reduce((sum, item) => sum + item.rate, 0) / month.cultos.length
        : 0
      safeAutoTable({
        startY: nextY(),
        head: [[`Resumo mensal - ${month.label}`]],
        body: [[
          `Total de cultos: ${month.cultos.length}`,
        ], [
          `Presença média da comum: ${formatPercent(averageRate)}`,
        ], [
          `Faltas médias da comum: ${formatPercent(100 - averageRate)}`,
        ]],
        ...baseTable,
      })
    })
  }

  const dailyRows = serviceGroups.map((group) => {
    const presentCount = new Set(
      group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
    ).size
    // Presença % calculada APENAS com base em músicos da comum (visitantes NÃO entram)
    const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
    const visitorsCount = getVisitorsCount(group.service?.id ?? group.records[0]?.service_id ?? 0, group.date)
    return [
      formatDateWithWeekday(group.date, group.weekday ?? null),
      String(presentCount), // Músicos da comum presentes
      String(visitorsCount), // Visitantes (informativos, não entram no cálculo)
      String(activeTotal), // Total de músicos ativos da comum
      formatPercent(rate), // Presença % da comum (presentCount / activeTotal)
      formatPercent(100 - rate), // Faltas % da comum
    ]
  })
  safeAutoTable({
    startY: nextY(),
    head: [['Dia do culto', 'Músicos da comum presentes', 'Visitantes', 'Total músicos da comum', 'Presença da comum %', 'Faltas da comum %']],
    body: dailyRows.length ? dailyRows : [['Nenhum dado disponível para este período.', '', '', '', '', '']],
    ...baseTable,
  })

  safeAutoTable({
    startY: nextY(),
    head: [['Ranking de músicos', '', '', '']],
    body: rankingRows.length
      ? rankingRows.map((row) => [
          row.name,
          `Presenças: ${row.presences}`,
          `Cultos: ${row.total}`,
          `Presença: ${formatPercent(row.rate)}`,
        ])
      : [['Nenhum dado disponível para este período.', '', '', '']],
    ...baseTable,
  })

  safeAutoTable({
    startY: nextY(),
    head: [['Músico', 'Comum', 'Presenças', 'Total cultos', 'Percentual']],
    body: rows.length
      ? rows.map((row) => [
          row.musicianName,
          row.commonName,
          String(row.attendanceCount),
          String(row.totalServices),
          `${row.percentage}%`,
        ])
      : [['Nenhum registro encontrado para este período.', '', '', '', '']],
    ...baseTable,
  })

  doc.save('relatorio-sisorchest.pdf')
}

const populateReportFilters = (commons: Common[], musicians: Musician[]) => {
  const commonSelect = document.getElementById('report-common') as HTMLSelectElement | null
  const musicianSelect = document.getElementById('report-musician') as HTMLSelectElement | null

  if (commonSelect) {
    const options = commons
      .map((common) => `<option value="${common.id}">${common.name}</option>`)
      .join('')
    commonSelect.innerHTML = `<option value="">Todas</option>${options}`
  }

  if (musicianSelect) {
    const options = musicians
      .map((musician) => `<option value="${musician.id}">${musician.name}</option>`)
      .join('')
    musicianSelect.innerHTML = `<option value="">Todos</option>${options}`
  }
}

const applySummary = (
  rows: ReportRow[],
  services: Service[],
  attendance: Attendance[],
  activeMusicians: Musician[],
) => {
  const totalMusicians = rows.length
  const totalAttendance = rows.reduce((sum, row) => sum + row.attendanceCount, 0)
  const activeTotal = activeMusicians.length
  const presentUnique = new Set(
    attendance.filter((item) => item.status === 'present').map((item) => item.musician_id),
  ).size

  const nextService = services
    .slice()
    .sort((a, b) => {
      const dayDiff = weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday)
      if (dayDiff !== 0) return dayDiff
      return a.service_time.localeCompare(b.service_time)
    })[0]

  setText(
    'reports-summary',
    `Equipe ativa: ${totalMusicians} músicos. Presenças registradas: ${totalAttendance}.`,
  )
  setText(
    'reports-services',
    nextService
      ? `Próximo culto: ${formatServiceSchedule(nextService.weekday, nextService.service_time)}.`
      : 'Sem cultos cadastrados.',
  )

  if (!attendance.length) {
    setText('reports-period', 'Sem registros no período selecionado.')
    return
  }
  const sortedDates = attendance
    .map((item) => item.service_date ?? '')
    .filter(Boolean)
    .sort()
  const first = sortedDates[0]
  const last = sortedDates[sortedDates.length - 1]
  const absences = Math.max(activeTotal - presentUnique, 0)
  setText(
    'reports-period',
    `Período: ${first ? formatServiceDate(first) : '--'} até ${last ? formatServiceDate(last) : '--'} • Presentes: ${presentUnique} de ${activeTotal} • Faltas: ${absences}`,
  )
}

const buildPresenceRatesByPeriod = (attendance: Attendance[], activeTotal: number) => {
  const byDate = new Map<string, Set<number>>()
  attendance.forEach((item) => {
    const date = item.service_date ?? ''
    if (!date) return
    if (!byDate.has(date)) byDate.set(date, new Set())
    if (item.status === 'present') {
      byDate.get(date)?.add(item.musician_id)
    }
  })

  const dayRates = Array.from(byDate.entries()).map(([date, presentSet]) => {
    const rate = activeTotal ? Math.round((presentSet.size / activeTotal) * 100) : 0
    return { date, rate }
  })

  const weekRates = new Map<string, number[]>()
  const monthRates = new Map<string, number[]>()
  dayRates.forEach((item) => {
    const date = new Date(`${item.date}T00:00:00`)
    if (Number.isNaN(date.getTime())) return
    const weekKey = `${date.getFullYear()}-W${Math.ceil(((date.getDate() + (new Date(date.getFullYear(), date.getMonth(), 1).getDay() || 7) - 1) / 7))}`
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!weekRates.has(weekKey)) weekRates.set(weekKey, [])
    if (!monthRates.has(monthKey)) monthRates.set(monthKey, [])
    weekRates.get(weekKey)?.push(item.rate)
    monthRates.get(monthKey)?.push(item.rate)
  })

  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0
  const lastWeek = Array.from(weekRates.keys()).sort().pop()
  const lastMonth = Array.from(monthRates.keys()).sort().pop()

  return {
    dayAverage: average(dayRates.map((item) => item.rate)),
    weekAverage: lastWeek ? average(weekRates.get(lastWeek) ?? []) : 0,
    monthAverage: lastMonth ? average(monthRates.get(lastMonth) ?? []) : 0,
    trend: dayRates,
  }
}

const formatServiceDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

const buildHistoryRows = (attendance: Attendance[]) => {
  const byDate = new Map<string, { date: string; weekday: string; present: number; absent: number }>()
  attendance.forEach((item) => {
    const dateKey = item.service_date ?? '--'
    const current = byDate.get(dateKey) ?? { date: dateKey, weekday: item.service_weekday ?? '--', present: 0, absent: 0 }
    if (item.status === 'present') {
      current.present += 1
    } else {
      current.absent += 1
    }
    byDate.set(dateKey, current)
  })

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

const renderHistoryTable = (rows: { date: string; weekday: string; present: number; absent: number }[]) => {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="4" class="empty-row">Sem lançamentos no período.</td>
      </tr>
    `
  }
  return rows
    .map(
      (row) => `
      <tr>
        <td>${formatServiceDate(row.date)}</td>
        <td>${row.weekday}</td>
        <td>${row.present}</td>
        <td>${row.absent}</td>
      </tr>
    `,
    )
    .join('')
}

const buildFilters = () => {
  const commonValue = (document.getElementById('report-common') as HTMLSelectElement | null)?.value
  const musicianValue = (document.getElementById('report-musician') as HTMLSelectElement | null)?.value
  const weekdayValue = (document.getElementById('report-weekday') as HTMLSelectElement | null)?.value
  const dateValue = (document.getElementById('report-date') as HTMLSelectElement | null)?.value

  return {
    commonId: commonValue ? Number(commonValue) : null,
    musicianId: musicianValue ? Number(musicianValue) : null,
    weekday: weekdayValue || '',
    cultoId: dateValue ? Number(dateValue) : null,
  }
}

const loadReportData = async (filters: { commonId?: number | null; musicianId?: number | null; weekday?: string; cultoId?: number | null; mode?: string }) => {
  setTextLoading(['reports-summary', 'reports-attendance', 'reports-services', 'reports-period'])
  setTableLoading('reports-table-body', 5)
  setTableLoading('reports-history-body', 4)
  document.querySelector('.report-chart')?.classList.add('is-loading')
  const currentUser = getCurrentUser()
  const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
  const commonId = resolvedCommonId ?? filters.commonId ?? null

  // Reset KPIs inicialmente
  renderKPIs({ totalMusicos: 0, totalFaltas: 0, mediaPresenca: 0, musicosEmRisco: 0 })

  try {
    // Se cultoId foi selecionado, usa o novo endpoint
    if (filters.cultoId) {
      const reportData = await api.getRelatorioPresenca({ cultoId: filters.cultoId, somentePresentes: true })
      
      // A função request já extrai data automaticamente, então reportData já é o array
      // Filtra apenas músicos presentes (já vem filtrado do backend, mas garantimos aqui também)
      const presentesOnly = Array.isArray(reportData) 
        ? reportData.filter((item: any) => item.total_presencas > 0)
        : []
      
      // Armazena dados completos para KPIs
      currentReportData = presentesOnly.map((item: any) => ({
        id: item.id || 0,
        nome: item.nome || '--',
        total_escalas: item.total_escalas || 0,
        total_presencas: item.total_presencas || 0,
        total_faltas: item.total_faltas || 0,
        percentual_presenca: item.percentual_presenca || 0,
        percentual_faltas: item.percentual_faltas || 0,
      }))
      
      // Converte para formato ReportRow
      const reportRows: ReportRow[] = presentesOnly.map((item: any) => ({
        musicianName: item.nome || '--',
        commonName: '--', // Será preenchido depois se necessário
        attendanceCount: item.total_presencas || 0,
        totalServices: item.total_escalas || 0,
        percentage: item.percentual_presenca || 0,
        totalFaltas: item.total_faltas || 0,
        percentualFaltas: item.percentual_faltas || 0,
      }))

      currentReportRows = reportRows
      currentReportContext = {
        attendance: [],
        services: [],
        activeTotal: presentesOnly.length,
        visitors: [],
      }
      
      // Calcula e renderiza KPIs
      const kpis = calculateKPIs(currentReportData)
      renderKPIs(kpis)
      
      setHtml('reports-table-body', renderReportTable(reportRows))
      setupTableSorting()
      renderChart(reportRows)
      setText('reports-summary', `Equipe presente: ${presentesOnly.length} músicos.`)
      setText('reports-attendance', `Presença: ${presentesOnly.length} músicos presentes.`)
      setText('reports-services', 'Relatório por culto específico.')
      setText('reports-period', 'Dados do culto selecionado.')
      setHtml('reports-history-body', '<tr><td colspan="4" class="empty-row">Nenhum histórico disponível para culto específico.</td></tr>')
      setHtml('reports-ranking-faltas', '<p>Ranking não disponível para culto específico.</p>')
      const chartContainer = document.getElementById('reports-ranking-chart')
      if (chartContainer) {
        chartContainer.innerHTML = '<p style="padding: 2rem; text-align: center; color: rgba(255, 255, 255, 0.6);">Gráfico não disponível para culto específico</p>'
      }
      
      // Oculta o banner de alerta para culto específico
      const alertBanner = document.getElementById('report-alert-banner')
      if (alertBanner) {
        alertBanner.style.display = 'none'
      }
      
      return
    }

    // Lógica original para relatório geral
    const [commons, musicians, services, attendance, visitors] = await Promise.all([
      api.getCommons(),
      api.getMusicians({ common_id: commonId ?? undefined }),
      api.getServices({ common_id: commonId ?? undefined }),
      api.getAttendance({ common_id: commonId ?? undefined }),
      commonId
        ? api.getAttendanceVisitors({ common_id: commonId }).catch(() => [])
        : Promise.resolve([]),
    ])

    // Busca ranking de faltas e dados do relatório mensal para KPIs
    try {
      const mesSelect = document.getElementById('report-mes') as HTMLSelectElement | null
      const anoSelect = document.getElementById('report-ano') as HTMLSelectElement | null
      const diaSemanaSelect = document.getElementById('report-weekday') as HTMLSelectElement | null

      if (mesSelect && anoSelect && mesSelect.value && anoSelect.value) {
        const mes = Number(mesSelect.value)
        const ano = Number(anoSelect.value)
        let diaSemanaNum: number | null = null

        if (diaSemanaSelect?.value) {
          const diaSemanaMap: Record<string, number> = {
            'Domingo': 1,
            'Segunda': 2,
            'Terça': 3,
            'Quarta': 4,
            'Quinta': 5,
            'Sexta': 6,
            'Sábado': 7,
          }
          diaSemanaNum = diaSemanaMap[diaSemanaSelect.value] || null
        }

        // Busca ranking de faltas
        const rankingData = await api.getRankingFaltasPeriodo({
          mes,
          ano,
          diaSemana: diaSemanaNum,
        })

        rankingFaltas = Array.isArray(rankingData) ? rankingData : []

        // Busca dados completos do relatório para KPIs
        const relatorioData = await api.getRelatorioPresencaMensal({
          mes,
          ano,
          diaSemana: diaSemanaNum,
        })

        currentReportData = Array.isArray(relatorioData) ? relatorioData : []
      } else {
        rankingFaltas = []
        currentReportData = []
      }
    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error)
      rankingFaltas = []
      currentReportData = []
    }

    const allowedCommons =
      currentUser?.role === 'admin' ? commons : commons.filter((common) => common.id === commonId)

    const activeMusicians = musicians.filter((musician) => musician.status === 'active')
    const activeIds = new Set(activeMusicians.map((musician) => musician.id))
    const filteredAttendance = attendance
      .filter((item) => activeIds.has(item.musician_id))
      .filter((item) => !filters.musicianId || item.musician_id === filters.musicianId)
      .filter((item) => !filters.weekday || item.service_weekday === filters.weekday)

    const reportRows = buildReport(allowedCommons, musicians, services, attendance, activeMusicians, {
      commonId,
      musicianId: filters.musicianId ?? null,
      weekday: filters.weekday || '',
    })

    const filteredServices = filters.weekday
      ? services.filter((service) => service.weekday === filters.weekday)
      : services
    currentReportRows = reportRows
    currentReportContext = {
      attendance: filteredAttendance,
      services: filteredServices,
      activeTotal: activeMusicians.length,
      visitors,
    }
    // Calcula e renderiza KPIs
    const kpis = calculateKPIs(currentReportData)
    renderKPIs(kpis)

    setHtml('reports-table-body', renderReportTable(reportRows))
    setupTableSorting()
    renderChart(reportRows)
    applySummary(reportRows, filteredServices, filteredAttendance, activeMusicians)
    setHtml('reports-history-body', renderHistoryTable(buildHistoryRows(filteredAttendance)))
    const periodRates = buildPresenceRatesByPeriod(filteredAttendance, activeMusicians.length)
    if (!filteredAttendance.length) {
      setText('reports-attendance', 'Sem dados suficientes para calcular médias de presença.')
    } else {
      setText(
        'reports-attendance',
        `Presença média: ${periodRates.dayAverage}% (dia) • ${periodRates.weekAverage}% (semana) • ${periodRates.monthAverage}% (mês)`,
      )
    }
    populateReportFilters(allowedCommons, musicians)
    const reportCommonSelect = document.getElementById('report-common') as HTMLSelectElement | null
    if (reportCommonSelect && currentUser?.role !== 'admin' && commonId) {
      reportCommonSelect.value = String(commonId)
      reportCommonSelect.disabled = true
    }

    // Renderiza ranking de faltas
    renderRankingFaltas()
    renderRankingChart()
    checkAndShowAlert()
  } finally {
    clearTextLoading(['reports-summary', 'reports-attendance', 'reports-services', 'reports-period'])
    clearTableLoading('reports-table-body')
    clearTableLoading('reports-history-body')
    document.querySelector('.report-chart')?.classList.remove('is-loading')
  }
}

const loadAvailableDates = async () => {
  const modeSelect = document.getElementById('report-mode') as HTMLSelectElement | null
  const mesSelect = document.getElementById('report-mes') as HTMLSelectElement | null
  const anoSelect = document.getElementById('report-ano') as HTMLSelectElement | null
  const diaSemanaSelect = document.getElementById('report-weekday') as HTMLSelectElement | null
  const dateSelect = document.getElementById('report-date') as HTMLSelectElement | null

  // Só carrega datas se estiver no modo mensal
  if (!modeSelect || modeSelect.value !== 'mensal') {
    if (dateSelect) {
      dateSelect.innerHTML = '<option value="">Selecione modo mensal</option>'
    }
    return
  }

  if (!mesSelect || !anoSelect || !dateSelect) return

  const mes = mesSelect.value
  const ano = anoSelect.value
  const diaSemanaValue = diaSemanaSelect?.value || ''

  if (!mes || !ano) {
    dateSelect.innerHTML = '<option value="">Selecione mês e ano</option>'
    availableDates = []
    return
  }

  try {
    // Converte dia da semana de string para número se necessário
    let diaSemanaNum: number | null = null
    if (diaSemanaValue) {
      const diaSemanaMap: Record<string, number> = {
        'Domingo': 1,
        'Segunda': 2,
        'Terça': 3,
        'Quarta': 4,
        'Quinta': 5,
        'Sexta': 6,
        'Sábado': 7,
      }
      diaSemanaNum = diaSemanaMap[diaSemanaValue] || null
    }

    const response = await api.getCultosComPresenca({
      mes: Number(mes),
      ano: Number(ano),
      diaSemana: diaSemanaNum,
    })

    availableDates = Array.isArray(response) ? response : []
    const options = availableDates.map((date) => `<option value="${date.id}">${date.data || date.service_date || ''}</option>`).join('')
    dateSelect.innerHTML = availableDates.length > 0
      ? `<option value="">Todas as datas</option>${options}`
      : '<option value="">Nenhuma data disponível</option>'
  } catch (error) {
    console.error('Erro ao carregar datas disponíveis:', error)
    dateSelect.innerHTML = '<option value="">Erro ao carregar datas</option>'
    availableDates = []
  }
}

const populateAnoSelect = () => {
  const anoSelect = document.getElementById('report-ano') as HTMLSelectElement | null
  if (!anoSelect) return

  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i)
  }

  const options = years.map((year) => `<option value="${year}">${year}</option>`).join('')
  anoSelect.innerHTML = `<option value="">Selecione</option>${options}`
  
  // Define o ano atual como padrão
  anoSelect.value = String(currentYear)
}

const toggleReportMode = () => {
  const modeSelect = document.getElementById('report-mode') as HTMLSelectElement | null
  const dateLabel = document.getElementById('report-date-label')
  const mesLabel = document.getElementById('report-mes-label')
  const anoLabel = document.getElementById('report-ano-label')
  const weekdayLabel = document.getElementById('report-weekday-label')

  if (!modeSelect) return

  const mode = modeSelect.value

  if (mode === 'culto') {
    // Modo Culto: mostra apenas Data do Culto
    if (dateLabel) dateLabel.style.display = ''
    if (mesLabel) mesLabel.style.display = 'none'
    if (anoLabel) anoLabel.style.display = 'none'
    if (weekdayLabel) weekdayLabel.style.display = 'none'
  } else if (mode === 'mensal') {
    // Modo Mensal: mostra Mês, Ano e Dia da Semana
    if (dateLabel) dateLabel.style.display = 'none'
    if (mesLabel) mesLabel.style.display = ''
    if (anoLabel) anoLabel.style.display = ''
    if (weekdayLabel) weekdayLabel.style.display = ''
  }
}

const setupDateSelectListeners = () => {
  const mesSelect = document.getElementById('report-mes') as HTMLSelectElement | null
  const anoSelect = document.getElementById('report-ano') as HTMLSelectElement | null
  const diaSemanaSelect = document.getElementById('report-weekday') as HTMLSelectElement | null

  const updateDates = () => {
    loadAvailableDates()
  }

  mesSelect?.addEventListener('change', updateDates)
  anoSelect?.addEventListener('change', updateDates)
  diaSemanaSelect?.addEventListener('change', updateDates)
}

export const setupReports = () => {
  const generateButton = document.getElementById('report-generate')
  const exportButton = document.getElementById('report-export')
  const modeSelect = document.getElementById('report-mode') as HTMLSelectElement | null

  // Popula o select de ano
  populateAnoSelect()

  // Configura o modo inicial
  toggleReportMode()

  // Listener para mudança de modo
  modeSelect?.addEventListener('change', () => {
    toggleReportMode()
    // Limpa os valores quando muda o modo
    const dateSelect = document.getElementById('report-date') as HTMLSelectElement | null
    const mesSelect = document.getElementById('report-mes') as HTMLSelectElement | null
    const anoSelect = document.getElementById('report-ano') as HTMLSelectElement | null
    const weekdaySelect = document.getElementById('report-weekday') as HTMLSelectElement | null
    
    if (modeSelect?.value === 'culto') {
      // No modo culto, limpa os campos mensais
      if (mesSelect) mesSelect.value = ''
      if (anoSelect) anoSelect.value = ''
      if (weekdaySelect) weekdaySelect.value = ''
      if (dateSelect) dateSelect.innerHTML = '<option value="">Selecione uma data</option>'
    } else {
      // No modo mensal, limpa o campo de data do culto
      if (dateSelect) dateSelect.innerHTML = '<option value="">Selecione mês e ano</option>'
      // Restaura o ano atual
      if (anoSelect) {
        const currentYear = new Date().getFullYear()
        anoSelect.value = String(currentYear)
      }
    }
  })

  generateButton?.addEventListener('click', async () => {
    setButtonLoading(generateButton as HTMLButtonElement | null, true, 'Gerando...')
    await loadReportData(buildFilters())
    setButtonLoading(generateButton as HTMLButtonElement | null, false)
  })

  exportButton?.addEventListener('click', () => {
    if (!requireConfirmClick(exportButton as HTMLButtonElement | null, 'Confirmar')) return
    setButtonLoading(exportButton as HTMLButtonElement | null, true, 'Exportando...')
    exportReportPdf(currentReportRows)
    setTimeout(() => setButtonLoading(exportButton as HTMLButtonElement | null, false), 300)
  })

  setupDateSelectListeners()
}

export const loadReports = async () => {
  await loadReportData(buildFilters())
}
