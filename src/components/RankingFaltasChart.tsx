import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RankingData {
  id: number
  nome: string
  total_escalas: number
  total_presencas: number
  total_faltas: number
  percentual_faltas: number
}

interface RankingFaltasChartProps {
  data: RankingData[]
}

export const RankingFaltasChart = ({ data }: RankingFaltasChartProps) => {
  // Ordena do maior para o menor percentual de faltas
  const sortedData = [...data].sort((a, b) => b.percentual_faltas - a.percentual_faltas)

  // Formata os dados para o gráfico
  const chartData = sortedData.map((item) => ({
    name: item.nome,
    percentual_faltas: Number(item.percentual_faltas.toFixed(2)),
  }))

  if (chartData.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
        Nenhum dado disponível para o gráfico
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <h3 style={{ margin: '0 0 1rem', color: '#d4af37', fontSize: '1.2rem' }}>
        Top 5 Músicos que Mais Faltaram
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.2)" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            stroke="rgba(255, 255, 255, 0.7)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
          />
          <YAxis
            label={{ value: 'Percentual de Faltas (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.7)' }}
            stroke="rgba(255, 255, 255, 0.7)"
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#131313',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '8px',
              color: '#d4af37',
            }}
            labelStyle={{ color: '#d4af37' }}
          />
          <Legend wrapperStyle={{ color: 'rgba(255, 255, 255, 0.7)' }} />
          <Bar
            dataKey="percentual_faltas"
            fill="#ef4444"
            name="Percentual de Faltas (%)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
