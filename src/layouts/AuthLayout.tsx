import React from 'react'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
    children,
    title,
    subtitle,
}) => {
    return (
        <div className="auth-layout saas-v2">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">S</div>
                        <h1 className="auth-title">{title}</h1>
                        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                    </div>
                    <div className="auth-content">
                        {children}
                    </div>
                </div>
                <div className="auth-footer">
                    <p>© 2026 SisOrchest. Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    )
}
