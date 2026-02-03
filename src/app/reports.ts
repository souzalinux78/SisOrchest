import { api } from './api'
import type { Attendance, AttendanceVisitors, Common, Musician, Service } from './api'
import { clearTableLoading, clearTextLoading, formatServiceSchedule, requireConfirmClick, setButtonLoading, setHtml, setTableLoading, setText, setTextLoading } from './dom'
import { getCurrentUser } from './session'
import Chart from 'chart.js/auto'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'

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
  visitors: AttendanceVisitors[]
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
  const [commons, musicians, services, attendance, visitors] = await Promise.all([
      api.getCommons(),
      api.getMusicians({ common_id: commonId ?? undefined }),
      api.getServices({ common_id: commonId ?? undefined }),
      api.getAttendance({ common_id: commonId ?? undefined }),
    commonId
      ? api.getAttendanceVisitors({ common_id: commonId }).catch(() => [])
      : Promise.resolve([]),
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
      visitors,
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
