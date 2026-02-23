import React from 'react'
import { Button } from './base/Button'

interface HeroCardProps {
    title: string
    status: string
    description: string
    actionLabel?: string
    onAction?: () => void
    icon?: string
}

export const HeroCard: React.FC<HeroCardProps> = ({
    title,
    status,
    description,
    actionLabel,
    onAction,
    icon = '✨'
}) => {
    return (
        <div className="hero-card">
            <div className="hero-card__content">
                <div className="hero-card__header">
                    <div className="hero-card__icon">{icon}</div>
                    <h3 className="hero-card__title">{title}</h3>
                </div>
                <div className="hero-card__status">{status}</div>
                <p className="hero-card__description">{description}</p>
                {actionLabel && (
                    <div className="hero-card__actions">
                        <Button onClick={onAction} size="lg">
                            {actionLabel}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
