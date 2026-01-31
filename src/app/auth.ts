import { api } from './api'
import { loadAllData } from './overview'
import { setButtonLoading, setText } from './dom'
import { setCurrentUser } from './session'
import { applyPermissions, resetPermissions } from './permissions'

const setLoginStatus = (message: string, type: 'success' | 'error' | 'info') => {
  const loginStatus = document.getElementById('login-status')
  if (!loginStatus) return
  loginStatus.textContent = message
  loginStatus.className = `login-status ${type}`
}

const setRegisterStatus = (message: string, type: 'success' | 'error' | 'info') => {
  const registerStatus = document.getElementById('self-register-status')
  if (!registerStatus) return
  registerStatus.textContent = message
  registerStatus.className = `login-status ${type}`
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export const setupLogin = () => {
  const loginForm = document.querySelector<HTMLFormElement>('#login-form')
  const registerForm = document.querySelector<HTMLFormElement>('#self-register-form')
  const refreshButton = document.getElementById('refresh-data')
  const logoutButton = document.getElementById('logout-button')
  const restrictedLogout = document.getElementById('restricted-logout')
  const toggleRegister = document.getElementById('toggle-register')
  const closeRegister = document.getElementById('close-register')
  const loginSubmit = loginForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null
  const registerSubmit = registerForm?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null

  refreshButton?.addEventListener('click', async () => {
    setButtonLoading(refreshButton as HTMLButtonElement | null, true, 'Atualizando...')
    await loadAllData()
    setButtonLoading(refreshButton as HTMLButtonElement | null, false)
  })

  const handleLogout = (button?: HTMLButtonElement | null) => {
    setButtonLoading(button ?? null, true, 'Saindo...')
    const appRoot = document.querySelector('.app')
    appRoot?.classList.remove('is-authenticated')
    appRoot?.classList.remove('is-restricted')
    setCurrentUser(null)
    resetPermissions()
    setLoginStatus('Sessão encerrada.', 'info')
    const passwordInput = document.querySelector<HTMLInputElement>('#login-password')
    if (passwordInput) passwordInput.value = ''
    document.querySelector('.login-section')?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => setButtonLoading(button ?? null, false), 200)
  }

  logoutButton?.addEventListener('click', () => handleLogout(logoutButton as HTMLButtonElement | null))
  restrictedLogout?.addEventListener('click', () =>
    handleLogout(restrictedLogout as HTMLButtonElement | null),
  )

  toggleRegister?.addEventListener('click', () => {
    const appRoot = document.querySelector('.app')
    const isOpen = appRoot?.classList.toggle('is-register-open')
    if (toggleRegister) {
      toggleRegister.textContent = isOpen ? 'Fechar cadastro' : 'Cadastro de encarregado'
    }
  })

  const phoneField = document.getElementById('self-phone') as HTMLInputElement | null
  phoneField?.addEventListener('input', () => {
    phoneField.value = formatPhone(phoneField.value)
  })

  closeRegister?.addEventListener('click', () => {
    const appRoot = document.querySelector('.app')
    appRoot?.classList.remove('is-register-open')
    if (toggleRegister) {
      toggleRegister.textContent = 'Cadastro de encarregado'
    }
  })

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault()

    const emailInput = document.querySelector<HTMLInputElement>('#login-email')
    const passwordInput = document.querySelector<HTMLInputElement>('#login-password')
    const email = emailInput?.value?.trim()
    const password = passwordInput?.value ?? ''

    if (!email || !password) {
      setLoginStatus('Preencha e-mail e senha para continuar.', 'error')
      return
    }

    setLoginStatus('Verificando acesso...', 'info')
    setButtonLoading(loginSubmit, true, 'Entrando...')

    try {
      const user = await api.login(email, password)
      setCurrentUser(user)
      const appRoot = document.querySelector('.app')
      const allowedRoles = ['admin', 'manager']

      if (!allowedRoles.includes(user.role)) {
        appRoot?.classList.remove('is-authenticated')
        appRoot?.classList.add('is-restricted')
        setLoginStatus('Acesso restrito ao administrador.', 'error')
        return
      }

      applyPermissions(user)
      setLoginStatus(`Bem-vindo, ${user.name}. Acesso liberado.`, 'success')
      setText('data-status', 'Carregando dados para o dashboard...')
      await loadAllData()

      appRoot?.classList.remove('is-restricted')
      appRoot?.classList.add('is-authenticated')
      document.querySelector('.shell')?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
      setLoginStatus(error instanceof Error ? error.message : 'Falha ao autenticar.', 'error')
      const loginCard = document.querySelector('.login-card')
      loginCard?.classList.add('is-error')
      setTimeout(() => loginCard?.classList.remove('is-error'), 350)
    } finally {
      setButtonLoading(loginSubmit, false, 'Entrar no SisOrchest')
    }
  })

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault()

    const name = (document.getElementById('self-name') as HTMLInputElement | null)?.value.trim()
    const email = (document.getElementById('self-email') as HTMLInputElement | null)?.value.trim()
    const phoneInput = document.getElementById('self-phone') as HTMLInputElement | null
    const phone = phoneInput?.value.trim()
    const password = (document.getElementById('self-password') as HTMLInputElement | null)?.value
    const commonName = (document.getElementById('self-common-name') as HTMLInputElement | null)?.value.trim()

    if (!name || !email || !phone || !password || !commonName) {
      setRegisterStatus('Preencha nome, email, celular, comum e senha.', 'error')
      return
    }

    setRegisterStatus('Enviando solicitação...', 'info')
    setButtonLoading(registerSubmit, true, 'Enviando...')
    try {
      await api.registerUser({
        name,
        email,
        phone,
        password,
        common_name: commonName.toUpperCase(),
      })
      setRegisterStatus('Cadastro enviado. Aguarde aprovação do administrador.', 'success')
      const nameInput = document.getElementById('self-name') as HTMLInputElement | null
      const emailInput = document.getElementById('self-email') as HTMLInputElement | null
      const phoneInput = document.getElementById('self-phone') as HTMLInputElement | null
      const passwordInput = document.getElementById('self-password') as HTMLInputElement | null
      const commonInput = document.getElementById('self-common-name') as HTMLInputElement | null
      if (nameInput) nameInput.value = ''
      if (emailInput) emailInput.value = ''
      if (phoneInput) phoneInput.value = ''
      if (passwordInput) passwordInput.value = ''
      if (commonInput) commonInput.value = ''
    } catch (error) {
      setRegisterStatus(error instanceof Error ? error.message : 'Erro ao enviar cadastro.', 'error')
    } finally {
      setButtonLoading(registerSubmit, false, 'Solicitar aprovação')
    }
  })
}
