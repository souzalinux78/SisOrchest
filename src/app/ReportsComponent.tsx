import { useState, useEffect, useMemo } from 'react'
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

type Common = {
  id: number
  name: string
}

const Reports = () => {
  const currentUser = getCurrentUser()
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  // Estados principais
  const [commonId, setCommonId] = useState<number | null>(null)
  const [mes, setMes] = useState<number>(currentMonth)
  const [ano, setAno] = useState<number>(currentYear)
  const [diaSemana, setDiaSemana] = useState<string | null>(null)
  const [modo, setModo] = useState<'mensal' | 'culto'>('mensal')
  const [cultoId, setCultoId] = useState<number | null>(null)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [rankingData, setRankingData] = useState<RankingData[]>([])
  const [availableCultos, setAvailableCultos] = useState<CultoData[]>([])
  const [commons, setCommons] = useState<Common[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<'percentual_presenca' | 'total_faltas' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Carrega comuns disponíveis e define commonId inicial
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (currentUser?.role === 'admin') {
          const commonsData = await api.getCommons()
          if (Array.isArray(commonsData)) {
            setCommons(commonsData)
          }
        } else {
          const userCommonId = currentUser?.common_id ?? null
          if (userCommonId) {
            setCommonId(userCommonId)
          }
        }
      } catch (err) {
        setError('Erro ao carregar dados iniciais')
      }
    }

    loadInitialData()
  }, [])

  // Carrega cultos disponíveis quando modo é 'culto' e filtros mudam
  useEffect(() => {
    if (modo === 'culto' && mes && ano && commonId) {
      loadCultosDisponiveis()
    } else {
      setAvailableCultos([])
      setCultoId(null)
    }
  }, [modo, mes, ano, commonId])

  const loadCultosDisponiveis = async () => {
    if (!commonId) return

    try {
      setError(null)
      const data = await api.getCultosComPresenca({
        mes,
        ano,
        common_id: commonId,
        diaSemana: null,
      })

      if (Array.isArray(data)) {
        setAvailableCultos(data)
      } else {
        setAvailableCultos([])
      }
    } catch (err) {
      setError('Erro ao carregar cultos disponíveis')
      setAvailableCultos([])
    }
  }

  const gerarRelatorio = async () => {
    if (!commonId) {
      setError('Selecione uma comum antes de gerar o relatório')
      return
    }

    setLoading(true)
    setError(null)
    setReportData([])
    setRankingData([])

    try {
      if (modo === 'mensal') {
        const diaSemanaStr = diaSemana && diaSemana !== '' ? diaSemana : null

        const [reportResponse, rankingResponse] = await Promise.all([
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

        if (Array.isArray(reportResponse)) {
          setReportData(reportResponse)
        } else {
          setError('Erro ao carregar dados do relatório')
        }

        if (Array.isArray(rankingResponse)) {
          setRankingData(rankingResponse)
        }
      } else if (modo === 'culto') {
        if (!cultoId) {
          setError('Selecione uma data de culto')
          setLoading(false)
          return
        }

        const reportResponse = await api.getRelatorioPresenca({
          cultoId,
          common_id: commonId,
          somentePresentes: true,
        })

        if (Array.isArray(reportResponse)) {
          setReportData(reportResponse)
        } else {
          setError('Erro ao carregar dados do relatório')
        }

        setRankingData([])
      }
    } catch (err) {
      setError('Erro ao gerar relatório. Tente novamente.')
      setReportData([])
      setRankingData([])
    } finally {
      setLoading(false)
    }
  }

  // Calcula KPIs apenas se houver dados
  const kpis = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return null
    }

    const totalMusicos = reportData.length
    const totalPresencas = reportData.reduce((acc, m) => acc + (m.total_presencas || 0), 0)
    const totalFaltas = reportData.reduce((acc, m) => acc + (m.total_faltas || 0), 0)
    const totalEscalas = totalPresencas + totalFaltas

    const percentualMedio =
      totalEscalas === 0
        ? 0
        : Number(((totalPresencas / totalEscalas) * 100).toFixed(2))

    const musicosEmRisco = reportData.filter((m) => (m.percentual_faltas || 0) > 30).length

    return {
      totalMusicos,
      totalPresencas,
      totalFaltas,
      percentualMedio,
      musicosEmRisco,
    }
  }, [reportData])

  // Dados ordenados para tabela
  const sortedReportData = useMemo(() => {
    if (!sortColumn || !reportData.length) return reportData

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

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
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
  const years = useMemo(() => {
    const yearsList: number[] = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      yearsList.push(i)
    }
    return yearsList
  }, [currentYear])

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

      {error && (
        <div className="report-alert-banner" style={{ display: 'block', backgroundColor: '#dc3545' }}>
          <div className="alert-banner-content">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">{error}</span>
          </div>
        </div>
      )}

      {hasHighAbsence && modo === 'mensal' && rankingData.length > 0 && (
        <div className="report-alert-banner" style={{ display: 'block' }}>
          <div className="alert-banner-content">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">
              Atenção: Existem músicos com percentual de faltas acima de 40% no período selecionado.
            </span>
          </div>
        </div>
      )}

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
              setReportData([])
              setRankingData([])
            }}
          >
            <option value="mensal">Relatório Mensal</option>
            <option value="culto">Relatório por Culto</option>
          </select>
        </label>

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

        {modo === 'mensal' && (
          <label>
            <span>Dia da semana</span>
            <select
              value={diaSemana || ''}
              onChange={(e) => setDiaSemana(e.target.value || null)}
            >
              {diasSemana.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {modo === 'culto' && (
          <label>
            <span>Data do culto</span>
            <select
              value={cultoId || ''}
              onChange={(e) => setCultoId(e.target.value ? Number(e.target.value) : null)}
              disabled={availableCultos.length === 0}
            >
              <option value="">
                {availableCultos.length === 0 ? 'Carregando...' : 'Selecione uma data'}
              </option>
              {availableCultos.map((culto) => (
                <option key={culto.id} value={culto.id}>
                  {culto.data || ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="report-actions">
          <button
            className="primary"
            onClick={gerarRelatorio}
            disabled={loading || !commonId}
          >
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {kpis && (
        <div className="report-kpis">
          <div className="kpi-card kpi-card--total">
            <div className="kpi-value">{kpis.totalMusicos}</div>
            <div className="kpi-label">Total de Músicos</div>
          </div>
          <div className="kpi-card kpi-card--presencas">
            <div className="kpi-value">{kpis.totalPresencas}</div>
            <div className="kpi-label">Total Presenças</div>
          </div>
          <div className="kpi-card kpi-card--faltas">
            <div className="kpi-value">{kpis.totalFaltas}</div>
            <div className="kpi-label">Total Faltas</div>
          </div>
          <div
            className={`kpi-card kpi-card--media ${
              kpis.percentualMedio >= 70
                ? 'kpi-card--success'
                : kpis.percentualMedio >= 50
                  ? 'kpi-card--warning'
                  : 'kpi-card--danger'
            }`}
          >
            <div className="kpi-value">{kpis.percentualMedio}%</div>
            <div className="kpi-label">Percentual Médio</div>
          </div>
        </div>
      )}

      <div className="data-card">
        <h3>Detalhamento por músico</h3>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados...</p>
        ) : sortedReportData.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center' }}>
            Nenhum dado para o filtro selecionado.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
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
              </tr>
            </thead>
            <tbody>
              {sortedReportData.map((item) => {
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
                    <td>{item.total_presencas || 0}</td>
                    <td>{item.total_faltas || 0}</td>
                    <td>{item.percentual_presenca?.toFixed(2) || 0}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
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

      {modo === 'culto' && reportData.length > 0 && (
        <div className="data-card">
          <p>Ranking não disponível para culto específico.</p>
        </div>
      )}
    </section>
  )
}

export default Reports
