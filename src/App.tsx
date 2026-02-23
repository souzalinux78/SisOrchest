import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { getCurrentUser, setCurrentUser } from './app/session'

// Legacy Integration Layer
import { dashboardView } from './app/layout/dashboard'
import { musiciansView } from './app/layout/musicians'
import { servicesView } from './app/layout/services'
import { commonsView } from './app/layout/commons'
import { usersView } from './app/layout/users'

import { setupLogin } from './app/auth'
import { setupFeatureHandlers, loadAllData } from './app/overview'

// Components
import Reports from './app/reports'
import AttendancePage from './pages/AttendancePage'

/**
 * LegacyView Component
 * Renders old HTML strings and initializes their logic
 */
const LegacyView: React.FC<{ html: string; viewId: string }> = ({ html, viewId }) => {
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const user = getCurrentUser()
        if (user) {
            setupFeatureHandlers()
            loadAllData()
        }

        const innerView = containerRef.current?.querySelector<HTMLElement>('.view')
        if (innerView) {
            innerView.classList.add('active', 'is-active')
        }
    }, [viewId])

    return (
        <div
            ref={containerRef}
            className={`view active view-${viewId}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

/**
 * ProtectedRoute Component
 * Handles authentication and role-based access
 */
const ProtectedRoute = () => {
    const user = getCurrentUser()
    const allowedRoles = ['admin', 'manager']

    if (!user?.access_token) {
        setCurrentUser(null)
        return <Navigate to="/login" replace />
    }

    if (!allowedRoles.includes(user.role)) {
        return (
            <AuthLayout title="Acesso Restrito" subtitle="Seu perfil aguarda liberação administrativa.">
                <p className="auth-subtitle auth-subtitle--centered">
                    Seu cadastro foi recebido. Fale com seu administrador para liberar seu acesso à plataforma Gestão de Culto.
                </p>
                <button
                    className="btn btn--outline btn--full"
                    onClick={() => {
                        setCurrentUser(null)
                        window.location.href = '/login'
                    }}
                >
                    Sair e tentar outro e-mail
                </button>
            </AuthLayout>
        )
    }

    return <Outlet />
}

/**
 * Main App Component
 */
const App: React.FC = () => {
    const [user, setUser] = React.useState(getCurrentUser())

    React.useEffect(() => {
        if (!user) {
            setupLogin()
        }
    }, [user])

    const handleLogout = () => {
        setCurrentUser(null)
        setUser(null)
        window.location.href = '/login'
    }

    return (
        <Routes>
            {/* Public Context */}
            <Route path="/login" element={
                <AuthLayout title="SisOrchest" subtitle="Acesso seguro à plataforma">
                    <form id="login-form" className="auth-content login-form">
                        <div className="input-group">
                            <label className="input-label">E-mail corporativo</label>
                            <input id="login-email" className="input-field" type="email" placeholder="seu@email.com" required />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Senha</label>
                            <input id="login-password" className="input-field" type="password" placeholder="••••••••" required />
                        </div>
                        <button className="btn btn--primary btn--full" type="submit">Entrar no SisOrchest</button>
                        <button id="toggle-register" className="btn btn--ghost btn--full auth-register-toggle" type="button">
                            Cadastro de encarregado
                        </button>
                        <div id="login-status" className="login-status"></div>
                    </form>
                </AuthLayout>
            } />

            {/* Private Context */}
            <Route element={<ProtectedRoute />}>
                <Route element={
                    <DashboardLayout
                        user={user || { name: 'Usuário', role: 'SaaS Admin' }}
                        onLogout={handleLogout}
                    >
                        <Outlet />
                    </DashboardLayout>
                }>
                    <Route index element={<LegacyView html={dashboardView} viewId="dashboard" />} />
                    <Route path="musicians" element={<LegacyView html={musiciansView} viewId="musicians" />} />
                    <Route path="services" element={<LegacyView html={servicesView} viewId="services" />} />
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="commons" element={<LegacyView html={commonsView} viewId="commons" />} />
                    <Route path="users" element={<LegacyView html={usersView} viewId="users" />} />
                    <Route path="reports" element={<Reports />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
    )
}

export default App
