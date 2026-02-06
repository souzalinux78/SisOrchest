import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api, type Common } from './api'
import { getCurrentUser } from './session'

type ReportSummary = {
  total_musicos: number
  total_cultos_distintos: number
  total_presencas: number
  total_faltas: number
  percentual_presenca: number
}

type RankingItem = {
  musician_id: number
  musician_name: string
  presencas: number
  faltas: number
  percentual_presenca: number
}

type RankingMusicos = {
  ranking_faltas: RankingItem[]
  ranking_presencas: RankingItem[]
}

type HistoryItem = {
  service_date: string
  weekday: string
  total_presencas: number
  total_faltas: number
}

function Reports() {
  const currentUser = getCurrentUser()
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const [commons, setCommons] = useState<Common[]>([])
  const [commonId, setCommonId] = useState<number | null>(null)
  const [month, setMonth] = useState<number>(currentMonth)
  const [year, setYear] = useState<number>(currentYear)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [ranking, setRanking] = useState<RankingMusicos | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingCommons, setLoadingCommons] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Carrega lista de comuns ao montar componente
  useEffect(() => {
    const loadCommons = async () => {
      try {
        setLoadingCommons(true)
        const response = await api.getCommons()
        setCommons(Array.isArray(response) ? response : [])

        // Se usuário não é admin, define common_id automaticamente
        if (currentUser?.role !== 'admin' && currentUser?.common_id) {
          setCommonId(currentUser.common_id)
        }
      } catch (err) {
        setError('Erro ao carregar comuns')
      } finally {
        setLoadingCommons(false)
      }
    }

    loadCommons()
  }, [])

  const gerarRelatorio = async () => {
    if (!commonId) {
      setError('Selecione uma comum antes de gerar o relatório')
      return
    }

    setLoading(true)
    setError(null)
    setSummary(null)
    setRanking(null)
    setHistory([])

    try {
      const [summaryData, rankingData, historyData] = await Promise.all([
        api.getReportsSummary({
          common_id: commonId,
          month,
          year,
        }),
        api.getReportsRanking({
          common_id: commonId,
          month,
          year,
        }),
        api.getReportsHistory({
          common_id: commonId,
          month,
          year,
        }),
      ])

      setSummary(summaryData)
      setRanking(
        rankingData && typeof rankingData === 'object' && 'ranking_faltas' in rankingData
          ? (rankingData as RankingMusicos)
          : null,
      )
      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar relatório')
      setSummary(null)
      setRanking(null)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  // Gera lista de anos (ano atual e anterior)
  const years = [currentYear, currentYear - 1]

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ]

  const getPercentualClass = (percentual: number) => {
    if (percentual >= 70) return 'kpi-card--success'
    if (percentual >= 50) return 'kpi-card--warning'
    return 'kpi-card--danger'
  }

  return (
    <>
      <div className="view-header">
        <div>
          <h2>Relatórios Executivos</h2>
          <p>Visões gerenciais para tomada de decisão.</p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '12px',
            color: '#ef4444',
          }}
        >
          {error}
        </div>
      )}

      <div className="form-card">
        <h3>Filtros do Relatório</h3>
        <div className="form-grid">
          {currentUser?.role === 'admin' && (
            <label>
              <span>Comum</span>
              <select
                value={commonId || ''}
                onChange={(e) => setCommonId(e.target.value ? Number(e.target.value) : null)}
                disabled={loadingCommons}
              >
                <option value="">Selecione uma comum</option>
                {commons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>Mês</span>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Ano</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="primary"
              onClick={gerarRelatorio}
              disabled={loading || !commonId || loadingCommons}
            >
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="kpi-grid" style={{ marginTop: '2rem' }}>
          <article className="kpi-card">
            <span className="kpi-label">Total de Músicos</span>
            <strong className="kpi-value">{summary.total_musicos}</strong>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Total de Cultos Distintos</span>
            <strong className="kpi-value">{summary.total_cultos_distintos}</strong>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Total de Presenças</span>
            <strong className="kpi-value">{summary.total_presencas}</strong>
          </article>

          <article className="kpi-card">
            <span className="kpi-label">Total de Faltas</span>
            <strong className="kpi-value">{summary.total_faltas}</strong>
          </article>

          <article className={`kpi-card ${getPercentualClass(summary.percentual_presenca)}`}>
            <span className="kpi-label">Percentual de Presença</span>
            <strong className="kpi-value">{summary.percentual_presenca.toFixed(2)}%</strong>
          </article>
        </div>
      )}

      {!summary && !loading && !error && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <p>Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados.</p>
        </div>
      )}

      {summary && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              className="primary"
              onClick={() => {
                const url = `/api/reports/pdf?common_id=${commonId}&month=${month}&year=${year}`
                window.open(url, '_blank')
              }}
              disabled={!summary}
            >
              Exportar PDF
            </button>
          </div>

          {ranking && ranking.ranking_faltas.length > 0 && (
            <div className="form-card">
              <h3>Ranking de Faltas (Top 10)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Músico</th>
                      <th>Presenças</th>
                      <th>Faltas</th>
                      <th>% Presença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.ranking_faltas.map((item, index) => (
                      <tr key={item.musician_id}>
                        <td>{index + 1}º</td>
                        <td>{item.musician_name}</td>
                        <td>{item.presencas}</td>
                        <td style={{ color: item.faltas > 0 ? '#ef4444' : 'inherit' }}>
                          {item.faltas}
                        </td>
                        <td>{item.percentual_presenca.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ranking && ranking.ranking_presencas.length > 0 && (
            <div className="form-card">
              <h3>Ranking de Presenças (Top 10)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Músico</th>
                      <th>Presenças</th>
                      <th>Faltas</th>
                      <th>% Presença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.ranking_presencas.map((item, index) => (
                      <tr key={item.musician_id}>
                        <td>{index + 1}º</td>
                        <td>{item.musician_name}</td>
                        <td style={{ color: '#3dca7b' }}>{item.presencas}</td>
                        <td>{item.faltas}</td>
                        <td>{item.percentual_presenca.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!ranking || (ranking.ranking_faltas.length === 0 && ranking.ranking_presencas.length === 0)) && (
            <div className="form-card">
              <h3>Ranking de Músicos</h3>
              <p style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                Nenhum dado de ranking disponível para o período selecionado.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="form-card">
              <h3>Histórico por Data</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Dia da Semana</th>
                      <th>Presenças</th>
                      <th>Faltas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, index) => (
                      <tr key={`${item.service_date}-${index}`}>
                        <td>{new Date(item.service_date).toLocaleDateString('pt-BR')}</td>
                        <td>{item.weekday}</td>
                        <td>{item.total_presencas}</td>
                        <td>{item.total_faltas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {history.length === 0 && summary && (
            <div className="form-card">
              <h3>Histórico por Data</h3>
              <p style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                Nenhum histórico disponível para o período selecionado.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

let reactRoot: ReturnType<typeof createRoot> | null = null

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
