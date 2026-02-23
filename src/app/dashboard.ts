import { api } from './api'
import type { Attendance, Musician, Service } from './api'
import { clearTableLoading, clearTextLoading, formatServiceSchedule, setHtml, setTableLoading, setText, setTextLoading } from './dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HeroCard } from '../components/HeroCard'

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

const summarizeNames = (names: string[], limit = 6) => {
  if (names.length <= limit) return names.join(', ')
  const remaining = names.length - limit
  return `${names.slice(0, limit).join(', ')} e mais ${remaining}.`
}

const renderManagementAlerts = (
  consecutiveAbsences: string[],
  lowFrequencyDays: Array<{ weekday: string; rate: number; presentCount: number; total: number }>,
) => {
  if (!consecutiveAbsences.length && !lowFrequencyDays.length) {
    return `<span class="empty-row">Nenhum alerta no momento.</span>`
  }

  const blocks: string[] = []

  if (consecutiveAbsences.length) {
    blocks.push(`
      <article class="management-alert management-alert--warning">
        <h4 class="management-alert__title">Faltas consecutivas (${consecutiveAbsences.length})</h4>
        <p class="management-alert__text">${summarizeNames(consecutiveAbsences)}</p>
      </article>
    `)
  }

  if (lowFrequencyDays.length) {
    blocks.push(`
      <article class="management-alert management-alert--danger">
        <h4 class="management-alert__title">Cultos abaixo de 70%</h4>
        <ul class="management-alert__list">
          ${lowFrequencyDays
            .map((item) => `<li>${item.weekday}: ${item.rate}% (${item.presentCount}/${item.total})</li>`)
            .join('')}
        </ul>
      </article>
    `)
  }

  return `<div class="management-alerts">${blocks.join('')}</div>`
}

const updateKpis = (
  musicians: Musician[],
  services: Service[],
  attendance: Attendance[],
) => {
  const activeMusicians = musicians.filter((musician) => musician.status === 'active')
  const { rate, present, absences } = calculateAttendanceRate(attendance, activeMusicians)
  const totalServices = services.length
  const stats = buildMusicianStats(activeMusicians, attendance, totalServices)
  const activeTotal = activeMusicians.length

  setText('kpi-musicians', `${musicians.length}`)
  setText('kpi-musicians-detail', `Ativos: ${activeMusicians.length}`)

  setText('kpi-attendance', `${rate}%`)
  setText('kpi-attendance-detail', `Presentes: ${present} de ${activeTotal}`)
  setText('kpi-launches', `${attendance.length}`)
  setText('kpi-launches-detail', `Total de registros`)
  setText('kpi-absences', `${absences}`)
  setText('kpi-absences-detail', `Ausências contabilizadas`)

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

  const serviceWeekdays = Array.from(
    new Set(services.map((service) => service.weekday).filter((weekday): weekday is string => Boolean(weekday))),
  ).sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b))

  const weekdayStatsData = serviceWeekdays.map((weekday) => {
    const records = attendance.filter((item) => item.service_weekday === weekday)
    if (!activeTotal) {
      return { weekday, label: `${weekday}: --`, rate: 0, presentCount: 0, total: 0, hasLaunches: false }
    }
    if (!records.length) {
      return { weekday, label: `${weekday}: sem lançamentos`, rate: 0, presentCount: 0, total: activeTotal, hasLaunches: false }
    }

    const presentCount = new Set(
      records.filter((item) => item.status === 'present').map((item) => item.musician_id),
    ).size
    const rate = Math.round((presentCount / activeTotal) * 100)
    return { weekday, label: `${weekday}: ${rate}% (${presentCount}/${activeTotal})`, rate, presentCount, total: activeTotal, hasLaunches: true }
  })

  setHtml(
    'weekday-frequency',
    renderList(weekdayStatsData.map((item) => item.label), 'Sem registros por dia de culto.'),
  )

  const lowFrequencyDays = weekdayStatsData
    .filter((item) => item.hasLaunches && item.rate < 70)
    .map((item) => ({
      weekday: item.weekday,
      rate: item.rate,
      presentCount: item.presentCount,
      total: item.total,
    }))
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

  setHtml('attendance-alerts', renderManagementAlerts(consecutiveAbsences, lowFrequencyDays))
}

let heroRoot: any = null

export const loadDashboardData = async (commonId?: number | null) => {
  setText('data-status', 'Sincronizando dados com a API...')
  setTextLoading([
    'kpi-attendance',
    'kpi-attendance-detail',
    'kpi-launches',
    'kpi-launches-detail',
    'kpi-absences',
    'kpi-absences-detail',
    'kpi-musicians',
    'kpi-musicians-detail',
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

    // Bridge for legacy buttons
    document.querySelectorAll('.view-all-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.target
        if (target) window.location.href = `/${target}`
      })
    })

    // Render Hero Card or Dashboard Content
    const heroContainer = document.getElementById('dashboard-hero-container')
    if (heroContainer) {
      if (services.length === 0) {
        if (!heroRoot) heroRoot = createRoot(heroContainer)
        heroRoot.render(
          React.createElement(HeroCard, {
            title: "Atenção",
            status: "Nenhum culto aberto",
            description: "No momento não há cultos agendados para sua comum. Clique no botão abaixo para criar o primeiro evento da sua orquestra.",
            actionLabel: "Criar novo culto",
            onAction: () => {
              window.location.href = '/services'
            }
          })
        )
      } else {
        if (heroRoot) {
          heroRoot.unmount()
          heroRoot = null
        }
        heroContainer.innerHTML = ''
      }
    }

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
      'kpi-musicians',
      'kpi-musicians-detail',
    ])
    clearTableLoading('musicians-body')
    clearTableLoading('services-body')
    clearTableLoading('attendance-body')
  }
}
