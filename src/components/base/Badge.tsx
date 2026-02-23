import React from 'react'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
    className?: string
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    className = '',
}) => {
    return (
        <span className={`badge-saas badge-saas--${variant} ${className}`}>
            {children}
        </span>
    )
}
