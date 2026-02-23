import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    fullWidth,
    className = '',
    ...props
}) => {
    const baseClass = 'btn'
    const variantClass = `btn--${variant}`
    const sizeClass = `btn--${size}`
    const fullWidthClass = fullWidth ? 'btn--full' : ''

    return (
        <button
            className={`${baseClass} ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? <span className="btn__spinner"></span> : children}
        </button>
    )
}
