import { API_BASE_URL } from '../config'

export type User = {
  id: number
  name: string
  email: string
  phone?: string | null
  role: string
  status: string
  common_id?: number | null
}

export type Musician = {
  id: number
  name: string
  instrument: string
  phone?: string | null
  email?: string | null
  status: string
  common_id: number
}

export type Common = {
  id: number
  name: string
}

export type Service = {
  id: number
  weekday: string
  service_time: string
  common_id: number
  common_name?: string | null
}

export type Attendance = {
  id: number
  service_id: number
  musician_id: number
  status: string
  service_weekday?: string | null
  service_date?: string | null
  name: string
  instrument: string
  recorded_at: string
}

export type AttendanceVisitors = {
  service_id: number
  service_date: string
  visitors_count: number
}

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.message ?? 'Falha ao processar a requisição.'
    throw new Error(message)
  }

  // Se a resposta vier no formato padronizado { success: true, data: [...] }, extrai o data
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T
  }

  return data as T
}

export const api = {
  login: (email: string, password: string) =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMusicians: (params?: { common_id?: number | null }) => {
    const query = params?.common_id ? `?common_id=${params.common_id}` : ''
    return request<Musician[]>(`/musicians${query}`)
  },
  createMusician: (payload: Omit<Musician, 'id'>) =>
    request<{ id: number }>('/musicians', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMusician: (id: number, payload: Omit<Musician, 'id' | 'common_id'>) =>
    request<{ message: string }>(`/musicians/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteMusician: (id: number) =>
    request<{ message: string }>(`/musicians/${id}`, { method: 'DELETE' }),
  getCommons: () => request<Common[]>('/commons'),
  createCommon: (payload: { name: string }) =>
    request<{ id: number }>('/commons', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteCommon: (id: number) =>
    request<{ message: string }>(`/commons/${id}`, { method: 'DELETE' }),
  registerUser: (payload: {
    name: string
    email: string
    phone: string
    password: string
    common_name?: string
    common_id?: number
  }) =>
    request<{ message: string }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getUsers: (params?: { status?: string; common_id?: number | null }) => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.set('status', params.status)
    if (params?.common_id) queryParams.set('common_id', String(params.common_id))
    const query = queryParams.toString()
    return request<(User & { common_name?: string | null })[]>(`/users${query ? `?${query}` : ''}`)
  },
  approveUser: (id: number, payload: { approved_by: number; note?: string | null }) =>
    request<{ message: string }>(`/users/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getServices: (params?: { common_id?: number | null }) => {
    const query = params?.common_id ? `?common_id=${params.common_id}` : ''
    return request<Service[]>(`/services${query}`)
  },
  createService: (payload: Omit<Service, 'id' | 'common_name'>) =>
    request<{ id: number }>('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteService: (id: number) =>
    request<{ message: string }>(`/services/${id}`, { method: 'DELETE' }),
  getAttendance: (params?: { common_id?: number | null }) => {
    const query = params?.common_id ? `?common_id=${params.common_id}` : ''
    return request<Attendance[]>(`/attendance${query}`)
  },
  registerAttendance: (payload: {
    service_id: number
    presentes: number[]
    service_weekday: string
    service_date: string
  }) =>
    request<{ message: string }>('/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAttendanceVisitors: (params: { service_id?: number; service_date?: string; common_id?: number | null }) => {
    const queryParams = new URLSearchParams()
    if (params.service_id) queryParams.set('service_id', String(params.service_id))
    if (params.service_date) queryParams.set('service_date', params.service_date)
    if (params.common_id) queryParams.set('common_id', String(params.common_id))
    const query = queryParams.toString()
    return request<AttendanceVisitors[]>(`/attendance/visitors${query ? `?${query}` : ''}`)
  },
  saveAttendanceVisitors: (payload: { service_id: number; service_date: string; visitors_count: number }) =>
    request<{ message: string }>('/attendance/visitors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCultosComPresenca: (params: { mes: number; ano: number; common_id: number; diaSemana?: number | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('mes', String(params.mes))
    queryParams.set('ano', String(params.ano))
    queryParams.set('common_id', String(params.common_id))
    if (params.diaSemana !== undefined && params.diaSemana !== null) {
      queryParams.set('diaSemana', String(params.diaSemana))
    }
    return request<Array<{ id: number; data: string }>>(`/attendance/relatorios/cultos-com-presenca?${queryParams.toString()}`)
  },
  getRelatorioPresenca: (params: { cultoId: number; common_id: number; somentePresentes?: boolean }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('cultoId', String(params.cultoId))
    queryParams.set('common_id', String(params.common_id))
    if (params.somentePresentes !== undefined) {
      queryParams.set('somentePresentes', String(params.somentePresentes))
    }
    return request<Array<{ id: number; nome: string; total_escalas: number; total_presencas: number; total_faltas: number; percentual_presenca: number; percentual_faltas: number }>>(`/attendance/relatorios/presenca?${queryParams.toString()}`)
  },
  getRankingFaltasPeriodo: (params: { mes: number; ano: number; common_id: number; diaSemana?: string | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('mes', String(params.mes))
    queryParams.set('ano', String(params.ano))
    queryParams.set('common_id', String(params.common_id))
    if (params.diaSemana !== undefined && params.diaSemana !== null && params.diaSemana !== '') {
      queryParams.set('diaSemana', String(params.diaSemana))
    }
    return request<Array<{ id: number; nome: string; total_escalas: number; total_presencas: number; total_faltas: number; percentual_faltas: number }>>(`/attendance/relatorios/ranking-faltas-periodo?${queryParams.toString()}`)
  },
  getRelatorioPresencaMensal: (params: { mes: number; ano: number; common_id: number; diaSemana?: string | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('mes', String(params.mes))
    queryParams.set('ano', String(params.ano))
    queryParams.set('common_id', String(params.common_id))
    if (params.diaSemana !== undefined && params.diaSemana !== null && params.diaSemana !== '') {
      queryParams.set('diaSemana', String(params.diaSemana))
    }
    return request<Array<{ id: number; nome: string; total_escalas: number; total_presencas: number; total_faltas: number; percentual_presenca: number; percentual_faltas: number }>>(`/attendance/relatorios/presenca?${queryParams.toString()}`)
  },
  getReportsSummary: (params: { common_id: number; month: number; year: number; weekday?: string | null; specific_date?: string | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('common_id', String(params.common_id))
    queryParams.set('month', String(params.month))
    queryParams.set('year', String(params.year))
    if (params.weekday !== undefined && params.weekday !== null && params.weekday !== '') {
      queryParams.set('weekday', String(params.weekday))
    }
    if (params.specific_date !== undefined && params.specific_date !== null && params.specific_date !== '') {
      queryParams.set('specific_date', String(params.specific_date))
    }
    return request<{
      total_musicos: number
      total_cultos_distintos: number
      total_presencas: number
      total_faltas: number
      percentual_presenca: number
    }>(`/reports/summary?${queryParams.toString()}`)
  },
  getReportsRanking: (params: { common_id: number; month: number; year: number; weekday?: string | null; specific_date?: string | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('common_id', String(params.common_id))
    queryParams.set('month', String(params.month))
    queryParams.set('year', String(params.year))
    if (params.weekday !== undefined && params.weekday !== null && params.weekday !== '') {
      queryParams.set('weekday', String(params.weekday))
    }
    if (params.specific_date !== undefined && params.specific_date !== null && params.specific_date !== '') {
      queryParams.set('specific_date', String(params.specific_date))
    }
    return request<{
      ranking_faltas: Array<{
        musician_id: number
        musician_name: string
        presencas: number
        faltas: number
        percentual_presenca: number
      }>
      ranking_presencas: Array<{
        musician_id: number
        musician_name: string
        presencas: number
        faltas: number
        percentual_presenca: number
      }>
    }>(`/reports/ranking?${queryParams.toString()}`)
  },
  getReportsHistory: (params: { common_id: number; month: number; year: number; weekday?: string | null; specific_date?: string | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('common_id', String(params.common_id))
    queryParams.set('month', String(params.month))
    queryParams.set('year', String(params.year))
    if (params.weekday !== undefined && params.weekday !== null && params.weekday !== '') {
      queryParams.set('weekday', String(params.weekday))
    }
    if (params.specific_date !== undefined && params.specific_date !== null && params.specific_date !== '') {
      queryParams.set('specific_date', String(params.specific_date))
    }
    return request<
      Array<{
        service_date: string
        weekday: string
        total_presencas: number
        total_faltas: number
      }>
    >(`/reports/history?${queryParams.toString()}`)
  },
  getAvailableServiceDates: (params: { common_id: number; month: number; year: number; weekday?: string | null }) => {
    const queryParams = new URLSearchParams()
    queryParams.set('common_id', String(params.common_id))
    queryParams.set('month', String(params.month))
    queryParams.set('year', String(params.year))
    if (params.weekday !== undefined && params.weekday !== null && params.weekday !== '') {
      queryParams.set('weekday', String(params.weekday))
    }
    return request<Array<{ service_date: string; weekday: string }>>(`/reports/available-dates?${queryParams.toString()}`)
  },
}
