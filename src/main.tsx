import './styles/design-system.css'
import './styles/base.css'
import './styles/components-base.css'
import './styles/layout-v2.css'
import './styles/auth-v2.css'
import './styles/tables.css'
import './styles/attendance-saas.css'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const container = document.getElementById('app')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}

// Service Worker Logic
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
    await deferredInstall.userChoice
    deferredInstall = null
    hideInstallBanner()
  })

  dismissButton?.addEventListener('click', () => {
    window.localStorage.setItem('pwa-install-dismissed', 'true')
    hideInstallBanner()
  })

  window.addEventListener('appinstalled', () => {
    hideInstallBanner()
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

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  })
}
