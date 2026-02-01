import { api } from './api'
import type { Common } from './api'
import { clearTableLoading, requireConfirmClick, setButtonLoading, setHtml, setTableLoading, setText } from './dom'
import { refreshCommonSelects } from './selectors'

const renderCommonsTable = (commons: Common[]) => {
  if (!commons.length) {
    return `
      <tr>
        <td colspan="2" class="empty-row">Nenhuma comum cadastrada.</td>
      </tr>
    `
  }

  return commons
    .map(
      (common) => `
      <tr>
        <td>${common.name}</td>
        <td>
          <button class="table-action" data-action="delete" data-id="${common.id}">
            Remover
          </button>
        </td>
      </tr>
    `,
    )
    .join('')
}

export const loadCommonsList = async () => {
  setTableLoading('commons-table-body', 2)
  try {
    const commons = await api.getCommons()
    setHtml('commons-table-body', renderCommonsTable(commons))
    setText('commons-status', 'Comuns carregadas com sucesso.')
    refreshCommonSelects(commons)
  } catch (error) {
    setText('commons-status', error instanceof Error ? error.message : 'Erro ao carregar comuns.')
  } finally {
    clearTableLoading('commons-table-body')
  }
}

export const setupCommonsForm = () => {
  const saveButton = document.getElementById('common-save')
  const tableBody = document.getElementById('commons-table-body')

  saveButton?.addEventListener('click', async () => {
    const name = (document.getElementById('common-name') as HTMLInputElement | null)?.value.trim()
    if (!name) {
      setText('commons-status', 'Nome da comum é obrigatório.')
      return
    }

    setText('commons-status', 'Salvando comum...')
    setButtonLoading(saveButton as HTMLButtonElement | null, true, 'Salvando...')
    try {
      await api.createCommon({ name })
      await loadCommonsList()
      const input = document.getElementById('common-name') as HTMLInputElement | null
      if (input) input.value = ''
      setText('commons-status', 'Comum salva com sucesso.')
    } catch (error) {
      setText('commons-status', error instanceof Error ? error.message : 'Erro ao salvar comum.')
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
    if (!requireConfirmClick(target as HTMLButtonElement | null, 'Confirmar')) return

    setText('commons-status', 'Removendo comum...')
    setButtonLoading(target as HTMLButtonElement | null, true, 'Removendo...')
    try {
      await api.deleteCommon(id)
      await loadCommonsList()
      setText('commons-status', 'Comum removida.')
    } catch (error) {
      setText('commons-status', error instanceof Error ? error.message : 'Erro ao remover comum.')
    } finally {
      setButtonLoading(target as HTMLButtonElement | null, false)
    }
  })
}
