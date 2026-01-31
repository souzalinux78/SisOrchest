import { api } from './api'
import type { Musician } from './api'
import { clearTableLoading, setButtonLoading, setHtml, setTableLoading, setText } from './dom'
import { loadAttendanceLookups } from './attendance'
import { getCurrentUser } from './session'

const renderMusiciansTable = (musicians: Musician[]) => {
  if (!musicians.length) {
    return `
      <tr>
        <td colspan="4" class="empty-row">Nenhum músico cadastrado.</td>
      </tr>
    `
  }

  return musicians
    .map(
      (musician) => `
      <tr>
        <td>${musician.name}</td>
        <td>${musician.instrument}</td>
        <td>${musician.status === 'active' ? 'Ativo' : 'Inativo'}</td>
        <td>
          <button class="table-action" data-action="delete" data-id="${musician.id}">
            Remover
          </button>
        </td>
      </tr>
    `,
    )
    .join('')
}

export const loadMusiciansList = async (commonId?: number | null) => {
  setTableLoading('musicians-table-body', 4)
  try {
    const currentUser = getCurrentUser()
    const resolvedCommonId =
      commonId ?? (currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null)
    const musicians = await api.getMusicians({ common_id: resolvedCommonId ?? undefined })
    setHtml('musicians-table-body', renderMusiciansTable(musicians))
    loadAttendanceLookups()
    setText('musicians-status', 'Músicos carregados com sucesso.')
  } catch (error) {
    setText('musicians-status', error instanceof Error ? error.message : 'Erro ao carregar músicos.')
  } finally {
    clearTableLoading('musicians-table-body')
  }
}

export const setupMusiciansForm = () => {
  const saveButton = document.getElementById('musician-save')
  const tableBody = document.getElementById('musicians-table-body')
  const csvInput = document.getElementById('musicians-csv') as HTMLInputElement | null
  const csvButton = document.getElementById('musicians-csv-upload')

  saveButton?.addEventListener('click', async () => {
    const name = (document.getElementById('musician-name') as HTMLInputElement | null)?.value.trim()
    const instrument = (document.getElementById('musician-instrument') as HTMLInputElement | null)?.value.trim()
    const phone = (document.getElementById('musician-phone') as HTMLInputElement | null)?.value.trim()
    const email = (document.getElementById('musician-email') as HTMLInputElement | null)?.value.trim()
    const status =
      (document.getElementById('musician-status') as HTMLSelectElement | null)?.value ?? 'active'
    const currentUser = getCurrentUser()
    const commonIdFromSelect = Number(
      (document.getElementById('musician-common') as HTMLSelectElement | null)?.value,
    )
    const commonId = currentUser?.role === 'admin'
      ? commonIdFromSelect
      : currentUser?.common_id ?? commonIdFromSelect

    if (!name || !instrument || !commonId) {
      setText('musicians-status', 'Nome, instrumento e comum são obrigatórios.')
      return
    }

    setText('musicians-status', 'Salvando músico...')
    setButtonLoading(saveButton as HTMLButtonElement | null, true, 'Salvando...')
    try {
      await api.createMusician({
        name,
        instrument,
        phone: phone || null,
        email: email || null,
        status,
        common_id: commonId,
      })
      await loadMusiciansList()
      loadAttendanceLookups()
      const nameInput = document.getElementById('musician-name') as HTMLInputElement | null
      const instrumentInput = document.getElementById('musician-instrument') as HTMLInputElement | null
      const phoneInput = document.getElementById('musician-phone') as HTMLInputElement | null
      const emailInput = document.getElementById('musician-email') as HTMLInputElement | null
      if (nameInput) nameInput.value = ''
      if (instrumentInput) instrumentInput.value = ''
      if (phoneInput) phoneInput.value = ''
      if (emailInput) emailInput.value = ''
      setText('musicians-status', 'Músico salvo com sucesso.')
    } catch (error) {
      setText('musicians-status', error instanceof Error ? error.message : 'Erro ao salvar músico.')
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

    setText('musicians-status', 'Removendo músico...')
    setButtonLoading(target as HTMLButtonElement | null, true, 'Removendo...')
    try {
      await api.deleteMusician(id)
      await loadMusiciansList()
      loadAttendanceLookups()
      setText('musicians-status', 'Músico removido com sucesso.')
    } catch (error) {
      setText('musicians-status', error instanceof Error ? error.message : 'Erro ao remover músico.')
    } finally {
      setButtonLoading(target as HTMLButtonElement | null, false)
    }
  })

  csvButton?.addEventListener('click', async () => {
    const file = csvInput?.files?.[0]
    if (!file) {
      setText('musicians-status', 'Selecione um arquivo CSV.')
      return
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (!lines.length) {
      setText('musicians-status', 'CSV vazio.')
      return
    }

    const delimiter = lines[0].includes(';') ? ';' : ','
    const header = lines[0].toLowerCase()
    const hasHeader = header.includes('nome') || header.includes('instrumento')
    const dataLines = hasHeader ? lines.slice(1) : lines

    const currentUser = getCurrentUser()
    const commonIdFromSelect = Number(
      (document.getElementById('musician-common') as HTMLSelectElement | null)?.value,
    )
    const commonId = currentUser?.role === 'admin'
      ? commonIdFromSelect
      : currentUser?.common_id ?? commonIdFromSelect

    if (!commonId) {
      setText('musicians-status', 'Comum obrigatória para importação.')
      return
    }

    setText('musicians-status', 'Importando músicos...')
    setButtonLoading(csvButton as HTMLButtonElement | null, true, 'Importando...')
    try {
      for (const line of dataLines) {
        const [name, instrument, phone, email, status] = line.split(delimiter).map((v) => v.trim())
        if (!name || !instrument) continue
        await api.createMusician({
          name,
          instrument,
          phone: phone || null,
          email: email || null,
          status: status || 'active',
          common_id: commonId,
        })
      }
      await loadMusiciansList()
      setText('musicians-status', 'Importação concluída.')
      if (csvInput) csvInput.value = ''
    } catch (error) {
      setText('musicians-status', error instanceof Error ? error.message : 'Erro ao importar CSV.')
    } finally {
      setButtonLoading(csvButton as HTMLButtonElement | null, false)
    }
  })
}
