import { api } from './api'
import type { Attendance, Musician, Service } from './api'
import { clearTableLoading, formatDate, formatDateTime, formatServiceSchedule, setHtml, setTableLoading, setText } from './dom'
import { getCurrentUser } from './session'

const renderAttendanceTable = (attendance: Attendance[]) => {
  if (!attendance.length) {
    return `
      <tr>
        <td colspan="5" class="empty-row">Nenhuma presença registrada.</td>
      </tr>
    `
  }

  return attendance
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.instrument}</td>
        <td>${item.status === 'present' ? 'Presente' : 'Ausente'}</td>
        <td>${formatDate(item.service_date)}</td>
        <td>${item.service_weekday ?? '--'}</td>
      </tr>
    `,
    )
    .join('')
}

const renderSelectOptions = (items: { id: number; label: string }[], placeholder: string) => {
  const options = items
    .map((item) => `<option value="${item.id}">${item.label}</option>`)
    .join('')
  return `<option value="">${placeholder}</option>${options}`
}

const weekdayOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

let cachedAttendance: Attendance[] = []

const calculateServiceDate = (weekday?: string | null) => {
  if (!weekday) return ''
  const targetIndex = weekdayOrder.indexOf(weekday)
  if (targetIndex < 0) return ''
  const today = new Date()
  const currentIndex = today.getDay()
  const diff = (targetIndex - currentIndex + 7) % 7
  const serviceDate = new Date(today)
  serviceDate.setDate(today.getDate() + diff)
  const year = serviceDate.getFullYear()
  const month = String(serviceDate.getMonth() + 1).padStart(2, '0')
  const day = String(serviceDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const applyExistingToChecklist = (serviceId?: number | null, serviceDate?: string) => {
  if (!serviceId || !serviceDate) return
  const rows = document.querySelectorAll<HTMLLabelElement>('.attendance-item')
  rows.forEach((row) => {
    const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!checkbox) return
    checkbox.checked = false
    const existing = cachedAttendance.find(
      (item) => item.service_id === serviceId && item.musician_id === Number(checkbox.value),
    )
    if (!existing || existing.service_date !== serviceDate) return
    checkbox.checked = existing.status === 'present'
  })
}

const renderExistingAttendance = (serviceId?: number | null, serviceDate?: string) => {
  const container = document.getElementById('attendance-existing')
  if (!container) return
  if (!serviceId || !serviceDate) {
    container.innerHTML = ''
    return
  }

  const existing = cachedAttendance.filter(
    (item) => item.service_id === serviceId && item.service_date === serviceDate,
  )
  if (!existing.length) {
    container.innerHTML = ''
    return
  }

  container.innerHTML = `
    <div class="attendance-existing__header">Lançamentos já registrados para esta data</div>
    <ul class="attendance-existing__list">
      ${existing
        .map(
          (item) => `
          <li>
            <strong>${item.name}</strong> (${item.instrument}) —
            ${item.status === 'present' ? 'Presente' : 'Ausente'} em ${formatDate(item.service_date)}.
            Registrado em ${formatDateTime(item.recorded_at)}.
          </li>
        `,
        )
        .join('')}
    </ul>
  `
  applyExistingToChecklist(serviceId, serviceDate)
}

const setAttendanceSelects = (musicians: Musician[], services: Service[]) => {
  const serviceSelect = document.getElementById('attendance-service') as HTMLSelectElement | null
  const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
  const listContainer = document.getElementById('attendance-musicians-list') as HTMLDivElement | null
  const warning = document.getElementById('attendance-warning')

  if (serviceSelect) {
    serviceSelect.innerHTML = renderSelectOptions(
      services.map((service) => ({
        id: service.id,
        label: `${formatServiceSchedule(service.weekday, service.service_time)} - ${service.common_name ?? 'Comum'}`,
      })),
      'Selecione um culto',
    )
  }

  if (listContainer) {
    const activeMusicians = musicians.filter((musician) => musician.status === 'active')
    listContainer.innerHTML = activeMusicians.length
      ? activeMusicians
          .map(
            (musician) => `
        <label class="attendance-item">
          <input type="checkbox" value="${musician.id}" />
          <span>${musician.name} - ${musician.instrument}</span>
        </label>
        `,
          )
          .join('')
      : '<span class="empty-row">Nenhum músico ativo cadastrado.</span>'
  }

  if (dateInput) {
    const selectedService = services.find(
      (service) => String(service.id) === serviceSelect?.value,
    )
    dateInput.value = calculateServiceDate(selectedService?.weekday)
  }

  if (warning) warning.textContent = ''
  renderExistingAttendance(Number(serviceSelect?.value ?? 0), dateInput?.value)
}

export const loadAttendanceList = async (commonId?: number | null) => {
  setTableLoading('attendance-table-body', 5)
  try {
    const currentUser = getCurrentUser()
    const resolvedCommonId =
      commonId ?? (currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null)
    const attendance = await api.getAttendance({ common_id: resolvedCommonId ?? undefined })
    cachedAttendance = attendance
    setHtml('attendance-table-body', renderAttendanceTable(attendance))
    setText('attendance-status-text', 'Presenças carregadas com sucesso.')
  } catch (error) {
    setText('attendance-status-text', error instanceof Error ? error.message : 'Erro ao carregar presenças.')
  } finally {
    clearTableLoading('attendance-table-body')
  }
}

export const loadAttendanceLookups = async () => {
  try {
    const currentUser = getCurrentUser()
    const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
    const [musicians, services] = await Promise.all([
      api.getMusicians({ common_id: resolvedCommonId ?? undefined }),
      api.getServices({ common_id: resolvedCommonId ?? undefined }),
    ])
    setAttendanceSelects(musicians, services)
  } catch (error) {
    setText('attendance-status-text', error instanceof Error ? error.message : 'Erro ao carregar opções.')
  }
}

export const setupAttendanceForm = () => {
  const serviceSelect = document.getElementById('attendance-service') as HTMLSelectElement | null
  const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
  const warning = document.getElementById('attendance-warning')
  const listContainer = document.getElementById('attendance-musicians-list')

  serviceSelect?.addEventListener('change', async () => {
    try {
      const currentUser = getCurrentUser()
      const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
      const services = await api.getServices({ common_id: resolvedCommonId ?? undefined })
      const selected = services.find((service) => String(service.id) === serviceSelect.value)
      if (dateInput) {
        dateInput.value = calculateServiceDate(selected?.weekday)
      }
      if (warning) warning.textContent = ''
      renderExistingAttendance(Number(serviceSelect.value), dateInput?.value)
    } catch {
      if (dateInput) dateInput.value = ''
    }
  })

  dateInput?.addEventListener('change', () => {
    if (!dateInput?.value) return
    const selectedDate = new Date(`${dateInput.value}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (warning) {
      warning.textContent =
        selectedDate < today
          ? 'Você está lançando presença para um culto passado.'
          : ''
    }
    renderExistingAttendance(Number(serviceSelect?.value ?? 0), dateInput.value)
  })

  listContainer?.addEventListener('change', async (event) => {
    const target = event.target as HTMLInputElement | null
    if (!target || target.type !== 'checkbox') return

    const serviceId = Number(serviceSelect?.value ?? 0)
    const serviceDate = dateInput?.value ?? ''
    const serviceWeekday =
      serviceSelect?.selectedOptions[0]?.textContent?.split(' às ')[0]?.trim() ?? ''

    if (!serviceId || !serviceDate || !serviceWeekday) {
      setText('attendance-status-text', 'Selecione um culto válido antes de registrar presença.')
      target.checked = false
      return
    }

    const musicianId = Number(target.value)
    const existing = cachedAttendance.find(
      (record) =>
        record.service_id === serviceId &&
        record.musician_id === musicianId &&
        record.service_date === serviceDate,
    )
    const nextStatus = target.checked ? 'present' : 'absent'

    if (existing?.status === 'present' && nextStatus === 'absent') {
      const confirmChange = window.confirm(
        'Este músico já possui presença registrada. Deseja realmente marcar como falta?',
      )
      if (!confirmChange) {
        target.checked = true
        return
      }
    }

    setText('attendance-status-text', 'Salvando presença...')
    try {
      await api.registerAttendance({
        service_id: serviceId,
        musician_id: musicianId,
        status: nextStatus,
        service_weekday: serviceWeekday,
        service_date: serviceDate,
      })
      await loadAttendanceList()
      renderExistingAttendance(serviceId, serviceDate)
      setText('attendance-status-text', 'Presença atualizada.')
    } catch (error) {
      setText('attendance-status-text', error instanceof Error ? error.message : 'Erro ao registrar presença.')
      target.checked = !target.checked
    }
  })
}
