const titleByView: Record<string, string> = {
  dashboard: 'Dashboard principal',
  musicians: 'Gestão de músicos',
  services: 'Gestão de cultos',
  attendance: 'Controle de presenças',
  commons: 'Cadastro de comuns',
  users: 'Gestão de usuários',
  reports: 'Relatórios executivos',
}

export const setupNavigation = () => {
  const menuItems = document.querySelectorAll<HTMLButtonElement>('.nav-item')
  const views = document.querySelectorAll<HTMLElement>('.view')
  const appBarTitle = document.getElementById('appbar-title')
  const appRoot = document.querySelector('.app')
  const menuToggle = document.getElementById('menu-toggle')
  const menuBackdrop = document.getElementById('menu-backdrop')

  const activateView = (viewId: string) => {
    menuItems.forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === viewId)
    })
    views.forEach((view) => {
      // In SaaS V2, views use .view class and we toggle active state
      view.classList.toggle('active', view.dataset.view === viewId)
      view.classList.toggle('is-active', view.dataset.view === viewId)
    })
    if (appBarTitle) {
      appBarTitle.textContent = titleByView[viewId] ?? 'SisOrchest'
    }
  }

  const closeMenu = () => {
    appRoot?.classList.remove('is-menu-open')
  }

  menuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view
      if (viewId) {
        activateView(viewId)
        closeMenu()
      }
    })
  })

  menuToggle?.addEventListener('click', () => {
    appRoot?.classList.toggle('is-menu-open')
  })

  menuBackdrop?.addEventListener('click', closeMenu)
}
