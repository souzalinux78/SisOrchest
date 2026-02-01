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
let currentReportContext: {
  attendance: Attendance[]
  services: Service[]
  activeTotal: number
} | null = null

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
    const attendanceCount = filteredAttendance.filter(
      (item) => item.musician_id === musician.id && item.status === 'present',
    ).length
    const percentage = totalActiveMusicians
      ? Math.round((attendanceCount / totalActiveMusicians) * 100)
      : 0
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
  doc.setTextColor(212, 175, 55)
  doc.text('SisOrchest - Relatório gerencial de presenças', 14, 18)
  doc.setTextColor(255, 255, 255)

  const context = currentReportContext
  const attendance = context?.attendance ?? []
  const services = context?.services ?? []
  const activeTotal = context?.activeTotal ?? 0

  const formatPercent = (value: number) => `${Math.round(value)}%`
  const formatIsoDate = (value?: string | null) => {
    if (!value) return '--'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
  }
  const normalizeIsoDate = (value?: string | null) => {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    if (value.includes('T')) return value.split('T')[0]
    return value
  }

  const presentUnique = new Set(
    attendance.filter((item) => item.status === 'present').map((item) => item.musician_id),
  ).size
  const presenceRate = activeTotal ? (presentUnique / activeTotal) * 100 : 0
  const absences = Math.max(activeTotal - presentUnique, 0)
  const absenceRate = 100 - presenceRate

  autoTable(doc, {
    startY: 24,
    head: [['Indicadores gerais']],
    body: [[
      `Presença: ${formatPercent(presenceRate)} (${presentUnique} de ${activeTotal} músicos)`,
    ], [
      `Faltas: ${formatPercent(absenceRate)} (${absences} de ${activeTotal} músicos)`,
    ]],
    theme: 'grid',
    styles: { textColor: 255, fontSize: 10 },
    headStyles: { fillColor: [18, 18, 18], textColor: [212, 175, 55] },
  })

  let currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34

  const groupByServiceDate = () => {
    const map = new Map<string, { service?: Service; date: string; records: Attendance[] }>()
    attendance.forEach((item) => {
      const dateKey = normalizeIsoDate(item.service_date)
      const key = `${item.service_id}|${dateKey}`
      if (!map.has(key)) {
        map.set(key, {
          service: services.find((service) => service.id === item.service_id),
          date: dateKey,
          records: [],
        })
      }
      map.get(key)?.records.push(item)
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  const serviceGroups = groupByServiceDate()
  if (serviceGroups.length === 1) {
    const group = serviceGroups[0]
    const presentCount = new Set(
      group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
    ).size
    const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
    const absRate = 100 - rate
    currentY += 6
    doc.setFontSize(12)
    doc.setTextColor(212, 175, 55)
    doc.text('Relatório de culto', 14, currentY)
    doc.setTextColor(255, 255, 255)
    autoTable(doc, {
      startY: currentY + 4,
      head: [['Indicadores do culto']],
      body: [[
        `Presença: ${formatPercent(rate)} (${presentCount} de ${activeTotal} músicos)`,
      ], [
        `Faltas: ${formatPercent(absRate)} (${Math.max(activeTotal - presentCount, 0)} de ${activeTotal} músicos)`,
      ]],
      theme: 'grid',
      styles: { textColor: 255, fontSize: 10 },
      headStyles: { fillColor: [18, 18, 18], textColor: [212, 175, 55] },
    })
    currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 10
  }

  const buildWeeklySummary = () => {
    const weeks = new Map<string, { label: string; cultos: { date: string; present: number; rate: number }[] }>()
    serviceGroups.forEach((group) => {
      const dateObj = new Date(`${group.date}T00:00:00`)
      if (Number.isNaN(dateObj.getTime())) return
      const weekKey = `${dateObj.getFullYear()}-W${Math.ceil(((dateObj.getDate() + (new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getDay() || 7) - 1) / 7))}`
      const presentCount = new Set(
        group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
      ).size
      const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, { label: `Semana ${weekKey}`, cultos: [] })
      }
      weeks.get(weekKey)?.cultos.push({ date: group.date, present: presentCount, rate })
    })
    return Array.from(weeks.values())
  }

  const buildMonthlySummary = () => {
    const months = new Map<string, { label: string; cultos: { date: string; present: number; rate: number }[] }>()
    serviceGroups.forEach((group) => {
      const dateObj = new Date(`${group.date}T00:00:00`)
      if (Number.isNaN(dateObj.getTime())) return
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      const presentCount = new Set(
        group.records.filter((item) => item.status === 'present').map((item) => item.musician_id),
      ).size
      const rate = activeTotal ? (presentCount / activeTotal) * 100 : 0
      if (!months.has(monthKey)) {
        months.set(monthKey, { label: `Mês ${monthKey}`, cultos: [] })
      }
      months.get(monthKey)?.cultos.push({ date: group.date, present: presentCount, rate })
    })
    return Array.from(months.values())
  }

  const weeklySummary = buildWeeklySummary()
  if (weeklySummary.length) {
    weeklySummary.forEach((week) => {
      currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
      doc.setFontSize(12)
      doc.setTextColor(212, 175, 55)
      doc.text(`Resumo semanal - ${week.label}`, 14, currentY + 8)
      doc.setTextColor(255, 255, 255)
      const averageRate = week.cultos.length
        ? week.cultos.reduce((sum, item) => sum + item.rate, 0) / week.cultos.length
        : 0
      const absenceRate = 100 - averageRate
      autoTable(doc, {
        startY: currentY + 12,
        head: [['Resumo da semana']],
        body: [[
          `Total de cultos: ${week.cultos.length}`,
        ], [
          `Média de presença: ${formatPercent(averageRate)}`,
        ], [
          `Média de faltas: ${formatPercent(absenceRate)}`,
        ]],
        theme: 'grid',
        styles: { textColor: 255, fontSize: 10 },
        headStyles: { fillColor: [18, 18, 18], textColor: [212, 175, 55] },
      })
      autoTable(doc, {
        startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 24,
        head: [['Data', 'Presentes', 'Presença %', 'Faltas %']],
        body: week.cultos.map((culto) => {
          const rate = culto.rate
          return [
            formatIsoDate(culto.date),
            `${culto.present}/${activeTotal}`,
            formatPercent(rate),
            formatPercent(100 - rate),
          ]
        }),
        theme: 'grid',
        styles: { textColor: 255, fontSize: 9 },
        headStyles: { fillColor: [18, 18, 18], textColor: [212, 175, 55] },
      })
    })
  }

  const monthlySummary = buildMonthlySummary()
  if (monthlySummary.length) {
    monthlySummary.forEach((month) => {
      currentY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY
      doc.setFontSize(12)
      doc.setTextColor(212, 175, 55)
      doc.text(`Resumo mensal - ${month.label}`, 14, currentY + 8)
      doc.setTextColor(255, 255, 255)
      const averageRate = month.cultos.length
        ? month.cultos.reduce((sum, item) => sum + item.rate, 0) / month.cultos.length
        : 0
      const absenceRate = 100 - averageRate
      autoTable(doc, {
        startY: currentY + 12,
        head: [['Resumo do mês']],
        body: [[
          `Total de cultos: ${month.cultos.length}`,
        ], [
          `Média de presença: ${formatPercent(averageRate)}`,
        ], [
          `Média de faltas: ${formatPercent(absenceRate)}`,
        ]],
        theme: 'grid',
        styles: { textColor: 255, fontSize: 10 },
        headStyles: { fillColor: [18, 18, 18], textColor: [212, 175, 55] },
      })
      autoTable(doc, {
        startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 24,
        head: [['Dia do culto', 'Presença %', 'Faltas %', 'Presentes/Total']],
        body: month.cultos.map((culto) => {
          const rate = culto.rate
          return [
            formatIsoDate(culto.date),
            formatPercent(rate),
            formatPercent(100 - rate),
            `${culto.present}/${activeTotal}`,
          ]
        }),
        theme: 'grid',
        styles: { textColor: 255, fontSize: 9 },
        headStyles: { fillColor: [18, 18, 18], textColor: [212, 175, 55] },
      })
    })
  }

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 28,
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

  return {
    commonId: commonValue ? Number(commonValue) : null,
    musicianId: musicianValue ? Number(musicianValue) : null,
    weekday: weekdayValue || '',
  }
}

const loadReportData = async (filters: { commonId?: number | null; musicianId?: number | null; weekday?: string }) => {
  setTextLoading(['reports-summary', 'reports-attendance', 'reports-services', 'reports-period'])
  setTableLoading('reports-table-body', 5)
  setTableLoading('reports-history-body', 4)
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
    }
    setHtml('reports-table-body', renderReportTable(reportRows))
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
  } finally {
    clearTextLoading(['reports-summary', 'reports-attendance', 'reports-services', 'reports-period'])
    clearTableLoading('reports-table-body')
    clearTableLoading('reports-history-body')
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
