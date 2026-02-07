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
let originalStatusMap = new Map<number, 'present' | 'absent'>()
let originalVisitorsCount = 0

const formatBrDate = (value?: string | null) => {
  if (!value) return ''
  // Fix timezone issue: directly format YYYY-MM-DD strings
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(date)
}

const normalizeIsoDate = (value?: string | null) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (value.includes('T')) return value.split('T')[0]
  const parsed = parseBrDateToIso(value)
  return parsed || ''
}

const parseBrDateToIso = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return ''
  const [, day, month, year] = match
  const iso = `${year}-${month}-${day}`
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return iso
}

const applyDateMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (!digits) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

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
  const normalizedDate = normalizeIsoDate(serviceDate)
  const rows = document.querySelectorAll<HTMLLabelElement>('.attendance-item')
  originalStatusMap = new Map()
  rows.forEach((row) => {
    const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!checkbox) return
    checkbox.checked = false
    originalStatusMap.set(Number(checkbox.value), 'absent')
    const existing = cachedAttendance.find(
      (item) =>
        item.service_id === serviceId &&
        item.musician_id === Number(checkbox.value) &&
        normalizeIsoDate(item.service_date) === normalizedDate,
    )
    if (!existing) return
    checkbox.checked = existing.status === 'present'
    originalStatusMap.set(Number(checkbox.value), existing.status === 'present' ? 'present' : 'absent')
  })
  const saveButton = document.getElementById('attendance-save') as HTMLButtonElement | null
  if (saveButton) saveButton.disabled = true
}

const renderExistingAttendance = (serviceId?: number | null, serviceDate?: string) => {
  const container = document.getElementById('attendance-existing')
  if (!container) return
  if (!serviceId || !serviceDate) {
    container.innerHTML = ''
    return
  }
  const normalizedDate = normalizeIsoDate(serviceDate)

  const existing = cachedAttendance.filter(
    (item) =>
      item.service_id === serviceId && normalizeIsoDate(item.service_date) === normalizedDate,
  )
  if (!existing.length) {
    container.innerHTML = ''
    applyExistingToChecklist(serviceId, normalizedDate)
    setText('attendance-status-text', 'Modo novo lançamento: nenhuma presença registrada.')
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
            ${item.status === 'present' ? 'Presente' : 'Ausente'} em ${formatBrDate(item.service_date)}.
            Registrado em ${formatDateTime(item.recorded_at)}.
          </li>
        `,
      )
      .join('')}
    </ul>
  `
  applyExistingToChecklist(serviceId, normalizedDate)
  setText('attendance-status-text', 'Modo edição: presenças existentes carregadas.')
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
    const isoDate = calculateServiceDate(selectedService?.weekday)
    dateInput.value = isoDate ? formatBrDate(isoDate) : ''
  }

  if (warning) warning.textContent = ''
}

const refreshAttendanceCache = async () => {
  const currentUser = getCurrentUser()
  const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
  const attendance = await api.getAttendance({ common_id: resolvedCommonId ?? undefined })
  cachedAttendance = attendance
  return attendance
}

const loadVisitorsCount = async (serviceId: number, serviceDate: string) => {
  const visitorsInput = document.getElementById('attendance-visitors') as HTMLInputElement | null
  if (!visitorsInput) return
  if (!serviceId || !serviceDate) {
    visitorsInput.value = '0'
    originalVisitorsCount = 0
    return
  }
  try {
    const rows = await api.getAttendanceVisitors({ service_id: serviceId, service_date: serviceDate })
    const count = rows?.[0]?.visitors_count ?? 0
    visitorsInput.value = String(count)
    originalVisitorsCount = count
  } catch {
    visitorsInput.value = '0'
    originalVisitorsCount = 0
  }
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
    await refreshAttendanceCache()
    const serviceSelect = document.getElementById('attendance-service') as HTMLSelectElement | null
    const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
    const isoDate = parseBrDateToIso(dateInput?.value ?? '')
    renderExistingAttendance(Number(serviceSelect?.value ?? 0), isoDate)
    await loadVisitorsCount(Number(serviceSelect?.value ?? 0), isoDate)
  } catch (error) {
    setText('attendance-status-text', error instanceof Error ? error.message : 'Erro ao carregar opções.')
  }
}

export const setupAttendanceForm = () => {
  const saveButton = document.getElementById('attendance-save') as HTMLButtonElement | null
  const serviceSelect = document.getElementById('attendance-service') as HTMLSelectElement | null
  const dateInput = document.getElementById('attendance-date') as HTMLInputElement | null
  const warning = document.getElementById('attendance-warning')
  const listContainer = document.getElementById('attendance-musicians-list')
  let visitorsInput = document.getElementById('attendance-visitors') as HTMLInputElement | null

  if (!visitorsInput) {
    const dateLabel = dateInput?.closest('label')
    const formGrid = dateLabel?.parentElement
    if (dateLabel && formGrid) {
      const label = document.createElement('label')
      const span = document.createElement('span')
      span.textContent = 'Quantidade de músicos visitantes'
      const input = document.createElement('input')
      input.id = 'attendance-visitors'
      input.type = 'number'
      input.min = '0'
      input.step = '1'
      input.value = '0'
      label.appendChild(span)
      label.appendChild(input)
      dateLabel.insertAdjacentElement('afterend', label)
      visitorsInput = input
    }
  }

  serviceSelect?.addEventListener('change', async () => {
    try {
      const currentUser = getCurrentUser()
      const resolvedCommonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
      const services = await api.getServices({ common_id: resolvedCommonId ?? undefined })
      const selected = services.find((service) => String(service.id) === serviceSelect.value)
      if (dateInput) {
        const isoDate = calculateServiceDate(selected?.weekday)
        dateInput.value = isoDate ? formatBrDate(isoDate) : ''
      }
      if (warning) warning.textContent = ''
      await refreshAttendanceCache()
      const isoDate = parseBrDateToIso(dateInput?.value ?? '')
      renderExistingAttendance(Number(serviceSelect.value), isoDate)
      await loadVisitorsCount(Number(serviceSelect.value), isoDate)
    } catch {
      if (dateInput) dateInput.value = ''
    }
  })

  dateInput?.addEventListener('change', () => {
    if (!dateInput?.value) return
    const isoDate = parseBrDateToIso(dateInput.value)
    if (!isoDate) return
    const selectedDate = new Date(`${isoDate}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (warning) {
      warning.textContent =
        selectedDate < today
          ? 'Você está lançando presença para um culto passado.'
          : ''
    }
    refreshAttendanceCache().then(() => {
      renderExistingAttendance(Number(serviceSelect?.value ?? 0), isoDate)
      loadVisitorsCount(Number(serviceSelect?.value ?? 0), isoDate)
    })
  })

  dateInput?.addEventListener('input', () => {
    if (!dateInput) return
    const masked = applyDateMask(dateInput.value)
    dateInput.value = masked
  })

  dateInput?.addEventListener('blur', () => {
    if (!dateInput?.value) return
    if (dateInput.value.length < 10) return
    const isoDate = parseBrDateToIso(dateInput.value)
    if (!isoDate) {
      setText('attendance-status-text', 'Data inválida. Use o formato DD/MM/AAAA.')
    }
  })

  visitorsInput?.addEventListener('input', () => {
    if (!visitorsInput) return
    const digits = visitorsInput.value.replace(/\D/g, '')
    visitorsInput.value = digits ? String(Number(digits)) : '0'
    const currentValue = Number(visitorsInput.value || 0)
    if (currentValue < 0) {
      visitorsInput.value = '0'
    }
    if (currentValue !== originalVisitorsCount) {
      if (saveButton) saveButton.disabled = false
      setText('attendance-status-text', 'Alterações pendentes. Clique em "Salvar alterações".')
    }
  })

  listContainer?.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement | null
    if (!target || target.type !== 'checkbox') return

    const serviceId = Number(serviceSelect?.value ?? 0)
    const serviceDate = parseBrDateToIso(dateInput?.value ?? '')
    const serviceWeekday =
      serviceSelect?.selectedOptions[0]?.textContent?.split(' às ')[0]?.trim() ?? ''

    if (!serviceId || !serviceDate || !serviceWeekday) {
      setText('attendance-status-text', 'Selecione um culto válido antes de registrar presença.')
      target.checked = false
      return
    }

    const musicianId = Number(target.value)
    const originalStatus = originalStatusMap.get(musicianId) ?? 'absent'
    const nextStatus = target.checked ? 'present' : 'absent'
    if (originalStatus === 'present' && nextStatus === 'absent') {
      const confirmChange = window.confirm(
        'Este músico já estava marcado como presente. Deseja realmente alterar para falta?',
      )
      if (!confirmChange) {
        target.checked = true
        return
      }
    }

    if (saveButton) saveButton.disabled = false
    setText('attendance-status-text', 'Alterações pendentes. Clique em "Salvar alterações".')
  })

  saveButton?.addEventListener('click', async () => {
    const serviceId = Number(serviceSelect?.value ?? 0)
    const serviceDate = parseBrDateToIso(dateInput?.value ?? '')
    const serviceWeekday =
      serviceSelect?.selectedOptions[0]?.textContent?.split(' às ')[0]?.trim() ?? ''
    const visitorsCount = Number(visitorsInput?.value ?? 0)

    if (!serviceId || !serviceDate || !serviceWeekday) {
      setText('attendance-status-text', 'Selecione um culto válido antes de salvar.')
      return
    }

    const checkboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>('#attendance-musicians-list input[type="checkbox"]'),
    )

    // Coleta apenas os IDs dos músicos marcados como presentes
    const presentesIds = checkboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => Number(checkbox.value))

    // Verifica se houve mudanças comparando com o estado original
    const currentPresentesSet = new Set(presentesIds)
    const originalPresentesSet = new Set(
      Array.from(originalStatusMap.entries())
        .filter(([_, status]) => status === 'present')
        .map(([id]) => id)
    )

    const hasChangesInAttendance =
      presentesIds.length !== originalPresentesSet.size ||
      presentesIds.some(id => !originalPresentesSet.has(id)) ||
      Array.from(originalPresentesSet).some(id => !currentPresentesSet.has(id))

    const visitorsChanged = visitorsCount !== originalVisitorsCount

    if (!hasChangesInAttendance && !visitorsChanged) {
      setText('attendance-status-text', 'Nenhuma alteração para salvar.')
      return
    }

    // Alerta se algum músico que estava presente foi desmarcado
    const removedPresence = Array.from(originalPresentesSet).some(id => !currentPresentesSet.has(id))
    if (removedPresence) {
      const confirmChange = window.confirm(
        'Você removeu a presença de um ou mais músicos que estavam marcados como presentes. Deseja realmente confirmar esta alteração?',
      )
      if (!confirmChange) return
    }

    setText('attendance-status-text', 'Salvando alterações...')
    saveButton.disabled = true
    try {
      // Envia service_id, lista de presentes, service_weekday e service_date
      // O backend cria faltas automaticamente para músicos não presentes
      await api.registerAttendance({
        service_id: serviceId,
        presentes: presentesIds,
        service_weekday: serviceWeekday,
        service_date: serviceDate,
      })

      // Salva visitantes separadamente se houver mudança
      if (visitorsChanged) {
        await api.saveAttendanceVisitors({
          service_id: serviceId,
          service_date: serviceDate,
          visitors_count: Math.max(visitorsCount, 0),
        })
      }

      await loadAttendanceList()
      renderExistingAttendance(serviceId, serviceDate)
      await loadVisitorsCount(serviceId, serviceDate)
      setText('attendance-status-text', 'Alterações salvas com sucesso.')
      window.dispatchEvent(new CustomEvent('attendance:updated'))
    } catch (error) {
      setText('attendance-status-text', error instanceof Error ? error.message : 'Erro ao salvar alterações.')
      saveButton.disabled = false
    }
  })
}
