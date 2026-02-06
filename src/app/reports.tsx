import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from './api'

type Common = {
  id: number
  name: string
}

function Reports() {
  const [commons, setCommons] = useState<Common[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await api.getCommons()
        setCommons(Array.isArray(response) ? response : [])
      } catch (err) {
        console.error(err)
        setError('Erro ao carregar relatórios')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return <div style={{ padding: 40 }}>Carregando relatórios...</div>
  }

  if (error) {
    return <div style={{ padding: 40, color: 'red' }}>{error}</div>
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Relatórios Executivos</h1>

      <h3>Comuns cadastradas</h3>
      <ul>
        {commons.map(c => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
    </div>
  )
}

let reactRoot: ReturnType<typeof createRoot> | null = null

export function setupReports() {
  // Função vazia - mantida para compatibilidade, mas não faz nada
}

export function loadReports() {
  const container = document.getElementById('reports-react-root')
  if (!container) return

  if (reactRoot) {
    reactRoot.unmount()
    reactRoot = null
  }

  reactRoot = createRoot(container)
  reactRoot.render(<Reports />)
}

export default Reports
