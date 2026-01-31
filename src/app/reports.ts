import { api } from './api'
import type { Attendance, Common, Musician, Service } from './api'
import { clearTableLoading, clearTextLoading, formatServiceSchedule, requireConfirmClick, setButtonLoading, setHtml, setTableLoading, setText, setTextLoading } from './dom'
import { getCurrentUser } from './session'
import Chart from 'chart.js/auto'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReportRow = {
  musicianName: string
  commonName: string
  attendanceCount: number
  totalServices: number
  percentage: number
}

let chartInstance: Chart | null = null
let currentReportRows: ReportRow[] = []

const weekdayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const renderReportTable = (rows: ReportRow[]) => {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="5" class="empty-row">Nenhum dado para o filtro selecionado.</td>
      </tr>
    `
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td>${row.musicianName}</td>
        <td>${row.commonName}</td>
        <td>${row.attendanceCount}</td>
        <td>${row.totalServices}</td>
        <td>${row.percentage}%</td>
      </tr>
    `,
    )
    .join('')
}

const buildReport = (
  commons: Common[],
  musicians: Musician[],
  services: Service[],
  attendance: Attendance[],
  filters: { commonId?: number | null; musicianId?: number | null; weekday?: string },
): ReportRow[] => {
  const filteredServices = filters.weekday
    ? services.filter((service) => service.weekday === filters.weekday)
    : services

  const serviceIds = new Set(filteredServices.map((service) => service.id))
  const filteredAttendance = attendance.filter((item) => serviceIds.has(item.service_id))

  const filteredMusicians = filters.musicianId
    ? musicians.filter((musician) => musician.id === filters.musicianId)
    : musicians

  const totalServices = filteredServices.length

  return filteredMusicians.map((musician) => {
    const attendanceCount = filteredAttendance.filter(
      (item) => item.musician_id === musician.id && item.status === 'present',
    ).length
    const percentage = totalServices ? Math.round((attendanceCount / totalServices) * 100) : 0
    const commonName = commons.find((common) => common.id === musician.common_id)?.name ?? '--'

    return {
      musicianName: musician.name,
      commonName,
      attendanceCount,
      totalServices,
      percentage,
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
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('SisOrchest - Relatório de presenças', 14, 20)

  autoTable(doc, {
    startY: 28,
    head: [['Músico', 'Comum', 'Presenças', 'Total cultos', 'Percentual']],
    body: rows.map((row) => [
      row.musicianName,
      row.commonName,
      String(row.attendanceCount),
      String(row.totalServices),
      `${row.percentage}%`,
    ]),
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

const applySummary = (rows: ReportRow[], services: Service[]) => {
  const totalMusicians = rows.length
  const totalAttendance = rows.reduce((sum, row) => sum + row.attendanceCount, 0)
  const totalServices = services.length
  const averageRate = totalServices
    ? Math.round((totalAttendance / (totalServices * Math.max(totalMusicians, 1))) * 100)
    : 0

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
  setText('reports-attendance', `Frequência média: ${averageRate}% de presença.`)
  setText(
    'reports-services',
    nextService
      ? `Próximo culto: ${formatServiceSchedule(nextService.weekday, nextService.service_time)}.`
      : 'Sem cultos cadastrados.',
  )
}

const buildFilters = () => {
  const commonValue = (document.getElementById('report-common') as HTMLSelectElement | null)?.value
  const musicianValue = (document.getElementById('report-musician') as HTMLSelectElement | null)?.value
  const weekdayValue = (document.getElementById('report-weekday') as HTMLSelectElement | null)?.value

  return {
    commonId: commonValue ? Number(commonValue) : null,
    musicianId: musicianValue ? Number(musicianValue) : null,
    weekday: weekdayValue || '',
  }
}

const loadReportData = async (filters: { commonId?: number | null; musicianId?: number | null; weekday?: string }) => {
  setTextLoading(['reports-summary', 'reports-attendance', 'reports-services'])
  setTableLoading('reports-table-body', 5)
  document.querySelector('.report-chart')?.classList.add('is-loading')
  const currentUser = getCurrentUser()
  const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
  const commonId = resolvedCommonId ?? filters.commonId ?? null

  try {
    const [commons, musicians, services, attendance] = await Promise.all([
      api.getCommons(),
      api.getMusicians({ common_id: commonId ?? undefined }),
      api.getServices({ common_id: commonId ?? undefined }),
      api.getAttendance({ common_id: commonId ?? undefined }),
    ])

    const reportRows = buildReport(commons, musicians, services, attendance, {
      commonId,
      musicianId: filters.musicianId ?? null,
      weekday: filters.weekday || '',
    })

    currentReportRows = reportRows
    setHtml('reports-table-body', renderReportTable(reportRows))
    renderChart(reportRows)
    const filteredServices = filters.weekday
      ? services.filter((service) => service.weekday === filters.weekday)
      : services
    applySummary(reportRows, filteredServices)
    populateReportFilters(commons, musicians)
  } finally {
    clearTextLoading(['reports-summary', 'reports-attendance', 'reports-services'])
    clearTableLoading('reports-table-body')
    document.querySelector('.report-chart')?.classList.remove('is-loading')
  }
}

export const setupReports = () => {
  const generateButton = document.getElementById('report-generate')
  const exportButton = document.getElementById('report-export')

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
}

export const loadReports = async () => {
  await loadReportData(buildFilters())
}
