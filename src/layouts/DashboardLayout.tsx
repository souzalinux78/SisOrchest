import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface DashboardLayoutProps {
    children: React.ReactNode
    user: { name: string; role: string }
    onLogout: () => void
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    user,
    onLogout,
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const menuItems = [
        { id: 'dashboard', path: '/', label: 'Dashboard', icon: '📊' },
        { id: 'musicians', path: '/musicians', label: 'Músicos', icon: '🎵' },
        { id: 'services', path: '/services', label: 'Cultos', icon: '⛪' },
        { id: 'attendance', path: '/attendance', label: 'Presenças', icon: '📝' },
        { id: 'commons', path: '/commons', label: 'Comuns', icon: '🏢' },
        { id: 'users', path: '/users', label: 'Usuários', icon: '👥' },
        { id: 'reports', path: '/reports', label: 'Relatórios', icon: '📈' },
    ]

    const activeItem = menuItems.find(item =>
        item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path))
    ) || menuItems[0]

    return (
        <div className="saas-layout saas-v2">
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'is-visible' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            <aside className={`saas-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-logo">S</div>
                    <span className="brand-name">SisOrchest</span>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeItem.id === item.id ? 'is-active' : ''}`}
                            onClick={() => {
                                navigate(item.path)
                                setIsSidebarOpen(false)
                            }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user.name.charAt(0)}</div>
                        <div className="user-details">
                            <p className="user-name">{user.name}</p>
                            <p className="user-role">{user.role}</p>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={onLogout}>
                        Sair
                    </button>
                </div>
            </aside>

            <main className="saas-main">
                <header className="saas-header">
                    <div className="header-left">
                        <button
                            className="mobile-menu-toggle"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            ☰
                        </button>
                        <div className="header-breadcrumb">
                            <span className="breadcrumb-parent">Painel</span>
                            <span className="breadcrumb-separator">/</span>
                            <span className="breadcrumb-current">
                                {activeItem.label}
                            </span>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button className="header-action-btn" aria-label="Notificações">
                            🔔
                        </button>
                        <div className="header-avatar">{user.name.charAt(0)}</div>
                    </div>
                </header>

                <div className="content-area">
                    <div className="content-container">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
