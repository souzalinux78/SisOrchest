import { api } from './api'
import { clearTableLoading, setButtonLoading, setHtml, setTableLoading, setText } from './dom'
import { getCurrentUser } from './session'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const renderUsersTable = (users: Array<{
  id: number
  name: string
  email: string
  status: string
  common_name?: string | null
}>) => {
  if (!users.length) {
    return `
      <tr>
        <td colspan="5" class="empty-row">Nenhum usuário cadastrado.</td>
      </tr>
    `
  }

  return users
    .map(
      (user) => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.common_name ?? '--'}</td>
        <td>${user.status}</td>
        <td>
          ${
            user.status === 'pending'
              ? `<button class="table-action" data-action="approve" data-id="${user.id}">Aprovar</button>`
              : '<span>--</span>'
          }
        </td>
      </tr>
    `,
    )
    .join('')
}

export const loadUsersList = async () => {
  setTableLoading('users-table-body', 5)
  try {
    const users = await api.getUsers()
    setHtml('users-table-body', renderUsersTable(users))
    setText('users-status', 'Usuários carregados.')
  } catch (error) {
    setText('users-status', error instanceof Error ? error.message : 'Erro ao carregar usuários.')
  } finally {
    clearTableLoading('users-table-body')
  }
}

export const setupUsersForm = () => {
  const saveButton = document.getElementById('user-save')
  const tableBody = document.getElementById('users-table-body')
  const exportButton = document.getElementById('users-export')

  saveButton?.addEventListener('click', async () => {
    const name = (document.getElementById('user-name') as HTMLInputElement | null)?.value.trim()
    const email = (document.getElementById('user-email') as HTMLInputElement | null)?.value.trim()
    const phone = (document.getElementById('user-phone') as HTMLInputElement | null)?.value.trim()
    const password = (document.getElementById('user-password') as HTMLInputElement | null)?.value
    const commonId = Number((document.getElementById('user-common') as HTMLSelectElement | null)?.value)

    if (!name || !email || !phone || !password || !commonId) {
      setText('users-status', 'Preencha nome, email, celular, senha e comum.')
      return
    }

    setText('users-status', 'Enviando cadastro para aprovação...')
    setButtonLoading(saveButton as HTMLButtonElement | null, true, 'Enviando...')
    try {
      await api.registerUser({ name, email, phone, password, common_id: commonId })
      await loadUsersList()
      const nameInput = document.getElementById('user-name') as HTMLInputElement | null
      const emailInput = document.getElementById('user-email') as HTMLInputElement | null
      const phoneInput = document.getElementById('user-phone') as HTMLInputElement | null
      const passwordInput = document.getElementById('user-password') as HTMLInputElement | null
      if (nameInput) nameInput.value = ''
      if (emailInput) emailInput.value = ''
      if (phoneInput) phoneInput.value = ''
      if (passwordInput) passwordInput.value = ''
      setText('users-status', 'Cadastro enviado. Aguardando aprovação.')
    } catch (error) {
      setText('users-status', error instanceof Error ? error.message : 'Erro ao cadastrar usuário.')
    } finally {
      setButtonLoading(saveButton as HTMLButtonElement | null, false)
    }
  })

  tableBody?.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const action = target.dataset.action
    const id = Number(target.dataset.id)
    if (action !== 'approve' || !id) return

    setText('users-status', 'Aprovando usuário...')
    setButtonLoading(target as HTMLButtonElement | null, true, 'Aprovando...')
    try {
      const currentUser = getCurrentUser()
      if (!currentUser?.id) {
        setText('users-status', 'Admin não identificado para aprovação.')
        return
      }
      await api.approveUser(id, { approved_by: currentUser.id })
      await loadUsersList()
      setText('users-status', 'Usuário aprovado.')
    } catch (error) {
      setText('users-status', error instanceof Error ? error.message : 'Erro ao aprovar usuário.')
    } finally {
      setButtonLoading(target as HTMLButtonElement | null, false)
    }
  })

  exportButton?.addEventListener('click', async () => {
    const users = await api.getUsers()
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('SisOrchest - Cadastros de usuários', 14, 20)

    autoTable(doc, {
      startY: 28,
      head: [['Nome', 'Email', 'Comum', 'Status']],
      body: users.map((user) => [
        user.name,
        user.email,
        user.common_name ?? '--',
        user.status,
      ]),
    })
    doc.save('cadastros-encarregados.pdf')
  })
}
