import { createRoot } from 'react-dom/client'
import Reports from './Reports'

// Função para montar o componente React
let reactRoot: ReturnType<typeof createRoot> | null = null

export const setupReports = () => {
  const mountReports = () => {
    const container = document.getElementById('reports-react-root')
    
    if (container) {
      if (reactRoot) {
        reactRoot.unmount()
        reactRoot = null
      }
      reactRoot = createRoot(container)
      reactRoot.render(<Reports />)
    }
  }

  const container = document.getElementById('reports-react-root')
  if (container) {
    mountReports()
  } else {
    const observer = new MutationObserver(() => {
      const container = document.getElementById('reports-react-root')
      if (container) {
        mountReports()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    
    setTimeout(() => {
      observer.disconnect()
      const container = document.getElementById('reports-react-root')
      if (container && !reactRoot) {
        mountReports()
      }
    }, 1000)
  }
}

export const loadReports = async () => {
  setupReports()
}
