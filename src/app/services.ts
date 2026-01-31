import { api } from './api'
import type { Service } from './api'
import { clearTableLoading, setButtonLoading, setHtml, setTableLoading, setText } from './dom'
import { loadAttendanceLookups } from './attendance'
import { getCurrentUser } from './session'

const renderServicesTable = (services: Service[]) => {
  if (!services.length) {
    return `
      <tr>
        <td colspan="4" class="empty-row">Nenhum culto cadastrado.</td>
      </tr>
    `
  }

  return services
    .map(
      (service) => `
      <tr>
        <td>${service.weekday}</td>
        <td>${service.service_time.slice(0, 5)}</td>
        <td>${service.common_name ?? '--'}</td>
        <td>
          <button class="table-action" data-action="delete" data-id="${service.id}">
            Remover
          </button>
        </td>
      </tr>
    `,
    )
    .join('')
}

export const loadServicesList = async (commonId?: number | null) => {
  setTableLoading('services-table-body', 4)
  try {
    const currentUser = getCurrentUser()
    const resolvedCommonId =
      commonId ?? (currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null)
    const services = await api.getServices({ common_id: resolvedCommonId ?? undefined })
    setHtml('services-table-body', renderServicesTable(services))
    loadAttendanceLookups()
    setText('services-status', 'Cultos carregados com sucesso.')
  } catch (error) {
    setText('services-status', error instanceof Error ? error.message : 'Erro ao carregar cultos.')
  } finally {
    clearTableLoading('services-table-body')
  }
}

export const setupServicesForm = () => {
  const saveButton = document.getElementById('service-save')
  const tableBody = document.getElementById('services-table-body')

  saveButton?.addEventListener('click', async () => {
    const weekday = (document.getElementById('service-weekday') as HTMLSelectElement | null)?.value
    const serviceTime = (document.getElementById('service-time') as HTMLInputElement | null)?.value
    const currentUser = getCurrentUser()
    const commonIdFromSelect = Number(
      (document.getElementById('service-common') as HTMLSelectElement | null)?.value,
    )
    const commonId = currentUser?.role === 'admin'
      ? commonIdFromSelect
      : currentUser?.common_id ?? commonIdFromSelect

    if (!weekday || !serviceTime || !commonId) {
      setText('services-status', 'Dia, hora e comum são obrigatórios.')
      return
    }

    setText('services-status', 'Salvando culto...')
    setButtonLoading(saveButton as HTMLButtonElement | null, true, 'Salvando...')
    try {
      await api.createService({
        weekday,
        service_time: serviceTime,
        common_id: commonId,
      })
      await loadServicesList()
      loadAttendanceLookups()
      const weekdayInput = document.getElementById('service-weekday') as HTMLSelectElement | null
      const timeInput = document.getElementById('service-time') as HTMLInputElement | null
      const commonInput = document.getElementById('service-common') as HTMLSelectElement | null
      if (weekdayInput) weekdayInput.value = ''
      if (timeInput) timeInput.value = ''
      if (commonInput) commonInput.value = ''
      setText('services-status', 'Culto salvo com sucesso.')
    } catch (error) {
      setText('services-status', error instanceof Error ? error.message : 'Erro ao salvar culto.')
    } finally {
      setButtonLoading(saveButton as HTMLButtonElement | null, false)
    }
  })

  tableBody?.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const action = target.dataset.action
    const id = Number(target.dataset.id)
    if (action !== 'delete' || !id) return

    setText('services-status', 'Removendo culto...')
    setButtonLoading(target as HTMLButtonElement | null, true, 'Removendo...')
    try {
      await api.deleteService(id)
      await loadServicesList()
      loadAttendanceLookups()
      setText('services-status', 'Culto removido com sucesso.')
    } catch (error) {
      setText('services-status', error instanceof Error ? error.message : 'Erro ao remover culto.')
    } finally {
      setButtonLoading(target as HTMLButtonElement | null, false)
    }
  })
}
