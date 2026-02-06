import { useState, useMemo, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from './api'
import { getCurrentUser } from './session'
import { RankingFaltasChart } from '../components/RankingFaltasChart'

type ReportData = {
  id: number
  nome: string
  total_escalas: number
  total_presencas: number
  total_faltas: number
  percentual_presenca: number
  percentual_faltas: number
}

type RankingData = {
  id: number
  nome: string
  total_escalas: number
  total_presencas: number
  total_faltas: number
  percentual_faltas: number
}

type CultoData = {
  id: number
  data: string
}

export const ReportsComponent = () => {
  const currentUser = getCurrentUser()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Estados
  const [modo, setModo] = useState<'culto' | 'mensal'>('mensal')
  const [cultoId, setCultoId] = useState<number | null>(null)
  const [mes, setMes] = useState<number>(currentMonth)
  const [ano, setAno] = useState<number>(currentYear)
  const [diaSemana, setDiaSemana] = useState<string>('')
  const [commonId, setCommonId] = useState<number | null>(
    currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null
  )
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [rankingData, setRankingData] = useState<RankingData[]>([])
  const [availableDates, setAvailableDates] = useState<CultoData[]>([])
  const [loading, setLoading] = useState(false)
  const [sortColumn, setSortColumn] = useState<'percentual_presenca' | 'total_faltas' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [commons, setCommons] = useState<Array<{ id: number; name: string }>>([])

  // Carrega comuns disponíveis
  useEffect(() => {
    const loadCommons = async () => {
      try {
        const data = await api.getCommons()
        setCommons(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Erro ao carregar comuns:', error)
      }
    }
    loadCommons()
  }, [])

  // Carrega datas disponíveis quando modo é 'culto' e mês/ano mudam
  useEffect(() => {
    if (modo === 'culto' && mes && ano && commonId) {
      loadAvailableDates()
    } else {
      setAvailableDates([])
    }
  }, [modo, mes, ano, commonId])

  const loadAvailableDates = async () => {
    if (!mes || !ano || !commonId) {
      setAvailableDates([])
      return
    }

    try {
      const response = await api.getCultosComPresenca({
        mes,
        ano,
        common_id: commonId,
        diaSemana: null,
      })
      setAvailableDates(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error('Erro ao carregar datas disponíveis:', error)
      setAvailableDates([])
    }
  }

  // Função única para gerar relatório
  const gerarRelatorio = async () => {
    if (!commonId) {
      alert('Selecione uma comum antes de gerar o relatório.')
      return
    }

    setLoading(true)

    try {
      if (modo === 'culto') {
        if (!cultoId) {
          alert('Selecione uma data de culto')
          setLoading(false)
          return
        }

        const data = await api.getRelatorioPresenca({
          cultoId,
          common_id: commonId,
          somentePresentes: true,
        })

        console.log('🔵 [AUDITORIA] PRESENCA DATA (culto):', data)
        setReportData(Array.isArray(data) ? data : [])
        setRankingData([]) // Ranking não disponível para culto específico
      } else {
        const diaSemanaStr = diaSemana || null

        const [data, ranking] = await Promise.all([
          api.getRelatorioPresencaMensal({
            mes,
            ano,
            diaSemana: diaSemanaStr,
            common_id: commonId,
          }),
          api.getRankingFaltasPeriodo({
            mes,
            ano,
            diaSemana: diaSemanaStr,
            common_id: commonId,
          }),
        ])

        console.log('🔵 [AUDITORIA] PRESENCA DATA (mensal):', data)
        console.log('🔵 [AUDITORIA] RANKING DATA:', ranking)

        setReportData(Array.isArray(data) ? data : [])
        setRankingData(Array.isArray(ranking) ? ranking : [])
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      alert('Erro ao gerar relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Calcula KPIs com useMemo
  const kpis = useMemo(() => {
    if (!reportData.length) {
      return {
        totalMusicos: 0,
        totalPresencas: 0,
        totalFaltas: 0,
        media: 0,
        musicosEmRisco: 0,
      }
    }

    const totalMusicos = reportData.length
    const totalPresencas = reportData.reduce((acc, m) => acc + (m.total_presencas || 0), 0)
    const totalFaltas = reportData.reduce((acc, m) => acc + (m.total_faltas || 0), 0)
    const totalEscalas = totalPresencas + totalFaltas

    const media =
      totalEscalas === 0
        ? 0
        : Number(((totalPresencas / totalEscalas) * 100).toFixed(2))

    const musicosEmRisco = reportData.filter((m) => (m.percentual_faltas || 0) > 30).length

    return {
      totalMusicos,
      totalPresencas,
      totalFaltas,
      media,
      musicosEmRisco,
    }
  }, [reportData])

  // Dados ordenados para tabela
  const sortedReportData = useMemo(() => {
    if (!sortColumn) return reportData

    return [...reportData].sort((a, b) => {
      let aValue: number
      let bValue: number

      if (sortColumn === 'percentual_presenca') {
        aValue = a.percentual_presenca || 0
        bValue = b.percentual_presenca || 0
      } else {
        aValue = a.total_faltas || 0
        bValue = b.total_faltas || 0
      }

      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }, [reportData, sortColumn, sortDirection])

  const handleSort = (column: 'percentual_presenca' | 'total_faltas') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const hasHighAbsence = rankingData.some((m) => (m.percentual_faltas || 0) > 40)

  // Gera anos para select
  const years = []
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i)
  }

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
    { value: '', label: 'Todos' },
    { value: 'Domingo', label: 'Domingo' },
    { value: 'Segunda', label: 'Segunda' },
    { value: 'Terça', label: 'Terça' },
    { value: 'Quarta', label: 'Quarta' },
    { value: 'Quinta', label: 'Quinta' },
    { value: 'Sexta', label: 'Sexta' },
    { value: 'Sábado', label: 'Sábado' },
  ]

  return (
    <section className="view" data-view="reports">
      <div className="view-header">
        <div>
          <h2>Relatórios</h2>
          <p>Visões executivas para a direção musical.</p>
        </div>
      </div>

      <div className="report-filters">
        {currentUser?.role === 'admin' && (
          <label>
            <span>Comum</span>
            <select
              value={commonId || ''}
              onChange={(e) => setCommonId(e.target.value ? Number(e.target.value) : null)}
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
          <span>Modo</span>
          <select
            value={modo}
            onChange={(e) => {
              setModo(e.target.value as 'culto' | 'mensal')
              setCultoId(null)
            }}
          >
            <option value="culto">Relatório por Culto</option>
            <option value="mensal">Relatório Mensal</option>
          </select>
        </label>

        {modo === 'culto' ? (
          <>
            <label>
              <span>Mês</span>
              <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {meses.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Ano</span>
              <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Data do culto</span>
              <select
                value={cultoId || ''}
                onChange={(e) => setCultoId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Selecione uma data</option>
                {availableDates.map((date) => (
                  <option key={date.id} value={date.id}>
                    {date.data || ''}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>Mês</span>
              <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {meses.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Ano</span>
              <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Dia da semana</span>
              <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
                {diasSemana.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <div className="report-actions">
          <button
            className="primary"
            onClick={gerarRelatorio}
            disabled={loading}
          >
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {hasHighAbsence && modo === 'mensal' && (
        <div className="report-alert-banner" style={{ display: 'block' }}>
          <div className="alert-banner-content">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">
              Atenção: Existem músicos com percentual de faltas acima de 40% no período selecionado.
            </span>
          </div>
        </div>
      )}

      <div className="report-kpis">
        <div className="kpi-card kpi-card--total">
          <div className="kpi-value">{kpis.totalMusicos}</div>
          <div className="kpi-label">Total de Músicos</div>
        </div>
        <div
          className={`kpi-card kpi-card--media ${
            kpis.media >= 70
              ? 'kpi-card--success'
              : kpis.media >= 50
                ? 'kpi-card--warning'
                : 'kpi-card--danger'
          }`}
        >
          <div className="kpi-value">{kpis.media}%</div>
          <div className="kpi-label">Média Geral de Presença (%)</div>
        </div>
        <div className="kpi-card kpi-card--faltas">
          <div className="kpi-value">{kpis.totalFaltas}</div>
          <div className="kpi-label">Total de Faltas no Período</div>
        </div>
        <div
          className={`kpi-card kpi-card--risco ${
            kpis.musicosEmRisco === 0
              ? 'kpi-card--success'
              : kpis.musicosEmRisco <= 2
                ? 'kpi-card--warning'
                : 'kpi-card--danger'
          }`}
        >
          <div className="kpi-value">{kpis.musicosEmRisco}</div>
          <div className="kpi-label">Músicos em Risco (&gt;30% faltas)</div>
        </div>
      </div>

      <div className="data-card">
        <h3>Detalhamento por músico</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Músico</th>
              <th>Total Escalas</th>
              <th>Presenças</th>
              <th>Faltas</th>
              <th
                className="sortable-header"
                onClick={() => handleSort('percentual_presenca')}
                style={{ cursor: 'pointer' }}
              >
                Percentual{' '}
                {sortColumn === 'percentual_presenca' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                className="sortable-header"
                onClick={() => handleSort('total_faltas')}
                style={{ cursor: 'pointer' }}
              >
                Total Faltas{' '}
                {sortColumn === 'total_faltas' && (
                  <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedReportData.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  {loading ? 'Carregando...' : 'Nenhum dado para o filtro selecionado.'}
                </td>
              </tr>
            ) : (
              sortedReportData.map((item) => {
                const hasHighAbsence = (item.percentual_faltas || 0) > 30
                const hasExcellentFrequency = (item.percentual_presenca || 0) >= 80

                return (
                  <tr
                    key={item.id}
                    className={hasHighAbsence ? 'row-high-absence' : ''}
                  >
                    <td>
                      {item.nome || '--'}
                      {hasExcellentFrequency && (
                        <span className="badge-excellent">Excelente Frequência</span>
                      )}
                    </td>
                    <td>{item.total_escalas || 0}</td>
                    <td>{item.total_presencas || 0}</td>
                    <td>{item.total_faltas || 0}</td>
                    <td>{item.percentual_presenca?.toFixed(2) || 0}%</td>
                    <td>{item.total_faltas || 0}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {modo === 'mensal' && rankingData.length > 0 && (
        <>
          <div className="data-card">
            <h3>Top 5 músicos que mais faltaram</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Percentual de faltas</th>
                  <th>Total de faltas</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.map((m) => (
                  <tr key={m.id}>
                    <td>{m.nome || '--'}</td>
                    <td>{m.percentual_faltas?.toFixed(2) || 0}%</td>
                    <td>{m.total_faltas || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="data-card">
            <div>
              <RankingFaltasChart data={rankingData} />
            </div>
          </div>
        </>
      )}

      {modo === 'culto' && rankingData.length === 0 && (
        <div className="data-card">
          <p>Ranking não disponível para culto específico.</p>
        </div>
      )}
    </section>
  )
}

// Função para montar o componente React
let reactRoot: ReturnType<typeof createRoot> | null = null

export const setupReports = () => {
  // Monta o componente React quando a view é ativada
  const mountReports = () => {
    const container = document.getElementById('reports-react-root')
    if (container) {
      // Limpa o root anterior se existir
      if (reactRoot) {
        reactRoot.unmount()
      }
      reactRoot = createRoot(container)
      reactRoot.render(<ReportsComponent />)
    }
  }

  // Monta imediatamente se o container já existe
  if (document.getElementById('reports-react-root')) {
    mountReports()
  } else {
    // Aguarda o DOM estar pronto
    const observer = new MutationObserver(() => {
      if (document.getElementById('reports-react-root')) {
        mountReports()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

export const loadReports = async () => {
  // Esta função não é mais necessária, mas mantida para compatibilidade
  // O componente React gerencia seu próprio estado
  // Apenas garante que o componente está montado
  setupReports()
}
