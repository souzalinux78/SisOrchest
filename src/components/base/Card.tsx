import React from 'react'

interface CardProps {
    children: React.ReactNode
    title?: string
    description?: string
    className?: string
    footer?: React.ReactNode
    noPadding?: boolean
}

export const Card: React.FC<CardProps> = ({
    children,
    title,
    description,
    className = '',
    footer,
    noPadding = false,
}) => {
    return (
        <div className={`card ${className}`}>
            {(title || description) && (
                <div className="card-header">
                    {title && <h3 className="card-title">{title}</h3>}
                    {description && <p className="card-description">{description}</p>}
                </div>
            )}
            <div className={`card-content ${noPadding ? 'card-content--no-padding' : ''}`}>
                {children}
            </div>
            {footer && <div className="card-footer">{footer}</div>}
        </div>
    )
}
