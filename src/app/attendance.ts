import { api } from './api'
import type { Attendance, Musician, Service } from './api'
import { clearTableLoading, formatDate, formatServiceSchedule, setButtonLoading, setHtml, setTableLoading, setText } from './dom'
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

const setAttendanceSelects = (musicians: Musician[], services: Service[]) => {
  const serviceSelect = document.getElementById('attendance-service') as HTMLSelectElement | null
  const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
  const listContainer = document.getElementById('attendance-musicians-list') as HTMLDivElement | null

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
    listContainer.innerHTML = musicians.length
      ? musicians
          .map(
            (musician) => `
          <label class="attendance-item">
            <input type="checkbox" value="${musician.id}" />
            <span>${musician.name} - ${musician.instrument}</span>
          </label>
        `,
          )
          .join('')
      : '<span class="empty-row">Nenhum músico cadastrado.</span>'
  }

  if (dateInput) {
    const selectedService = services.find(
      (service) => String(service.id) === serviceSelect?.value,
    )
    dateInput.value = calculateServiceDate(selectedService?.weekday)
  }
}

export const loadAttendanceList = async (commonId?: number | null) => {
  setTableLoading('attendance-table-body', 5)
  try {
    const currentUser = getCurrentUser()
    const resolvedCommonId =
      commonId ?? (currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null)
    const attendance = await api.getAttendance({ common_id: resolvedCommonId ?? undefined })
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
  const saveButton = document.getElementById('attendance-save')
  const serviceSelect = document.getElementById('attendance-service') as HTMLSelectElement | null

  serviceSelect?.addEventListener('change', async () => {
    try {
      const currentUser = getCurrentUser()
      const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
      const services = await api.getServices({ common_id: resolvedCommonId ?? undefined })
      const selected = services.find((service) => String(service.id) === serviceSelect.value)
      const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
      if (dateInput) {
        dateInput.value = calculateServiceDate(selected?.weekday)
      }
    } catch {
      const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
      if (dateInput) dateInput.value = ''
    }
  })

  saveButton?.addEventListener('click', async () => {
    const serviceId = Number(
      (document.getElementById('attendance-service') as HTMLSelectElement | null)?.value,
    )
    const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
    const serviceDate = dateInput?.value ?? ''
    const serviceWeekday =
      serviceSelect?.selectedOptions[0]?.textContent?.split(' às ')[0]?.trim() ?? ''
    const selectedMusicians = Array.from(
      document.querySelectorAll<HTMLInputElement>('#attendance-musicians-list input:checked'),
    ).map((input) => Number(input.value))

    if (!serviceId || !serviceDate || !serviceWeekday) {
      setText('attendance-status-text', 'Selecione um culto válido.')
      return
    }

    if (!selectedMusicians.length) {
      setText('attendance-status-text', 'Selecione pelo menos um músico.')
      return
    }

    setText('attendance-status-text', 'Registrando presença...')
    setButtonLoading(saveButton as HTMLButtonElement | null, true, 'Registrando...')
    try {
      await Promise.all(
        selectedMusicians.map((musicianId) =>
          api.registerAttendance({
            service_id: serviceId,
            musician_id: musicianId,
            service_weekday: serviceWeekday,
            service_date: serviceDate,
          }),
        ),
      )
      await loadAttendanceList()
      setText('attendance-status-text', 'Presença registrada com sucesso.')
    } catch (error) {
      setText('attendance-status-text', error instanceof Error ? error.message : 'Erro ao registrar presença.')
    } finally {
      setButtonLoading(saveButton as HTMLButtonElement | null, false)
    }
  })
}
