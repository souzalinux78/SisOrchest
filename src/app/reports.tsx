import { useEffect, useState } from 'react'
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
  const [weekday, setWeekday] = useState<string>('')
  const [specificDate, setSpecificDate] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<Array<{ service_date: string; weekday: string }>>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [ranking, setRanking] = useState<RankingMusicos | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [exportingPdf, setExportingPdf] = useState<boolean>(false)
  const [exportingHistoryPdf, setExportingHistoryPdf] = useState<boolean>(false)
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

  // Carrega datas disponíveis
  useEffect(() => {
    const loadDates = async () => {
      if (!commonId) return
      try {
        const dates = await api.getAvailableServiceDates({
          common_id: commonId,
          month,
          year,
          weekday: weekday || null
        })
        setAvailableDates(Array.isArray(dates) ? dates : [])
      } catch (err) {
        console.error('Erro ao carregar datas:', err)
      }
    }
    loadDates()
  }, [commonId, month, year, weekday])

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
          weekday: weekday || null,
          specific_date: specificDate || null,
        }),
        api.getReportsRanking({
          common_id: commonId,
          month,
          year,
          weekday: weekday || null,
          specific_date: specificDate || null,
        }),
        api.getReportsHistory({
          common_id: commonId,
          month,
          year,
          weekday: weekday || null,
          specific_date: specificDate || null,
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

  const diasSemana = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ]

  const getPercentualClass = (percentual: number) => {
    if (percentual >= 70) return 'kpi-card--success'
    if (percentual >= 50) return 'kpi-card--warning'
    return 'kpi-card--danger'
  }

  const exportarPdf = async () => {
    if (!commonId) {
      setError('Selecione uma comum antes de exportar o PDF')
      return
    }

    try {
      setExportingPdf(true)
      setError(null)
      const blob = await api.downloadReportsPdf({
        common_id: commonId,
        month,
        year,
        weekday: weekday || null,
        specific_date: specificDate || null,
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-executivo-${year}-${String(month).padStart(2, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const exportarPdfHistorico = async () => {
    if (!commonId) {
      setError('Selecione uma comum antes de exportar o PDF detalhado')
      return
    }

    try {
      setExportingHistoryPdf(true)
      setError(null)
      const blob = await api.downloadReportsHistoryPresencePdf({
        common_id: commonId,
        month,
        year,
        weekday: weekday || null,
        specific_date: specificDate || null,
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-historico-presenca-${year}-${String(month).padStart(2, '0')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar PDF detalhado')
    } finally {
      setExportingHistoryPdf(false)
    }
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
        <div className="report-error-banner">
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

          <label>
            <span>Dia de Culto</span>
            <select value={weekday} onChange={(e) => {
              setWeekday(e.target.value)
              setSpecificDate('')
            }}>
              <option value="">Todos</option>
              {diasSemana.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Data Específica</span>
            <select
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              disabled={availableDates.length === 0}
            >
              <option value="">Todas as datas</option>
              {availableDates.map((date) => {
                const dateVal = typeof date.service_date === 'string' ? date.service_date.split('T')[0] : String(date.service_date)
                const d = new Date(dateVal)
                // Ajuste para exibição local simplificada (sempre DD/MM)
                const label = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} - ${date.weekday}`
                return (
                  <option key={dateVal} value={dateVal}>
                    {label}
                  </option>
                )
              })}
            </select>
          </label>

          <div className="report-actions-row">
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
        <div className="kpi-grid report-kpis-section">
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
        <div className="report-empty">
          <p>Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados.</p>
        </div>
      )}

      {summary && (
        <div className="report-stack">
          <div className="report-actions-row">
            <button
              className="secondary"
              onClick={() => window.print()}
              disabled={!summary}
            >
              Imprimir Relatorio
            </button>
            <button
              className="primary"
              onClick={exportarPdf}
              disabled={!summary || exportingPdf}
            >
              {exportingPdf ? 'Exportando...' : 'Exportar PDF Executivo'}
            </button>
            <button
              className="primary"
              onClick={exportarPdfHistorico}
              disabled={!summary || exportingHistoryPdf}
            >
              {exportingHistoryPdf ? 'Exportando...' : 'Exportar PDF Historico'}
            </button>
          </div>

          {ranking && ranking.ranking_faltas.length > 0 && (
            <div className="form-card">
              <h3>Ranking de Faltas (Top 10)</h3>
              <div className="report-scroll">
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
                        <td className={item.faltas > 0 ? 'text-error' : ''}>
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
              <div className="report-scroll">
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
                        <td className="text-success">{item.presencas}</td>
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
              <p className="report-empty">
                Nenhum dado de ranking disponível para o período selecionado.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="form-card">
              <h3>Histórico por Data</h3>
              <div className="report-scroll">
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
              <p className="report-empty">
                Nenhum histórico disponível para o período selecionado.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Reports
