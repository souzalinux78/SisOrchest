import React, { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, Save, Info } from 'lucide-react'
import { api, type Musician, type Service } from '../../app/api'
import { getCurrentUser } from '../../app/session'

// Components
import AttendanceSummary from './AttendanceSummary.tsx'
import MusicianList from './MusicianList.tsx'
import AttendanceFilters from './AttendanceFilters.tsx'

const AttendancePage: React.FC = () => {
    const [musicians, setMusicians] = useState<Musician[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
    const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [visitors, setVisitors] = useState(0)
    const [presentIds, setPresentIds] = useState<Set<number>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null)

    const user = getCurrentUser()

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const commonId = user?.role === 'admin' ? undefined : user?.common_id

                const [musData, servData] = await Promise.all([
                    api.getMusicians({ common_id: commonId }),
                    api.getServices({ common_id: commonId })
                ])

                setMusicians(musData.filter(m => m.status === 'active'))
                setServices(servData)

                if (servData.length > 0) {
                    setSelectedServiceId(servData[0].id)
                }
            } catch (err) {
                setMessage({ text: 'Falha ao carregar dados iniciais.', type: 'error' })
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Load existing attendance when service or date changes
    useEffect(() => {
        const loadExisting = async () => {
            if (!selectedServiceId || !attendanceDate) return

            try {
                const commonId = user?.role === 'admin' ? undefined : user?.common_id
                const attendance = await api.getAttendance({ common_id: commonId })

                const existing = attendance.filter(a =>
                    a.service_id === selectedServiceId &&
                    (a.service_date ? a.service_date.split('T')[0] : '') === attendanceDate
                )

                const ids = new Set(existing.filter(a => a.status === 'present').map(a => a.musician_id))
                setPresentIds(ids)

                // Load visitors
                const visitorsData = await api.getAttendanceVisitors({
                    service_id: selectedServiceId,
                    service_date: attendanceDate
                })
                setVisitors(visitorsData?.[0]?.visitors_count ?? 0)

                if (existing.length > 0) {
                    setMessage({ text: 'Lançamentos existentes carregados para edição.', type: 'info' })
                } else {
                    setMessage(null)
                }
            } catch (err) {
                console.error('Erro ao buscar presenças existentes')
            }
        }
        loadExisting()
    }, [selectedServiceId, attendanceDate])

    const handleTogglePresence = (musicianId: number) => {
        const newIds = new Set(presentIds)
        if (newIds.has(musicianId)) {
            newIds.delete(musicianId)
        } else {
            newIds.add(musicianId)
        }
        setPresentIds(newIds)
    }

    const handleSave = async () => {
        if (!selectedServiceId || !attendanceDate) {
            setMessage({ text: 'Selecione um culto e uma data válidos.', type: 'error' })
            return
        }

        setSaving(true)
        try {
            const selectedService = services.find(s => s.id === selectedServiceId)
            const serviceWeekday = selectedService?.weekday ?? 'Outro'

            await api.registerAttendance({
                service_id: selectedServiceId,
                presentes: Array.from(presentIds),
                service_weekday: serviceWeekday,
                service_date: attendanceDate
            })

            await api.saveAttendanceVisitors({
                service_id: selectedServiceId,
                service_date: attendanceDate,
                visitors_count: visitors
            })

            setMessage({ text: 'Presenças salvas com sucesso!', type: 'success' })
            setTimeout(() => setMessage(null), 5000)
        } catch (err) {
            setMessage({ text: 'Erro ao salvar presenças.', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const musiciansByInstrument = useMemo(() => {
        const filtered = musicians.filter(m =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.instrument.toLowerCase().includes(searchTerm.toLowerCase())
        )

        const groups: Record<string, Musician[]> = {}
        filtered.forEach(m => {
            if (!groups[m.instrument]) groups[m.instrument] = []
            groups[m.instrument].push(m)
        })
        return groups
    }, [musicians, searchTerm])

    if (loading) {
        return <div className="loading-state">Carregando músicos e cultos...</div>
    }

    return (
        <div className="attendance-page">
            <header className="page-header">
                <div className="header-info">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="text-primary-500" />
                        Controle de Presença
                    </h1>
                    <p className="text-gray-500">Gestão de frequência e produtividade da orquestra.</p>
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn--primary flex items-center gap-2"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} />
                        {saving ? 'Salvando...' : 'Salvar Frequência'}
                    </button>
                </div>
            </header>

            {message && (
                <div className={`alert alert--${message.type} mb-4 flex items-center gap-2 animate-slide-in`}>
                    <Info size={18} />
                    {message.text}
                </div>
            )}

            <div className="attendance-grid">
                <main className="attendance-main">
                    {/* Filters Area */}
                    <AttendanceFilters
                        services={services}
                        selectedServiceId={selectedServiceId}
                        onServiceChange={setSelectedServiceId}
                        attendanceDate={attendanceDate}
                        onDateChange={setAttendanceDate}
                        visitors={visitors}
                        onVisitorsChange={setVisitors}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />

                    {/* List Area */}
                    <MusicianList
                        groups={musiciansByInstrument}
                        presentIds={presentIds}
                        onTogglePresence={handleTogglePresence}
                    />
                </main>

                <aside className="attendance-sidebar">
                    <AttendanceSummary
                        totalMusicians={musicians.length}
                        presentCount={presentIds.size}
                        visitors={visitors}
                    />
                </aside>
            </div>

            {/* Mobile Footer Action */}
            <div className="mobile-action-bar lg:hidden">
                <button
                    className="btn btn--primary btn--full shadow-lg"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Gravando...' : 'Salvar Presenças'}
                </button>
            </div>
        </div>
    )
}

export default AttendancePage
