import { api } from './api'
import type { Attendance, Musician, Service } from './api'
import { clearTableLoading, clearTextLoading, formatServiceSchedule, setHtml, setTableLoading, setText, setTextLoading } from './dom'

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

const calculateAttendanceRate = (attendance: Attendance[]) => {
  if (!attendance.length) return { rate: 0, total: 0 }
  const presentCount = attendance.filter((item) => item.status === 'present').length
  const rate = Math.round((presentCount / attendance.length) * 100)
  return { rate, total: attendance.length }
}

const getUpcomingServices = (services: Service[]) => services

const updateKpis = (
  musicians: Musician[],
  services: Service[],
  attendance: Attendance[],
) => {
  const activeMusicians = musicians.filter((musician) => musician.status === 'active')
  const upcomingServices = getUpcomingServices(services)
  const { rate, total } = calculateAttendanceRate(attendance)

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
  setText('kpi-attendance-detail', total ? `Base: ${total}` : 'Sem registros')
}

export const loadDashboardData = async (commonId?: number | null) => {
  setText('data-status', 'Sincronizando dados com a API...')
  setTextLoading([
    'kpi-attendance',
    'kpi-attendance-detail',
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
