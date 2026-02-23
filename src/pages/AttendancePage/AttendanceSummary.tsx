import { Users, UserPlus, Info, Activity } from 'lucide-react'

interface AttendanceSummaryProps {
    totalMusicians: number
    presentCount: number
    visitors: number
}

const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ totalMusicians, presentCount, visitors }) => {
    const attendanceRate = totalMusicians > 0
        ? Math.round((presentCount / totalMusicians) * 100)
        : 0

    return (
        <div className="card-saas sticky top-6 shadow-xl border-none bg-gradient-to-br from-blue-700 to-blue-900 text-white overflow-hidden">
            {/* Abstract Design Elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white opacity-5 rounded-full blur-3xl"></div>

            <div className="card-header pb-2">
                <h3 className="card-title text-white opacity-80 uppercase tracking-widest text-xs flex items-center gap-2">
                    <Activity size={14} />
                    Status em Tempo Real
                </h3>
            </div>

            <div className="card-content">
                <div className="space-y-8 mt-4">
                    {/* Main Percentage */}
                    <div className="percentage-display text-center">
                        <div className="relative inline-block">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="58"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="8"
                                    fill="transparent"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="58"
                                    stroke="white"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={364.4}
                                    strokeDashoffset={364.4 - (364.4 * attendanceRate) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-700 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black leading-none">{attendanceRate}%</span>
                                <span className="text-[10px] opacity-60 uppercase font-bold tracking-tight">Presença</span>
                            </div>
                        </div>
                    </div>

                    <div className="stats-row flex justify-between items-center py-4 border-b border-white border-opacity-10">
                        <div className="stat-label flex items-center gap-2 text-sm opacity-80">
                            <Users size={14} />
                            Nossa Comum
                        </div>
                        <div className="stat-value font-bold text-lg">
                            {presentCount} <span className="text-sm opacity-50 font-normal">/ {totalMusicians}</span>
                        </div>
                    </div>

                    <div className="stats-row flex justify-between items-center py-4 border-b border-white border-opacity-10">
                        <div className="stat-label flex items-center gap-2 text-sm opacity-80">
                            <UserPlus size={14} />
                            Visitantes
                        </div>
                        <div className="stat-value font-bold text-lg">
                            {visitors}
                        </div>
                    </div>

                    <div className="stats-total bg-white bg-opacity-10 rounded-xl p-4 mt-6">
                        <p className="text-xs opacity-60 uppercase tracking-wider mb-1 font-bold">Total na Orquestra</p>
                        <p className="text-2xl font-black">{presentCount + visitors} <span className="text-sm font-normal opacity-70">músicos hoje</span></p>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-yellow-400 bg-opacity-20 rounded-xl border border-yellow-400 border-opacity-20 flex gap-3 text-xs text-yellow-100">
                    <Info size={16} className="shrink-0" />
                    <p className="leading-relaxed">
                        Certifique-se de salvar os dados antes de sair desta tela para manter o histórico atualizado.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default AttendanceSummary
