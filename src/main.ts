import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/tables.css'
import './styles/responsive.css'
import { layoutHtml } from './app/layout'
import { setupLogin } from './app/auth'
import { setupNavigation } from './app/navigation'
import { loadAllData, setupFeatureHandlers } from './app/overview'

const appRoot = document.querySelector<HTMLDivElement>('#app')

if (appRoot) {
  appRoot.innerHTML = layoutHtml
  setupLogin()
  setupNavigation()
  setupFeatureHandlers()
  loadAllData()
}

if ('serviceWorker' in navigator) {
  let deferredInstall = null as BeforeInstallPromptEvent | null
  const installBanner = document.getElementById('pwa-install-banner')
  const installButton = document.getElementById('pwa-install-button') as HTMLButtonElement | null
  const dismissButton = document.getElementById('pwa-install-dismiss')

  const showInstallBanner = () => {
    if (!installBanner) return
    const dismissed = window.localStorage.getItem('pwa-install-dismissed')
    if (dismissed === 'true') return
    installBanner.classList.add('is-visible')
  }

  const hideInstallBanner = () => {
    installBanner?.classList.remove('is-visible')
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstall = event as BeforeInstallPromptEvent
    showInstallBanner()
  })

  installButton?.addEventListener('click', async () => {
    if (!deferredInstall) return
    deferredInstall.prompt()
    const choice = await deferredInstall.userChoice
    deferredInstall = null
    hideInstallBanner()
    if (choice?.outcome === 'dismissed') {
      window.localStorage.setItem('pwa-install-dismissed', 'true')
    }
  })

  dismissButton?.addEventListener('click', () => {
    window.localStorage.setItem('pwa-install-dismissed', 'true')
    hideInstallBanner()
  })

  window.addEventListener('appinstalled', () => {
    hideInstallBanner()
    window.localStorage.removeItem('pwa-install-dismissed')
  })
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const updateBanner = document.getElementById('update-banner')
    const updateButton = document.getElementById('update-banner-reload') as HTMLButtonElement | null

    const showUpdateBanner = (registration: ServiceWorkerRegistration) => {
      if (!updateBanner || !updateButton) return
      updateBanner.classList.add('is-visible')
      updateButton.onclick = () => {
        updateButton.disabled = true
        updateButton.textContent = 'Atualizando...'
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      }
    }

    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        if (registration.waiting) {
          showUpdateBanner(registration)
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(registration)
            }
          })
        })
      })
      .catch(() => {
        // Mantém silêncio caso o SW falhe no primeiro load.
      })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  })
}
