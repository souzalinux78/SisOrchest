import { api } from './api'
import type { Attendance, Musician, Service } from './api'
import { clearTableLoading, clearTextLoading, formatServiceSchedule, setHtml, setTableLoading, setText, setTextLoading } from './dom'

const weekdayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const createEmptyRow = (colSpan: number, message: string) => `
  <tr>
    <td colspan="${colSpan}" class="empty-row">${message}</td>
  </tr>
`

const renderMusicians = (musicians: Musician[]) => {
  if (!musicians.length) {
    return createEmptyRow(3, 'Nenhum músico cadastrado.')
  }

  return musicians
    .slice(0, 5)
    .map(
      (musician) => `
      <tr>
        <td>${musician.name}</td>
        <td>${musician.instrument}</td>
        <td>${musician.status === 'active' ? 'Ativo' : 'Inativo'}</td>
      </tr>
    `,
    )
    .join('')
}

const renderServices = (services: Service[]) => {
  if (!services.length) {
    return createEmptyRow(2, 'Nenhum culto cadastrado.')
  }

  return services
    .slice(0, 5)
    .map(
      (service) => `
      <tr>
        <td>${formatServiceSchedule(service.weekday, service.service_time)}</td>
        <td>${service.common_name ?? '--'}</td>
      </tr>
    `,
    )
    .join('')
}

const renderAttendance = (attendance: Attendance[]) => {
  if (!attendance.length) {
    return createEmptyRow(3, 'Nenhuma presença registrada.')
  }

  return attendance
    .slice(0, 5)
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.instrument}</td>
        <td>${item.status === 'present' ? 'Presente' : 'Ausente'}</td>
      </tr>
    `,
    )
    .join('')
}

const calculateAttendanceRate = (attendance: Attendance[], activeMusicians: Musician[]) => {
  if (!activeMusicians.length) return { rate: 0, present: 0, absences: 0 }
  const activeIds = new Set(activeMusicians.map((musician) => musician.id))
  const presentIds = new Set(
    attendance
      .filter((item) => item.status === 'present' && activeIds.has(item.musician_id))
      .map((item) => item.musician_id),
  )
  const presentCount = presentIds.size
  const absences = Math.max(activeMusicians.length - presentCount, 0)
  const rate = Math.round((presentCount / activeMusicians.length) * 100)
  return { rate, present: presentCount, absences }
}

const getUpcomingServices = (services: Service[]) => services

const buildMusicianStats = (musicians: Musician[], attendance: Attendance[], totalServices: number) =>
  musicians.map((musician) => {
    const records = attendance.filter((item) => item.musician_id === musician.id)
    const present = records.filter((item) => item.status === 'present').length
    const absent = records.filter((item) => item.status !== 'present').length
    const rate = totalServices ? Math.round((present / totalServices) * 100) : 0
    return { musician, present, absent, rate, records }
  })

const renderRanking = (items: { name: string; value: number }[], emptyText: string) => {
  if (!items.length) return `<span class="empty-row">${emptyText}</span>`
  return `
    <ul class="indicator-list">
      ${items.map((item) => `<li>${item.name} — ${item.value}</li>`).join('')}
    </ul>
  `
}

const renderList = (items: string[], emptyText: string) =>
  items.length ? `<ul class="indicator-list">${items.map((item) => `<li>${item}</li>`).join('')}</ul>` : `<span class="empty-row">${emptyText}</span>`

const updateKpis = (
  musicians: Musician[],
  services: Service[],
  attendance: Attendance[],
) => {
  const activeMusicians = musicians.filter((musician) => musician.status === 'active')
  const upcomingServices = getUpcomingServices(services)
  const { rate, present, absences } = calculateAttendanceRate(attendance, activeMusicians)
  const totalServices = services.length
  const stats = buildMusicianStats(activeMusicians, attendance, totalServices)
  const averageRate = stats.length
    ? Math.round(stats.reduce((sum, item) => sum + item.rate, 0) / stats.length)
    : 0

  setText('kpi-musicians', `${musicians.length}`)
  setText('kpi-musicians-detail', `Ativos: ${activeMusicians.length}`)

  setText('kpi-services', `${upcomingServices.length}`)
  setText(
    'kpi-services-detail',
    upcomingServices[0]
      ? `Próximo: ${formatServiceSchedule(upcomingServices[0].weekday, upcomingServices[0].service_time)}`
      : 'Sem agenda',
  )

  setText('kpi-attendance', `${rate}%`)
  setText('kpi-attendance-detail', `Presentes: ${present} de ${activeMusicians.length}`)
  setText('kpi-launches', `${attendance.length}`)
  setText('kpi-launches-detail', 'Total de registros')
  setText('kpi-absences', `${absences}`)
  setText('kpi-absences-detail', 'Ausências contabilizadas')
  setText('kpi-average', `${averageRate}%`)
  setText('kpi-average-detail', 'Presença média')

  const topPresent = stats
    .slice()
    .sort((a, b) => b.present - a.present)
    .slice(0, 5)
    .map((item) => ({ name: item.musician.name, value: item.present }))
  const topAbsent = stats
    .slice()
    .sort((a, b) => b.absent - a.absent)
    .slice(0, 5)
    .map((item) => ({ name: item.musician.name, value: item.absent }))
  setHtml('rank-present', `<strong>Mais presentes</strong>${renderRanking(topPresent, 'Sem dados de presença.')}`)
  setHtml('rank-absent', `<strong>Mais faltas</strong>${renderRanking(topAbsent, 'Sem dados de faltas.')}`)

  const weekdayStats = weekdayOrder.map((weekday) => {
    const records = attendance.filter((item) => item.service_weekday === weekday)
    if (!records.length) return `${weekday}: --`
    const present = records.filter((item) => item.status === 'present').length
    const rate = Math.round((present / records.length) * 100)
    return `${weekday}: ${rate}% (${present}/${records.length})`
  })
  setHtml('weekday-frequency', renderList(weekdayStats, 'Sem registros por dia.'))

  const serviceComparison = services.map((service) => {
    const records = attendance.filter((item) => item.service_id === service.id)
    if (!records.length) {
      return `${formatServiceSchedule(service.weekday, service.service_time)}: sem registros`
    }
    const present = records.filter((item) => item.status === 'present').length
    const rate = Math.round((present / records.length) * 100)
    return `${formatServiceSchedule(service.weekday, service.service_time)}: ${rate}% (${present}/${records.length})`
  })
  setHtml('service-comparison', renderList(serviceComparison, 'Sem dados de comparação.'))

  const lowFrequency = stats
    .filter((item) => item.rate > 0 && item.rate < 70)
    .map((item) => `${item.musician.name} (${item.rate}% de presença)`)
  const consecutiveAbsences = stats
    .map((item) => {
      const sorted = item.records
        .slice()
        .sort((a, b) => (a.service_date ?? '').localeCompare(b.service_date ?? ''))
        .reverse()
      const lastTwo = sorted.slice(0, 2)
      const hasTwoAbsences =
        lastTwo.length === 2 && lastTwo.every((record) => record.status !== 'present')
      return hasTwoAbsences ? item.musician.name : null
    })
    .filter((name): name is string => Boolean(name))

  const alerts: string[] = []
  if (consecutiveAbsences.length) {
    alerts.push(`Faltas consecutivas: ${consecutiveAbsences.join(', ')}`)
  }
  if (lowFrequency.length) {
    alerts.push(`Frequência abaixo de 70%: ${lowFrequency.join(', ')}`)
  }
  setHtml('attendance-alerts', renderList(alerts, 'Nenhum alerta no momento.'))
}

export const loadDashboardData = async (commonId?: number | null) => {
  setText('data-status', 'Sincronizando dados com a API...')
  setTextLoading([
    'kpi-attendance',
    'kpi-attendance-detail',
    'kpi-launches',
    'kpi-launches-detail',
    'kpi-absences',
    'kpi-absences-detail',
    'kpi-average',
    'kpi-average-detail',
    'kpi-musicians',
    'kpi-musicians-detail',
    'kpi-services',
    'kpi-services-detail',
  ])
  setTableLoading('musicians-body', 3)
  setTableLoading('services-body', 2)
  setTableLoading('attendance-body', 3)

  try {
    const [musicians, services, attendance] = await Promise.all([
      api.getMusicians({ common_id: commonId ?? undefined }),
      api.getServices({ common_id: commonId ?? undefined }),
      api.getAttendance({ common_id: commonId ?? undefined }),
    ])

    updateKpis(musicians, services, attendance)
    setHtml('musicians-body', renderMusicians(musicians))
    setHtml('services-body', renderServices(services))
    setHtml('attendance-body', renderAttendance(attendance))

    setText('data-status', 'Dados atualizados com sucesso.')
  } catch (error) {
    setText('data-status', error instanceof Error ? error.message : 'Erro ao carregar dados.')
  } finally {
    clearTextLoading([
      'kpi-attendance',
      'kpi-attendance-detail',
      'kpi-launches',
      'kpi-launches-detail',
      'kpi-absences',
      'kpi-absences-detail',
      'kpi-average',
      'kpi-average-detail',
      'kpi-musicians',
      'kpi-musicians-detail',
      'kpi-services',
      'kpi-services-detail',
    ])
    clearTableLoading('musicians-body')
    clearTableLoading('services-body')
    clearTableLoading('attendance-body')
  }
}
