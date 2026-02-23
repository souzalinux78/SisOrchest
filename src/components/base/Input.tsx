import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
        <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
            {label && <label htmlFor={inputId} className="input-label">{label}</label>}
            <input
                id={inputId}
                className="input-field"
                {...props}
            />
            {error && <span className="input-error">{error}</span>}
            {!error && helperText && <span className="input-helper">{helperText}</span>}
        </div>
    )
}
