import React from 'react'
import { Search, Calendar, Church, Users2 } from 'lucide-react'
import type { Service } from '../../app/api'

interface AttendanceFiltersProps {
    services: Service[]
    selectedServiceId: number | null
    onServiceChange: (id: number) => void
    attendanceDate: string
    onDateChange: (date: string) => void
    visitors: number
    onVisitorsChange: (count: number) => void
    searchTerm: string
    onSearchChange: (term: string) => void
}

const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
    services,
    selectedServiceId,
    onServiceChange,
    attendanceDate,
    onDateChange,
    visitors,
    onVisitorsChange,
    searchTerm,
    onSearchChange
}) => {
    return (
        <div className="card-saas mb-6 overflow-visible">
            <div className="card-header pb-4 border-b">
                <h3 className="card-title text-lg">Parâmetros do Culto</h3>
            </div>
            <div className="card-content">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Service Selector */}
                    <div className="input-group mb-0">
                        <label className="input-label flex items-center gap-2">
                            <Church size={14} className="text-gray-400" />
                            Culto / Horário
                        </label>
                        <select
                            className="input-field"
                            value={selectedServiceId ?? ''}
                            onChange={(e) => onServiceChange(Number(e.target.value))}
                        >
                            {services.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.weekday} às {s.service_time} - {s.common_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="input-group mb-0">
                        <label className="input-label flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            Data do Culto
                        </label>
                        <input
                            type="date"
                            className="input-field"
                            value={attendanceDate}
                            onChange={(e) => onDateChange(e.target.value)}
                        />
                    </div>

                    {/* Visitors */}
                    <div className="input-group mb-0">
                        <label className="input-label flex items-center gap-2">
                            <Users2 size={14} className="text-gray-400" />
                            Músicos Visitantes
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                className="btn btn--secondary btn--icon p-2"
                                onClick={() => onVisitorsChange(Math.max(0, visitors - 1))}
                            >-</button>
                            <input
                                type="number"
                                className="input-field text-center py-2"
                                value={visitors}
                                onChange={(e) => onVisitorsChange(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                            <button
                                className="btn btn--secondary btn--icon p-2"
                                onClick={() => onVisitorsChange(visitors + 1)}
                            >+</button>
                        </div>
                    </div>

                    {/* Quick Search */}
                    <div className="input-group mb-0">
                        <label className="input-label flex items-center gap-2">
                            <Search size={14} className="text-gray-400" />
                            Filtrar Lista
                        </label>
                        <input
                            type="text"
                            placeholder="Buscar músico..."
                            className="input-field"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AttendanceFilters
