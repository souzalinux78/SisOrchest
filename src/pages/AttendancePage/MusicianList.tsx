import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Check, User } from 'lucide-react'
import type { Musician } from '../../app/api'

interface MusicianListProps {
    groups: Record<string, Musician[]>
    presentIds: Set<number>
    onTogglePresence: (id: number) => void
}

const MusicianList: React.FC<MusicianListProps> = ({ groups, presentIds, onTogglePresence }) => {
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

    const toggleGroup = (instrument: string) => {
        setCollapsed(prev => ({ ...prev, [instrument]: !prev[instrument] }))
    }

    const instruments = Object.keys(groups).sort()

    if (instruments.length === 0) {
        return (
            <div className="card-saas p-12 text-center text-gray-400 border-dashed border-2">
                <User size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum músico encontrado para os filtros atuais.</p>
            </div>
        )
    }

    return (
        <div className="musician-list-container">
            {instruments.map(instrument => (
                <div key={instrument} className="instrument-group mb-4">
                    <button
                        className="flex items-center gap-3 w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => toggleGroup(instrument)}
                    >
                        {collapsed[instrument] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        <span className="font-semibold text-gray-700">{instrument}</span>
                        <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">
                            {presentIds.size} / {groups[instrument].length} presentes
                        </span>
                    </button>

                    {!collapsed[instrument] && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 mt-3 animate-slide-up">
                            {groups[instrument].map(musician => {
                                const isPresent = presentIds.has(musician.id)
                                return (
                                    <div
                                        key={musician.id}
                                        className={`
                      musician-presence-card flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                      ${isPresent
                                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                : 'bg-white border-gray-100 hover:border-gray-300'}
                    `}
                                        onClick={() => onTogglePresence(musician.id)}
                                    >
                                        <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                      ${isPresent ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}
                    `}>
                                            {musician.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>

                                        <div className="flex-1 overflow-hidden">
                                            <p className={`font-medium truncate ${isPresent ? 'text-blue-800' : 'text-gray-900'}`}>{musician.name}</p>
                                            <p className="text-xs text-gray-500">{musician.instrument}</p>
                                        </div>

                                        <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                      ${isPresent ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-200 bg-white'}
                    `}>
                                            {isPresent && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export default MusicianList
